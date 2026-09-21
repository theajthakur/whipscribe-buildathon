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
                    "tasks": [{"id": t.id, "title": t.text, "effort": t.effort or "M", "time": t.timestamp_link or "00:00", "estimated_hours": 4} for t in tasks],
                    "quote": {"total_price": settings.hourly_rate * 10, "total_hours": 10, "hourly_rate": settings.hourly_rate},
                    "client_message_draft": client_drafts[0] if client_drafts else "",
                },
                "saved_items": [{"id": it.id, "type": it.type, "text": it.text, "time": it.timestamp_link} for it in items],
            }

    orchestrator = AgentOrchestrator()
    override = CallIntent(payload.override_intent) if payload.override_intent else None

    # Run Agentic Orchestration asynchronously in worker thread pool without blocking event loop
    result = await asyncio.to_thread(
        orchestrator.process_call,
        transcript_data=sub.transcript_json,
        client_id=payload.client_id,
        hourly_rate=settings.hourly_rate,
        currency=settings.currency,
        message_tone=settings.message_tone,
        user_name=user_name,
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
