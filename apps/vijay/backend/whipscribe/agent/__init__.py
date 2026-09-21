"""
WhipScribe Agentic Module using Vertex AI & Google GenAI SDK.
"""

from .vertex_client import VertexClientFactory
from .router import RouterAgent, RouterResult, CallIntent
from .playbooks import PlaybookProcessor
from .tools import (
    AgentProposal,
    RequirementItem,
    TaskItem,
    QuoteEstimate,
    ScopeChangeItem,
    format_transcript_tool,
    calculate_quote_tool,
)
from .guardrails import GuardrailValidator
from .orchestrator import AgentOrchestrator, OrchestrationResult

__all__ = [
    "VertexClientFactory",
    "RouterAgent",
    "RouterResult",
    "CallIntent",
    "PlaybookProcessor",
    "AgentProposal",
    "RequirementItem",
    "TaskItem",
    "QuoteEstimate",
    "ScopeChangeItem",
    "format_transcript_tool",
    "calculate_quote_tool",
    "GuardrailValidator",
    "AgentOrchestrator",
    "OrchestrationResult",
]
