"""
main.py — FastAPI application entry point with 24/7 background AI lead hunter.
"""
from __future__ import annotations

import csv
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import io
import logging

from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import (
    ActivityLog,
    Lead,
    LeadStatus,
    ScrapeJob,
    get_db,
    init_db,
)
from schemas import (
    ActivityLogOut,
    AnalyticsCategoryItem,
    AnalyticsDailyItem,
    AnalyticsResponse,
    AnalyticsStatusItem,
    LeadCreate,
    LeadListResponse,
    LeadOut,
    LeadUpdate,
    SchedulerConfigRequest,
    SchedulerStatusResponse,
    ScrapeJobOut,
    ScrapeRequest,
    ScrapeResponse,
    StatsResponse,
)
from scheduler import (
    execute_lead_hunt,
    get_scheduler_status_details,
    start_scheduler,
    stop_scheduler,
    toggle_scheduler,
    update_scheduler_settings,
)
from websocket_manager import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite schemas and launch 24/7 autonomous scheduler
    await init_db()
    logger.info("Database initialised.")
    start_scheduler()
    logger.info("24/7 Lead Hunter is running.")
    yield
    # Shutdown: Stop scheduler
    stop_scheduler()
    logger.info("Clean shutdown complete.")


app = FastAPI(
    title="24/7 Lead Hunter & CRM API",
    description="Autonomous Gurugram B2B Lead Engine for Shri Apps and Web",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for seamless LAN mobile access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────── WEBSOCKET ────────────────────────────

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    """Real-time live push channel for incoming leads and scraper status."""
    await manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive ping
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket closed: {e}")
        manager.disconnect(websocket)


# ─────────────────────────── HEALTH CHECKS ────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "system": "24/7 Lead Generation Engine",
        "company": settings.COMPANY_NAME,
        "location": settings.DEFAULT_LOCATION,
    }


@app.get("/api/health", tags=["Health"])
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}


# ─────────────────────────── LEADS ENDPOINTS ──────────────────────

@app.get("/api/leads", response_model=LeadListResponse, tags=["Leads"])
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: LeadStatus | None = None,
    search: str | None = None,
    min_score: int | None = None,
    sort_by: str = Query("score_desc", pattern="^(score_desc|score_asc|newest|oldest)$"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Lead)
    if status:
        stmt = stmt.where(Lead.status == status)
    if min_score is not None:
        stmt = stmt.where(Lead.lead_score >= min_score)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            Lead.business_name.ilike(like)
            | Lead.category.ilike(like)
            | Lead.address.ilike(like)
            | Lead.phone.ilike(like)
        )

    # Sorting options
    if sort_by == "score_desc":
        stmt = stmt.order_by(desc(Lead.lead_score), desc(Lead.created_at))
    elif sort_by == "score_asc":
        stmt = stmt.order_by(Lead.lead_score.asc(), desc(Lead.created_at))
    elif sort_by == "oldest":
        stmt = stmt.order_by(Lead.created_at.asc())
    else:  # newest
        stmt = stmt.order_by(desc(Lead.created_at))

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginate
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    rows = (await db.execute(stmt)).scalars().all()

    return LeadListResponse(total=total, page=page, page_size=page_size, items=rows)


@app.get("/api/leads/export/csv", tags=["Leads"])
async def export_leads_csv(
    status: LeadStatus | None = None,
    search: str | None = None,
    min_score: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Export filtered leads to a clean CSV file."""
    stmt = select(Lead)
    if status:
        stmt = stmt.where(Lead.status == status)
    if min_score is not None:
        stmt = stmt.where(Lead.lead_score >= min_score)
    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            Lead.business_name.ilike(like)
            | Lead.category.ilike(like)
            | Lead.address.ilike(like)
        )
    stmt = stmt.order_by(desc(Lead.lead_score))

    rows = (await db.execute(stmt)).scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Business Name",
        "Category",
        "Phone",
        "Lead Score",
        "Status",
        "Address",
        "Website",
        "Rating",
        "Problems Identified",
        "WhatsApp Sales Pitch",
        "Notes",
        "Created At",
    ])

    for l in rows:
        writer.writerow([
            l.id,
            l.business_name,
            l.category or "",
            l.phone or "",
            l.lead_score or 50,
            l.status.value,
            l.address or "",
            l.website or "",
            l.rating or "",
            l.problems_identified or "",
            l.sales_pitch or "",
            l.notes or "",
            l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else "",
        ])

    output.seek(0)
    filename = f"leads_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/leads/{lead_id}", response_model=LeadOut, tags=["Leads"])
async def get_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@app.post("/api/leads", response_model=LeadOut, status_code=201, tags=["Leads"])
async def create_lead(payload: LeadCreate, db: AsyncSession = Depends(get_db)):
    lead = Lead(**payload.model_dump())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    # Log manual lead creation
    db.add(
        ActivityLog(
            event_type="lead_created",
            title=f"Manual Lead Added: {lead.business_name}",
            description=f"Phone: {lead.phone or 'N/A'} | Category: {lead.category or 'N/A'}",
        )
    )
    await db.commit()
    return lead


@app.patch("/api/leads/{lead_id}", response_model=LeadOut, tags=["Leads"])
async def update_lead(
    lead_id: int, payload: LeadUpdate, db: AsyncSession = Depends(get_db)
):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_status = lead.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)

    # If status changed, create activity log
    if payload.status and payload.status != old_status:
        db.add(
            ActivityLog(
                event_type="status_changed",
                title=f"Pipeline Update: {lead.business_name}",
                description=f"Status transitioned from '{old_status.value}' to '{payload.status.value}'.",
            )
        )
        await db.commit()
        await manager.broadcast(
            "LEAD_UPDATED",
            {"id": lead.id, "status": lead.status.value, "business_name": lead.business_name},
        )

    return lead


@app.delete("/api/leads/{lead_id}", status_code=204, tags=["Leads"])
async def delete_lead(lead_id: int, db: AsyncSession = Depends(get_db)):
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.commit()


# ─────────────────────────── 24/7 SCHEDULER & SCRAPER ─────────────

@app.get("/api/scheduler/status", response_model=SchedulerStatusResponse, tags=["Scheduler"])
async def get_scheduler_status():
    """Live status of the autonomous 24/7 engine."""
    details = await get_scheduler_status_details()
    return SchedulerStatusResponse(**details)


@app.post("/api/scheduler/toggle", tags=["Scheduler"])
async def toggle_scheduler_endpoint():
    """Toggle 24/7 autonomous scraper on or off."""
    new_state = await toggle_scheduler()
    return {
        "is_enabled": new_state,
        "message": "24/7 Lead Hunter is ACTIVE" if new_state else "24/7 Lead Hunter is PAUSED",
    }


@app.post("/api/scheduler/config", tags=["Scheduler"])
async def update_scheduler_config_endpoint(payload: SchedulerConfigRequest):
    """Adjust scrape interval and category rotation queries."""
    if payload.is_enabled is not None:
        await toggle_scheduler(payload.is_enabled)
    await update_scheduler_settings(
        interval_minutes=payload.interval_minutes,
        custom_queries=payload.custom_queries,
    )
    return {"status": "updated", "message": "Scheduler settings updated."}


@app.post("/api/scrape/trigger", response_model=ScrapeResponse, tags=["Scraping"])
async def manual_trigger_scrape(
    payload: ScrapeRequest,
    background_tasks: BackgroundTasks,
):
    """Trigger an immediate scrape in the background without waiting for the 24/7 timer."""
    background_tasks.add_task(
        execute_lead_hunt,
        target_query=payload.query.strip(),
        max_results=payload.max_results,
    )
    return ScrapeResponse(
        job_id=0,
        query=payload.query,
        message=f"Scrape initiated for '{payload.query}'. Results will stream live via WebSocket.",
    )


@app.get("/api/scrape/jobs", response_model=list[ScrapeJobOut], tags=["Scraping"])
async def get_scrape_jobs(
    limit: int = Query(15, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve audit history of past autonomous and manual scrape runs."""
    stmt = select(ScrapeJob).order_by(desc(ScrapeJob.started_at)).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


# ─────────────────────────── ACTIVITY LOGS ────────────────────────

@app.get("/api/activity", response_model=list[ActivityLogOut], tags=["Activity"])
async def get_activity_logs(
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Live audit trail of autonomous scraper runs and CRM lead interactions."""
    stmt = select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


# ─────────────────────────── STATS & ANALYTICS ────────────────────

@app.get("/api/stats", response_model=StatsResponse, tags=["Stats"])
async def get_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(Lead))).scalar_one()

    async def count_status(s: LeadStatus) -> int:
        return (
            await db.execute(
                select(func.count()).select_from(Lead).where(Lead.status == s)
            )
        ).scalar_one()

    # Leads added today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_new = (
        await db.execute(
            select(func.count()).select_from(Lead).where(Lead.created_at >= today_start)
        )
    ).scalar_one()

    # Hot leads (Score >= 80)
    hot_count = (
        await db.execute(
            select(func.count()).select_from(Lead).where(Lead.lead_score >= 80)
        )
    ).scalar_one()

    # Average score
    avg_score_res = (
        await db.execute(select(func.avg(Lead.lead_score)).select_from(Lead))
    ).scalar_one()
    avg_score = round(float(avg_score_res), 1) if avg_score_res else 0.0

    return StatsResponse(
        total=total,
        new=await count_status(LeadStatus.NEW),
        contacted=await count_status(LeadStatus.CONTACTED),
        interested=await count_status(LeadStatus.INTERESTED),
        closed=await count_status(LeadStatus.CLOSED),
        rejected=await count_status(LeadStatus.REJECTED),
        today_new=today_new,
        hot_leads_count=hot_count,
        average_score=avg_score,
    )


@app.get("/api/analytics", response_model=AnalyticsResponse, tags=["Analytics"])
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """Aggregated business analytics for dashboard charts."""
    total = (await db.execute(select(func.count()).select_from(Lead))).scalar_one()
    hot_leads = (
        await db.execute(
            select(func.count()).select_from(Lead).where(Lead.lead_score >= 80)
        )
    ).scalar_one()

    avg_score_res = (
        await db.execute(select(func.avg(Lead.lead_score)).select_from(Lead))
    ).scalar_one()
    avg_score = round(float(avg_score_res), 1) if avg_score_res else 0.0

    # Top categories
    cat_stmt = (
        select(Lead.category, func.count(Lead.id).label("count"))
        .where(Lead.category != None, Lead.category != "")
        .group_by(Lead.category)
        .order_by(desc("count"))
        .limit(6)
    )
    cat_rows = (await db.execute(cat_stmt)).all()
    categories = [
        AnalyticsCategoryItem(category=r[0] or "Other", count=r[1]) for r in cat_rows
    ]

    # Pipeline status distribution
    status_stmt = (
        select(Lead.status, func.count(Lead.id).label("count"))
        .group_by(Lead.status)
        .order_by(desc("count"))
    )
    status_rows = (await db.execute(status_stmt)).all()
    statuses = [
        AnalyticsStatusItem(status=r[0].value, count=r[1]) for r in status_rows
    ]

    # Daily trend (last 7 days)
    daily_stmt = (
        select(
            func.strftime("%Y-%m-%d", Lead.created_at).label("day"),
            func.count(Lead.id).label("count"),
        )
        .group_by("day")
        .order_by(desc("day"))
        .limit(7)
    )
    daily_rows = (await db.execute(daily_stmt)).all()
    daily_trend = [
        AnalyticsDailyItem(date=r[0], count=r[1]) for r in reversed(daily_rows)
    ]

    return AnalyticsResponse(
        total_leads=total,
        hot_leads=hot_leads,
        average_score=avg_score,
        categories=categories,
        statuses=statuses,
        daily_trend=daily_trend,
    )
