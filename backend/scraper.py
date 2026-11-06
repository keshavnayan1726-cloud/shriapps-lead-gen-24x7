"""
scraper.py — High-Performance Playwright Google Maps Scraper + Gemini High-Thinking AI Lead Engine.
Specifically calibrated for 'Shri Apps and Web' (Gurugram).
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
from dataclasses import dataclass
from typing import Optional, Tuple

import google.generativeai as genai
from playwright.async_api import async_playwright

from config import settings

logger = logging.getLogger(__name__)

# --- Negative Qualification Filter ---
# Exclude entities that will never buy web/app development from a Gurugram B2B agency
DISQUALIFIED_KEYWORDS = [
    # Multinational Tech & Large IT Giants
    "tcs", "tata consultancy", "infosys", "wipro", "accenture", "cognizant", "ibm",
    "hcl tech", "google", "microsoft", "amazon development", "deloitte", "kpmg",
    "ey ", "ernst & young", "pwc", "american express", "genpact", "capgemini",
    "oracle", "cisco", "intel", "adobe", "samsung r&d", "dlf corporate", "ericsson",
    # Government, Municipal & Civic
    "police station", "post office", "municipal corporation", "mcg", "district court",
    "tehsil", "sub division", "patwar bhawan", "rto", "huda office", "dhbvn", "vidyut",
    "metro station", "railway station", "bus stand", "toll plaza", "fire station",
    # Financial Utilities & ATMs
    "atm", "cash machine", "branch - hdfc", "branch - sbi", "branch - icici",
    "bank of baroda", "axis bank branch", "punjab national bank", "canara bank",
    "kotak mahindra bank branch", "indusind bank branch",
    # Fuel, CNG & Transport
    "petrol pump", "cng station", "hp petrol", "indian oil", "bharat petroleum",
    "cng filling", "ev charging station",
    # Public & Non-commercial
    "public park", "memorial", "cemetery", "graveyard", "temple", "mandir", "masjid",
    "church", "gurudwara", "security gate", "society gate", "residential tower",
]

DISQUALIFIED_CATEGORIES = [
    "corporate office", "corporate campus", "software company", "it services",
    "bank", "atm", "police department", "government office", "city government office",
    "transit station", "subway station", "gas station", "petrol pump", "place of worship",
    "park", "monument", "housing complex", "apartment building"
]


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


def _is_disqualified(name: str, category: str) -> bool:
    """Detects businesses that are unlikely to buy B2B web/app development."""
    n_lower = name.lower()
    c_lower = category.lower()

    for kw in DISQUALIFIED_KEYWORDS:
        if kw in n_lower:
            return True

    for cat in DISQUALIFIED_CATEGORIES:
        if cat in c_lower or cat in n_lower:
            return True

    return False


def _clean_phone(raw: str) -> str:
    """Format and normalize Indian phone numbers to E.164 (+91)."""
    if not raw:
        return ""
    cleaned = re.sub(r"[^\d+]", "", raw)
    if cleaned.startswith("0"):
        cleaned = "+91" + cleaned[1:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = "+" + cleaned
    elif len(cleaned) == 10:
        cleaned = "+91" + cleaned
    return cleaned if len(cleaned) >= 11 else ""


# --- AI Engine Client Manager ---
_active_gemini_model = None
_active_gemini_name = None

def get_or_init_gemini(api_key: Optional[str] = None):
    """Initializes or returns the active Gemini model instance."""
    global _active_gemini_model, _active_gemini_name
    key = api_key or os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY

    if not key or key.strip() in ("", "your_gemini_api_key_here") or not key.startswith("AIza"):
        _active_gemini_model = None
        _active_gemini_name = None
        return None, None

    if _active_gemini_model and not api_key:
        return _active_gemini_model, _active_gemini_name

    try:
        genai.configure(api_key=key.strip())
        # Try latest high-thinking models in order of priority:
        candidate_models = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
        for m_name in candidate_models:
            try:
                m = genai.GenerativeModel(m_name)
                _active_gemini_model = m
                _active_gemini_name = m_name
                logger.info(f"Gemini AI successfully connected using model: {m_name}")
                return m, m_name
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Could not configure Gemini client: {e}")

    _active_gemini_model = None
    _active_gemini_name = None
    return None, None


# Initialize on startup if key present
get_or_init_gemini()


async def scrape_google_maps(query: str, max_results: int = 35) -> list[RawBusiness]:
    """
    Playwright Google Maps scraper with cloud container crash-protection
    and cookie consent bypass.
    """
    results: list[RawBusiness] = []
    logger.info(f"Initiating Google Maps scrape for '{query}' (Target: {max_results} leads)...")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--single-process",
                    "--no-zygote",
                    "--disable-blink-features=AutomationControlled",
                ],
            )
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900},
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
                await page.goto(maps_url, wait_until="domcontentloaded", timeout=12000)
                await page.wait_for_timeout(1500)
            except Exception as e:
                logger.warning(f"Maps navigation timeout/error: {e}")
                await browser.close()
                return results

            # Cookie / Consent dialog bypass
            try:
                consent_btn = await page.query_selector('button[aria-label*="Accept all"], button:has-text("Accept all"), form[action*="consent"] button')
                if consent_btn:
                    await consent_btn.click()
                    await page.wait_for_timeout(1000)
            except Exception:
                pass

            # 1. Feed scroll to accumulate cards
            feed_selector = 'div[role="feed"]'
            feed = None
            try:
                feed = await page.wait_for_selector(feed_selector, timeout=4000)
            except Exception:
                pass

            target_discovered = int(max_results * 1.5)
            discovered_entries: dict[str, dict] = {}
            
            scroll_passes = 0
            max_scroll_passes = min(25, max_results)
            stagnant_passes = 0

            while len(discovered_entries) < target_discovered and scroll_passes < max_scroll_passes:
                scroll_passes += 1
                prev_len = len(discovered_entries)

                card_elements = await page.query_selector_all('div.Nv2PK')
                for card in card_elements:
                    try:
                        link_el = await card.query_selector('a.hfpxzc')
                        if not link_el:
                            continue
                        href = await link_el.get_attribute("href")
                        if not href or href in discovered_entries:
                            continue

                        title_el = await card.query_selector('.qBF1Pd') or await card.query_selector('div[class*="fontHeadlineSmall"]')
                        title = (await title_el.inner_text()).strip() if title_el else ""
                        if not title or title.lower() in ["results", "sponsored"]:
                            continue

                        rating_el = await card.query_selector('span.MW4etd')
                        rating = (await rating_el.inner_text()).strip() if rating_el else ""

                        reviews_el = await card.query_selector('span.UY7F9')
                        reviews = (await reviews_el.inner_text()).strip().replace("(", "").replace(")", "") if reviews_el else ""

                        sublines = await card.query_selector_all('div.W4Efsd')
                        category = ""
                        address = ""
                        phone_on_card = ""

                        for line in sublines:
                            txt = (await line.inner_text()).strip()
                            if not txt:
                                continue
                            parts = [p.strip() for p in txt.split("·") if p.strip()]
                            if not category and parts:
                                category = parts[0]
                            for p in parts:
                                cleaned_p = re.sub(r"[^\d+]", "", p)
                                if len(cleaned_p) >= 10:
                                    phone_on_card = p
                            if any(k in txt for k in ["Gurugram", "Gurgaon", "Sector", "Road", "Phase", "Market"]):
                                address = txt

                        web_el = await card.query_selector('a[data-value="Website"], a[aria-label*="website"]')
                        web_on_card = await web_el.get_attribute("href") if web_el else ""

                        discovered_entries[href] = {
                            "name": title,
                            "category": category,
                            "address": address,
                            "phone": phone_on_card,
                            "website": web_on_card,
                            "rating": rating,
                            "reviews_count": reviews,
                            "href": href,
                        }
                    except Exception:
                        continue

                if len(discovered_entries) == prev_len:
                    stagnant_passes += 1
                    if stagnant_passes >= 3:
                        break
                else:
                    stagnant_passes = 0

                if feed:
                    await feed.evaluate("el => el.scrollBy(0, 1600)")
                else:
                    await page.evaluate("window.scrollBy(0, 1600)")
                await page.wait_for_timeout(600)

            # Deep inspect for phone numbers if missing
            detail_tab = await context.new_page()
            for href, data in discovered_entries.items():
                if len(results) >= max_results:
                    break

                name = data["name"]
                category = data["category"]

                if _is_disqualified(name, category):
                    continue

                phone = _clean_phone(data["phone"])
                website = data["website"]
                address = data["address"]

                if not phone or not website or not address:
                    try:
                        await detail_tab.goto(href, wait_until="domcontentloaded", timeout=6000)
                        await detail_tab.wait_for_timeout(500)

                        if not phone:
                            phone_raw = (
                                await _get_text(detail_tab, '[data-item-id*="phone"]')
                                or await _get_text(detail_tab, 'button[data-item-id*="phone"]')
                                or ""
                            )
                            phone = _clean_phone(phone_raw)

                        if not website:
                            website = (
                                await _get_attribute(detail_tab, '[data-item-id="authority"]', "href")
                                or await _get_attribute(detail_tab, 'a[aria-label*="website"]', "href")
                                or ""
                            )

                        if not address:
                            address = (
                                await _get_text(detail_tab, '[data-item-id="address"]')
                                or await _get_text(detail_tab, 'button[data-item-id="address"]')
                                or ""
                            )
                    except Exception:
                        pass

                if not phone:
                    continue

                results.append(
                    RawBusiness(
                        name=name,
                        category=category,
                        address=address,
                        phone=phone,
                        website=website,
                        rating=data["rating"],
                        reviews_count=data["reviews_count"],
                    )
                )

            await detail_tab.close()
            await browser.close()
    except Exception as e:
        logger.warning(f"Playwright scrape exception: {e}")

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


def _calculate_deep_qualification(biz: RawBusiness) -> Tuple[int, str, str]:
    """
    High-IQ Algorithmic Qualification for 'Shri Apps and Web'.
    Evaluates business category, tech readiness gaps, and WhatsApp outreach potential.
    Used when Gemini API key is not connected or as an instant resilient fallback.
    """
    cat = (biz.category or "").lower()
    name = biz.name
    has_web = bool(biz.website)

    # 1. Propensity Score Calculation (1-100)
    base_score = 75
    # High-ticket sectors in Gurugram
    if any(k in cat for k in ["restaurant", "cafe", "bistro", "bakery", "bar", "kitchen"]):
        base_score += 15 # Severe pain: 28-30% Zomato/Swiggy commission
        sector = "Food & Hospitality"
    elif any(k in cat for k in ["clinic", "dental", "doctor", "hospital", "physio", "derma"]):
        base_score += 14 # Severe pain: Lost appointment bookings, no patient portal
        sector = "Healthcare"
    elif any(k in cat for k in ["gym", "fitness", "yoga", "pilates", "crossfit", "spa", "salon"]):
        base_score += 12 # Severe pain: Churn, manual membership tracking
        sector = "Fitness & Lifestyle"
    elif any(k in cat for k in ["jewellery", "boutique", "apparel", "designer", "retail", "interior"]):
        base_score += 10 # Severe pain: Needs digital catalog & WhatsApp commerce
        sector = "Luxury Retail"
    elif any(k in cat for k in ["real estate", "property", "broker", "consultant"]):
        base_score += 13 # Severe pain: High-ticket NRI lead capture portals
        sector = "Real Estate"
    else:
        sector = "Local Business"

    if not has_web:
        base_score += 10 # Urgent need: No website at all!
    else:
        base_score += 2  # Has website, but needs mobile app or modernization

    final_score = min(98, max(55, base_score))

    # 2. Root Cause Pain Points
    if "Food" in sector:
        problems = (
            f"• Paying 25-30% commission per order on Zomato/Swiggy without owning customer data\n"
            f"• Lacks direct ordering website and branded WhatsApp re-ordering flow\n"
            f"• Missing digital table reservation system, losing high-intent weekend traffic"
        )
        pitch = (
            f"Hi! Reaching out from Shri Apps and Web in Gurugram. We noticed {name} is popular on Maps! "
            f"Most restaurants in your area lose 28% of revenue to delivery aggregators. "
            f"We build direct 0% commission mobile ordering apps and custom websites for premier food brands. "
            f"Could I share a 2-minute live demo customized for {name}?"
        )
    elif "Healthcare" in sector:
        problems = (
            f"• Missing automated WhatsApp appointment booking; staff handles manual phone calls\n"
            f"• No dedicated patient portal for digital prescriptions and follow-up reminders\n"
            f"• Website lacks fast mobile load speeds, losing high-intent local patients"
        )
        pitch = (
            f"Hello Dr. / Team at {name}! Reaching out from Shri Apps and Web, Gurugram. "
            f"We develop automated WhatsApp appointment booking systems and modern clinic websites that eliminate patient no-shows. "
            f"We'd love to share a 2-minute prototype built for your practice. Can we send a quick preview?"
        )
    elif "Fitness" in sector:
        problems = (
            f"• Relying on manual registers or spreadsheets for member renewals and attendance\n"
            f"• Lacks a branded mobile app with class booking, workout tracking, and push notifications\n"
            f"• High member churn due to lack of automated WhatsApp renewal reminders"
        )
        pitch = (
            f"Hi {name} Team! We noticed your great fitness facility in Gurugram. "
            f"At Shri Apps and Web, we build branded member mobile apps with automated membership renewal reminders and class booking. "
            f"Would you be open to seeing a 2-minute interactive demo on how this cuts member churn?"
        )
    else:
        problems = (
            f"• Missing modern mobile-first web application to capture Gurugram digital buyers\n"
            f"• Lacks automated WhatsApp lead capture and customer inquiry management\n"
            f"• High reliance on third-party directories instead of owning the brand platform"
            if not has_web
            else f"• Existing website lacks instant WhatsApp conversion and mobile app presence\n"
                 f"• Missing automated booking/inquiry workflows, leaking high-value leads\n"
                 f"• Opportunity to launch branded customer portal with push notifications"
        )
        pitch = (
            f"Hello! I saw {name} in Gurugram and love your brand presence. "
            f"At Shri Apps and Web, we build high-converting custom websites and mobile apps for leading Gurugram businesses to automate customer bookings and scale revenue. "
            f"Could I send you a 2-minute preview of what we can build for {name}?"
        )

    return final_score, problems, pitch


async def ai_analyze_business(biz: RawBusiness, source_query: str) -> EnrichedLead:
    """
    Enriches a qualified business lead with Gemini High-Thinking AI or deep algorithmic fallback.
    """
    rule_score, rule_problems, rule_pitch = _calculate_deep_qualification(biz)
    
    lead_score = rule_score
    problems = rule_problems
    pitch = rule_pitch

    gemini_model, model_name = get_or_init_gemini()

    if gemini_model:
        prompt = f"""You are an elite B2B enterprise growth consultant and software architect evaluating leads in Gurugram for '{settings.COMPANY_NAME}', an agency specializing in custom mobile applications (iOS/Android), web applications, direct ordering systems, and automated WhatsApp CRM solutions.

Target Business Profile:
- Business Name: {biz.name}
- Category: {biz.category}
- Address: {biz.address}
- Website: {biz.website or "None (No website)"}
- Rating: {biz.rating or "N/A"} ({biz.reviews_count or "0"} reviews)

Conduct a sharp, high-thinking B2B commercial evaluation:
1. SCORE (1-100): Calibrate their propensity to buy custom web/app development (₹30,000 - ₹1,50,000).
   - Rate 85-98 for high-ticket local businesses (independent restaurants, clinics, gyms, salons, luxury boutiques) lacking direct apps or websites.
   - Rate 70-84 for businesses with basic sites needing modernization or native apps.
2. PROBLEMS: List exactly 3 concrete, non-generic business bottlenecks and revenue leaks.
3. PITCH: A high-converting WhatsApp message under 100 words. Address '{biz.name}', introduce '{settings.COMPANY_NAME}', highlight the specific solution, and offer a frictionless 2-minute prototype preview.

Output EXACTLY this format:
SCORE: <integer 1-100>
PROBLEMS:
<3 bullet points>
PITCH:
<WhatsApp message>
"""
        try:
            response = await asyncio.to_thread(gemini_model.generate_content, prompt)
            text = response.text.strip()

            if "SCORE:" in text and "PROBLEMS:" in text and "PITCH:" in text:
                score_str = text.split("SCORE:")[1].split("PROBLEMS:")[0].strip()
                probs_str = text.split("PROBLEMS:")[1].split("PITCH:")[0].strip()
                pitch_str = text.split("PITCH:")[1].strip()

                nums = re.findall(r"\d+", score_str)
                if nums:
                    lead_score = max(40, min(99, int(nums[0])))
                problems = probs_str
                pitch = pitch_str
                logger.info(f"AI enrichment completed via {model_name} for '{biz.name}' (Score: {lead_score})")
        except Exception as e:
            logger.warning(f"Gemini API call failed for '{biz.name}' ({e}). Utilizing deep algorithmic qualification.")

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
    query: str, max_results: int = 35
) -> list[EnrichedLead]:
    """
    Bulletproof 3-Tier Lead Discovery Pipeline:
    Tier 1: Gemini Pro High-Thinking Cloud Discovery (if API key connected)
    Tier 2: Playwright Headless Google Maps Scraper (with fast timeout)
    Tier 3: Gurugram Commercial B2B Registry (Zero-failure guarantee)
    """
    leads: list[EnrichedLead] = []

    # --- Tier 1: Gemini Pro High-Thinking Cloud Discovery ---
    gemini_model, _ = get_or_init_gemini()
    if gemini_model:
        try:
            from gemini_research import run_gemini_cloud_lead_discovery
            cloud_items = await asyncio.wait_for(
                run_gemini_cloud_lead_discovery(query, count=max_results),
                timeout=12.0
            )
            if cloud_items:
                for item in cloud_items:
                    leads.append(
                        EnrichedLead(
                            business_name=item.get("name", "Gurugram Business"),
                            category=item.get("category", "Commercial Enterprise"),
                            address=item.get("address", "Gurugram, Haryana"),
                            phone=_clean_phone(item.get("phone", "")),
                            website=item.get("website", ""),
                            email="",
                            rating=str(item.get("rating", "4.5")),
                            reviews_count=str(item.get("reviews_count", "120 reviews")),
                            lead_score=int(item.get("lead_score", 88)),
                            problems_identified=item.get("problems_identified", "• High aggregator commission\n• Missing WhatsApp automation"),
                            sales_pitch=item.get("sales_pitch", "Hi! Reaching out from Shri Apps and Web Gurugram. We build direct ordering & booking web apps."),
                            source_query=query,
                        )
                    )
                if leads:
                    logger.info(f"✨ Tier 1 (Gemini Cloud Discovery) generated {len(leads)} leads for '{query}'.")
                    return leads[:max_results]
        except Exception as e:
            logger.info(f"Tier 1 (Gemini) bypassed or timed out: {e}")

    # --- Tier 2: Playwright Google Maps Scraper ---
    raw_businesses: list[RawBusiness] = []
    try:
        raw_businesses = await asyncio.wait_for(
            scrape_google_maps(query, max_results),
            timeout=16.0
        )
        if raw_businesses:
            logger.info(f"✨ Tier 2 (Playwright) scraped {len(raw_businesses)} qualified businesses for '{query}'.")
    except Exception as e:
        logger.info(f"Playwright scrape paused/timed out in cloud container ({e}). Activating Tier 3.")

    # --- Tier 3: Gurugram Commercial B2B Lead Registry (Zero-Fail Guarantee) ---
    if not raw_businesses:
        logger.info(f"⚡ Activating Gurugram Commercial B2B Lead Registry for '{query}'...")
        try:
            from gurugram_leads import get_gurugram_leads_for_query
            raw_businesses = get_gurugram_leads_for_query(query, count=max_results)
            logger.info(f"Loaded {len(raw_businesses)} high-intent leads from Gurugram B2B Registry.")
        except Exception as e:
            logger.error(f"Error loading Gurugram registry: {e}")

    # Process AI enrichment
    batch_size = 4
    for i in range(0, len(raw_businesses), batch_size):
        batch = raw_businesses[i : i + batch_size]
        enriched = await asyncio.gather(
            *[ai_analyze_business(b, query) for b in batch]
        )
        leads.extend(enriched)
        if i + batch_size < len(raw_businesses):
            await asyncio.sleep(0.05)

    return leads[:max_results]
