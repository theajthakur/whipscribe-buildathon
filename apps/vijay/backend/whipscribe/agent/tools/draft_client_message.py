"""
Tool 7: draft_client_message
Drafts polite, professional confirmation or follow-up messages for WhatsApp/email.
"""

from typing import Optional, List, Dict, Any
from .base import BaseTool, ToolResult


class DraftClientMessageTool(BaseTool):
    name = "draft_client_message"
    description = "Drafts confirmation or follow-up text tailored for WhatsApp/email."

    def run(
        self,
        summary: str,
        total_price: Optional[float] = None,
        estimated_weeks: Optional[float] = None,
        channel: str = "WhatsApp",
        tone: str = "friendly and professional",
        **kwargs,
    ) -> ToolResult:
        try:
            lines = [f"Hi! Thanks for the call today."]
            lines.append(f"\nHere is a quick summary of what we discussed:\n• {summary}")

            if total_price and estimated_weeks:
                lines.append(
                    f"\nEstimated Timeline: ~{estimated_weeks} week(s)\nEstimated Quote: ${total_price:,.2f}"
                )

            lines.append(
                "\nPlease let me know if everything looks good or if you'd like to adjust any details before we get started!"
            )

            message_text = "\n".join(lines)

            return ToolResult(
                tool_name=self.name,
                success=True,
                data={
                    "channel": channel,
                    "tone": tone,
                    "message_text": message_text,
                },
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, data=None, error=str(e))
