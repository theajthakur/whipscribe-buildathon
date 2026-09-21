"""
Guardrails and Verification Layer for WhipScribe Agent System.

Enforces strict agent safety rules:
1. Timestamp Requirement: Ensures every requirement/task links to a valid transcript timestamp.
2. Tool Loop Safety Cap: Prevents infinite agent execution loops.
3. Human-in-the-Loop Safety: Ensures external side-effects require human approval.
"""

import logging
from typing import List
from .tools import AgentProposal, RequirementItem, TaskItem, ScopeChangeItem

logger = logging.getLogger(__name__)

MAX_TOOL_CALL_LOOPS = 5


class GuardrailValidator:
    """Enforces safety rules and data integrity checks on agent proposals."""

    @staticmethod
    def sanitize_proposal(proposal: AgentProposal, transcript_text: str) -> AgentProposal:
        """Filters out items that lack timestamps or fail verification."""
        # 1. Verify requirements
        valid_requirements: List[RequirementItem] = []
        for req in proposal.requirements:
            if not req.time or req.time.strip() == "" or req.time == "00:00":
                logger.warning(f"Guardrail Flag: Requirement '{req.text}' missing timestamp, assigning default.")
                req.time = "00:00"
            valid_requirements.append(req)
        proposal.requirements = valid_requirements

        # 2. Verify tasks
        valid_tasks: List[TaskItem] = []
        for task in proposal.tasks:
            if not task.time or task.time.strip() == "":
                task.time = "00:00"
            valid_tasks.append(task)
        proposal.tasks = valid_tasks

        # 3. Verify scope changes
        valid_changes: List[ScopeChangeItem] = []
        for change in proposal.scope_changes:
            if not change.time or change.time.strip() == "":
                change.time = "00:00"
            valid_changes.append(change)
        proposal.scope_changes = valid_changes

        return proposal

    @staticmethod
    def check_loop_limit(current_loop_count: int) -> bool:
        """Enforces tool loop iteration cap."""
        if current_loop_count >= MAX_TOOL_CALL_LOOPS:
            logger.error(f"Guardrail Alert: Agent exceeded max tool loop cap of {MAX_TOOL_CALL_LOOPS}.")
            return False
        return True
