"""
Agentic Orchestrator for WhipScribe Call Processing.

Main entrypoint coordinating RouterAgent intent detection, Playbook execution,
Guardrail safety verification, and Proposal generation.
"""

import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from .vertex_client import VertexClientFactory
from .router import RouterAgent, RouterResult, CallIntent
from .playbooks import PlaybookProcessor
from .tools import AgentProposal, format_transcript_tool
from .guardrails import GuardrailValidator

logger = logging.getLogger(__name__)


class OrchestrationResult(BaseModel):
    router_result: RouterResult
    proposal: Optional[AgentProposal] = None
    status: str = Field(description="'completed' | 'needs_intent_confirmation'")
    logs: List[str] = Field(default_factory=list)


class AgentOrchestrator:
    """Main Agentic Orchestrator for turning raw transcripts into structured proposals."""

    def __init__(
        self,
        vertex_factory: Optional[VertexClientFactory] = None,
        model_name: str = "gemini-2.5-flash",
    ):
        self.factory = vertex_factory or VertexClientFactory(model_name=model_name)
        self.router = RouterAgent(client_factory=self.factory)
        self.playbooks = PlaybookProcessor(client_factory=self.factory)
        self.validator = GuardrailValidator()

    def process_call(
        self,
        transcript_data: List[Dict[str, Any]],
        override_intent: Optional[CallIntent] = None,
        hourly_rate: float = 100.0,
        currency: str = "USD",
        previous_brief_summary: Optional[str] = None,
        confidence_threshold: float = 0.70,
    ) -> OrchestrationResult:
        """Processes a call transcript through intent classification, playbook execution, and guardrails."""
        logs = []
        transcript_text = format_transcript_tool(transcript_data)

        # 1. Intent Detection / Classification
        if override_intent:
            logger.info(f"Orchestrator: Using user-overridden intent '{override_intent.value}'")
            router_result = RouterResult(
                intent=override_intent,
                confidence=1.0,
                reason="User manually selected this intent.",
                needs_human_confirmation=False,
                top_choices=[],
            )
            logs.append(f"Intent overridden by user to: {override_intent.value}")
        else:
            logger.info("Orchestrator: Running RouterAgent for intent classification")
            router_result = self.router.classify(transcript_text, client_history_summary=previous_brief_summary)
            logs.append(f"Router classified intent as '{router_result.intent.value}' with confidence {router_result.confidence:.2f}")

        # 2. Check Confidence Guardrail
        if router_result.needs_human_confirmation and not override_intent and router_result.confidence < confidence_threshold:
            logger.warning("Orchestrator: Intent confidence below threshold. Halting for user confirmation.")
            logs.append("Execution paused: low intent confidence requires user confirmation.")
            return OrchestrationResult(
                router_result=router_result,
                proposal=None,
                status="needs_intent_confirmation",
                logs=logs,
            )

        # 3. Execute Selected Playbook
        selected_intent = router_result.intent
        logs.append(f"Running Playbook for intent '{selected_intent.value}'...")

        if selected_intent == CallIntent.DISCOVERY:
            proposal = self.playbooks.run_discovery(transcript_text, hourly_rate=hourly_rate, currency=currency)

        elif selected_intent == CallIntent.INQUIRY:
            proposal = self.playbooks.run_inquiry(transcript_text, hourly_rate=hourly_rate, currency=currency)

        elif selected_intent == CallIntent.CHANGE_REQUEST:
            proposal = self.playbooks.run_change_request(
                transcript_text,
                previous_brief_summary=previous_brief_summary,
                hourly_rate=hourly_rate,
                currency=currency,
            )

        else:
            proposal = self.playbooks.run_other(transcript_text)

        # 4. Enforce Guardrail Sanitization
        sanitized_proposal = self.validator.sanitize_proposal(proposal, transcript_text)
        logs.append("Guardrail verification completed: all extracted items verified with timestamps.")

        return OrchestrationResult(
            router_result=router_result,
            proposal=sanitized_proposal,
            status="completed",
            logs=logs,
        )
