"""
database.py — SQLAlchemy async engine + models for 24/7 lead generation.
"""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class LeadStatus(str, enum.Enum):
    NEW = "new"
    AUDITED = "audited"
    CONTACTED = "contacted"
    INTERESTED = "interested"
    PROPOSAL_SENT = "proposal_sent"
    CLOSED = "closed"
    REJECTED = "rejected"


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    # Business Profile
    business_name = Column(String(255), nullable=False, index=True)
    category = Column(String(128), nullable=True, index=True)
    address = Column(String(512), nullable=True)
    phone = Column(String(32), nullable=True, index=True)
    website = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    rating = Column(String(16), nullable=True)
    reviews_count = Column(String(32), nullable=True)

    # AI Lead Intelligence
    lead_score = Column(Integer, default=50, index=True)  # 1 to 100
    problems_identified = Column(Text, nullable=True)
    sales_pitch = Column(Text, nullable=True)

    # Agency & Gemini Pro Research Toolkit
    audit_report = Column(Text, nullable=True)  # JSON or markdown audit from Gemini Pro
    proposal_content = Column(Text, nullable=True)  # Full B2B agency proposal
    deal_value = Column(Integer, default=25000, nullable=False)  # Deal size in INR
    followup_sequence = Column(Text, nullable=True)  # 3-touch WhatsApp sequence

    # CRM Pipeline & Metadata
    source_query = Column(String(255), nullable=True)
    status = Column(Enum(LeadStatus), default=LeadStatus.NEW, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(255), nullable=False)
    agent_name = Column(String(128), default="AI Hunter 1", nullable=True)
    status = Column(String(32), default="running", index=True)  # running, completed, failed
    leads_found = Column(Integer, default=0)
    leads_saved = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)  # scrape_started, lead_found, status_changed, scheduler_toggle
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class SchedulerConfig(Base):
    __tablename__ = "scheduler_config"

    id = Column(Integer, primary_key=True)
    is_enabled = Column(Boolean, default=True)
    interval_minutes = Column(Integer, default=60)
    current_category_index = Column(Integer, default=0)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    custom_queries = Column(Text, nullable=True)


async def init_db() -> None:
    """Create all tables and migrate columns if needed."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Check and migrate columns in existing leads table
        try:
            res = await conn.execute(text("PRAGMA table_info(leads)"))
            cols = {row[1] for row in res.fetchall()}
            if "audit_report" not in cols:
                await conn.execute(text("ALTER TABLE leads ADD COLUMN audit_report TEXT"))
            if "proposal_content" not in cols:
                await conn.execute(text("ALTER TABLE leads ADD COLUMN proposal_content TEXT"))
            if "deal_value" not in cols:
                await conn.execute(text("ALTER TABLE leads ADD COLUMN deal_value INTEGER DEFAULT 25000"))
            if "followup_sequence" not in cols:
                await conn.execute(text("ALTER TABLE leads ADD COLUMN followup_sequence TEXT"))
        except Exception:
            pass


async def get_db():
    """FastAPI dependency — yields an async database session."""
    async with AsyncSessionLocal() as session:
        yield session
