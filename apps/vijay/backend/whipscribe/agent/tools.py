"""
Tool Registry for WhipScribe Agent Workflow.

Each tool is a modular function producing structured outputs with mandatory timestamp verification.
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
    breakdown: List[Dict[str, Any]]


class ScopeChangeItem(BaseModel):
    id: str
    original_agreement: Optional[str]
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


# Tool helper functions
def format_transcript_tool(transcript_data: List[Dict[str, Any]]) -> str:
    """Formats raw transcript entries into a clean readable string with timestamps and speakers."""
    formatted_lines = []
    for line in transcript_data:
        time = line.get("time") or line.get("timestamp") or "00:00"
        speaker = line.get("speaker") or "SPEAKER"
        text = line.get("text") or ""
        formatted_lines.append(f"[{time}] {speaker}: {text}")
    return "\n".join(formatted_lines)


def calculate_quote_tool(
    tasks: List[TaskItem],
    hourly_rate: float = 100.0,
    currency: str = "USD",
) -> QuoteEstimate:
    """Calculates timeline and pricing quote from a list of tasks with effort sizing."""
    effort_hours_map = {"S": 2.0, "M": 5.0, "L": 12.0}

    total_hours = 0.0
    breakdown = []

    for task in tasks:
        hours = task.estimated_hours or effort_hours_map.get(task.effort.upper(), 4.0)
        cost = hours * hourly_rate
        total_hours += hours
        breakdown.append({
            "task_id": task.id,
            "task_title": task.title,
            "effort": task.effort,
            "hours": hours,
            "cost": cost,
        })

    total_price = total_hours * hourly_rate

    return QuoteEstimate(
        hourly_rate=hourly_rate,
        total_hours=total_hours,
        total_price=total_price,
        currency=currency,
        breakdown=breakdown,
    )
