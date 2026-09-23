"""
Clerk Webhook Router using Svix Verification.
Handles user.created, user.updated, and user.deleted events to sync users into PostgreSQL/SQLite.
Exposes endpoint compatible with Svix CLI (`svix listen http://localhost:8000/api/webhooks/clerk`).
"""

import os
import logging
from fastapi import APIRouter, Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
try:
    from svix.webhooks import Webhook, WebhookVerificationError
except ImportError:
    Webhook = None
    WebhookVerificationError = Exception
from .database import get_db
from .crud import upsert_user_from_clerk, delete_user_from_clerk

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET") or os.getenv("CLERK_WEBHOOK_SECRET")


@router.post("/clerk")
async def clerk_webhook_handler(request: Request, db: Session = Depends(get_db)):
    """Receives Clerk webhooks and upserts users in database."""
    headers = request.headers
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        logger.error("Clerk Webhook: Missing Svix headers")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required Svix headers",
        )

    body = await request.body()

    # Verify signature if WEBHOOK_SECRET is set
    if WEBHOOK_SECRET and WEBHOOK_SECRET != "whsec_sample_secret_key_for_clerk":
        try:
            wh = Webhook(WEBHOOK_SECRET)
            payload = wh.verify(body, headers)
        except WebhookVerificationError as e:
            logger.error(f"Clerk Webhook Verification Failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Webhook signature",
            )
    else:
        # Fallback for local development testing without strict Svix signature requirement
        import json
        payload = json.loads(body.decode("utf-8"))

    event_type = payload.get("type")
    event_data = payload.get("data", {})

    logger.info(f"Clerk Webhook Received: Event '{event_type}' for ID '{event_data.get('id')}'")

    if event_type in ("user.created", "user.updated"):
        user = upsert_user_from_clerk(db, event_data)
        return {
            "status": "success",
            "message": f"User '{user.id}' ({user.email}) promptly upserted.",
        }

    elif event_type == "user.deleted":
        clerk_id = event_data.get("id")
        if clerk_id:
            delete_user_from_clerk(db, clerk_id)
            return {"status": "success", "message": f"User '{clerk_id}' deleted."}

    return {"status": "ignored", "event_type": event_type}
