"""
seed.py — Injects realistic Gurugram commercial leads and activity logs
for instant testing of the 24/7 mobile dashboard.
Run: python seed.py
"""
import asyncio
from datetime import datetime, timezone, timedelta
from database import init_db, Lead, ActivityLog, ScrapeJob, AsyncSessionLocal

SAMPLE_LEADS = [
    {
        "business_name": "The Roastery Coffee House & Eatery",
        "category": "Cafe & Restaurant",
        "address": "Sector 29, Main Market, Gurugram, Haryana 122001",
        "phone": "+919811234567",
        "website": "",
        "rating": "4.6",
        "reviews_count": "1,240 reviews",
        "lead_score": 94,
        "problems_identified": (
            "• High reliance on Swiggy/Zomato (losing 25-30% margin on every delivery order)\n"
            "• No direct online ordering or digital table booking capability\n"
            "• Missing customer retention & digital loyalty rewards program"
        ),
        "sales_pitch": (
            "Hi! I'm from Shri Apps and Web in Gurugram. Loved The Roastery's coffee and ambiance! "
            "I noticed you don't have a direct online ordering website or app, meaning you're giving away 25-30% "
            "margin to aggregators on every order. We build custom zero-commission ordering apps for top Gurugram cafes. "
            "Could I share a 2-minute prototype we created for you? ☕"
        ),
        "source_query": "cafes and restaurants Gurugram",
    },
    {
        "business_name": "Khyber Lounge & Fine Dining",
        "category": "Mughlai Restaurant",
        "address": "Golf Course Road, DLF Phase 5, Gurugram, Haryana 122009",
        "phone": "+919871987654",
        "website": "http://khyberlounge-old.in",
        "rating": "4.3",
        "reviews_count": "890 reviews",
        "lead_score": 86,
        "problems_identified": (
            "• Outdated desktop-only website that is not mobile responsive\n"
            "• No WhatsApp instant table reservation system\n"
            "• Missed weekend bookings due to slow manual phone confirmations"
        ),
        "sales_pitch": (
            "Hello! Reaching out from Shri Apps and Web. Khyber Lounge has an amazing reputation on Golf Course Road! "
            "We noticed your website isn't mobile-friendly and lacks instant WhatsApp table booking, which causes high weekend drop-offs. "
            "We build ultra-fast dining apps that increase direct banquet & table reservations by 40%. Would you be open to a quick demo? 🍷"
        ),
        "source_query": "cafes and restaurants Gurugram",
    },
    {
        "business_name": "IronCore Crossfit & Fitness Studio",
        "category": "Fitness & Gym",
        "address": "Sohna Road, Sector 49, Gurugram, Haryana 122018",
        "phone": "+919910876543",
        "website": "",
        "rating": "4.8",
        "reviews_count": "340 reviews",
        "lead_score": 92,
        "problems_identified": (
            "• No digital member portal or attendance tracking app\n"
            "• Manual fee collection and membership expiry reminders on WhatsApp\n"
            "• Inability to sell online trial passes to corporate employees in Cyber City"
        ),
        "sales_pitch": (
            "Hi there! This is Shri Apps and Web. Impressive setup at IronCore! "
            "We build custom branded gym management mobile apps with automated QR attendance, digital membership renewals, "
            "and workout tracking. We've helped fitness studios in Gurugram automate 90% of admin work. Can I send a quick preview? 💪"
        ),
        "source_query": "gyms and fitness studios Gurugram",
    },
    {
        "business_name": "DentCare Aesthetic & Implant Clinic",
        "category": "Dental Clinic",
        "address": "DLF Phase 4, Near Galleria Market, Gurugram, Haryana 122002",
        "phone": "+919821345678",
        "website": "https://dentcare-sample.com",
        "rating": "4.9",
        "reviews_count": "520 reviews",
        "lead_score": 88,
        "problems_identified": (
            "• High no-show rate due to absence of automated WhatsApp SMS reminders\n"
            "• No online consultation booking with advance slot payment\n"
            "• Lack of digital medical history & prescription portal for patients"
        ),
        "sales_pitch": (
            "Hello Doctor! I'm from Shri Apps and Web, Gurugram. DentCare has stellar 4.9★ reviews near Galleria! "
            "We specialize in HIPAA-compliant patient booking platforms that send automated WhatsApp appointment confirmations "
            "and slash clinic no-shows by over 60%. Would love to share how we can streamline your clinic appointments! 🦷"
        ),
        "source_query": "dental clinics and implants Gurugram",
    },
    {
        "business_name": "Velvet Touch Luxury Spa & Salon",
        "category": "Beauty & Wellness",
        "address": "MG Road, Heritage City, Gurugram, Haryana 122002",
        "phone": "+919711456789",
        "website": "",
        "rating": "4.5",
        "reviews_count": "410 reviews",
        "lead_score": 91,
        "problems_identified": (
            "• Zero online appointment scheduling, forcing clients to call manually\n"
            "• No digital menu for high-ticket bridal & spa packages\n"
            "• Missing automated anniversary & birthday discount campaigns"
        ),
        "sales_pitch": (
            "Hi! Team Shri Apps and Web here. Velvet Touch Spa has such an elegant vibe on MG Road! "
            "We build bespoke salon booking apps with digital service menus and one-tap WhatsApp bridal inquiries. "
            "Our salon clients typically see a 35% increase in repeat bookings within 60 days. Can we chat for 2 minutes? 💆‍♀️"
        ),
        "source_query": "luxury salons and spas Gurugram",
    },
    {
        "business_name": "AutoGloss Detailers & Ceramic Hub",
        "category": "Automotive Detailing",
        "address": "Udyog Vihar Phase 4, Gurugram, Haryana 122015",
        "phone": "+919899123456",
        "website": "",
        "rating": "4.7",
        "reviews_count": "280 reviews",
        "lead_score": 89,
        "problems_identified": (
            "• No gallery showcase or package configurator for ceramic/PPF coatings\n"
            "• Manual pickup-drop coordination and invoicing\n"
            "• Missing digital warranty card portal for coated vehicles"
        ),
        "sales_pitch": (
            "Hey! Reaching out from Shri Apps and Web. Saw the incredible luxury car transformations by AutoGloss! "
            "High-end car owners expect seamless digital booking and electronic PPF warranty cards. We build automotive apps "
            "with interactive quote calculators that convert premium car owners instantly. Can I show you a working prototype? 🏎️"
        ),
        "source_query": "car detailing and auto workshops Gurugram",
    },
    {
        "business_name": "PrimeAcres Realty & Commercial Advisory",
        "category": "Real Estate Broker",
        "address": "Golf Course Extension Road, Sector 65, Gurugram, Haryana 122018",
        "phone": "+919810567890",
        "website": "https://primeacres-old.in",
        "rating": "4.4",
        "reviews_count": "190 reviews",
        "lead_score": 82,
        "problems_identified": (
            "• Slow mobile loading speeds losing affluent NRI & corporate investors\n"
            "• No instant WhatsApp brochure download trigger on property listings\n"
            "• Inefficient lead capture mechanism for luxury residential launches"
        ),
        "sales_pitch": (
            "Hello! I'm from Shri Apps and Web. PrimeAcres has prime listings on Golf Course Ext! "
            "We build high-converting real estate web platforms with 1-click WhatsApp brochure downloads and instant virtual tour requests. "
            "Top Gurugram brokers use our tech to double their NRI buyer conversion. Let's connect for 5 mins? 🏢"
        ),
        "source_query": "real estate consultants and brokers Gurugram",
    },
    {
        "business_name": "Paws & Whiskers 24/7 Vet Care",
        "category": "Pet Care & Veterinary",
        "address": "DLF Phase 3, Near Cyber City, Gurugram, Haryana 122002",
        "phone": "+919873456712",
        "website": "",
        "rating": "4.8",
        "reviews_count": "610 reviews",
        "lead_score": 87,
        "problems_identified": (
            "• No emergency SOS button or digital pet vaccination record card\n"
            "• High call volume for routine pet grooming slot inquiries\n"
            "• Missing recurring pet food & medication subscription system"
        ),
        "sales_pitch": (
            "Hi! Shri Apps and Web here. Huge fan of Paws & Whiskers' 24/7 care near Cyber City! "
            "Pet parents love having an app with vaccination reminders and instant grooming slots. We build custom veterinary apps "
            "that make scheduling effortless and boost pet supply subscriptions. Open to seeing a quick demo? 🐾"
        ),
        "source_query": "pet clinics and grooming Gurugram",
    },
]


async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        for i, lead_data in enumerate(SAMPLE_LEADS):
            lead = Lead(**lead_data)
            lead.created_at = now - timedelta(hours=i * 2, minutes=15)
            db.add(lead)

        # Add sample past scrape jobs
        db.add(
            ScrapeJob(
                query="cafes and restaurants Gurugram",
                status="completed",
                leads_found=14,
                leads_saved=12,
                started_at=now - timedelta(hours=3),
                completed_at=now - timedelta(hours=2, minutes=55),
            )
        )
        db.add(
            ScrapeJob(
                query="luxury salons and spas Gurugram",
                status="completed",
                leads_found=11,
                leads_saved=9,
                started_at=now - timedelta(hours=1),
                completed_at=now - timedelta(minutes=52),
            )
        )

        # Add sample activity logs
        db.add(
            ActivityLog(
                event_type="scheduler_started",
                title="24/7 Lead Hunter Initialized",
                description="Autonomous background daemon started. Target: commercial sectors in Gurugram.",
                created_at=now - timedelta(hours=4),
            )
        )
        db.add(
            ActivityLog(
                event_type="scrape_completed",
                title="AI Scrape Completed: Sector 29 Cafes",
                description="Discovered 14 businesses, enriched with custom pitches for Shri Apps and Web.",
                created_at=now - timedelta(hours=3),
            )
        )
        db.add(
            ActivityLog(
                event_type="lead_created",
                title="High-Priority Lead Identified: The Roastery",
                description="Lead Score: 94/100 (No website, massive Swiggy commission leakage).",
                created_at=now - timedelta(hours=2, minutes=30),
            )
        )

        await db.commit()
    print(f"[SUCCESS] Successfully seeded {len(SAMPLE_LEADS)} high-scoring Gurugram leads & logs!")


if __name__ == "__main__":
    asyncio.run(main())
