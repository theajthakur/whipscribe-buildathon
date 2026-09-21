"""
Tool 4: create_tasks
Generates task breakdown list with S / M / L effort sizing and timestamp links.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field
from .base import BaseTool, ToolResult


class TaskBreakdown(BaseModel):
    id: str
    title: str
    description: str
    effort: str = Field(description="'S' | 'M' | 'L'")
    estimated_hours: float
    time: str = Field(description="Timestamp in call where task was discussed. MANDATORY.")


class CreateTasksTool(BaseTool):
    name = "create_tasks"
    description = "Generates structured task breakdown with effort sizing (S/M/L) and timestamps."

    EFFORT_MAP = {"S": 2.0, "M": 5.0, "L": 12.0}

    def run(self, raw_tasks: List[Dict[str, Any]], **kwargs) -> ToolResult:
        try:
            tasks = []
            for idx, task_data in enumerate(raw_tasks):
                effort = (task_data.get("effort") or "M").upper()
                est_hours = task_data.get("estimated_hours") or self.EFFORT_MAP.get(effort, 4.0)
                time_str = task_data.get("time") or task_data.get("timestamp") or "00:00"

                t = TaskBreakdown(
                    id=f"task_{idx+1}",
                    title=task_data.get("title", f"Task {idx+1}"),
                    description=task_data.get("description", ""),
                    effort=effort,
                    estimated_hours=float(est_hours),
                    time=time_str,
                )
                tasks.append(t.model_dump())

            return ToolResult(
                tool_name=self.name,
                success=True,
                data={
                    "tasks": tasks,
                    "count": len(tasks),
                },
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
