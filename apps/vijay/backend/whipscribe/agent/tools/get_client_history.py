"""
Tool 2: get_client_history
Fetches earlier calls and briefs for a specific client to support memory & scope comparison.
"""

from typing import Optional, List, Dict, Any
from .base import BaseTool, ToolResult


class GetClientHistoryTool(BaseTool):
    name = "get_client_history"
    description = "Retrieves earlier call briefs, notes, and agreed scope for a client."

    def run(self, client_id: str, history_records: Optional[List[Dict[str, Any]]] = None, **kwargs) -> ToolResult:
        try:
            records = history_records or []
            client_briefs = [r for r in records if r.get("client_id") == client_id]

            summary_lines = []
            for b in client_briefs:
                date = b.get("date", "Unknown date")
                project = b.get("project", "Default Project")
                brief_summary = b.get("summary", "")
                summary_lines.append(f"- [{date}] Project '{project}': {brief_summary}")

            combined_summary = "\n".join(summary_lines) if summary_lines else "No previous history found for this client."

            return ToolResult(
                tool_name=self.name,
                success=True,
                data={
                    "client_id": client_id,
                    "history_summary": combined_summary,
                    "record_count": len(client_briefs),
                },
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
