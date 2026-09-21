"""
Playbooks for WhipScribe Call Processing.

Defines the output structure and prompt instructions for each of the 4 call intents:
1. Discovery Playbook
2. Inquiry Playbook
3. Change Request Playbook
4. Other / Fallback Playbook
"""

from typing import Optional, List
from pydantic import BaseModel, Field
from .vertex_client import VertexClientFactory
from .tools import (
    AgentProposal,
    RequirementItem,
    TaskItem,
    QuoteEstimate,
    ScopeChangeItem,
    calculate_quote_tool,
)


class DiscoveryOutputSchema(BaseModel):
    summary: str = Field(description="2-3 sentence overview of what the client wants")
    requirements: List[RequirementItem] = Field(description="List of features, goals, non-requirements. Timestamp is mandatory.")
    tasks: List[TaskItem] = Field(description="Task breakdown with S/M/L effort sizing and timestamp")
    client_message_draft: str = Field(description="Polite confirmation message to send the client over WhatsApp/email")


class InquiryOutputSchema(BaseModel):
    summary: str = Field(description="1-2 sentence overview of the inquiry")
    rough_price_range: str = Field(description="Estimated price range (e.g. '$1,500 – $2,500')")
    lead_note: str = Field(description="Internal lead note summarizing client intent and urgency")
    follow_up_message: str = Field(description="Short follow-up message draft to send to the client")


class ChangeRequestOutputSchema(BaseModel):
    summary: str = Field(description="Summary of requested changes")
    scope_changes: List[ScopeChangeItem] = Field(description="Diff comparing request against earlier brief. Timestamp is mandatory.")
    updated_tasks: List[TaskItem] = Field(description="New or modified tasks required")
    client_message_draft: str = Field(description="Message drafting scope impact & quote adjustment for client approval")


class OtherOutputSchema(BaseModel):
    summary: str = Field(description="Brief summary of conversation")
    action_items: List[RequirementItem] = Field(description="Action items or questions discussed")


class PlaybookProcessor:
    """Executes the appropriate playbook for a classified intent using Vertex AI."""

    def __init__(self, client_factory: Optional[VertexClientFactory] = None):
        self.factory = client_factory or VertexClientFactory()

    def run_discovery(
        self,
        transcript_text: str,
        hourly_rate: float = 100.0,
        currency: str = "USD",
    ) -> AgentProposal:
        """Runs the Discovery Playbook for first-time client calls."""
        system_instruction = """You are an AI assistant for a freelance web developer processing a Discovery Call recording.
Rules:
1. Extract must-have features, nice-to-haves, goals, and non-requirements into 'requirements'.
2. EVERY requirement and task MUST include the exact timestamp string (e.g. '01:24') from the transcript where it was mentioned. Do NOT invent timestamps.
3. Break down work into tasks with 'S' (1-2h), 'M' (3-6h), or 'L' (8-16h) effort tags.
4. Draft a friendly, professional client confirmation message.
"""

        prompt = f"### TRANSCRIPT:\n{transcript_text}"
        data: DiscoveryOutputSchema = self.factory.generate_structured(
            prompt=prompt,
            response_schema=DiscoveryOutputSchema,
            system_instruction=system_instruction,
            temperature=0.2,
        )

        quote = calculate_quote_tool(data.tasks, hourly_rate=hourly_rate, currency=currency)

        return AgentProposal(
            intent="discovery",
            summary=data.summary,
            requirements=data.requirements,
            tasks=data.tasks,
            quote=quote,
            client_message_draft=data.client_message_draft,
        )

    def run_inquiry(self, transcript_text: str, hourly_rate: float = 100.0, currency: str = "USD") -> AgentProposal:
        """Runs the Inquiry Playbook for quick service pricing calls."""
        system_instruction = """You are an AI assistant for a freelancer processing a simple Service Inquiry call.
Keep output lightweight:
1. Provide a concise summary.
2. Estimate a rough price range.
3. Write an internal lead note.
4. Draft a direct, polite follow-up message to send the client.
"""

        prompt = f"### TRANSCRIPT:\n{transcript_text}"
        data: InquiryOutputSchema = self.factory.generate_structured(
            prompt=prompt,
            response_schema=InquiryOutputSchema,
            system_instruction=system_instruction,
            temperature=0.2,
        )

        return AgentProposal(
            intent="inquiry",
            summary=f"{data.summary} (Estimated range: {data.rough_price_range})",
            client_message_draft=data.follow_up_message,
            lead_note=data.lead_note,
        )

    def run_change_request(
        self,
        transcript_text: str,
        previous_brief_summary: Optional[str] = None,
        hourly_rate: float = 100.0,
        currency: str = "USD",
    ) -> AgentProposal:
        """Runs the Change Request Playbook comparing calls against previous project briefs."""
        system_instruction = """You are an AI assistant for a freelancer processing a Change Request call on an ongoing project.
Rules:
1. Compare new requests against the previous brief if provided.
2. Flag items that represent Scope Creep.
3. EVERY scope change MUST carry a valid timestamp from the transcript.
4. Create updated/additional tasks for the new work.
5. Draft a confirmation message asking the client to approve the scope & timeline adjustment.
"""

        prompt = f"### TRANSCRIPT:\n{transcript_text}\n"
        if previous_brief_summary:
            prompt += f"\n### PREVIOUS BRIEF SUMMARY:\n{previous_brief_summary}\n"

        data: ChangeRequestOutputSchema = self.factory.generate_structured(
            prompt=prompt,
            response_schema=ChangeRequestOutputSchema,
            system_instruction=system_instruction,
            temperature=0.2,
        )

        quote = calculate_quote_tool(data.updated_tasks, hourly_rate=hourly_rate, currency=currency)

        return AgentProposal(
            intent="change_request",
            summary=data.summary,
            scope_changes=data.scope_changes,
            tasks=data.updated_tasks,
            quote=quote,
            client_message_draft=data.client_message_draft,
        )

    def run_other(self, transcript_text: str) -> AgentProposal:
        """Fallback playbook for unclear or general status calls."""
        system_instruction = """You are an AI assistant for a freelancer processing a general or off-topic call.
Summarize the call clearly and list any key action items discussed, including timestamps where applicable.
"""

        prompt = f"### TRANSCRIPT:\n{transcript_text}"
        data: OtherOutputSchema = self.factory.generate_structured(
            prompt=prompt,
            response_schema=OtherOutputSchema,
            system_instruction=system_instruction,
            temperature=0.2,
        )

        return AgentProposal(
            intent="other",
            summary=data.summary,
            requirements=data.action_items,
        )
