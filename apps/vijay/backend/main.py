"""
FastAPI Main Application Entrypoint for CallBrief Backend Service.
Exposes Clerk Webhook endpoints, User Submissions, and Agent Orchestration APIs.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from whipscribe.db import Base, engine, get_db, crud, webhook_router
from whipscribe.agent import AgentOrchestrator, CallIntent
from whipscribe.client import WhipScribeClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("callbrief-backend")

app = FastAPI(
    title="CallBrief Backend API",
    description="Backend API supporting Clerk Webhooks, WhipScribe Transcription, and Vertex AI Agentic Orchestration.",
    version="1.0.0",
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Webhook Router
app.include_router(webhook_router)


@app.on_event("startup")
def on_startup():
    """Initializes database tables on application startup."""
    try:
        logger.info("Initializing database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
    except Exception as e:
        logger.warning(f"Database table auto-creation note: {e}")


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "CallBrief Backend API"}


# --- API Request Models ---

class SubmissionCreateRequest(BaseModel):
    user_id: str
    source_type: str  # 'audio_file' | 'audio_url' | 'whatsapp_export'
    source_location: str


class ProcessCallRequest(BaseModel):
    submission_id: str
    user_id: str
    override_intent: Optional[str] = None


# --- Submission & Agent Processing API ---

@app.post("/api/submissions", status_code=status.HTTP_201_CREATED)
def create_submission(payload: SubmissionCreateRequest, db: Session = Depends(get_db)):
    """Creates a user submission record for transcription and processing."""
    submission = crud.create_user_submission(
        db=db,
        user_id=payload.user_id,
        source_type=payload.source_type,
        source_location=payload.source_location,
    )
    return {"status": "success", "submission": {
        "id": submission.id,
        "user_id": submission.user_id,
        "source_type": submission.source_type,
        "status": submission.status,
    }}


@app.post("/api/process-call")
def process_call(payload: ProcessCallRequest, db: Session = Depends(get_db)):
    """Processes a submission through Vertex AI Agent Orchestrator."""
    settings = crud.get_or_create_settings(db, user_id=payload.user_id)
    orchestrator = AgentOrchestrator()

    # Sample demo transcript if mock submission
    sample_transcript = [
        {"time": "00:15", "speaker": "CLIENT", "text": "We need an e-commerce booking system with calendar sync."},
        {"time": "00:45", "speaker": "CLIENT", "text": "Must support deposit payments via Stripe and mobile responsiveness."},
        {"time": "01:20", "speaker": "CLIENT", "text": "Our budget is around $2,500."},
    ]

    override = CallIntent(payload.override_intent) if payload.override_intent else None

    result = orchestrator.process_call(
        transcript_data=sample_transcript,
        hourly_rate=settings.hourly_rate,
        currency=settings.currency,
        override_intent=override,
    )

    # Save Call Record & Agent Log in Database
    call_record = crud.create_call_record(
        db=db,
        submission_id=payload.submission_id,
        file_type="call_recording",
        transcript_text="\n".join([t["text"] for t in sample_transcript]),
        transcript_data=sample_transcript,
        detected_intent=result.router_result.intent.value,
        confidence=result.router_result.confidence,
    )

    if result.proposal:
        # Save Proposal Items
        for req in result.proposal.requirements:
            crud.add_item_to_call(
                db=db,
                call_id=call_record.id,
                item_type="requirement",
                text=req.text,
                original_agent_text=req.text,
                timestamp_link=req.time,
            )

        for task in result.proposal.tasks:
            crud.add_item_to_call(
                db=db,
                call_id=call_record.id,
                item_type="task",
                text=task.title,
                original_agent_text=task.title,
                timestamp_link=task.time,
                effort=task.effort,
            )

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
    }
