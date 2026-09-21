"""
Tool 3: extract_requirements
Extracts goals, must-haves, nice-to-haves, and non-requirements with mandatory timestamp links.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field
from .base import BaseTool, ToolResult


class ExtractedRequirement(BaseModel):
    id: str
    category: str = Field(description="'must_have' | 'nice_to_have' | 'non_requirement' | 'goal'")
    text: str
    time: str = Field(description="Exact timestamp from call transcript (e.g. '01:24'). MANDATORY.")


class ExtractRequirementsTool(BaseTool):
    name = "extract_requirements"
    description = "Extracts structured requirements (goals, features, non-requirements) linked with timestamps."

    def run(self, raw_requirements: List[Dict[str, Any]], **kwargs) -> ToolResult:
        try:
            items = []
            for idx, req in enumerate(raw_requirements):
                time_str = req.get("time") or req.get("timestamp") or "00:00"
                item = ExtractedRequirement(
                    id=f"req_{idx+1}",
                    category=req.get("category", "must_have"),
                    text=req.get("text", ""),
                    time=time_str,
                )
                items.append(item.model_dump())

            return ToolResult(
                tool_name=self.name,
                success=True,
                data={
                    "requirements": items,
                    "count": len(items),
                },
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
