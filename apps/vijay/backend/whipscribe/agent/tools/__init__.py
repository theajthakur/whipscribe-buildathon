"""
Modular Agent Tools Package for WhipScribe.
"""

from whipscribe.agent.models import (
    RequirementItem,
    TaskItem,
    QuoteEstimate,
    ScopeChangeItem,
    AgentProposal,
)
from .base import BaseTool, ToolResult
from .get_transcript import GetTranscriptTool, format_transcript_tool
from .get_client_history import GetClientHistoryTool
from .extract_requirements import ExtractRequirementsTool
from .create_tasks import CreateTasksTool
from .estimate_timeline_and_quote import EstimateTimelineAndQuoteTool, calculate_quote_tool
from .compare_with_previous_brief import CompareWithPreviousBriefTool
from .draft_client_message import DraftClientMessageTool
from .save_lead_note import SaveLeadNoteTool
from .registry import ToolRegistry

__all__ = [
    "RequirementItem",
    "TaskItem",
    "QuoteEstimate",
    "ScopeChangeItem",
    "AgentProposal",
    "BaseTool",
    "ToolResult",
    "GetTranscriptTool",
    "format_transcript_tool",
    "GetClientHistoryTool",
    "ExtractRequirementsTool",
    "CreateTasksTool",
    "EstimateTimelineAndQuoteTool",
    "calculate_quote_tool",
    "CompareWithPreviousBriefTool",
    "DraftClientMessageTool",
    "SaveLeadNoteTool",
    "ToolRegistry",
]
