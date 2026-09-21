"""
Tool 5: estimate_timeline_and_quote
Calculates project timeline and pricing quote from task breakdown & freelancer hourly rate.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field
from whipscribe.agent.models import TaskItem, QuoteEstimate
from .base import BaseTool, ToolResult


class QuoteCalculation(BaseModel):
    hourly_rate: float
    total_hours: float
    total_price: float
    currency: str = "USD"
    estimated_weeks: float
    task_breakdown: List[Dict[str, Any]]


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


class EstimateTimelineAndQuoteTool(BaseTool):
    name = "estimate_timeline_and_quote"
    description = "Calculates total hours, project timeline in weeks, and cost quote based on task effort."

    EFFORT_HOURS = {"S": 2.0, "M": 5.0, "L": 12.0}

    def run(
        self,
        tasks: List[Dict[str, Any]],
        hourly_rate: float = 100.0,
        currency: str = "USD",
        weekly_capacity_hours: float = 30.0,
        **kwargs,
    ) -> ToolResult:
        try:
            total_hours = 0.0
            breakdown = []

            for task in tasks:
                effort = (task.get("effort") or "M").upper()
                hours = task.get("estimated_hours") or self.EFFORT_HOURS.get(effort, 4.0)
                cost = hours * hourly_rate
                total_hours += hours

                breakdown.append({
                    "task_title": task.get("title", "Task"),
                    "effort": effort,
                    "hours": hours,
                    "cost": cost,
                })

            total_price = total_hours * hourly_rate
            weeks = max(0.5, round(total_hours / weekly_capacity_hours, 1))

            quote = QuoteCalculation(
                hourly_rate=hourly_rate,
                total_hours=total_hours,
                total_price=total_price,
                currency=currency,
                estimated_weeks=weeks,
                task_breakdown=breakdown,
            )

            return ToolResult(
                tool_name=self.name,
                success=True,
                data=quote.model_dump(),
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
