"""
Tool 1: get_transcript
Formats transcript entries with speakers and timestamps.
"""

from typing import List, Dict, Any
from .base import BaseTool, ToolResult


def format_transcript_tool(transcript_data: List[Dict[str, Any]]) -> str:
    """Formats raw transcript entries into a clean readable string with timestamps and speakers."""
    formatted_lines = []
    for line in transcript_data:
        time = line.get("time") or line.get("timestamp") or "00:00"
        speaker = line.get("speaker") or "SPEAKER"
        text = line.get("text") or ""
        formatted_lines.append(f"[{time}] {speaker}: {text}")
    return "\n".join(formatted_lines)


class GetTranscriptTool(BaseTool):
    name = "get_transcript"
    description = "Formats raw transcript entries with speaker tags and timestamp markers."

    def run(self, transcript_data: List[Dict[str, Any]], **kwargs) -> ToolResult:
        try:
            result_text = format_transcript_tool(transcript_data)
            return ToolResult(
                tool_name=self.name,
                success=True,
                data={
                    "formatted_text": result_text,
                    "line_count": len(transcript_data),
                },
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
