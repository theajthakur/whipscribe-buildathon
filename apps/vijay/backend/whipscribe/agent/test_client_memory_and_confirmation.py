"""
Integration Test Suite for Client & Project Memory, Change Request Comparison, and Confirmation Tracking.
"""

import sys
import unittest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from whipscribe.db import Base, crud, models
from whipscribe.agent import AgentOrchestrator, CallIntent
from whipscribe.agent.tools.calculate_productivity_and_budget import calculate_task_productivity_and_quote


class TestClientMemoryAndConfirmation(unittest.TestCase):

    def setUp(self):
        # Create an in-memory SQLite DB for testing
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        # Create test user
        self.user_id = "user_test_freelancer_123"
        self.user = crud.upsert_user_from_clerk(self.db, {"id": self.user_id, "first_name": "Test", "last_name": "Freelancer"})

    def tearDown(self):
        self.db.close()

    def test_client_and_project_creation(self):
        client = crud.create_client(self.db, user_id=self.user_id, name="Salon Chain Inc", whatsapp_number="+15551234567")
        self.assertIsNotNone(client.id)
        self.assertEqual(client.name, "Salon Chain Inc")

        projects = crud.list_client_projects(self.db, client_id=client.id, user_id=self.user_id)
        self.assertEqual(len(projects), 0)

        project = crud.create_project(self.db, client_id=client.id, user_id=self.user_id, title="Online Booking Web Platform")
        self.assertIsNotNone(project.id)

        projects_after = crud.list_client_projects(self.db, client_id=client.id, user_id=self.user_id)
        self.assertEqual(len(projects_after), 1)
        self.assertEqual(projects_after[0].title, "Online Booking Web Platform")

    def test_change_request_history_comparison(self):
        client = crud.create_client(self.db, user_id=self.user_id, name="Acro Corp")
        project = crud.create_project(self.db, client_id=client.id, user_id=self.user_id, title="Mobile App")

        # Initial call record with agreed scope
        call1 = crud.create_call_record(
            db=self.db,
            project_id=project.id,
            detected_intent="discovery",
            confidence=0.95,
        )
        crud.add_item_to_call(self.db, call_id=call1.id, item_type="requirement", text="User Auth via Phone Number", original_agent_text="User Auth", timestamp_link="00:15")
        crud.add_item_to_call(self.db, call_id=call1.id, item_type="task", text="Build phone login flow", original_agent_text="Build login", effort="M")

        # Extract history summary for project
        history_text = crud.get_previous_brief_for_project_or_client(self.db, user_id=self.user_id, project_id=project.id)
        self.assertIsNotNone(history_text)
        self.assertIn("User Auth via Phone Number", history_text)

        # Run Change Request playbook with previous history
        orchestrator = AgentOrchestrator()
        change_transcript = [
            {"time": "00:10", "speaker": "CLIENT", "text": "We want to add multi-factor SMS authentication and Google OAuth login to our mobile app."},
            {"time": "00:40", "speaker": "FREELANCER", "text": "That extends our previous agreement of basic phone login."},
        ]

        result = orchestrator.process_call(
            transcript_data=change_transcript,
            override_intent=CallIntent.CHANGE_REQUEST,
            previous_brief_summary=history_text,
            hourly_rate=100.0,
        )

        self.assertEqual(result.router_result.intent, CallIntent.CHANGE_REQUEST)
        self.assertIsNotNone(result.proposal)
        self.assertEqual(result.proposal.intent, "change_request")

    def test_confirmation_lifecycle(self):
        sub = crud.create_user_submission(self.db, user_id=self.user_id, source_type="audio_file", source_location="/uploads/test.mp3")
        call = crud.create_call_record(self.db, submission_id=sub.id, detected_intent="discovery")

        # Create scope confirmation
        scope_msg = "Hi Client, here is the proposal for the online booking app: $2,500 total quote."
        conf = crud.create_confirmation(self.db, call_id=call.id, user_id=self.user_id, proposed_scope_message=scope_msg)
        self.assertEqual(conf.status, "pending_client_approval")

        # Update status to sent and then approved with client reply
        updated = crud.update_confirmation_status(self.db, confirmation_id=conf.id, user_id=self.user_id, status="approved", client_reply_text="Looks great, let's proceed!")
        self.assertEqual(updated.status, "approved")
        self.assertEqual(updated.client_reply_text, "Looks great, let's proceed!")

    def test_dynamic_quote_calculation_on_cache(self):
        tasks = [{"title": "API Backend", "effort": "L"}, {"title": "Auth UI", "effort": "S"}]
        quote = calculate_task_productivity_and_quote(tasks=tasks, hourly_rate=120.0, currency="USD")
        self.assertGreater(quote.total_hours, 0)
        self.assertAlmostEqual(quote.total_price, quote.total_hours * 120.0, places=2)


if __name__ == "__main__":
    unittest.main()
