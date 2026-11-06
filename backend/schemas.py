"""
schemas.py — Pydantic request/response validation schemas.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

from database import LeadStatus


class LeadBase(BaseModel):
    business_name: str
    category: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    rating: Optional[str] = None
    reviews_count: Optional[str] = None
    lead_score: Optional[int] = 50
    problems_identified: Optional[str] = None
    sales_pitch: Optional[str] = None
    source_query: Optional[str] = None
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    lead_score: Optional[int] = None
    sales_pitch: Optional[str] = None


class LeadOut(LeadBase):
    id: int
    status: LeadStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[LeadOut]


class ScrapeRequest(BaseModel):
    query: Optional[str] = None
    max_results: int = 15
    agent_id: Optional[int] = None
    run_all_agents: bool = False


class ScrapeResponse(BaseModel):
    job_id: int
    query: str
    message: str
    agent_name: Optional[str] = None


class ScrapeJobOut(BaseModel):
    id: int
    query: str
    agent_name: Optional[str] = "AI Hunter"
    status: str
    leads_found: int
    leads_saved: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class AgentStatusOut(BaseModel):
    id: int
    name: str
    specialty: str
    description: str
    is_active: bool
    current_target: str
    leads_found: int = 0


class ActivityLogOut(BaseModel):
    id: int
    event_type: str
    title: str
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SchedulerStatusResponse(BaseModel):
    is_enabled: bool
    interval_minutes: int
    current_category: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    total_jobs_run: int = 0
    leads_found_today: int = 0
    active_jobs_count: int = 0


class SchedulerConfigRequest(BaseModel):
    is_enabled: Optional[bool] = None
    interval_minutes: Optional[int] = None
    custom_queries: Optional[str] = None


class StatsResponse(BaseModel):
    total: int
    new: int
    contacted: int
    interested: int
    closed: int
    rejected: int
    today_new: int
    hot_leads_count: int
    average_score: float


class AnalyticsCategoryItem(BaseModel):
    category: str
    count: int


class AnalyticsStatusItem(BaseModel):
    status: str
    count: int


class AnalyticsDailyItem(BaseModel):
    date: str
    count: int


class AnalyticsResponse(BaseModel):
    total_leads: int
    hot_leads: int
    average_score: float
    categories: list[AnalyticsCategoryItem]
    statuses: list[AnalyticsStatusItem]
    daily_trend: list[AnalyticsDailyItem]
