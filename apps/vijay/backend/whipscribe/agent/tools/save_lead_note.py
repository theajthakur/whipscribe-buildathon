"""
Tool 8: save_lead_note
Saves lead summary note for lightweight inquiry tracking.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from .base import BaseTool, ToolResult


class LeadNoteRecord(BaseModel):
    client_name: str
    summary: str
    rough_price_range: Optional[str] = None
    urgency: str = "medium"


class SaveLeadNoteTool(BaseTool):
    name = "save_lead_note"
    description = "Saves internal lead note summary for client inquiry tracking."

    def run(
        self,
        client_name: str,
        summary: str,
        rough_price_range: Optional[str] = None,
        urgency: str = "medium",
        **kwargs,
    ) -> ToolResult:
        try:
            record = LeadNoteRecord(
                client_name=client_name,
                summary=summary,
                rough_price_range=rough_price_range,
                urgency=urgency,
            )

            return ToolResult(
                tool_name=self.name,
                success=True,
                data=record.model_dump(),
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
