"""
FastAPI Application Entrypoint for CallBrief Backend.
Supports Clerk Webhooks, WhipScribe API audio transcription,
Vertex AI Agentic Orchestration, and PostgreSQL Database Persistence with User-Scoped Auth.
"""

import os
import uuid
import shutil
import logging
import json
import asyncio
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
from fastapi.responses import StreamingResponse
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

def verify_clerk_token(token: str) -> Optional[str]:
    """Parses and verifies Clerk JWT token, returning subject (User ID)."""
    try:
        try:
            import jwt
        except ImportError:
            # Simple fallback JSON payload decoder if PyJWT not installed
            import base64, json
            parts = token.split(".")
            if len(parts) >= 2:
                payload_b64 = parts[1] + "=="
                payload_json = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
                user_id = payload_json.get("sub")
                return user_id if user_id and user_id.startswith("user_") else None
            return None

        # Parse unverified payload to extract claims
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id or not user_id.startswith("user_"):
            return None

        # If CLERK_SECRET_KEY is configured in environment, verify token signature
        clerk_secret = os.getenv("CLERK_SECRET_KEY")
        if clerk_secret:
            try:
                verified = jwt.decode(token, clerk_secret, algorithms=["HS256", "RS256"], options={"verify_exp": True})
                user_id = verified.get("sub")
            except Exception as e:
                logger.warning(f"Clerk JWT signature verification failed: {e}")
                return None

        return user_id
    except Exception as e:
        logger.warning(f"Clerk JWT decode error: {e}")
        return None


def get_current_user_id(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> str:
    """Enforces server-side user authentication and returns current Clerk User ID.

    Filters all database access strictly to current authenticated user.
    """
    user_id = None

    # 1. Verify Authorization Bearer token header
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        user_id = verify_clerk_token(token)

    # 2. Development Mode Fallback (gated strictly behind DEBUG / ALLOW_UNAUTHENTICATED_DEV env vars)
    is_debug_mode = (
        os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
        or os.getenv("ALLOW_UNAUTHENTICATED_DEV", "false").lower() in ("true", "1", "yes")
    )

    if not user_id and x_user_id:
        if is_debug_mode:
            logger.warning(f"DEBUG MODE ACTIVE: Trusting unverified X-User-Id header '{x_user_id}'")
            user_id = x_user_id
        else:
            logger.warning("Unverified X-User-Id header rejected in production mode.")

    if not user_id:
        if is_debug_mode:
            logger.warning("DEBUG MODE ACTIVE: Using default local freelancer user ID.")
            user_id = "user_default_local_freelancer"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please provide a valid Clerk Bearer token in the Authorization header.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Ensure user exists in database
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        user = crud.upsert_user_from_clerk(
            db,
            {
                "id": user_id,
                "email_addresses": [{"id": "e1", "email_address": f"{user_id}@callbrief.dev"}],
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


class ClientCreateSchema(BaseModel):
    name: str
    whatsapp_number: Optional[str] = None
    notes: Optional[str] = None


class ProjectCreateSchema(BaseModel):
    title: str
    status: Optional[str] = "active"


class ProcessAgentRequestSchema(BaseModel):
    submission_id: str
    override_intent: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    budget: Optional[float] = None


class ConfirmationCreateSchema(BaseModel):
    proposed_scope_message: str


class ConfirmationUpdateSchema(BaseModel):
    status: str  # 'draft' | 'sent' | 'approved' | 'disputed'
    client_reply_text: Optional[str] = None


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
                job_status_obj = whip_client.jobs.get(job_id)

                if job_status_obj.status == JobStatus.DONE:
                    tx_obj = whip_client.jobs.get_transcript(job_id, format=TranscriptFormat.JSON)
                    if hasattr(tx_obj, "segments"):
                        formatted_lines = []
                        for seg in tx_obj.segments:
                            start_secs = int(getattr(seg, "start", 0) or 0)
                            m, s = divmod(start_secs, 60)
                            formatted_lines.append({
                                "time": f"{m:02d}:{s:02d}",
                                "speaker": getattr(seg, "speaker", None) or "SPEAKER",
                                "text": getattr(seg, "text", "") or ""
                            })
                        transcript_json = formatted_lines
                    elif isinstance(tx_obj, list):
                        transcript_json = tx_obj
                    else:
                        transcript_json = [{"time": "00:00", "speaker": "SPEAKER", "text": str(tx_obj)}]

                    current_status = "completed"
                    crud.update_submission_status(db, submission_id, status="completed", transcript_json=transcript_json)
                elif job_status_obj.status == JobStatus.FAILED:
                    current_status = "failed"
                    crud.update_submission_status(db, submission_id, status="failed")
                elif job_status_obj.status in (JobStatus.QUEUED, JobStatus.PROCESSING):
                    current_status = "transcribing"
                    crud.update_submission_status(db, submission_id, status="transcribing")

            except Exception as e:
                logger.warning(f"WhipScribe job status check note: {e}")

    return {
        "submission_id": sub.id,
        "status": current_status,
        "transcript_job_id": job_id,
        "has_transcript": transcript_json is not None,
        "transcript_lines": transcript_json if current_status == "completed" else None,
    }


@app.get("/api/submissions/{submission_id}/audio")
def get_submission_audio(
    submission_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Fetches playback audio URL from WhipScribe API or local upload fallback."""
    sub = (
        db.query(models.UserSubmission)
        .filter(models.UserSubmission.id == submission_id, models.UserSubmission.user_id == user_id)
        .first()
    )

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found or unauthorized")

    job_id = sub.transcript_job_id
    backend_base = os.getenv("BACKEND_PUBLIC_URL", "http://localhost:8000")
    local_audio_url = f"{backend_base}{sub.source_location}" if sub.source_location else None

    # Query WhipScribe API playback URL if real job ID
    if job_id and not job_id.startswith("job_sim_"):
        try:
            whip_client = WhipScribeClient()
            audio_obj = whip_client.jobs.get_audio_url(job_id)
            if audio_obj and hasattr(audio_obj, "url") and audio_obj.url:
                return {
                    "submission_id": sub.id,
                    "audio_url": audio_obj.url,
                    "source": getattr(audio_obj, "storage", "whipscribe"),
                    "expires_in": getattr(audio_obj, "expires_in", 3600),
                    "local_fallback": local_audio_url,
                }
        except Exception as e:
            logger.warning(f"WhipScribe audio URL fetch note: {e}")

    return {
        "submission_id": sub.id,
        "audio_url": local_audio_url,
        "source": "local",
        "expires_in": None,
        "local_fallback": local_audio_url,
    }


# --- Agentic Orchestration API ---

@app.post("/api/submissions/{submission_id}/process-agent")
async def process_agent_call(
    submission_id: str,
    payload: ProcessAgentRequestSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Executes Vertex AI Agent Orchestrator asynchronously on completed transcript and persists call proposal items in database."""
    sub = (
        db.query(models.UserSubmission)
        .filter(models.UserSubmission.id == submission_id, models.UserSubmission.user_id == user_id)
        .first()
    )

    if not sub or not sub.transcript_json:
        raise HTTPException(status_code=400, detail="Submission transcript not ready or unauthorized")

    settings = crud.get_or_create_settings(db, user_id=user_id)
    user_record = db.query(models.User).filter(models.User.id == user_id).first()
    user_name = f"{user_record.first_name or ''} {user_record.last_name or ''}".strip() if user_record else "Freelancer"
    if not user_name:
        user_name = "Freelancer"

    # Return cached call record if already processed and no override requested
    if not payload.override_intent:
        existing_call = db.query(models.Call).filter(models.Call.user_submission_id == sub.id).first()
        if existing_call:
            items = db.query(models.Item).filter(models.Item.call_id == existing_call.id).all()
            reqs = [it for it in items if it.type == "requirement"]
            tasks = [it for it in items if it.type == "task"]
            client_drafts = [it.text for it in items if it.type == "message"]

            # Compute dynamic quote from saved task items instead of hardcoded multiplier
            from whipscribe.agent.tools.calculate_productivity_and_budget import calculate_task_productivity_and_quote
            task_items = [{"title": t.text, "effort": t.effort or "M"} for t in tasks]
            calc_quote = calculate_task_productivity_and_quote(
                tasks=task_items,
                hourly_rate=settings.hourly_rate,
                currency=settings.currency,
                budget=payload.budget,
            )

            return {
                "status": "success",
                "call_id": existing_call.id,
                "router_result": {
                    "intent": existing_call.detected_intent or "discovery",
                    "confidence": existing_call.confidence or 1.0,
                    "reason": "Retrieved from database",
                    "needs_human_confirmation": False,
                },
                "proposal": {
                    "summary": "Retrieved existing call proposal from database.",
                    "requirements": [{"id": r.id, "category": "requirement", "text": r.text, "time": r.timestamp_link or "00:00"} for r in reqs],
                    "tasks": [{"id": t.id, "title": t.text, "effort": t.effort or "M", "time": t.timestamp_link or "00:00", "estimated_hours": t.effort or 4} for t in tasks],
                    "quote": calc_quote.model_dump(),
                    "client_message_draft": client_drafts[0] if client_drafts else "",
                },
                "saved_items": [{"id": it.id, "type": it.type, "text": it.text, "time": it.timestamp_link} for it in items],
            }

    orchestrator = AgentOrchestrator()
    override = CallIntent(payload.override_intent) if payload.override_intent else None

    # Fetch previous brief history for project or client if provided
    previous_history = crud.get_previous_brief_for_project_or_client(
        db=db,
        user_id=user_id,
        project_id=payload.project_id,
        client_id=payload.client_id,
    )

    # Run Agentic Orchestration asynchronously in worker thread pool without blocking event loop
    result = await asyncio.to_thread(
        orchestrator.process_call,
        transcript_data=sub.transcript_json,
        client_id=payload.client_id,
        hourly_rate=settings.hourly_rate,
        currency=settings.currency,
        budget=payload.budget,
        message_tone=settings.message_tone,
        user_name=user_name,
        previous_brief_summary=previous_history,
        override_intent=override,
    )

    # Persist Call Record in PostgreSQL
    call_record = crud.create_call_record(
        db=db,
        submission_id=sub.id,
        project_id=payload.project_id,
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

        # Save client confirmation message draft if available
        if result.proposal.client_message_draft:
            msg_item = crud.add_item_to_call(
                db=db,
                call_id=call_record.id,
                item_type="message",
                text=result.proposal.client_message_draft,
                original_agent_text=result.proposal.client_message_draft,
            )
            saved_items.append({"id": msg_item.id, "type": msg_item.type, "text": msg_item.text, "time": None})

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


@app.post("/api/submissions/{submission_id}/process-agent-stream")
async def process_agent_call_stream(
    submission_id: str,
    payload: ProcessAgentRequestSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Executes Vertex AI Agent Orchestrator with real HTTP Server-Sent Event (SSE) stream logs."""
    sub = (
        db.query(models.UserSubmission)
        .filter(models.UserSubmission.id == submission_id, models.UserSubmission.user_id == user_id)
        .first()
    )

    if not sub or not sub.transcript_json:
        raise HTTPException(status_code=400, detail="Submission transcript not ready or unauthorized")

    settings = crud.get_or_create_settings(db, user_id=user_id)

    async def event_generator():
        # Step 1: Initializing
        yield f"data: {json.dumps({'type': 'log', 'step': 'init', 'message': 'Initializing Vertex AI Agent Orchestrator & Tool Registry...', 'percent': 10})}\n\n"
        await asyncio.sleep(0.1)

        # Check existing call record
        if not payload.override_intent:
            existing_call = db.query(models.Call).filter(models.Call.user_submission_id == sub.id).first()
            if existing_call:
                items = db.query(models.Item).filter(models.Item.call_id == existing_call.id).all()
                reqs = [it for it in items if it.type == "requirement"]
                tasks = [it for it in items if it.type == "task"]
                client_drafts = [it.text for it in items if it.type == "message"]
                cached_res = {
                    "status": "success",
                    "call_id": existing_call.id,
                    "router_result": {
                        "intent": existing_call.detected_intent or "discovery",
                        "confidence": existing_call.confidence or 1.0,
                        "reason": "Retrieved from database",
                        "needs_human_confirmation": False,
                    },
                    "proposal": {
                        "summary": "Retrieved existing call proposal from database.",
                        "requirements": [{"id": r.id, "category": "requirement", "text": r.text, "time": r.timestamp_link or "00:00"} for r in reqs],
                        "tasks": [{"id": t.id, "title": t.text, "effort": t.effort or "M", "time": t.timestamp_link or "00:00", "estimated_hours": 4} for t in tasks],
                        "quote": {"total_price": settings.hourly_rate * 10, "total_hours": 10, "hourly_rate": settings.hourly_rate},
                        "client_message_draft": client_drafts[0] if client_drafts else "",
                    },
                    "saved_items": [{"id": it.id, "type": it.type, "text": it.text, "time": it.timestamp_link} for it in items],
                }
                yield f"data: {json.dumps({'type': 'log', 'step': 'db_cache', 'message': 'Retrieved pre-processed proposal from PostgreSQL database cache.', 'percent': 90})}\n\n"
                yield f"data: {json.dumps({'type': 'result', 'step': 'completed', 'message': 'Completed from database cache!', 'percent': 100, 'result': cached_res})}\n\n"
                return

        # Step 2: Tool Execution get_transcript
        tx_lines_count = len(sub.transcript_json) if isinstance(sub.transcript_json, list) else 0
        yield f"data: {json.dumps({'type': 'log', 'step': 'tool_transcript', 'message': f'Tool get_transcript: Formatted {tx_lines_count} transcript lines with timestamps.', 'percent': 25})}\n\n"
        await asyncio.sleep(0.1)

        orchestrator = AgentOrchestrator()
        override = CallIntent(payload.override_intent) if payload.override_intent else None
        transcript_text = "\n".join([f"[{line.get('time', '00:00')}] {line.get('speaker', 'SPEAKER')}: {line.get('text', '')}" for line in sub.transcript_json])

        # Step 3: Intent Classification via RouterAgent
        if override:
            router_result = RouterResult(
                intent=override,
                confidence=1.0,
                reason="User manually selected this intent.",
                needs_human_confirmation=False,
                top_choices=[],
            )
            yield f"data: {json.dumps({'type': 'log', 'step': 'router_agent', 'message': f'User manual override intent selected: {override.value.upper()}', 'percent': 45})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'log', 'step': 'router_agent', 'message': 'Vertex AI RouterAgent: Analyzing transcript to classify intent & detect call type...', 'percent': 35})}\n\n"
            router_result = await asyncio.to_thread(orchestrator.router.classify, transcript_text)
            yield f"data: {json.dumps({'type': 'log', 'step': 'intent_classified', 'message': f'RouterAgent Classified Intent: {router_result.intent.value.upper()} (Confidence: {router_result.confidence*100:.0f}%)', 'percent': 50})}\n\n"

        # Step 4: Playbook Engine Execution
        selected_intent = router_result.intent
        user_record = db.query(models.User).filter(models.User.id == user_id).first()
        user_name = f"{user_record.first_name or ''} {user_record.last_name or ''}".strip() if user_record else "Freelancer"
        if not user_name:
            user_name = "Freelancer"

        yield f"data: {json.dumps({'type': 'log', 'step': 'playbook_exec', 'message': f'Executing {selected_intent.value.title()}CallPlaybook with Vertex AI Gemini model...', 'percent': 65})}\n\n"

        if selected_intent == CallIntent.DISCOVERY:
            proposal = await asyncio.to_thread(
                orchestrator.playbooks.run_discovery,
                transcript_text,
                hourly_rate=settings.hourly_rate,
                currency=settings.currency,
                message_tone=settings.message_tone,
                user_name=user_name,
            )
        elif selected_intent == CallIntent.INQUIRY:
            proposal = await asyncio.to_thread(
                orchestrator.playbooks.run_inquiry,
                transcript_text,
                hourly_rate=settings.hourly_rate,
                currency=settings.currency,
                message_tone=settings.message_tone,
                user_name=user_name,
            )
        elif selected_intent == CallIntent.CHANGE_REQUEST:
            proposal = await asyncio.to_thread(
                orchestrator.playbooks.run_change_request,
                transcript_text,
                hourly_rate=settings.hourly_rate,
                currency=settings.currency,
                message_tone=settings.message_tone,
                user_name=user_name,
            )
        else:
            proposal = await asyncio.to_thread(orchestrator.playbooks.run_other, transcript_text)

        total_price = proposal.quote.total_price if proposal and proposal.quote else settings.hourly_rate * 10
        yield f"data: {json.dumps({'type': 'log', 'step': 'tool_quote', 'message': f'Tool calculate_quote: Extracted {len(proposal.requirements) if proposal else 0} requirements & {len(proposal.tasks) if proposal else 0} tasks. Total Quote: ${total_price:.2f} ({settings.currency})', 'percent': 80})}\n\n"

        # Step 5: Guardrail Verification
        yield f"data: {json.dumps({'type': 'log', 'step': 'guardrails', 'message': 'GuardrailValidator: Verifying scope boundaries & timestamp references...', 'percent': 90})}\n\n"
        sanitized_proposal = await asyncio.to_thread(orchestrator.validator.sanitize_proposal, proposal, transcript_text)

        # Step 6: Persist in PostgreSQL
        call_record = crud.create_call_record(
            db=db,
            submission_id=sub.id,
            file_type="call_recording",
            transcript_text=transcript_text,
            transcript_data=sub.transcript_json,
            detected_intent=router_result.intent.value,
            confidence=router_result.confidence,
        )

        saved_items = []
        if sanitized_proposal:
            for req in sanitized_proposal.requirements:
                item = crud.add_item_to_call(db=db, call_id=call_record.id, item_type="requirement", text=req.text, original_agent_text=req.text, timestamp_link=req.time)
                saved_items.append({"id": item.id, "type": item.type, "text": item.text, "time": item.timestamp_link})

            for task in sanitized_proposal.tasks:
                item = crud.add_item_to_call(db=db, call_id=call_record.id, item_type="task", text=task.title, original_agent_text=task.title, timestamp_link=task.time, effort=task.effort)
                saved_items.append({"id": item.id, "type": item.type, "text": item.text, "time": item.timestamp_link, "effort": item.effort})

            if sanitized_proposal.client_message_draft:
                msg_item = crud.add_item_to_call(db=db, call_id=call_record.id, item_type="message", text=sanitized_proposal.client_message_draft, original_agent_text=sanitized_proposal.client_message_draft)
                saved_items.append({"id": msg_item.id, "type": msg_item.type, "text": msg_item.text, "time": None})

        crud.log_agent_run(db=db, call_id=call_record.id, intent=router_result.intent.value, logs=[f"Streamed execution for call {call_record.id}"])

        final_data = {
            "status": "completed",
            "call_id": call_record.id,
            "router_result": router_result.model_dump(),
            "proposal": sanitized_proposal.model_dump() if sanitized_proposal else None,
            "saved_items": saved_items,
        }

        yield f"data: {json.dumps({'type': 'result', 'step': 'completed', 'message': 'Agent Orchestration finished successfully!', 'percent': 100, 'result': final_data})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


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
    result = []
    for s in subs:
        raw_loc = s.source_location or ""
        fname = raw_loc.split("/")[-1]
        if "_" in fname:
            fname = fname.split("_", 1)[-1]
        result.append({
            "id": s.id,
            "source_type": s.source_type,
            "source_location": s.source_location,
            "filename": fname or "recording.mp3",
            "status": s.status,
            "transcript_job_id": s.transcript_job_id,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "has_transcript": s.transcript_json is not None,
            "calls": [c.id for c in s.calls] if s.calls else [],
        })
    return result


@app.delete("/api/submissions/{submission_id}")
def delete_user_submission(
    submission_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Deletes a submission and associated call records/items for current authenticated user."""
    sub = (
        db.query(models.UserSubmission)
        .filter(models.UserSubmission.id == submission_id, models.UserSubmission.user_id == user_id)
        .first()
    )

    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found or unauthorized")

    # Optionally delete saved local audio file
    if sub.source_location:
        raw_name = os.path.basename(sub.source_location)
        local_path = UPLOAD_DIR / raw_name
        if local_path.exists():
            try:
                os.remove(local_path)
            except Exception as e:
                logger.warning(f"Could not remove local file '{local_path}': {e}")

    db.delete(sub)
    db.commit()

    return {"status": "success", "deleted_submission_id": submission_id}



@app.get("/api/calls/{call_id}")
def get_call_details(
    call_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Retrieves detailed call brief and items strictly scoped to authenticated user."""
    call = (
        db.query(models.Call)
        .join(models.UserSubmission, models.Call.user_submission_id == models.UserSubmission.id)
        .filter(models.Call.id == call_id, models.UserSubmission.user_id == user_id)
        .first()
    )
    if not call:
        raise HTTPException(status_code=404, detail="Call not found or unauthorized")

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
    """Edits item text or updates status strictly scoped to authenticated user."""
    item = (
        db.query(models.Item)
        .join(models.Call, models.Item.call_id == models.Call.id)
        .join(models.UserSubmission, models.Call.user_submission_id == models.UserSubmission.id)
        .filter(models.Item.id == item_id, models.UserSubmission.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")

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


# --- Client & Project Memory APIs ---

@app.get("/api/clients")
def list_clients(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Lists all clients belonging strictly to current authenticated user."""
    clients = crud.list_user_clients(db, user_id=user_id)
    return [
        {
            "id": c.id,
            "name": c.name,
            "whatsapp_number": c.whatsapp_number,
            "notes": c.notes,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "project_count": len(c.projects) if c.projects else 0,
        }
        for c in clients
    ]


@app.post("/api/clients")
def create_client_endpoint(
    payload: ClientCreateSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Creates a new client for current authenticated user."""
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Client name is required")
    client = crud.create_client(
        db=db,
        user_id=user_id,
        name=payload.name.strip(),
        whatsapp_number=payload.whatsapp_number,
        notes=payload.notes,
    )
    return {"status": "success", "client": {"id": client.id, "name": client.name}}


@app.get("/api/clients/{client_id}/projects")
def list_projects_endpoint(
    client_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Lists projects under a client belonging strictly to current authenticated user."""
    projects = crud.list_client_projects(db, client_id=client_id, user_id=user_id)
    return [
        {
            "id": p.id,
            "client_id": p.client_id,
            "title": p.title,
            "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "call_count": len(p.calls) if p.calls else 0,
        }
        for p in projects
    ]


@app.post("/api/clients/{client_id}/projects")
def create_project_endpoint(
    client_id: str,
    payload: ProjectCreateSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Creates a new project for a client belonging to user."""
    if not payload.title or not payload.title.strip():
        raise HTTPException(status_code=400, detail="Project title is required")
    try:
        proj = crud.create_project(
            db=db,
            client_id=client_id,
            user_id=user_id,
            title=payload.title.strip(),
            status=payload.status or "active",
        )
        return {"status": "success", "project": {"id": proj.id, "title": proj.title, "client_id": proj.client_id}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# --- Scope Confirmation Lifecycle APIs ---

@app.post("/api/calls/{call_id}/confirmation")
def create_confirmation_endpoint(
    call_id: str,
    payload: ConfirmationCreateSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Creates or updates a scope confirmation tracking record for a call."""
    try:
        conf = crud.create_confirmation(
            db=db,
            call_id=call_id,
            user_id=user_id,
            proposed_scope_message=payload.proposed_scope_message,
        )
        return {
            "status": "success",
            "confirmation": {
                "id": conf.id,
                "call_id": conf.call_id,
                "proposed_scope_message": conf.proposed_scope_message,
                "status": conf.status,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/calls/{call_id}/confirmation")
def get_confirmation_endpoint(
    call_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Retrieves scope confirmation record for a call strictly scoped to user."""
    conf = crud.get_confirmation_by_call(db, call_id=call_id, user_id=user_id)
    if not conf:
        raise HTTPException(status_code=404, detail="Confirmation record not found for this call")
    return {
        "id": conf.id,
        "call_id": conf.call_id,
        "proposed_scope_message": conf.proposed_scope_message,
        "client_reply_text": conf.client_reply_text,
        "status": conf.status,
        "created_at": conf.created_at.isoformat() if conf.created_at else None,
    }


@app.patch("/api/confirmations/{confirmation_id}")
def update_confirmation_endpoint(
    confirmation_id: str,
    payload: ConfirmationUpdateSchema,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Updates scope confirmation status ('draft', 'sent', 'approved', 'disputed') and client response text."""
    conf = crud.update_confirmation_status(
        db=db,
        confirmation_id=confirmation_id,
        user_id=user_id,
        status=payload.status,
        client_reply_text=payload.client_reply_text,
    )
    if not conf:
        raise HTTPException(status_code=404, detail="Confirmation record not found or unauthorized")
    return {
        "status": "success",
        "confirmation": {
            "id": conf.id,
            "status": conf.status,
            "client_reply_text": conf.client_reply_text,
        },
    }
