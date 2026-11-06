"""
main.py — FastAPI application entry point with 24/7 background AI lead hunter.
"""
from __future__ import annotations

import csv
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import io
import json
import logging
import os

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
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from scraper import get_or_init_gemini

from config import settings
from database import (
    ActivityLog,
    Lead,
    LeadStatus,
    ScrapeJob,
    get_db,
    init_db,
)

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
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
    OutreachSequenceResponse,
    PipelineOverviewResponse,
    PipelineStageData,
    ProposalGenerateResponse,
    ResearchAuditResponse,
    SchedulerConfigRequest,
    SchedulerStatusResponse,
    ScrapeJobOut,
    ScrapeRequest,
    ScrapeResponse,
    StatsResponse,
)
from gemini_research import (
    generate_agency_proposal,
    generate_outreach_sequence,
    run_gemini_cloud_lead_discovery,
    run_gemini_pro_audit,
)
from scheduler import (
    execute_agent_hunt,
    execute_all_agents_simultaneously,
    get_agents_status_list,
    get_scheduler_status_details,
    reset_all_agents_and_jobs,
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
    # Safe reset of any residual running jobs on container boot
    await reset_all_agents_and_jobs()
    await start_scheduler()
    logger.info("24/7 Lead Hunter is running.")
    yield
    # Shutdown: Stop scheduler
    await stop_scheduler()
    logger.info("Clean shutdown complete.")


app = FastAPI(
    title="24/7 Lead Hunter & CRM API",
    description="Autonomous Gurugram B2B Lead Engine for Shri Apps and Web",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=".*",
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


# ─────────────────────────── HEALTH & ROOT ────────────────────────

@app.get("/api/info", tags=["Health"])
async def api_info():
    return {
        "status": "online",
        "system": "24/7 Lead Generation Engine",
        "company": settings.COMPANY_NAME,
        "location": settings.DEFAULT_LOCATION,
    }


@app.get("/", tags=["Health"])
async def root():
    index_file = frontend_dist / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
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


# ─────────────────────────── GEMINI PRO AGENCY TOOLKIT ─────────────

@app.post("/api/leads/{lead_id}/research", response_model=ResearchAuditResponse, tags=["Agency Toolkit"])
async def trigger_lead_research(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Runs a deep Gemini Pro audit on the lead, detects revenue leaks & tech vulnerabilities."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_dict = {
        "id": lead.id,
        "business_name": lead.business_name,
        "category": lead.category or "",
        "address": lead.address or "",
        "phone": lead.phone or "",
        "website": lead.website or "",
        "rating": lead.rating or "",
        "reviews_count": lead.reviews_count or "",
    }

    audit = await run_gemini_pro_audit(lead_dict)

    # Save into DB
    lead.audit_report = audit.get("audit_markdown", "")
    lead.deal_value = audit.get("suggested_deal_value_inr", lead.deal_value or 25000)
    lead.lead_score = max(lead.lead_score or 50, audit.get("digital_maturity_score", 50))
    if lead.status == LeadStatus.NEW:
        lead.status = LeadStatus.AUDITED

    # Log activity
    db.add(
        ActivityLog(
            event_type="audit_completed",
            title=f"🔬 Gemini Pro Audited: {lead.business_name}",
            description=f"Identified revenue leak: {audit.get('estimated_monthly_loss_inr', 'N/A')}. Suggested deal value: ₹{lead.deal_value:,}.",
        )
    )
    await db.commit()
    await db.refresh(lead)

    await manager.broadcast(
        "LEAD_UPDATED",
        {"id": lead.id, "status": lead.status.value, "business_name": lead.business_name},
    )
    return audit


@app.post("/api/leads/{lead_id}/proposal", response_model=ProposalGenerateResponse, tags=["Agency Toolkit"])
async def trigger_lead_proposal(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Generates a complete B2B agency proposal with 3-tier pricing packages in INR."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_dict = {
        "id": lead.id,
        "business_name": lead.business_name,
        "category": lead.category or "",
        "address": lead.address or "",
        "phone": lead.phone or "",
        "website": lead.website or "",
    }

    proposal = await generate_agency_proposal(lead_dict)

    # Save to DB
    lead.proposal_content = proposal.get("proposal_markdown", "")
    lead.deal_value = proposal.get("suggested_deal_value_inr", lead.deal_value or 38000)
    if lead.status in [LeadStatus.NEW, LeadStatus.AUDITED]:
        lead.status = LeadStatus.PROPOSAL_SENT

    db.add(
        ActivityLog(
            event_type="proposal_generated",
            title=f"📑 Proposal Generated for {lead.business_name}",
            description=f"Generated Shri Apps and Web proposal. Recommended package: ₹{lead.deal_value:,}.",
        )
    )
    await db.commit()
    await db.refresh(lead)

    await manager.broadcast(
        "LEAD_UPDATED",
        {"id": lead.id, "status": lead.status.value, "business_name": lead.business_name},
    )
    return proposal


@app.get("/api/leads/{lead_id}/sequence", response_model=OutreachSequenceResponse, tags=["Agency Toolkit"])
async def get_lead_outreach_sequence(lead_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieves or generates a 3-touch WhatsApp follow-up sequence with instant links."""
    lead = await db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead_dict = {
        "id": lead.id,
        "business_name": lead.business_name,
        "category": lead.category or "",
        "phone": lead.phone or "",
    }

    seq = generate_outreach_sequence(lead_dict)
    lead.followup_sequence = json.dumps(seq)
    await db.commit()
    return seq


@app.get("/api/pipeline", response_model=PipelineOverviewResponse, tags=["Agency Toolkit"])
async def get_pipeline_overview(db: AsyncSession = Depends(get_db)):
    """Provides a full CRM pipeline overview grouped by stages with total deal values in INR."""
    stmt = select(Lead).order_by(desc(Lead.lead_score))
    result = await db.execute(stmt)
    all_leads = result.scalars().all()

    stages_config = [
        ("new", "New Leads"),
        ("audited", "Audited by AI 🔬"),
        ("contacted", "Pitch Sent 💬"),
        ("interested", "Interested ⭐"),
        ("proposal_sent", "Proposal Sent 📑"),
        ("closed", "Closed Won 🏆"),
        ("rejected", "Archived / Passed"),
    ]

    stage_data_list = []
    total_val = 0
    total_leads_count = len(all_leads)

    for stage_key, stage_label in stages_config:
        leads_in_stage = [
            l
            for l in all_leads
            if (l.status.value if hasattr(l.status, "value") else str(l.status)) == stage_key
        ]
        stage_sum = sum(l.deal_value or 25000 for l in leads_in_stage)
        if stage_key != "rejected":
            total_val += stage_sum

        stage_data_list.append(
            PipelineStageData(
                stage=stage_key,
                label=stage_label,
                count=len(leads_in_stage),
                total_value_inr=stage_sum,
                leads=[LeadOut.model_validate(l) for l in leads_in_stage],
            )
        )

    return PipelineOverviewResponse(
        total_pipeline_value_inr=total_val,
        total_leads_in_pipeline=total_leads_count,
        stages=stage_data_list,
    )


# ─────────────────────────── CLOUD 24/7 & DEPLOYMENT ───────────────

@app.get("/api/cloud/status", tags=["Cloud 24/7"])
async def get_cloud_deployment_status():
    """Detects whether backend is running in cloud and provides connection/deployment metadata."""
    is_render = bool(os.getenv("RENDER"))
    is_railway = bool(os.getenv("RAILWAY_STATIC_URL") or os.getenv("RAILWAY_ENVIRONMENT"))
    is_cloud = is_render or is_railway or bool(os.getenv("PORT") and not os.getenv("WINDIR"))

    cloud_provider = (
        "Render (Cloud)"
        if is_render
        else (
            "Railway (Cloud)"
            if is_railway
            else ("Docker Cloud" if is_cloud else "Local Laptop")
        )
    )

    return {
        "is_cloud": is_cloud,
        "provider": cloud_provider,
        "status": "24/7 Running",
        "instructions": (
            "App is deployed in the cloud! It will run 24/7 autonomously even when your laptop is turned off."
            if is_cloud
            else "App is currently running on your local machine. Deploy to Render or Railway for 100% free 24/7 cloud operation."
        ),
        "deploy_url_render": "https://dashboard.render.com/select-repo?type=web",
        "deploy_url_railway": "https://railway.app/new",
    }


@app.post("/api/cloud/discover", tags=["Cloud 24/7"])
async def trigger_cloud_lead_discovery(payload: ScrapeRequest, db: AsyncSession = Depends(get_db)):
    """Cloud-resilient lead discovery engine powered by Gemini Pro with zero browser RAM overhead."""
    query = payload.query or "cafes and restaurants in Sector 29 Gurugram"
    count = payload.max_results or 10

    discovered = await run_gemini_cloud_lead_discovery(query=query, count=count)
    saved_count = 0

    for item in discovered:
        name = item.get("name", "").strip()
        if not name:
            continue
        stmt = select(Lead).where(Lead.business_name == name)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if not existing:
            lead = Lead(
                business_name=name,
                category=item.get("category", ""),
                address=item.get("address", ""),
                phone=item.get("phone", ""),
                website=item.get("website", ""),
                rating=str(item.get("rating", "4.2")),
                reviews_count=str(item.get("reviews_count", "50")),
                lead_score=item.get("lead_score", 85),
                problems_identified=item.get("problems_identified", ""),
                sales_pitch=item.get("sales_pitch", ""),
                source_query=f"Cloud AI: {query}",
                deal_value=35000,
            )
            db.add(lead)
            saved_count += 1

    if saved_count > 0:
        db.add(
            ActivityLog(
                event_type="cloud_discovery",
                title=f"☁️ Cloud AI Discovered {saved_count} Leads",
                description=f"Gemini Pro cloud engine retrieved {saved_count} businesses for '{query}'.",
            )
        )
        await db.commit()
        await manager.broadcast(
            "SCRAPE_COMPLETED", {"leads_saved": saved_count, "query": query}
        )

    return {
        "status": "success",
        "query": query,
        "discovered_count": len(discovered),
        "saved_count": saved_count,
        "message": f"Cloud AI discovered {len(discovered)} businesses, saved {saved_count} new high-converting leads.",
    }


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


@app.get("/api/agents", tags=["AI Engine"])
async def get_agents():
    """Returns real-time status and sector targets of all 3 parallel AI Hunters."""
    return get_agents_status_list()


@app.post("/api/agents/reset", tags=["AI Engine"])
async def reset_agents_endpoint():
    """Manually unstuck and reset all AI hunters and running jobs."""
    res = await reset_all_agents_and_jobs()
    return res


@app.post("/api/scrape/trigger", response_model=ScrapeResponse, tags=["Scraping"])
async def manual_trigger_scrape(
    payload: ScrapeRequest,
    background_tasks: BackgroundTasks,
):
    """Trigger an immediate scrape using 1 or ALL 3 AI Hunters simultaneously."""
    if payload.run_all_agents:
        # Launch ALL 3 AI hunters in parallel!
        per_agent = max(6, payload.max_results // 3)
        background_tasks.add_task(
            execute_all_agents_simultaneously,
            max_results_per_agent=per_agent,
        )
        return ScrapeResponse(
            job_id=0,
            query="3x Simultaneous AI Hunters (F&B, Healthcare, Retail)",
            message="🚀 All 3 AI Hunters deployed in parallel! New qualified leads will stream live.",
            agent_name="Triple AI Fleet",
        )
    elif payload.agent_id in [1, 2, 3]:
        background_tasks.add_task(
            execute_agent_hunt,
            agent_id=payload.agent_id,
            target_query=payload.query.strip() if payload.query else None,
            max_results=payload.max_results,
            force=True,
        )
        agent_names = {1: "Hunter Alpha (F&B)", 2: "Hunter Beta (Healthcare)", 3: "Hunter Gamma (Retail/Property)"}
        name = agent_names.get(payload.agent_id, "AI Hunter")
        return ScrapeResponse(
            job_id=0,
            query=payload.query or "Specialty Rotation",
            message=f"🚀 {name} launched! Results will stream live via WebSocket.",
            agent_name=name,
        )
    else:
        # Default single or multi
        target = payload.query.strip() if payload.query else "restaurants in Sector 29 Gurugram"
        background_tasks.add_task(
            execute_agent_hunt,
            agent_id=1,
            target_query=target,
            max_results=payload.max_results,
            force=True,
        )
        return ScrapeResponse(
            job_id=0,
            query=target,
            message=f"Scraper launched for '{target}'. Results will stream live.",
            agent_name="Hunter Alpha",
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


@app.get("/api/download-apk")
@app.get("/api/apk")
async def download_apk(type: str = "release"):
    """
    Directly serves the compiled Android APK for single-tap phone download and install.
    Returns standard MIME type application/vnd.android.package-archive.
    """
    project_root = Path(__file__).resolve().parent.parent
    if type == "debug":
        candidates = [
            project_root / "ShriApps-LeadGen-Debug.apk",
            project_root / "ShriApps-LeadGen.apk",
            project_root / "frontend" / "android" / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk",
        ]
    else:
        candidates = [
            project_root / "ShriApps-LeadGen-Release.apk",
            project_root / "ShriApps-LeadGen.apk",
            project_root / "frontend" / "android" / "app" / "build" / "outputs" / "apk" / "release" / "app-release.apk",
        ]

    for candidate in candidates:
        if candidate.exists():
            return FileResponse(
                path=str(candidate),
                media_type="application/vnd.android.package-archive",
                filename="ShriApps-LeadGen.apk",
            )

    raise HTTPException(status_code=404, detail="APK file not found on server")


# ---------------------------------------------------------------------------
# 🧠 AI ENGINE MANAGEMENT (Latest High-Thinking Models)
# ---------------------------------------------------------------------------

class AiConfigPayload(BaseModel):
    api_key: str
    model: str = "gemini-2.0-flash"


@app.get("/api/ai/status", tags=["AI Engine"])
async def get_ai_status():
    """Returns whether Gemini High-Thinking AI is configured and connected."""
    m, model_name = get_or_init_gemini()
    is_connected = m is not None
    return {
        "connected": is_connected,
        "model": model_name or "Deterministic B2B Qualifier",
        "provider": "Google Gemini" if is_connected else "Local High-IQ B2B Engine",
        "has_api_key": bool(
            settings.GEMINI_API_KEY
            and settings.GEMINI_API_KEY != "your_gemini_api_key_here"
        ),
    }


@app.post("/api/ai/config", tags=["AI Engine"])
async def set_ai_config(payload: AiConfigPayload):
    """Sets and saves Gemini API Key and reconfigures AI engine dynamically."""
    import re
    key = payload.api_key.strip()
    m, model_name = get_or_init_gemini(api_key=key)
    if not m:
        raise HTTPException(
            status_code=400,
            detail="Invalid Gemini API key or could not connect to Gemini models.",
        )

    settings.GEMINI_API_KEY = key
    # Persist to .env file
    env_file = Path(__file__).resolve().parent / ".env"
    if env_file.exists():
        content = env_file.read_text(encoding="utf-8")
        if "GEMINI_API_KEY=" in content:
            new_content = re.sub(r"GEMINI_API_KEY=.*", f"GEMINI_API_KEY={key}", content)
        else:
            new_content = content + f"\nGEMINI_API_KEY={key}"
        env_file.write_text(new_content, encoding="utf-8")

    return {
        "status": "success",
        "message": f"Gemini High-Thinking AI connected successfully using {model_name}!",
        "model": model_name,
    }


@app.post("/api/ai/test", tags=["AI Engine"])
async def test_ai_connection():
    """Runs a quick live test prompt on the configured AI model."""
    import asyncio
    m, model_name = get_or_init_gemini()
    if not m:
        return {
            "success": False,
            "message": "Gemini API key is not configured. Running on Deterministic B2B Qualifier.",
            "mode": "fallback",
        }
    try:
        res = await asyncio.to_thread(
            m.generate_content,
            "Say 'AI Online' and provide 1 sentence on high-converting B2B lead generation for Gurugram agencies.",
        )
        return {
            "success": True,
            "message": res.text.strip(),
            "model": model_name,
            "mode": "live_gemini",
        }
    except Exception as e:
        return {
            "success": False,
            "message": str(e),
            "mode": "error",
        }


@app.get("/download/app.apk", tags=["Mobile App"])
@app.get("/api/download-apk", tags=["Mobile App"])
async def download_apk():
    """Serves the signed release Android APK directly for instant phone installation."""
    apk_path = Path(__file__).resolve().parent.parent / "ShriApps-LeadGen.apk"
    if not apk_path.exists():
        raise HTTPException(status_code=404, detail="APK not found. Please rebuild.")
    return FileResponse(
        str(apk_path),
        media_type="application/vnd.android.package-archive",
        filename="ShriApps-LeadGen.apk",
    )


# ---------------------------------------------------------------------------
# 🌐 UNIFIED SINGLE-PORT FRONTEND SERVING (Zero Configuration)
# ---------------------------------------------------------------------------

if frontend_dist.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(frontend_dist / "assets")),
        name="frontend-assets",
    )

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        # Never intercept API, WS, docs, or OpenAPI endpoints
        if (
            full_path.startswith("api/")
            or full_path.startswith("ws/")
            or full_path.startswith("download/")
            or full_path in ["docs", "openapi.json", "redoc"]
        ):
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))
