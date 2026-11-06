"""
gemini_research.py — Gemini Pro High-Thinking Research, Digital Agency Audit,
Proposal Generation, and Multi-Touch WhatsApp Outreach Engine for 'Shri Apps and Web'.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

import google.generativeai as genai

from config import settings

logger = logging.getLogger(__name__)

# Active Gemini Pro Client Cache
_gemini_client: Optional[genai.GenerativeModel] = None
_active_model_name: str = "gemini-1.5-pro"


def get_research_model(api_key: Optional[str] = None, preferred_model: Optional[str] = None) -> Tuple[Optional[genai.GenerativeModel], str]:
    """Initializes or returns a cached Gemini model with Pro thinking capabilities."""
    global _gemini_client, _active_model_name
    key = api_key or os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not key or key.strip() in ("", "your_gemini_api_key_here") or not key.startswith("AIza"):
        return None, "none"

    if preferred_model:
        model_candidate = preferred_model
    else:
        model_candidate = "gemini-1.5-pro"

    try:
        genai.configure(api_key=key)
        # Attempt candidate models in order of reasoning depth
        candidates = [model_candidate, "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
        for cand in candidates:
            try:
                model = genai.GenerativeModel(cand)
                _gemini_client = model
                _active_model_name = cand
                return model, cand
            except Exception:
                continue
    except Exception as e:
        logger.error(f"Failed to configure Gemini Pro client: {e}")
    return None, "none"


# ─────────────────────────────────────────────────────────────────────────────
# 1. 🔬 DEEP AGENCY AUDIT & REVENUE LEAK INSPECTOR
# ─────────────────────────────────────────────────────────────────────────────

async def run_gemini_pro_audit(lead_data: dict, api_key: Optional[str] = None) -> dict:
    """
    Executes a high-depth digital agency audit on a business for Shri Apps and Web.
    Analyzes online footprint, calculates aggregator commission leakage,
    identifies tech vulnerabilities, and crafts a winning value proposition.
    """
    biz_name = lead_data.get("business_name", "Business")
    category = lead_data.get("category", "Commercial Business")
    address = lead_data.get("address", "Gurugram, Haryana")
    phone = lead_data.get("phone", "")
    website = lead_data.get("website", "")
    rating = lead_data.get("rating", "4.0")
    reviews = lead_data.get("reviews_count", "20")

    model, model_name = get_research_model(api_key)

    if model:
        prompt = f"""
You are the Chief Strategy Officer and Technical Architect at 'Shri Apps and Web', a premier digital agency in Gurugram, India specializing in:
1. Custom Mobile & Web Applications (PWAs, iOS, Android)
2. Automated WhatsApp Business Booking & Ordering Bots
3. Direct Ordering Engines to bypass 28-30% Zomato/Swiggy commissions
4. Google Maps & Local SEO Domination

Conduct an in-depth, rigorous B2B digital audit for this Gurugram business:
- Business Name: {biz_name}
- Category: {category}
- Address: {address}
- Current Website: {website if website else 'NO WEBSITE (Critical Vulnerability)'}
- Rating: {rating} ({reviews} reviews)

Output strict JSON with these EXACT keys:
{{
  "digital_maturity_score": <int 1-100 reflecting how digitized they currently are>,
  "estimated_monthly_loss_inr": "<e.g. ₹60,000 - ₹95,000 / month lost in third-party commissions or missed leads>",
  "tech_vulnerabilities": [
    "<Vulnerability 1: specific to their industry>",
    "<Vulnerability 2: mobile/booking gap>",
    "<Vulnerability 3: SEO or retention gap>"
  ],
  "recommended_services": [
    "<Service 1 for Shri Apps and Web to deliver>",
    "<Service 2 for Shri Apps and Web to deliver>",
    "<Service 3 for Shri Apps and Web to deliver>"
  ],
  "executive_summary": "<2 to 3 sentences diagnosing why they are leaving money on the table in Gurugram>",
  "irresistible_pitch": "<A compelling, direct, non-spammy cold message hook addressing the owner directly>",
  "suggested_deal_value_inr": <int e.g. 35000 to 75000 based on scale>
}}
Only return valid JSON. Do not wrap in markdown code blocks if possible.
"""
        try:
            res = await asyncio.to_thread(model.generate_content, prompt)
            raw_text = res.text.strip()
            # Clean markdown code block wraps if present
            cleaned_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
            cleaned_text = re.sub(r"\s*```$", "", cleaned_text, flags=re.MULTILINE).strip()
            data = json.loads(cleaned_text)

            audit_md = _format_audit_markdown(biz_name, category, data, model_name)
            data["audit_markdown"] = audit_md
            data["lead_id"] = lead_data.get("id", 0)
            data["business_name"] = biz_name
            return data
        except Exception as e:
            logger.warning(f"Gemini Pro audit API error, falling back to deterministic engine: {e}")

    # High-precision deterministic fallback
    return _deterministic_audit(lead_data)


def _format_audit_markdown(biz_name: str, category: str, data: dict, model: str) -> str:
    vulnerabilities = "\n".join(f"- ⚠️ **{v}**" for v in data.get("tech_vulnerabilities", []))
    services = "\n".join(f"- 🚀 **{s}**" for s in data.get("recommended_services", []))
    return f"""### 🔬 Digital Audit: {biz_name}
*Generated by Shri Apps and Web Research Brain ({model})*

**Digital Maturity Score**: **{data.get('digital_maturity_score', 45)}/100**
**Estimated Monthly Revenue Leak**: <span style="color:#ef4444;font-weight:700;">{data.get('estimated_monthly_loss_inr', '₹50,000 - ₹80,000')}</span>

#### 🎯 Executive Diagnosis
{data.get('executive_summary', '')}

#### ⚠️ Critical Vulnerabilities Identified
{vulnerabilities}

#### 💡 Recommended Shri Apps and Web Solutions
{services}

#### 💬 Cold Pitch Hook
> "{data.get('irresistible_pitch', '')}"

**Target Deal Value**: **₹{data.get('suggested_deal_value_inr', 35000):,}**
"""


def _deterministic_audit(lead_data: dict) -> dict:
    biz_name = lead_data.get("business_name", "Business")
    category = lead_data.get("category", "").lower()
    has_website = bool(lead_data.get("website"))
    score = 42 if not has_website else 62

    if any(k in category for k in ["restaurant", "cafe", "food", "bakery", "kitchen", "bar", "dining"]):
        leak = "₹75,000 - ₹1,40,000 / month (Swiggy/Zomato 28% commissions)"
        vulns = [
            "Losing 28-30% of every delivery order to aggregator commissions",
            "Zero direct customer database or automated WhatsApp re-order system",
            "Missing branded progressive web app for dine-in QR ordering",
        ]
        services = [
            "Direct PWA Ordering Engine (0% commission)",
            "Automated WhatsApp Loyalty & Menu Re-engagement Bot",
            "Google Maps Local SEO Optimization for Gurugram dining searches",
        ]
        pitch = f"Hi {biz_name} team, noticed your great ratings in Gurugram! We build zero-commission direct ordering apps for local food brands so you keep the 28% you pay Zomato/Swiggy. Can I send a 30-sec demo?"
        deal_value = 35000
    elif any(k in category for k in ["clinic", "dental", "doctor", "health", "derma", "gym", "fitness"]):
        leak = "₹60,000 - ₹1,10,000 / month (unconfirmed appointments & slow inquiry handling)"
        vulns = [
            "Patients drop off when booking calls go unanswered during rush hours",
            "No 24/7 automated WhatsApp appointment booking calendar",
            "Missing member portal for follow-ups and treatment plans",
        ]
        services = [
            "24/7 Instant WhatsApp Booking & Reminder Bot",
            "Custom Patient/Member Web Application",
            "Automated Review Generator on Google Maps",
        ]
        pitch = f"Hi {biz_name} team! We help premier Gurugram clinics automate patient bookings and reminders over WhatsApp so no inquiry is missed. Would you be open to seeing a 60-second interactive preview?"
        deal_value = 45000
    else:
        leak = "₹50,000 - ₹90,000 / month (inbound lead drop-offs & missing mobile app)"
        vulns = [
            "Website lacks mobile-first PWA speed and instant WhatsApp action button",
            "Manual inquiry follow-ups causing 40% of warm leads to cool down",
            "Competitors in Gurugram outranking for local commercial searches",
        ]
        services = [
            "High-Converting PWA Web Application with Instant WhatsApp CTA",
            "Automated CRM Lead Routing & Notification Pipeline",
            "Local Search Optimization & Reputation Shield",
        ]
        pitch = f"Hello {biz_name} team! We develop high-speed web apps and WhatsApp automation engines for growing Gurugram businesses. Would love to share 2 quick ideas on boosting direct inquiries."
        deal_value = 30000

    summary = f"{biz_name} has strong local demand in Gurugram but currently loses significant margin and repeat customer lifetime value due to lack of direct digital infrastructure."

    data = {
        "lead_id": lead_data.get("id", 0),
        "business_name": biz_name,
        "digital_maturity_score": score,
        "estimated_monthly_loss_inr": leak,
        "tech_vulnerabilities": vulns,
        "recommended_services": services,
        "executive_summary": summary,
        "irresistible_pitch": pitch,
        "suggested_deal_value_inr": deal_value,
    }
    data["audit_markdown"] = _format_audit_markdown(biz_name, category, data, "Deterministic Pro Qualifier")
    return data


# ─────────────────────────────────────────────────────────────────────────────
# 2. 📑 B2B PROPOSAL & QUOTATION STUDIO
# ─────────────────────────────────────────────────────────────────────────────

async def generate_agency_proposal(lead_data: dict, api_key: Optional[str] = None) -> dict:
    """
    Generates a client proposal and scope of work for Shri Apps and Web.
    Includes technical deliverables, 3-tier pricing packages (₹ INR), and implementation timeline.
    """
    biz_name = lead_data.get("business_name", "Valued Client")
    category = lead_data.get("category", "Commercial Enterprise")
    address = lead_data.get("address", "Gurugram, Haryana")

    model, model_name = get_research_model(api_key)

    if model:
        prompt = f"""
You are the Principal Solutions Architect at 'Shri Apps and Web' (Gurugram).
Draft a comprehensive, high-converting B2B Digital Transformation Proposal & Quotation for:
- Client: {biz_name}
- Industry: {category}
- Location: {address}

Structure the proposal in clean GitHub Markdown:
1. # Proposal: Digital Transformation for {biz_name}
   *Prepared by Shri Apps and Web — Gurugram*
2. ## 1. Executive Summary & Growth Opportunity
3. ## 2. Scope of Work & Technical Deliverables
   - Custom Mobile/Web Application (PWA + High-Speed Architecture)
   - WhatsApp Automation Bot (24/7 Inquiries, Bookings, Orders)
   - Admin CRM & Real-Time Analytics Dashboard
   - Payment Gateway (Razorpay/UPI integration) & Cloud Hosting
4. ## 3. Investment Packages (INR ₹)
   - Table with 3 tiers:
     * Starter (₹18,000)
     * Growth Accelerator (₹38,000) [Recommended]
     * Enterprise Dominance (₹75,000)
   Include deliverables for each tier.
5. ## 4. Timeline & Milestones (2-3 Weeks Roadmap)
6. ## 5. Terms, Payment Schedule (50% Advance / 50% on Handover), & Next Steps

Keep tone highly professional, consultative, and value-oriented.
"""
        try:
            res = await asyncio.to_thread(model.generate_content, prompt)
            markdown_content = res.text.strip()
            return {
                "lead_id": lead_data.get("id", 0),
                "business_name": biz_name,
                "proposal_markdown": markdown_content,
                "suggested_deal_value_inr": 38000,
                "packages": {
                    "starter": {"name": "Starter", "price_inr": 18000, "days": 10},
                    "growth": {"name": "Growth Accelerator", "price_inr": 38000, "days": 18},
                    "enterprise": {"name": "Enterprise Dominance", "price_inr": 75000, "days": 28},
                },
            }
        except Exception as e:
            logger.warning(f"Gemini Pro proposal error, using template: {e}")

    # Fallback professional proposal template
    markdown_content = f"""# 📑 Proposal: Digital Growth & Automation System
### Prepared for: **{biz_name}**
**Agency**: **Shri Apps and Web** (Gurugram, Haryana)  
**Date**: November 2026 | **Ref**: SAW-{lead_data.get('id', 101):04d}

---

## 1. Executive Summary
{biz_name} holds a recognized presence in {category} in Gurugram. This project equips {biz_name} with an autonomous digital infrastructure that captures customer demand directly, cuts third-party commission overheads, and automates client communication over WhatsApp.

---

## 2. Technical Scope of Work
- **Modern Progressive Web App (PWA)**: Ultra-fast loading mobile application accessible without app store downloads.
- **WhatsApp Business Automation**: 24/7 intelligent automated responder for bookings, inquiries, and customer routing.
- **Direct Ordering & Booking Portal**: Zero commission transaction engine with integrated UPI/Razorpay payment gateway.
- **Management Console**: Real-time admin dashboard for orders, customer CRM data, and revenue metrics.
- **Local SEO & Google Maps Optimization**: Strategy to rank {biz_name} on the top 3 spots in Gurugram.

---

## 3. Investment Packages

| Deliverable | Starter (₹18,000) | Growth Accelerator ⭐ (₹38,000) | Enterprise Suite (₹75,000) |
|---|:---:|:---:|:---:|
| **Custom Mobile Web App** | ✅ 5 Pages | ✅ Full PWA App | ✅ PWA + Native Android App |
| **WhatsApp Automation** | Standard Bot | Custom Booking Bot | AI Intelligence Bot |
| **Payment Gateway & UPI** | ✅ | ✅ | ✅ Multi-Account |
| **Google Maps Top 3 Push** | Basic | Advanced Local SEO | Aggressive Rank 1 Strategy |
| **Admin Analytics Dashboard** | Basic | Complete CRM | Multi-Role Enterprise |
| **Turnaround Time** | 7 Days | 14 Days | 24 Days |

---

## 4. Delivery Roadmap
- **Week 1**: UI/UX Wireframes, Domain & Brand Architecture Setup
- **Week 2**: Development of PWA Frontend, Database & WhatsApp Bot Integration
- **Week 3**: User Acceptance Testing, Security Audit, UPI Gateway Live Handover

---

## 5. Commercial Terms
- **Milestone 1**: 50% mobilization advance upon signing.
- **Milestone 2**: 50% upon final staging approval and domain handover.
- **Support**: 60 days complimentary maintenance and bug-free warranty included.

**Shri Apps and Web** — *Building Digital Assets That Compound.*
"""
    return {
        "lead_id": lead_data.get("id", 0),
        "business_name": biz_name,
        "proposal_markdown": markdown_content,
        "suggested_deal_value_inr": 38000,
        "packages": {
            "starter": {"name": "Starter", "price_inr": 18000, "days": 7},
            "growth": {"name": "Growth Accelerator", "price_inr": 38000, "days": 14},
            "enterprise": {"name": "Enterprise Suite", "price_inr": 75000, "days": 24},
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. 💬 3-TOUCH MULTI-TOUCH WHATSAPP SEQUENCER
# ─────────────────────────────────────────────────────────────────────────────

def generate_outreach_sequence(lead_data: dict) -> dict:
    """
    Generates a psychological 3-touch WhatsApp sequence tailored to the business category.
    Each touch has an instant, clickable WhatsApp deep link.
    """
    biz_name = lead_data.get("business_name", "Business Owner")
    category = lead_data.get("category", "business").lower()
    raw_phone = lead_data.get("phone", "")
    phone = re.sub(r"[^\d+]", "", raw_phone)
    if not phone.startswith("+"):
        if phone.startswith("91") and len(phone) == 12:
            phone = f"+{phone}"
        elif len(phone) == 10:
            phone = f"+91{phone}"

    clean_digits = phone.replace("+", "")

    # Category-specific hooks
    if any(k in category for k in ["restaurant", "cafe", "food", "bakery", "kitchen"]):
        t1_msg = f"Hi {biz_name} team! I'm Keshav from Shri Apps and Web (Gurugram). Love your food & reviews! Quick question: are you currently looking to cut the 28% commission you pay Swiggy/Zomato on repeat orders with your own direct ordering web app?"
        t2_msg = f"Hey {biz_name} team, following up on my note. We recently built a direct ordering PWA for a Cyber Hub kitchen that saved them ₹42,000 in aggregator fees in month 1. Would you like to see how it works?"
        t3_msg = f"Hi {biz_name}, I put together a quick 30-sec demo prototype of a branded ordering app for {biz_name}. Can I drop the link here for you to check out?"
    elif any(k in category for k in ["clinic", "dental", "doctor", "health", "gym"]):
        t1_msg = f"Hello {biz_name} team! I'm Keshav from Shri Apps and Web here in Gurugram. We help clinics automate patient bookings and reminder notifications over WhatsApp so zero walk-ins are lost. Would you be open to a quick look?"
        t2_msg = f"Hi {biz_name}, following up! Most clinics in South City lose 15-20% of appointments due to missed calls during peak hours. Our WhatsApp bot responds in 2 seconds and books directly on your calendar. Happy to share a live sample."
        t3_msg = f"Hi {biz_name}, wanted to see if you had 5 mins this week for a quick chat? I can show you how other healthcare practices in Gurugram automated their front-desk over WhatsApp with us."
    else:
        t1_msg = f"Hi {biz_name} team! I'm Keshav from Shri Apps and Web (Gurugram). We build custom mobile-friendly web apps and automated WhatsApp engines to help local businesses turn Google searches into paying customers. Would love to connect!"
        t2_msg = f"Hey {biz_name}, following up on my previous message. We noticed your great ratings and had 2 quick ideas on boosting direct inquiries for your team. Would love to share them if you're open."
        t3_msg = f"Hi {biz_name}, wanted to check in one last time! If you ever need a custom mobile app, website upgrade, or WhatsApp automation, Shri Apps and Web is right here in Gurugram. Wishing you continuous growth!"

    touches = [
        {
            "touch": 1,
            "title": "Day 1: The Revenue Leak Hook",
            "delay_days": 0,
            "message": t1_msg,
            "wa_link": f"https://wa.me/{clean_digits}?text={urllib.parse.quote(t1_msg)}",
        },
        {
            "touch": 2,
            "title": "Day 3: Social Proof & ROI Case",
            "delay_days": 3,
            "message": t2_msg,
            "wa_link": f"https://wa.me/{clean_digits}?text={urllib.parse.quote(t2_msg)}",
        },
        {
            "touch": 3,
            "title": "Day 5: Prototype Demo & Close",
            "delay_days": 5,
            "message": t3_msg,
            "wa_link": f"https://wa.me/{clean_digits}?text={urllib.parse.quote(t3_msg)}",
        },
    ]

    return {
        "lead_id": lead_data.get("id", 0),
        "business_name": biz_name,
        "phone": phone,
        "touches": touches,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. ☁️ GEMINI PRO CLOUD DISCOVERY (Zero RAM Scraper Fallback)
# ─────────────────────────────────────────────────────────────────────────────

async def run_gemini_cloud_lead_discovery(query: str, count: int = 10, api_key: Optional[str] = None) -> List[dict]:
    """
    Lightweight, cloud-resilient lead discovery engine powered by Gemini Pro.
    Operates with zero browser/Chromium overhead, making it ideal for free cloud containers
    (Render 512MB RAM, Hugging Face, Railway) where heavy browsers might hit limits.
    """
    model, model_name = get_research_model(api_key)
    if not model:
        logger.warning("Gemini Pro not configured for cloud discovery.")
        return []

    prompt = f"""
Act as an elite B2B Commercial Data Researcher specializing in Gurugram, India.
Search your knowledge base and current commercial data for high-intent business leads in Gurugram matching:
Query: "{query}"

Find up to {count} real, established local businesses (independent restaurants, clinics, luxury retail, real estate consultants, gyms, boutique firms).
Exclude multinational tech giants (Google, TCS, Infosys, Accenture), government offices, banks, ATMs, and petrol pumps.

Return a valid JSON array of objects with these exact keys:
[
  {{
    "name": "<Business Name>",
    "category": "<Specific Business Category>",
    "address": "<Sector / Market / Road address in Gurugram>",
    "phone": "<Valid Indian phone number with +91>",
    "website": "<Website URL or empty string>",
    "rating": "<e.g. 4.4>",
    "reviews_count": "<e.g. 180>",
    "lead_score": <int 75-95 based on revenue opportunity>,
    "problems_identified": "<Specific digital leak e.g. paying 30% aggregator commission, no WhatsApp booking>",
    "sales_pitch": "<Tailored pitch mentioning Shri Apps and Web>"
  }}
]
Return ONLY raw JSON array.
"""
    try:
        res = await asyncio.to_thread(model.generate_content, prompt)
        raw_text = res.text.strip()
        cleaned_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
        cleaned_text = re.sub(r"\s*```$", "", cleaned_text, flags=re.MULTILINE).strip()
        items = json.loads(cleaned_text)
        if isinstance(items, list):
            logger.info(f"☁️ Gemini Cloud Discovery found {len(items)} leads for '{query}'.")
            return items
    except Exception as e:
        logger.error(f"Gemini Cloud Discovery error: {e}")
    return []
