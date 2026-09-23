"""
Tool 5: estimate_timeline_and_quote
Calculates project timeline and pricing quote from task breakdown & freelancer hourly rate.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from whipscribe.agent.models import TaskItem, QuoteEstimate
from .base import BaseTool, ToolResult
from .calculate_productivity_and_budget import (
    calculate_task_productivity_and_quote,
    normalize_currency_to_usd,
    calculate_productivity_factor,
)


class QuoteCalculation(BaseModel):
    hourly_rate: float
    total_hours: float
    total_price: float
    currency: str = "USD"
    normalized_rate_usd: float = 0.0
    productivity_factor: float = 1.0
    budget: Optional[float] = None
    budget_status: Optional[str] = None
    estimated_weeks: float = 0.5
    task_breakdown: List[Dict[str, Any]]


def calculate_quote_tool(
    tasks: List[TaskItem],
    hourly_rate: float = 100.0,
    currency: str = "USD",
    budget: Optional[float] = None,
) -> QuoteEstimate:
    """Calculates timeline and pricing quote from a list of tasks with effort sizing and productivity adjustment."""
    return calculate_task_productivity_and_quote(
        tasks=tasks,
        hourly_rate=hourly_rate,
        currency=currency,
        budget=budget,
    )


class EstimateTimelineAndQuoteTool(BaseTool):
    name = "estimate_timeline_and_quote"
    description = "Calculates total hours, project timeline in weeks, and cost quote based on task effort and productivity scaling."

    def run(
        self,
        tasks: List[Dict[str, Any]],
        hourly_rate: float = 100.0,
        currency: str = "USD",
        budget: Optional[float] = None,
        weekly_capacity_hours: float = 30.0,
        **kwargs,
    ) -> ToolResult:
        try:
            quote_estimate = calculate_task_productivity_and_quote(
                tasks=tasks,
                hourly_rate=hourly_rate,
                currency=currency,
                budget=budget,
            )
            weeks = max(0.5, round(quote_estimate.total_hours / weekly_capacity_hours, 1))

            data_dict = quote_estimate.model_dump()
            data_dict["estimated_weeks"] = weeks

            return ToolResult(
                tool_name=self.name,
                success=True,
                data=data_dict,
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
