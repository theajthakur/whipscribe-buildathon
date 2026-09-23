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
from .calculate_productivity_and_budget import (
    CalculateProductivityAndBudgetTool,
    calculate_task_productivity_and_quote,
    normalize_currency_to_usd,
    calculate_productivity_factor,
)
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
    "CalculateProductivityAndBudgetTool",
    "calculate_task_productivity_and_quote",
    "normalize_currency_to_usd",
    "calculate_productivity_factor",
    "CompareWithPreviousBriefTool",
    "DraftClientMessageTool",
    "SaveLeadNoteTool",
    "ToolRegistry",
]
