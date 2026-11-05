"""
scheduler.py — 24/7 Autonomous Lead Hunter Daemon.
Runs in the background, rotating across Gurugram business categories,
scraping Google Maps, scoring leads with AI, and broadcasting live updates.
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

# Curated rotation of high-converting Gurugram commercial sectors & categories
DEFAULT_ROTATION_QUERIES = [
    "cafes and restaurants Gurugram",
    "luxury salons and spas Gurugram",
    "gyms and fitness studios Gurugram",
    "dental clinics and implants Gurugram",
    "boutique hotels and banquet halls Gurugram",
    "car detailing and auto workshops Gurugram",
    "real estate consultants and brokers Gurugram",
    "interior designers and architects Gurugram",
    "bakeries and dessert parlours Gurugram",
    "chartered accountants and tax firms Gurugram",
    "pet clinics and grooming Gurugram",
    "pre-schools and daycare centers Gurugram",
    "coaching institutes and academies Gurugram",
    "skin clinics and dermatologists Gurugram",
    "event planners and decorators Gurugram",
]

_scheduler: Optional[AsyncIOScheduler] = None
_is_job_executing: bool = False


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
                custom_queries=json.dumps(DEFAULT_ROTATION_QUERIES),
            )
            db.add(config)
            await db.commit()
            await db.refresh(config)
        return config


def get_queries_list(config: SchedulerConfig) -> list[str]:
    """Parse custom queries or fallback to default queries."""
    if config.custom_queries:
        try:
            items = json.loads(config.custom_queries)
            if isinstance(items, list) and items:
                return items
        except Exception:
            pass
    return DEFAULT_ROTATION_QUERIES


async def execute_lead_hunt(target_query: Optional[str] = None, max_results: Optional[int] = None) -> dict:
    """
    Core autonomous scraping & enrichment unit.
    Safely executes Playwright + Gemini AI, stores leads, and broadcasts live events.
    """
    global _is_job_executing
    if _is_job_executing:
        logger.warning("A lead hunt cycle is already executing. Skipping concurrent trigger.")
        return {"status": "busy", "message": "Scraper is currently active."}

    _is_job_executing = True
    max_count = max_results or settings.AUTO_SCRAPE_MAX_RESULTS

    async with AsyncSessionLocal() as db:
        config = await get_or_create_config()
        queries = get_queries_list(config)

        if not target_query:
            idx = config.current_category_index % len(queries)
            target_query = queries[idx]
            # Advance rotation pointer
            config.current_category_index = (idx + 1) % len(queries)

        config.last_run_at = datetime.now(timezone.utc)
        await db.commit()

        # 1. Create ScrapeJob record
        job = ScrapeJob(
            query=target_query,
            status="running",
            leads_found=0,
            leads_saved=0,
        )
        db.add(job)

        # 2. Add ActivityLog
        activity = ActivityLog(
            event_type="scrape_started",
            title=f"24/7 AI Scraper Initiated",
            description=f"Scanning Google Maps for '{target_query}' (target: up to {max_count} businesses).",
        )
        db.add(activity)
        await db.commit()
        await db.refresh(job)

    # Broadcast event to mobile dashboards
    await manager.broadcast(
        "SCRAPE_STARTED",
        {"job_id": job.id, "query": target_query, "status": "running"},
    )

    leads_found = 0
    leads_saved = 0
    error_msg = None

    try:
        # Run scraping and AI enrichment
        enriched_leads = await run_scrape_pipeline(target_query, max_count)
        leads_found = len(enriched_leads)

        async with AsyncSessionLocal() as db:
            for item in enriched_leads:
                # Check duplication by phone or exact business name
                existing = None
                if item.phone:
                    q = await db.execute(select(Lead).where(Lead.phone == item.phone))
                    existing = q.scalar_one_or_none()

                if not existing and item.business_name:
                    q = await db.execute(
                        select(Lead).where(
                            func.lower(Lead.business_name) == item.business_name.strip().lower()
                        )
                    )
                    existing = q.scalar_one_or_none()

                if not existing:
                    new_lead = Lead(
                        business_name=item.business_name,
                        category=item.category,
                        address=item.address,
                        phone=item.phone,
                        website=item.website,
                        email=item.email,
                        rating=item.rating,
                        reviews_count=item.reviews_count,
                        lead_score=item.lead_score,
                        problems_identified=item.problems_identified,
                        sales_pitch=item.sales_pitch,
                        source_query=target_query,
                    )
                    db.add(new_lead)
                    leads_saved += 1

            # Update Job & Log
            db_job = await db.get(ScrapeJob, job.id)
            if db_job:
                db_job.status = "completed"
                db_job.leads_found = leads_found
                db_job.leads_saved = leads_saved
                db_job.completed_at = datetime.now(timezone.utc)

            completion_log = ActivityLog(
                event_type="scrape_completed",
                title=f"AI Lead Hunt Complete ({leads_saved} new leads)",
                description=f"Found {leads_found} businesses for '{target_query}'. Added {leads_saved} unique prospects to pipeline.",
            )
            db.add(completion_log)
            await db.commit()

        # Broadcast completion
        await manager.broadcast(
            "SCRAPE_COMPLETED",
            {
                "job_id": job.id,
                "query": target_query,
                "leads_found": leads_found,
                "leads_saved": leads_saved,
            },
        )
        logger.info(f"✅ Lead hunt complete: {leads_saved} new leads saved for '{target_query}'.")

    except Exception as e:
        logger.error(f"❌ Lead hunt failed for '{target_query}': {e}", exc_info=True)
        error_msg = str(e)
        async with AsyncSessionLocal() as db:
            db_job = await db.get(ScrapeJob, job.id)
            if db_job:
                db_job.status = "failed"
                db_job.error_message = error_msg
                db_job.completed_at = datetime.now(timezone.utc)

            err_log = ActivityLog(
                event_type="error",
                title=f"Scraper Error on '{target_query}'",
                description=f"Error encountered: {error_msg}",
            )
            db.add(err_log)
            await db.commit()

        await manager.broadcast(
            "SCRAPE_FAILED",
            {"job_id": job.id, "query": target_query, "error": error_msg},
        )
    finally:
        _is_job_executing = False

    return {
        "job_id": job.id,
        "query": target_query,
        "leads_found": leads_found,
        "leads_saved": leads_saved,
        "error": error_msg,
    }


async def _scheduled_task_wrapper():
    """Wrapper invoked by APScheduler on each interval tick."""
    try:
        config = await get_or_create_config()
        if not config.is_enabled:
            logger.info("Autonomous scheduler is paused. Skipping scheduled tick.")
            return

        logger.info("⏰ 24/7 Autonomous scheduler triggered scheduled lead hunt.")
        await execute_lead_hunt()
    except Exception as e:
        logger.error(f"Unexpected error in scheduled task: {e}")


def start_scheduler():
    """Initialize and start the 24/7 background scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        _scheduled_task_wrapper,
        trigger=IntervalTrigger(minutes=settings.AUTO_SCRAPE_INTERVAL_MINUTES),
        id="auto_lead_hunter",
        name="24/7 Gurugram Business Hunter",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        f"🚀 24/7 Lead Generation Daemon started! Interval: {settings.AUTO_SCRAPE_INTERVAL_MINUTES} mins."
    )


def stop_scheduler():
    """Gracefully stop the background scheduler on shutdown."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("24/7 Lead Generation Daemon stopped.")


async def toggle_scheduler(enabled: Optional[bool] = None) -> bool:
    """Pause or resume the 24/7 auto scraper."""
    async with AsyncSessionLocal() as db:
        config = await get_or_create_config()
        if enabled is None:
            config.is_enabled = not config.is_enabled
        else:
            config.is_enabled = enabled
        await db.commit()

        event = "scheduler_resumed" if config.is_enabled else "scheduler_paused"
        title = "24/7 AI Scraper Resumed" if config.is_enabled else "24/7 AI Scraper Paused"
        db.add(ActivityLog(event_type=event, title=title))
        await db.commit()

        await manager.broadcast("SCHEDULER_STATUS", {"is_enabled": config.is_enabled})
        return config.is_enabled


async def update_scheduler_settings(interval_minutes: Optional[int] = None, custom_queries: Optional[str] = None):
    """Update interval timing and target rotation categories."""
    global _scheduler
    async with AsyncSessionLocal() as db:
        config = await get_or_create_config()
        if interval_minutes and interval_minutes >= 5:
            config.interval_minutes = interval_minutes
            if _scheduler and _scheduler.running:
                _scheduler.reschedule_job(
                    "auto_lead_hunter",
                    trigger=IntervalTrigger(minutes=interval_minutes),
                )
        if custom_queries is not None:
            config.custom_queries = custom_queries
        await db.commit()


async def get_scheduler_status_details() -> dict:
    """Compile comprehensive live status report of the 24/7 engine."""
    config = await get_or_create_config()
    queries = get_queries_list(config)
    idx = config.current_category_index % len(queries)
    current_category = queries[idx]

    # Calculate stats
    async with AsyncSessionLocal() as db:
        # Total jobs run
        total_jobs = (await db.execute(select(func.count()).select_from(ScrapeJob))).scalar_one()

        # Leads found today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_leads = (
            await db.execute(
                select(func.count()).select_from(Lead).where(Lead.created_at >= today_start)
            )
        ).scalar_one()

    # Next run time
    next_run = None
    if _scheduler and _scheduler.running and config.is_enabled:
        job = _scheduler.get_job("auto_lead_hunter")
        if job and job.next_run_time:
            next_run = job.next_run_time

    return {
        "is_enabled": config.is_enabled,
        "interval_minutes": config.interval_minutes,
        "current_category": current_category,
        "last_run_at": config.last_run_at,
        "next_run_at": next_run,
        "total_jobs_run": total_jobs,
        "leads_found_today": today_leads,
        "active_jobs_count": 1 if _is_job_executing else 0,
    }
