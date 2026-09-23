"""
Data Models for WhipScribe Agent Proposals, Requirements, Tasks, Quotes, and Diffs.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RequirementItem(BaseModel):
    id: str
    category: str = Field(description="'must_have' | 'nice_to_have' | 'non_requirement' | 'goal' | 'question'")
    text: str = Field(description="Extracted requirement text from client")
    time: str = Field(description="Exact timestamp in call (e.g. '01:24'). MANDATORY.")
    speaker: str = Field(default="CLIENT")


class TaskItem(BaseModel):
    id: str
    title: str
    description: str
    effort: str = Field(description="'S' (1-2h) | 'M' (3-6h) | 'L' (8-16h)")
    estimated_hours: float
    time: str = Field(description="Timestamp in call where task was discussed. MANDATORY.")


class QuoteEstimate(BaseModel):
    hourly_rate: float
    total_hours: float
    total_price: float
    currency: str = "USD"
    normalized_rate_usd: float = 0.0
    productivity_factor: float = 1.0
    budget: Optional[float] = None
    budget_status: Optional[str] = None
    breakdown: List[Dict[str, Any]]


class ScopeChangeItem(BaseModel):
    id: str
    original_agreement: Optional[str] = None
    new_request: str
    is_scope_creep: bool
    price_impact: float
    time: str = Field(description="Timestamp in call where change was requested. MANDATORY.")


class AgentProposal(BaseModel):
    intent: str
    summary: str
    requirements: List[RequirementItem] = Field(default_factory=list)
    tasks: List[TaskItem] = Field(default_factory=list)
    scope_changes: List[ScopeChangeItem] = Field(default_factory=list)
    quote: Optional[QuoteEstimate] = None
    client_message_draft: str = ""
    lead_note: str = ""
