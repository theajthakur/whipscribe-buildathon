"""
CRUD Operations for WhipScribe CallBrief Database Models.
Supports Clerk user webhook syncing, settings defaults, user submissions,
client & project management, call records, items, and agent run logging.
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from .models import (
    User,
    Settings,
    UserSubmission,
    Client,
    Project,
    Call,
    Item,
    Confirmation,
    AgentRun,
)


# --- User & Settings Sync (Clerk Webhooks) ---

def upsert_user_from_clerk(db: Session, clerk_user_data: Dict[str, Any]) -> User:
    """Creates or updates a User record from Clerk webhook payload and ensures Settings exist."""
    clerk_id = clerk_user_data.get("id")
    if not clerk_id:
        raise ValueError("Clerk payload missing user 'id'")

    # Extract primary email
    email_addresses = clerk_user_data.get("email_addresses", [])
    primary_email_id = clerk_user_data.get("primary_email_address_id")
    email = None

    for email_obj in email_addresses:
        if email_obj.get("id") == primary_email_id:
            email = email_obj.get("email_address")
            break
    if not email and email_addresses:
        email = email_addresses[0].get("email_address")

    email = email or f"{clerk_id}@placeholder.clerk"

    first_name = clerk_user_data.get("first_name")
    last_name = clerk_user_data.get("last_name")
    avatar_url = clerk_user_data.get("image_url") or clerk_user_data.get("profile_image_url")

    user = db.query(User).filter(User.id == clerk_id).first()

    if user:
        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.avatar_url = avatar_url
    else:
        user = User(
            id=clerk_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Ensure default Settings row exists (one row per user)
    get_or_create_settings(db, user_id=user.id)

    return user


def delete_user_from_clerk(db: Session, clerk_id: str) -> bool:
    """Deletes user when user.deleted webhook fires."""
    user = db.query(User).filter(User.id == clerk_id).first()
    if user:
        db.delete(user)
        db.commit()
        return True
    return False


def get_or_create_settings(db: Session, user_id: str) -> Settings:
    """Retrieves or creates default Settings for a user."""
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings:
        settings = Settings(
            user_id=user_id,
            hourly_rate=100.0,
            currency="USD",
            message_tone="friendly and professional",
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# --- User Submissions ---

def create_user_submission(
    db: Session,
    user_id: str,
    source_type: str,
    source_location: str,
    transcript_job_id: Optional[str] = None,
) -> UserSubmission:
    """Records a new audio / video / chat submission from a user."""
    submission = UserSubmission(
        user_id=user_id,
        source_type=source_type,
        source_location=source_location,
        transcript_job_id=transcript_job_id,
        status="pending",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def update_submission_status(
    db: Session,
    submission_id: str,
    status: str,
    transcript_json: Optional[Dict[str, Any]] = None,
) -> Optional[UserSubmission]:
    """Updates submission status and transcript payload."""
    sub = db.query(UserSubmission).filter(UserSubmission.id == submission_id).first()
    if sub:
        sub.status = status
        if transcript_json:
            sub.transcript_json = transcript_json
        db.commit()
        db.refresh(sub)
    return sub


# --- Call & Proposal Items ---

def create_call_record(
    db: Session,
    submission_id: Optional[str] = None,
    project_id: Optional[str] = None,
    file_type: str = "call_recording",
    transcript_text: Optional[str] = None,
    transcript_data: Optional[List[Dict[str, Any]]] = None,
    detected_intent: Optional[str] = None,
    confidence: float = 0.0,
) -> Call:
    """Creates a call record with transcript and classified intent."""
    call = Call(
        user_submission_id=submission_id,
        project_id=project_id,
        file_type=file_type,
        transcript_text=transcript_text,
        transcript_data=transcript_data,
        detected_intent=detected_intent,
        confidence=confidence,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def add_item_to_call(
    db: Session,
    call_id: str,
    item_type: str,
    text: str,
    original_agent_text: str,
    timestamp_link: Optional[str] = None,
    effort: Optional[str] = None,
) -> Item:
    """Adds a proposal item (requirement, task, question, quote) to a call."""
    item = Item(
        call_id=call_id,
        type=item_type,
        text=text,
        original_agent_text=original_agent_text,
        timestamp_link=timestamp_link,
        effort=effort,
        status="proposed",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def log_agent_run(
    db: Session,
    intent: str,
    call_id: Optional[str] = None,
    tools_called: Optional[List[Dict[str, Any]]] = None,
    logs: Optional[List[str]] = None,
) -> AgentRun:
    """Logs an agent execution run with tool calls for auditing."""
    run = AgentRun(
        call_id=call_id,
        intent=intent,
        tools_called=tools_called,
        logs=logs,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
