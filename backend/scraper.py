"""
scraper.py — Playwright-based Google Maps scraper + Gemini AI analysis & Lead Scoring.
"""
from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from typing import Optional

import google.generativeai as genai
from playwright.async_api import async_playwright

from config import settings

logger = logging.getLogger(__name__)

# Initialize Gemini if key provided
_gemini_available = False
if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        _gemini_available = True
        logger.info("Gemini AI client successfully initialized.")
    except Exception as e:
        logger.warning(f"Could not initialize Gemini AI: {e}")


@dataclass
class RawBusiness:
    name: str
    category: str = ""
    address: str = ""
    phone: str = ""
    website: str = ""
    rating: str = ""
    reviews_count: str = ""


@dataclass
class EnrichedLead:
    business_name: str
    category: str = ""
    address: str = ""
    phone: str = ""
    website: str = ""
    email: str = ""
    rating: str = ""
    reviews_count: str = ""
    lead_score: int = 50
    problems_identified: str = ""
    sales_pitch: str = ""
    source_query: str = ""


def _clean_phone(raw: str) -> str:
    """Format and normalize Indian phone numbers to E.164 standard."""
    if not raw:
        return ""
    cleaned = re.sub(r"[^\d+]", "", raw)
    if cleaned.startswith("0"):
        cleaned = "+91" + cleaned[1:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = "+" + cleaned
    elif len(cleaned) == 10:
        cleaned = "+91" + cleaned
    return cleaned


async def scrape_google_maps(query: str, max_results: int = 15) -> list[RawBusiness]:
    """Scrape Google Maps search results for the target location/category."""
    results: list[RawBusiness] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        maps_url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
        logger.info(f"Navigating to: {maps_url}")
        try:
            await page.goto(maps_url, wait_until="domcontentloaded", timeout=30000)
            await page.wait_for_timeout(2500)
        except Exception as e:
            logger.error(f"Navigation failed for query '{query}': {e}")
            await browser.close()
            return results

        # Find feed panel
        panel_selector = '[role="feed"]'
        try:
            panel = await page.wait_for_selector(panel_selector, timeout=10000)
        except Exception:
            logger.warning("Could not locate results feed panel. Continuing with visible items.")
            panel = None

        if panel:
            # Scroll to load listings
            scroll_passes = min(6, (max_results // 3) + 1)
            for _ in range(scroll_passes):
                try:
                    await panel.evaluate("el => el.scrollBy(0, 900)")
                    await page.wait_for_timeout(700)
                except Exception:
                    break

        cards = await page.query_selector_all('a[href*="/maps/place/"]')
        logger.info(f"Discovered {len(cards)} listing links on Google Maps.")

        seen_hrefs: set[str] = set()
        for card in cards:
            if len(results) >= max_results:
                break
            try:
                href = await card.get_attribute("href") or ""
                if not href or href in seen_hrefs:
                    continue
                seen_hrefs.add(href)

                await card.click()
                await page.wait_for_timeout(1500)

                # Extract business profile details
                name = (
                    await _get_text(page, 'h1[class*="DUwDvf"]')
                    or await _get_text(page, 'h1[class*="fontHeadlineLarge"]')
                    or "Local Business"
                )
                category = (
                    await _get_text(page, 'button[jsaction*="category"]')
                    or await _get_text(page, 'button[class*="DkEaL"]')
                    or "Business"
                )
                address = (
                    await _get_text(page, '[data-item-id="address"]')
                    or await _get_text(page, 'button[data-item-id="address"]')
                    or ""
                )
                phone_raw = (
                    await _get_text(page, '[data-item-id*="phone"]')
                    or await _get_text(page, 'button[data-item-id*="phone"]')
                    or ""
                )
                phone = _clean_phone(phone_raw)

                website = (
                    await _get_attribute(page, '[data-item-id="authority"]', "href")
                    or await _get_attribute(page, 'a[aria-label*="website"]', "href")
                    or ""
                )

                rating = (
                    await _get_text(page, 'span[class*="ceNzKf"]')
                    or await _get_text(page, 'div[class*="F7nice"] span[aria-hidden="true"]')
                    or ""
                )

                reviews_count = (
                    await _get_text(page, 'span[aria-label*="reviews"]')
                    or await _get_text(page, 'button[class*="HHrUdb"]')
                    or ""
                )

                if name and name != "Local Business":
                    results.append(
                        RawBusiness(
                            name=name,
                            category=category,
                            address=address,
                            phone=phone,
                            website=website,
                            rating=rating,
                            reviews_count=reviews_count,
                        )
                    )
                    logger.info(f"Scraped lead: {name} | Phone: {phone} | Site: {bool(website)}")
            except Exception as e:
                logger.debug(f"Error inspecting business card: {e}")
                continue

        await browser.close()

    return results


async def _get_text(page, selector: str) -> Optional[str]:
    try:
        el = await page.query_selector(selector)
        if el:
            txt = (await el.inner_text()).strip()
            return txt if txt else None
    except Exception:
        pass
    return None


async def _get_attribute(page, selector: str, attr: str) -> Optional[str]:
    try:
        el = await page.query_selector(selector)
        if el:
            return await el.get_attribute(attr)
    except Exception:
        pass
    return None


def _calculate_rule_based_score(biz: RawBusiness) -> int:
    """Smart algorithmic lead score based on digital readiness gaps."""
    score = 60
    if not biz.website:
        score += 25  # High priority: no website means high need for Web development
    else:
        score += 5  # Has website: might need mobile app or modern overhaul

    if biz.phone:
        score += 10  # Can be contacted directly on WhatsApp

    if biz.rating:
        try:
            val = float(biz.rating.split()[0])
            if val < 4.2:
                score += 5  # Negative review turnaround / custom feedback app needed
        except Exception:
            pass

    return min(98, max(40, score))


async def ai_analyze_business(biz: RawBusiness, source_query: str) -> EnrichedLead:
    """
    Leverages Gemini AI to generate:
    1. Specific digital problems
    2. A calibrated Lead Score (1-100)
    3. A conversion-focused WhatsApp sales pitch for 'Shri Apps and Web'
    """
    # Default fallback content
    rule_score = _calculate_rule_based_score(biz)
    has_website = bool(biz.website)
    category_label = biz.category or "business"

    default_problems = (
        f"• No dedicated mobile-first digital presence to capture high-intent Gurugram customers\n"
        f"• Missing direct booking / order management system, leaking leads to aggregators\n"
        f"• Lack of automated WhatsApp customer engagement and re-ordering workflow"
        if not has_website
        else f"• Website lacks seamless mobile conversion and instant WhatsApp booking\n"
             f"• High commission reliance instead of direct customer ownership\n"
             f"• Opportunity to launch branded loyalty and push notification mobile app"
    )

    default_pitch = (
        f"Hello! I noticed {biz.name} in Gurugram and love what you're doing. "
        f"At Shri Apps and Web, we help premier {category_label} businesses launch custom mobile apps "
        f"and high-converting websites that drive direct bookings and save huge platform commissions. "
        f"Could I share a 2-minute prototype we built for your business? 🚀"
    )

    lead_score = rule_score
    problems = default_problems
    pitch = default_pitch

    if _gemini_available:
        prompt = f"""You are an elite B2B sales development strategist for '{settings.COMPANY_NAME}', an agency in Gurugram specializing in custom mobile apps, web applications, and digital ordering/booking platforms.

Analyze this local Gurugram business:
- Name: {biz.name}
- Category: {biz.category}
- Address: {biz.address}
- Website: {biz.website or "None (No website found)"}
- Rating: {biz.rating or "N/A"}

Provide your response in EXACTLY this format:

SCORE: <An integer between 1 and 100 representing how urgently they need app/web development. Rate 85-98 if no website or outdated presence. Rate 70-84 if they have a website but need a mobile app/ordering system.>

PROBLEMS:
<2-3 concise bullet points identifying their digital blindspots, lost revenue, and tech bottlenecks>

PITCH:
<A friendly, punchy, WhatsApp-ready message under 120 words. Greet them warmly, mention their business name '{biz.name}', introduce '{settings.COMPANY_NAME}', address their exact problem, and propose a quick demo or prototype.>
"""
        try:
            response = await asyncio.to_thread(_gemini_model.generate_content, prompt)
            text = response.text.strip()

            if "SCORE:" in text and "PROBLEMS:" in text and "PITCH:" in text:
                score_part = text.split("SCORE:")[1].split("PROBLEMS:")[0].strip()
                probs_part = text.split("PROBLEMS:")[1].split("PITCH:")[0].strip()
                pitch_part = text.split("PITCH:")[1].strip()

                # Parse score safely
                nums = re.findall(r"\d+", score_part)
                if nums:
                    lead_score = max(35, min(99, int(nums[0])))
                problems = probs_part
                pitch = pitch_part
        except Exception as e:
            logger.warning(f"Gemini API enrichment error for '{biz.name}': {e}. Using intelligent fallback.")

    return EnrichedLead(
        business_name=biz.name,
        category=biz.category,
        address=biz.address,
        phone=biz.phone,
        website=biz.website,
        email="",
        rating=biz.rating,
        reviews_count=biz.reviews_count,
        lead_score=lead_score,
        problems_identified=problems,
        sales_pitch=pitch,
        source_query=source_query,
    )


async def run_scrape_pipeline(
    query: str, max_results: int = 15
) -> list[EnrichedLead]:
    """Execute complete workflow: Web scraping -> AI analysis & scoring."""
    raw_businesses = await scrape_google_maps(query, max_results)
    logger.info(f"Starting AI enrichment for {len(raw_businesses)} businesses...")

    leads: list[EnrichedLead] = []
    # Process in batches of 4 to respect API quotas
    batch_size = 4
    for i in range(0, len(raw_businesses), batch_size):
        batch = raw_businesses[i : i + batch_size]
        enriched = await asyncio.gather(
            *[ai_analyze_business(b, query) for b in batch]
        )
        leads.extend(enriched)
        if i + batch_size < len(raw_businesses):
            await asyncio.sleep(0.5)

    return leads
