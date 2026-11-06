"""
scheduler.py — Multi-Agent 24/7 Autonomous Lead Hunter Daemon.
Runs 3 AI Hunters SIMULTANEOUSLY across diverse Gurugram commercial sectors:
  1. Hunter Alpha: F&B & Hospitality (Restaurants, Cafes, Bakeries, Cloud Kitchens)
  2. Hunter Beta: Healthcare & Wellness (Dental, Derma, Clinics, Luxury Gyms)
  3. Hunter Gamma: Luxury Retail & Real Estate (Jewellery, Apparel, DLF Property, Interiors)
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
import logging
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import func, select

from config import settings
from database import (
    ActivityLog,
    AsyncSessionLocal,
    Lead,
    SchedulerConfig,
    ScrapeJob,
)
from scraper import run_scrape_pipeline
from websocket_manager import manager

logger = logging.getLogger(__name__)

# --- 3 Specialized AI Agent Configurations ---
AI_AGENTS_CONFIG = {
    1: {
        "id": 1,
        "name": "Hunter Alpha",
        "specialty": "Food, Cafes & Hospitality",
        "badge": "🍔 F&B Specialist",
        "description": "Targets dining brands paying 28-30% commissions to aggregators to sell direct ordering & apps.",
        "sectors": [
            "cafes and restaurants in Sector 29 Gurugram",
            "fine dine and restrobars in Cyber Hub Gurugram",
            "bakeries and cloud kitchens in Golf Course Road Gurugram",
            "breweries and lounges in Sector 29 Gurugram",
            "family dining in Galleria Market Gurugram",
            "cafes and bistro in 32nd Avenue Gurugram",
            "takeaway and cloud kitchens in Sohna Road Gurugram",
        ],
        "current_index": 0,
        "is_active": True,
        "is_running": False,
        "leads_found": 0,
    },
    2: {
        "id": 2,
        "name": "Hunter Beta",
        "specialty": "Healthcare, Clinics & Fitness",
        "badge": "🏥 Healthcare & Gyms",
        "description": "Targets medical & fitness practices to sell automated WhatsApp booking & member apps.",
        "sectors": [
            "dental clinics and implants in South City Gurugram",
            "dermatologists and skin clinics in Golf Course Extension Gurugram",
            "luxury gyms and fitness studios in Sector 56 Gurugram",
            "physiotherapy and wellness centers in Sohna Road Gurugram",
            "yoga and pilates studios in Sushant Lok Gurugram",
            "salons and luxury spas in Sector 14 Gurugram",
            "eye clinics and diagnostics in Sector 43 Gurugram",
        ],
        "current_index": 0,
        "is_active": True,
        "is_running": False,
        "leads_found": 0,
    },
    3: {
        "id": 3,
        "name": "Hunter Gamma",
        "specialty": "Luxury Retail & Real Estate",
        "badge": "💎 Retail & Property",
        "description": "Targets high-ticket retailers & DLF property consultants needing portfolio apps & NRI lead portals.",
        "sectors": [
            "real estate consultants and brokers in DLF Phase 5 Gurugram",
            "jewellery showrooms and boutiques in Gold Souk Mall Gurugram",
            "interior designers and luxury architects in Sector 49 Gurugram",
            "property advisors and luxury homes in Golf Course Road Gurugram",
            "boutique designer wear in MG Road Gurugram",
            "home automation and luxury decor in Nirvana Country Gurugram",
            "coaching institutes and test prep in Sector 14 Gurugram",
        ],
        "current_index": 0,
        "is_active": True,
        "is_running": False,
        "leads_found": 0,
    },
}

_scheduler: Optional[AsyncIOScheduler] = None


async def get_or_create_config() -> SchedulerConfig:
    """Ensure a singleton scheduler configuration exists in the database."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SchedulerConfig).where(SchedulerConfig.id == 1))
        config = result.scalar_one_or_none()
        if not config:
            config = SchedulerConfig(
                id=1,
                is_enabled=settings.AUTO_SCRAPE_ENABLED,
                interval_minutes=settings.AUTO_SCRAPE_INTERVAL_MINUTES,
                current_category_index=0,
                custom_queries=json.dumps([]),
            )
            db.add(config)
            await db.commit()
            await db.refresh(config)
        return config


def get_agents_status_list() -> list[dict]:
    """Returns current runtime state of all 3 AI Hunters."""
    res = []
    for aid, agent in AI_AGENTS_CONFIG.items():
        idx = agent["current_index"] % len(agent["sectors"])
        target = agent["sectors"][idx]
        res.append({
            "id": agent["id"],
            "name": agent["name"],
            "specialty": agent["specialty"],
            "badge": agent["badge"],
            "description": agent["description"],
            "is_active": agent["is_active"],
            "is_running": agent["is_running"],
            "current_target": target,
            "leads_found": agent["leads_found"],
        })
    return res


async def execute_agent_hunt(
    agent_id: int,
    target_query: Optional[str] = None,
    max_results: Optional[int] = None,
) -> dict:
    """
    Executes a single AI Hunter independently.
    Can run concurrently alongside the other 2 hunters without conflict.
    """
    agent = AI_AGENTS_CONFIG.get(agent_id)
    if not agent:
        return {"status": "error", "message": f"Agent {agent_id} not found."}

    if agent["is_running"]:
        logger.warning(f"{agent['name']} is already running. Skipping trigger.")
        return {"status": "busy", "message": f"{agent['name']} is currently busy."}

    agent["is_running"] = True
    max_count = max_results or settings.AUTO_SCRAPE_MAX_RESULTS

    # Determine sector query for this agent
    if not target_query:
        idx = agent["current_index"] % len(agent["sectors"])
        target_query = agent["sectors"][idx]
        agent["current_index"] = (idx + 1) % len(agent["sectors"])

    async with AsyncSessionLocal() as db:
        # Create ScrapeJob record
        job = ScrapeJob(
            query=target_query,
            agent_name=agent["name"],
            status="running",
            leads_found=0,
            leads_saved=0,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)

        # Log and Broadcast Start Event
        log_entry = ActivityLog(
            event_type="scrape_started",
            title=f"🤖 {agent['name']} Dispatched",
            description=f"Hunter active for '{target_query}' (Target: {max_count} businesses).",
        )
        db.add(log_entry)
        await db.commit()

        await manager.broadcast({
            "type": "AGENT_STARTED",
            "agent_id": agent["id"],
            "agent_name": agent["name"],
            "job_id": job.id,
            "query": target_query,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    saved_count = 0
    found_count = 0
    error_msg: Optional[str] = None

    try:
        # Run Playwright Scraping & AI Enrichment
        enriched_leads = await run_scrape_pipeline(
            query=target_query,
            max_results=max_count,
        )
        found_count = len(enriched_leads)

        async with AsyncSessionLocal() as db:
            for el in enriched_leads:
                # Deduplicate by business_name + phone or address
                stmt = select(Lead).where(Lead.business_name == el.business_name)
                existing = (await db.execute(stmt)).scalar_one_or_none()

                if not existing:
                    new_lead = Lead(
                        business_name=el.business_name,
                        category=el.category,
                        address=el.address,
                        phone=el.phone,
                        website=el.website,
                        email=el.email,
                        rating=el.rating,
                        reviews_count=el.reviews_count,
                        lead_score=el.lead_score,
                        problems_identified=el.problems_identified,
                        sales_pitch=el.sales_pitch,
                        source_query=el.source_query,
                    )
                    db.add(new_lead)
                    saved_count += 1

            agent["leads_found"] += saved_count

            # Update job record
            job_obj = await db.get(ScrapeJob, job.id)
            if job_obj:
                job_obj.status = "completed"
                job_obj.leads_found = found_count
                job_obj.leads_saved = saved_count
                job_obj.completed_at = datetime.now(timezone.utc)

            log_finish = ActivityLog(
                event_type="scrape_completed",
                title=f"✅ {agent['name']}: {saved_count} Leads Added",
                description=f"Found {found_count} businesses, added {saved_count} new leads for '{target_query}'.",
            )
            db.add(log_finish)
            await db.commit()

        logger.info(f"✅ {agent['name']} finished: {saved_count} leads saved for '{target_query}'.")

        await manager.broadcast({
            "type": "AGENT_COMPLETED",
            "agent_id": agent["id"],
            "agent_name": agent["name"],
            "job_id": job.id,
            "query": target_query,
            "leads_found": found_count,
            "leads_saved": saved_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ {agent['name']} error for '{target_query}': {e}", exc_info=True)

        async with AsyncSessionLocal() as db:
            job_obj = await db.get(ScrapeJob, job.id)
            if job_obj:
                job_obj.status = "failed"
                job_obj.error_message = error_msg
                job_obj.completed_at = datetime.now(timezone.utc)
            await db.commit()

        await manager.broadcast({
            "type": "AGENT_FAILED",
            "agent_id": agent["id"],
            "agent_name": agent["name"],
            "job_id": job.id,
            "error": error_msg,
        })
    finally:
        agent["is_running"] = False

    return {
        "agent_id": agent["id"],
        "agent_name": agent["name"],
        "status": "completed" if not error_msg else "failed",
        "leads_saved": saved_count,
        "query": target_query,
    }


async def execute_all_agents_simultaneously(max_results_per_agent: int = 12) -> list[dict]:
    """
    Launches all 3 AI Hunters in parallel simultaneously.
    Triple lead acquisition rate across F&B, Healthcare, and Luxury Retail/Real Estate.
    """
    logger.info("🚀 Launching ALL 3 AI Hunters simultaneously in parallel!")
    tasks = [
        execute_agent_hunt(agent_id=1, max_results=max_results_per_agent),
        execute_agent_hunt(agent_id=2, max_results=max_results_per_agent),
        execute_agent_hunt(agent_id=3, max_results=max_results_per_agent),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    clean_results = []
    for r in results:
        if isinstance(r, Exception):
            clean_results.append({"status": "error", "message": str(r)})
        else:
            clean_results.append(r)
    return clean_results


async def _scheduled_parallel_tick():
    """Timer callback triggered 24/7 by APScheduler: fires all 3 agents simultaneously."""
    config = await get_or_create_config()
    if not config.is_enabled:
        return
    logger.info("⏰ 24/7 Scheduler Tick: Launching 3 simultaneous hunters!")
    await execute_all_agents_simultaneously(max_results_per_agent=12)


async def start_scheduler():
    """Initializes and activates the 24/7 background scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    config = await get_or_create_config()
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _scheduled_parallel_tick,
        trigger=IntervalTrigger(minutes=config.interval_minutes),
        id="triple_ai_lead_hunter",
        name="3x Simultaneous Gurugram Lead Hunters",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"🚀 24/7 Triple AI Lead Hunter started! Interval: {config.interval_minutes} mins.")


async def stop_scheduler():
    """Halts the 24/7 autonomous scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("🛑 24/7 Autonomous Scheduler stopped.")


async def toggle_scheduler(enable: bool) -> bool:
    """Toggles scheduler active state in database and controls background daemon."""
    async with AsyncSessionLocal() as db:
        config = await get_or_create_config()
        config.is_enabled = enable
        await db.commit()

        if enable:
            await start_scheduler()
        else:
            await stop_scheduler()

        log_entry = ActivityLog(
            event_type="scheduler_toggle",
            title=f"3x AI Hunter {'Resumed' if enable else 'Paused'}",
            description=f"24/7 Simultaneous Hunter Daemon {'active' if enable else 'paused'} by user.",
        )
        db.add(log_entry)
        await db.commit()

        await manager.broadcast({
            "type": "SCHEDULER_TOGGLED",
            "is_enabled": enable,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    return enable


async def update_scheduler_settings(
    interval_minutes: Optional[int] = None,
    custom_queries: Optional[list[str]] = None,
) -> None:
    """Updates scheduler interval and custom category queries."""
    async with AsyncSessionLocal() as db:
        config = await get_or_create_config()
        if interval_minutes:
            config.interval_minutes = interval_minutes
        if custom_queries:
            config.custom_queries = json.dumps(custom_queries)
        await db.commit()


async def get_scheduler_status_details() -> dict:
    """Retrieves full status of 24/7 engine including all 3 AI agents."""
    config = await get_or_create_config()
    async with AsyncSessionLocal() as db:
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        total_jobs = (
            await db.execute(select(func.count(ScrapeJob.id)))
        ).scalar_one()
        today_leads = (
            await db.execute(
                select(func.count(Lead.id)).where(Lead.created_at >= today_start)
            )
        ).scalar_one()

    agents_list = get_agents_status_list()
    active_count = sum(1 for a in AI_AGENTS_CONFIG.values() if a.get("is_running", False))

    return {
        "is_enabled": config.is_enabled,
        "interval_minutes": config.interval_minutes,
        "current_category": "3x Simultaneous AI Hunters",
        "agents": agents_list,
        "total_jobs_run": total_jobs or 0,
        "leads_found_today": today_leads or 0,
        "active_jobs_count": active_count,
    }
