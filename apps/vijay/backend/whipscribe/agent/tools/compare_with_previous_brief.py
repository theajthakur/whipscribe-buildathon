"""
Tool 6: compare_with_previous_brief
Compares change request calls against earlier project briefs to flag scope creep.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from .base import BaseTool, ToolResult


class ScopeDiffItem(BaseModel):
    id: str
    original_agreement: Optional[str] = None
    new_request: str
    is_scope_creep: bool
    price_impact: float
    time: str = Field(description="Timestamp from transcript. MANDATORY.")


class CompareWithPreviousBriefTool(BaseTool):
    name = "compare_with_previous_brief"
    description = "Compares new client change requests against earlier project briefs to detect scope creep."

    def run(
        self,
        new_requests: List[Dict[str, Any]],
        previous_brief_items: Optional[List[Dict[str, Any]]] = None,
        hourly_rate: float = 100.0,
        **kwargs,
    ) -> ToolResult:
        try:
            prev_summary = [p.get("text", "").lower() for p in (previous_brief_items or [])]
            diffs = []

            for idx, req in enumerate(new_requests):
                request_text = req.get("text") or req.get("new_request") or ""
                time_str = req.get("time") or req.get("timestamp") or "00:00"

                # Check if request was in previous brief
                is_already_agreed = any(request_text.lower() in p for p in prev_summary) if prev_summary else False
                is_creep = not is_already_agreed

                est_hours = req.get("estimated_hours") or 3.0
                impact = est_hours * hourly_rate if is_creep else 0.0

                diff = ScopeDiffItem(
                    id=f"diff_{idx+1}",
                    original_agreement="Agreed in initial brief" if is_already_agreed else "Not in initial brief",
                    new_request=request_text,
                    is_scope_creep=is_creep,
                    price_impact=impact,
                    time=time_str,
                )
                diffs.append(diff.model_dump())

            return ToolResult(
                tool_name=self.name,
                success=True,
                data={
                    "scope_changes": diffs,
                    "scope_creep_count": sum(1 for d in diffs if d["is_scope_creep"]),
                },
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
