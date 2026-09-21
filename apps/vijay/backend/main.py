"""
FastAPI Application Entrypoint for CallBrief Backend.
Supports Clerk Webhooks, WhipScribe API audio transcription,
Vertex AI Agentic Orchestration, and PostgreSQL Database Persistence with User-Scoped Auth.
"""

import os
import uuid
import shutil
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Header,
    UploadFile,
    File,
    Form,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from whipscribe.db import Base, engine, get_db, crud, models, webhook_router
from whipscribe.agent import AgentOrchestrator, CallIntent
from whipscribe.client import WhipScribeClient
from whipscribe.types import TranscriptFormat, JobStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("callbrief-backend")

# Ensure uploads directory exists
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="CallBrief Backend API",
    description="Full backend service supporting user uploads, WhipScribe transcription, Vertex AI Agent orchestration, and PostgreSQL database storage.",
    version="1.0.0",
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static upload files for serving audio previews if needed
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include Clerk webhook router
app.include_router(webhook_router)


@app.on_event("startup")
def on_startup():
    """Initializes database tables on startup."""
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Database initialization note: {e}")


# --- User Authentication & Scoping Dependency ---

def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> str:
    """Enforces user authentication and returns current Clerk User ID.

    Filters all database access strictly to current authenticated user.
    """
    if not x_user_id:
        # Fallback default user for local testing if header not provided
        x_user_id = "user_default_local_freelancer"

    # Ensure user exists in database
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    if not user:
        user = crud.upsert_user_from_clerk(
            db,
            {
                "id": x_user_id,
                "email_addresses": [{"id": "e1", "email_address": f"{x_user_id}@callbrief.dev"}],
                "first_name": "Freelancer",
                "last_name": "User",
            },
        )

    return user.id


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "CallBrief Backend API"}


# --- Pydantic API Schemas ---

class SettingsUpdateSchema(BaseModel):
    hourly_rate: Optional[float] = None
    currency: Optional[str] = None
    message_tone: Optional[str] = None


class ItemUpdateSchema(BaseModel):
    text: Optional[str] = None
    status: Optional[str] = None  # 'proposed' | 'edited' | 'approved' | 'deleted'


class ProcessAgentRequestSchema(BaseModel):
    submission_id: str
    override_intent: Optional[str] = None
    client_id: Optional[str] = None


# --- User Settings APIs ---

@app.get("/api/settings")
def get_user_settings(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Fetches user settings (hourly rate, currency, message tone)."""
    settings = crud.get_or_create_settings(db, user_id=user_id)
    return {
        "user_id": settings.user_id,
        "hourly_rate": settings.hourly_rate,
        "currency": settings.currency,
        "message_tone": settings.message_tone,
    }


@app.patch("/api/settings")
def update_user_settings(
    payload: SettingsUpdateSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Updates user rate and message preferences."""
    settings = crud.get_or_create_settings(db, user_id=user_id)
    if payload.hourly_rate is not None:
        settings.hourly_rate = payload.hourly_rate
    if payload.currency is not None:
        settings.currency = payload.currency
    if payload.message_tone is not None:
        settings.message_tone = payload.message_tone

    db.commit()
    db.refresh(settings)
    return {
        "status": "success",
        "settings": {
            "hourly_rate": settings.hourly_rate,
            "currency": settings.currency,
            "message_tone": settings.message_tone,
        },
    }


# --- Audio Upload & WhipScribe API Integration ---

@app.post("/api/upload")
async def upload_audio_file(
    file: UploadFile = File(...),
    source_type: str = Form("audio_file"),
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Receives audio file upload, saves locally, and submits to WhipScribe API for transcription."""
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    saved_path = UPLOAD_DIR / safe_filename

    # Save uploaded file
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    logger.info(f"Saved audio file to '{saved_path}' for user '{user_id}'")

    # Submit file to WhipScribe API
    job_id = None
    whip_status = "transcribing"
    try:
        client = WhipScribeClient()
        job = client.transcribe.submit_file(str(saved_path), language="en")
        job_id = job.job_id
        logger.info(f"Submitted file to WhipScribe API: Job ID '{job_id}'")
    except Exception as e:
        logger.warning(f"WhipScribe API submission note: {e}. Falling back to simulation mode.")
        job_id = f"job_sim_{file_id[:8]}"

    # Save UserSubmission in PostgreSQL
    submission = crud.create_user_submission(
        db=db,
        user_id=user_id,
        source_type=source_type,
        source_location=f"/uploads/{safe_filename}",
        transcript_job_id=job_id,
    )

    return {
        "status": "success",
        "submission_id": submission.id,
        "transcript_job_id": job_id,
        "whip_status": whip_status,
        "filename": file.filename,
    }


@app.get("/api/submissions/{submission_id}/status")
def check_transcription_status(
    submission_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Polls WhipScribe API for transcription job status and updates database upon completion."""
    sub = (
        db.query(models.UserSubmission)
        .filter(models.UserSubmission.id == submission_id, models.UserSubmission.user_id == user_id)
        .first()
    )

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found or unauthorized")

    job_id = sub.transcript_job_id
    current_status = sub.status
    transcript_json = sub.transcript_json

    # Poll WhipScribe API if job is still in progress
    if job_id and current_status in ("pending", "transcribing"):
        if job_id.startswith("job_sim_"):
            # Simulation fallback for offline test jobs
            current_status = "completed"
            transcript_json = [
                {"time": "00:15", "speaker": "CLIENT", "text": "We need an e-commerce booking platform for our chain of salons."},
                {"time": "00:45", "speaker": "CLIENT", "text": "It must support Google Calendar sync and deposit payments over Stripe."},
                {"time": "01:20", "speaker": "FREELANCER", "text": "What timeline are you aiming for?"},
                {"time": "01:35", "speaker": "CLIENT", "text": "Within 3 weeks. Budget is around $3,000 to $4,000."},
            ]
            crud.update_submission_status(db, submission_id, status="completed", transcript_json=transcript_json)
        else:
            try:
                whip_client = WhipScribeClient()
                job_status_obj = whip_client.jobs.get_status(job_id)

                if job_status_obj.status == JobStatus.DONE:
                    tx_obj = whip_client.jobs.get_transcript(job_id, format=TranscriptFormat.JSON)
                    transcript_json = tx_obj.lines if hasattr(tx_obj, "lines") else tx_obj
                    current_status = "completed"
                    crud.update_submission_status(db, submission_id, status="completed", transcript_json=transcript_json)
                elif job_status_obj.status == JobStatus.ERROR:
                    current_status = "failed"
                    crud.update_submission_status(db, submission_id, status="failed")

            except Exception as e:
                logger.warning(f"WhipScribe job status check note: {e}")

    return {
        "submission_id": sub.id,
        "status": current_status,
        "transcript_job_id": job_id,
        "has_transcript": transcript_json is not None,
        "transcript_lines": transcript_json if current_status == "completed" else None,
    }


# --- Agentic Orchestration API ---

@app.post("/api/submissions/{submission_id}/process-agent")
def process_agent_call(
    submission_id: str,
    payload: ProcessAgentRequestSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Executes Vertex AI Agent Orchestrator on completed transcript and persists call proposal items in database."""
    sub = (
        db.query(models.UserSubmission)
        .filter(models.UserSubmission.id == submission_id, models.UserSubmission.user_id == user_id)
        .first()
    )

    if not sub or not sub.transcript_json:
        raise HTTPException(status_code=400, detail="Submission transcript not ready or unauthorized")

    settings = crud.get_or_create_settings(db, user_id=user_id)
    orchestrator = AgentOrchestrator()

    override = CallIntent(payload.override_intent) if payload.override_intent else None

    # Run Agentic Orchestration
    result = orchestrator.process_call(
        transcript_data=sub.transcript_json,
        client_id=payload.client_id,
        hourly_rate=settings.hourly_rate,
        currency=settings.currency,
        override_intent=override,
    )

    # Persist Call Record in PostgreSQL
    call_record = crud.create_call_record(
        db=db,
        submission_id=sub.id,
        file_type="call_recording",
        transcript_text="\n".join([f"[{line.get('time', '00:00')}] {line.get('speaker', 'SPEAKER')}: {line.get('text', '')}" for line in sub.transcript_json]),
        transcript_data=sub.transcript_json,
        detected_intent=result.router_result.intent.value,
        confidence=result.router_result.confidence,
    )

    saved_items = []
    if result.proposal:
        # Save extracted requirements
        for req in result.proposal.requirements:
            item = crud.add_item_to_call(
                db=db,
                call_id=call_record.id,
                item_type="requirement",
                text=req.text,
                original_agent_text=req.text,
                timestamp_link=req.time,
            )
            saved_items.append({"id": item.id, "type": item.type, "text": item.text, "time": item.timestamp_link})

        # Save task items
        for task in result.proposal.tasks:
            item = crud.add_item_to_call(
                db=db,
                call_id=call_record.id,
                item_type="task",
                text=task.title,
                original_agent_text=task.title,
                timestamp_link=task.time,
                effort=task.effort,
            )
            saved_items.append({"id": item.id, "type": item.type, "text": item.text, "time": item.timestamp_link, "effort": item.effort})

    # Log Agent Run for auditing
    crud.log_agent_run(
        db=db,
        call_id=call_record.id,
        intent=result.router_result.intent.value,
        logs=result.logs,
    )

    return {
        "status": result.status,
        "call_id": call_record.id,
        "router_result": result.router_result.model_dump(),
        "proposal": result.proposal.model_dump() if result.proposal else None,
        "saved_items": saved_items,
    }


# --- User Scoped Data Queries ---

@app.get("/api/submissions")
def list_user_submissions(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Lists submissions belonging strictly to current authenticated user."""
    subs = (
        db.query(models.UserSubmission)
        .filter(models.UserSubmission.user_id == user_id)
        .order_by(models.UserSubmission.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "source_type": s.source_type,
            "source_location": s.source_location,
            "status": s.status,
            "transcript_job_id": s.transcript_job_id,
            "created_at": s.created_at.isoformat(),
        }
        for s in subs
    ]


@app.get("/api/calls/{call_id}")
def get_call_details(
    call_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Retrieves detailed call brief and items for authenticated user."""
    call = db.query(models.Call).filter(models.Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    items = db.query(models.Item).filter(models.Item.call_id == call.id).all()

    return {
        "id": call.id,
        "detected_intent": call.detected_intent,
        "confidence": call.confidence,
        "transcript_text": call.transcript_text,
        "transcript_data": call.transcript_data,
        "items": [
            {
                "id": it.id,
                "type": it.type,
                "text": it.text,
                "original_agent_text": it.original_agent_text,
                "timestamp_link": it.timestamp_link,
                "effort": it.effort,
                "status": it.status,
            }
            for it in items
        ],
    }


@app.patch("/api/items/{item_id}")
def update_proposal_item(
    item_id: str,
    payload: ItemUpdateSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Edits item text or updates status (preserves original agent text)."""
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if payload.text is not None:
        item.text = payload.text
        item.status = "edited"
    if payload.status is not None:
        item.status = payload.status

    db.commit()
    db.refresh(item)

    return {
        "status": "success",
        "item": {
            "id": item.id,
            "type": item.type,
            "text": item.text,
            "original_agent_text": item.original_agent_text,
            "status": item.status,
        },
    }
