"""
Router Agent for WhipScribe Call Classification.

Uses Vertex AI Gemini to analyze call transcripts and classify conversation intent
with confidence scoring and reason logging.
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from .vertex_client import VertexClientFactory


class CallIntent(str, Enum):
    DISCOVERY = "discovery"
    INQUIRY = "inquiry"
    CHANGE_REQUEST = "change_request"
    OTHER = "other"


class IntentChoice(BaseModel):
    intent: CallIntent
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")
    reason: str = Field(description="Reason why this intent applies")


class RouterResponse(BaseModel):
    primary_intent: CallIntent = Field(description="The primary detected call intent")
    confidence: float = Field(description="Confidence score for the primary intent from 0.0 to 1.0")
    reason: str = Field(description="One-line explanation of why this intent was selected")
    alternative_choices: List[IntentChoice] = Field(
        default_factory=list,
        description="Top alternative intent choices if confidence is not 1.0",
    )


class RouterResult(BaseModel):
    intent: CallIntent
    confidence: float
    reason: str
    needs_human_confirmation: bool
    top_choices: List[IntentChoice]


ROUTER_SYSTEM_INSTRUCTION = """You are an expert conversation classifier for freelance web developer client calls.
Analyze the raw transcript and determine which of the four call intents best describes the interaction:

1. 'discovery': First discovery call with a new client discussing a full project, goals, features, budget, or scope.
2. 'inquiry': Simple service inquiry ("Do you build X? What does it cost?") asking for a quick quote/reply without full scope planning.
3. 'change_request': Existing client asking for new features, modifications, or scope additions on an ongoing project.
4. 'other': Off-topic, general status check, or unclear conversation.

Rules:
- Assign a realistic confidence score between 0.0 and 1.0.
- Provide a clear, one-sentence reason citing transcript details.
- Provide alternative choices with their respective confidence scores if confidence is below 0.85.
"""


class RouterAgent:
    """Classifies client call intent using Vertex AI."""

    def __init__(self, client_factory: Optional[VertexClientFactory] = None):
        self.factory = client_factory or VertexClientFactory()

    def classify(self, transcript_text: str, client_history_summary: Optional[str] = None) -> RouterResult:
        """Classifies a transcript text into a CallIntent."""
        prompt = f"### TRANSCRIPT TO CLASSIFY:\n{transcript_text}\n"
        if client_history_summary:
            prompt += f"\n### PREVIOUS CLIENT HISTORY:\n{client_history_summary}\n"

        response: RouterResponse = self.factory.generate_structured(
            prompt=prompt,
            response_schema=RouterResponse,
            system_instruction=ROUTER_SYSTEM_INSTRUCTION,
            temperature=0.1,
        )

        needs_confirmation = response.confidence < 0.75

        top_choices = [
            IntentChoice(
                intent=response.primary_intent,
                confidence=response.confidence,
                reason=response.reason,
            )
        ] + response.alternative_choices

        return RouterResult(
            intent=response.primary_intent,
            confidence=response.confidence,
            reason=response.reason,
            needs_human_confirmation=needs_confirmation,
            top_choices=top_choices,
        )
