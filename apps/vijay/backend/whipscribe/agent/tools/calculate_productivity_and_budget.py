"""
Tool: calculate_productivity_and_budget
Calculates productivity scaling based on freelancer hourly rate, normalizes currency (e.g. 1 USD = 90 INR),
and estimates adjusted task completion times & quotes according to project budget.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from whipscribe.agent.models import TaskItem, QuoteEstimate
from .base import BaseTool, ToolResult

# Approximate fixed currency conversion rates relative to USD (1 USD = X Currency)
DEFAULT_CURRENCY_RATES_TO_USD: Dict[str, float] = {
    "USD": 1.0,
    "INR": 90.0,   # 1 USD = 90 INR (Approximate price as requested)
    "EUR": 0.92,   # 1 USD = 0.92 EUR
    "GBP": 0.79,   # 1 USD = 0.79 GBP
    "AUD": 1.52,   # 1 USD = 1.52 AUD
    "CAD": 1.36,   # 1 USD = 1.36 CAD
    "JPY": 150.0,  # 1 USD = 150 JPY
}


def normalize_currency_to_usd(amount: float, currency: str = "USD") -> float:
    """Converts an amount from specified currency to USD using normalized fixed rates."""
    curr_upper = (currency or "USD").upper().strip()
    rate_to_usd = DEFAULT_CURRENCY_RATES_TO_USD.get(curr_upper, 1.0)
    return amount / rate_to_usd if rate_to_usd > 0 else amount


def calculate_productivity_factor(normalized_rate_usd: float, base_rate_usd: float = 50.0) -> float:
    """
    Calculates freelancer productivity factor relative to a baseline rate ($50 USD/hr).
    Higher rate freelancers scale higher in efficiency/speed (tasks take fewer hours).
    Lower rate freelancers scale lower in efficiency (tasks take more hours).
    Uses a square-root curve clamped between 0.5x and 2.5x.
    """
    if normalized_rate_usd <= 0:
        return 1.0
    raw_factor = (normalized_rate_usd / base_rate_usd) ** 0.5
    return max(0.5, min(2.5, round(raw_factor, 2)))


def calculate_task_productivity_and_quote(
    tasks: List[Any],
    hourly_rate: float = 50.0,
    currency: str = "USD",
    budget: Optional[float] = None,
    base_rate_usd: float = 50.0,
) -> QuoteEstimate:
    """
    Calculates timeline, task time estimates adjusted by productivity multiplier, and total quote.
    """
    effort_hours_map = {"S": 2.0, "M": 5.0, "L": 12.0}

    # Normalize rate to USD base
    normalized_rate_usd = normalize_currency_to_usd(hourly_rate, currency)
    prod_factor = calculate_productivity_factor(normalized_rate_usd, base_rate_usd=base_rate_usd)

    total_hours = 0.0
    breakdown = []

    for idx, task in enumerate(tasks):
        if isinstance(task, dict):
            task_id = task.get("id") or f"task_{idx+1}"
            title = task.get("title") or task.get("task_title") or f"Task {idx+1}"
            effort = (task.get("effort") or "M").upper()
            raw_hours = task.get("estimated_hours") or effort_hours_map.get(effort, 5.0)
        else:
            task_id = getattr(task, "id", f"task_{idx+1}")
            title = getattr(task, "title", f"Task {idx+1}")
            effort = getattr(task, "effort", "M").upper()
            raw_hours = getattr(task, "estimated_hours", None) or effort_hours_map.get(effort, 5.0)

        # Scale estimated task hours according to freelancer productivity factor
        adjusted_hours = max(0.5, round(float(raw_hours) / prod_factor, 1))
        task_cost = round(adjusted_hours * hourly_rate, 2)
        total_hours += adjusted_hours

        breakdown.append({
            "task_id": task_id,
            "task_title": title,
            "effort": effort,
            "raw_base_hours": float(raw_hours),
            "adjusted_hours": adjusted_hours,
            "cost": task_cost,
        })

    total_price = round(total_hours * hourly_rate, 2)
    total_hours = round(total_hours, 1)

    # Calculate Budget Status if budget is supplied
    budget_status = None
    if budget is not None and budget > 0:
        if total_price <= budget:
            budget_status = "within_budget"
        elif total_price <= budget * 1.15:
            budget_status = "slightly_over_budget"
        else:
            budget_status = "exceeds_budget"

    return QuoteEstimate(
        hourly_rate=hourly_rate,
        total_hours=total_hours,
        total_price=total_price,
        currency=currency.upper(),
        normalized_rate_usd=round(normalized_rate_usd, 2),
        productivity_factor=prod_factor,
        budget=budget,
        budget_status=budget_status,
        breakdown=breakdown,
    )


class CalculateProductivityAndBudgetTool(BaseTool):
    """Tool for calculating task estimated time, productivity scaling, and budget alignment."""

    name = "calculate_productivity_and_budget"
    description = (
        "Normalizes hourly rates to USD (e.g. 1 USD = 90 INR), calculates freelancer productivity "
        "scaling factor, and estimates adjusted task completion hours & quote according to project budget."
    )

    def run(
        self,
        tasks: List[Dict[str, Any]],
        hourly_rate: float = 50.0,
        currency: str = "USD",
        budget: Optional[float] = None,
        **kwargs,
    ) -> ToolResult:
        try:
            quote = calculate_task_productivity_and_quote(
                tasks=tasks,
                hourly_rate=hourly_rate,
                currency=currency,
                budget=budget,
            )
            return ToolResult(
                tool_name=self.name,
                success=True,
                data=quote.model_dump(),
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
