"""
Database Verification Test Suite for WhipScribe CallBrief DB & Webhooks.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from whipscribe.db import SessionLocal, crud, models


def run_db_test():
    print("==================================================")
    print("Testing WhipScribe CallBrief PostgreSQL Database")
    print("==================================================")

    db = SessionLocal()
    try:
        # Test Clerk Webhook User Upsert
        clerk_test_payload = {
            "id": "user_2test_clerk_user_id_123",
            "primary_email_address_id": "email_1",
            "email_addresses": [
                {"id": "email_1", "email_address": "freelancer@test.com"}
            ],
            "first_name": "Vijay",
            "last_name": "Singh",
            "image_url": "https://img.clerk.com/avatar.png",
        }

        print("\n[1] Upserting User from Clerk Webhook Payload...")
        user = crud.upsert_user_from_clerk(db, clerk_test_payload)
        print(f"User created/updated: ID='{user.id}', Email='{user.email}', Name='{user.first_name} {user.last_name}'")

        print("\n[2] Checking Default User Settings Auto-Creation...")
        settings = crud.get_or_create_settings(db, user_id=user.id)
        print(f"Settings found: Rate=${settings.hourly_rate}/h ({settings.currency}), Tone='{settings.message_tone}'")

        print("\n[3] Testing User Submission Creation...")
        submission = crud.create_user_submission(
            db=db,
            user_id=user.id,
            source_type="audio_file",
            source_location="/uploads/client_call_recording.mp3",
            transcript_job_id="job_whip_999",
        )
        print(f"Submission Created: ID='{submission.id}', Status='{submission.status}', Source='{submission.source_location}'")

        print("\n[4] Testing Call Record & Proposal Items...")
        call_rec = crud.create_call_record(
            db=db,
            submission_id=submission.id,
            file_type="call_recording",
            transcript_text="[00:15] CLIENT: Need website redesign",
            detected_intent="discovery",
            confidence=0.95,
        )

        item = crud.add_item_to_call(
            db=db,
            call_id=call_rec.id,
            item_type="requirement",
            text="Website redesign with mobile-first layout",
            original_agent_text="Website redesign with mobile-first layout",
            timestamp_link="00:15",
        )
        print(f"Call Item Created: ID='{item.id}', Type='{item.type}', Timestamp='{item.timestamp_link}'")

        print("\nSUCCESS: All Database Models & CRUD operations verified on PostgreSQL!")

    finally:
        db.close()


if __name__ == "__main__":
    run_db_test()
