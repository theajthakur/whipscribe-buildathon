"""
Unit Tests for Server-Side Auth Verification, User Scoping, and Guardrail Rules.
"""

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from whipscribe.agent.models import AgentProposal, RequirementItem, TaskItem
from whipscribe.agent.guardrails import GuardrailValidator


class TestSecurityAndGuardrails(unittest.TestCase):

    def test_guardrail_drops_items_without_timestamps(self):
        proposal = AgentProposal(
            intent="discovery",
            summary="Test proposal",
            requirements=[
                RequirementItem(id="r1", category="must_have", text="Sync calendar", time="01:24"),
                RequirementItem(id="r2", category="nice_to_have", text="Dark mode", time=""),
                RequirementItem(id="r3", category="goal", text="Fast loading", time="00:00"),
            ],
            tasks=[
                TaskItem(id="t1", title="Calendar API", description="", effort="M", estimated_hours=5.0, time="01:45"),
                TaskItem(id="t2", title="Unverified task", description="", effort="S", estimated_hours=2.0, time=""),
            ],
        )

        transcript_text = "[01:24] CLIENT: Need calendar sync. [01:45] FREELANCER: I will build Calendar API."

        sanitized = GuardrailValidator.sanitize_proposal(proposal, transcript_text)

        # Requirement r2 (empty time) and r3 (unverified 00:00) should be dropped!
        self.assertEqual(len(sanitized.requirements), 1)
        self.assertEqual(sanitized.requirements[0].id, "r1")

        # Task t2 (empty time) should be dropped!
        self.assertEqual(len(sanitized.tasks), 1)
        self.assertEqual(sanitized.tasks[0].id, "t1")

    @patch.dict(os.environ, {"DEBUG": "false", "ALLOW_UNAUTHENTICATED_DEV": "false"})
    def test_unauthenticated_request_rejected_in_production(self):
        from fastapi import HTTPException
        from main import get_current_user_id

        # Calling without authorization header in non-DEBUG mode must raise 401 HTTPException
        with self.assertRaises(HTTPException) as ctx:
            get_current_user_id(authorization=None, x_user_id=None, db=MagicMock())

        self.assertEqual(ctx.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
