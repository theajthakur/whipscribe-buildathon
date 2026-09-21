"""
WhipScribeClient — the single entry point for all API operations.

Usage
-----
    from whipscribe import WhipScribeClient
    from whipscribe.types import TranscriptFormat, CandidateKind

    # Reads WHIPSCRIBE_API from backend/.env automatically
    client = WhipScribeClient()

    # --- Transcription (Phase 1 of the build) ---
    job = client.transcribe.submit_file("samples/discovery-call.mp3", language="en")
    print(f"Queued: {job.job_id}")

    row = client.jobs.wait_for_done(job.job_id)
    tx  = client.jobs.get_transcript(job.job_id, format=TranscriptFormat.JSON)

    for seg in tx.segments:
        ts = f"{int(seg.start//60)}:{int(seg.start%60):02d}"
        print(f"[{ts}] {seg.speaker}: {seg.text[:80]}")

    # --- Clips ---
    client.clips.preprocess(job.job_id)
    hooks = client.clips.candidates(job.job_id, kind=CandidateKind.HOOK, limit=3)
    if hooks:
        clip_sub = client.clips.render(job.job_id, hooks[0].start_s, hooks[0].end_s)
        clip     = client.clips.wait_for_done(clip_sub.clip_id)
        print(clip.video_url)

    # --- Account ---
    me = client.account.me()
    print(me.tier, me.retention_days)
"""

from __future__ import annotations

from typing import Optional

from ._http import HttpSession
from .transcribe import TranscribeResource
from .jobs import JobsResource
from .clips import ClipsResource
from .account import AccountResource


class WhipScribeClient:
    """
    Top-level client for the WhipScribe HTTP API v1.

    All resources are available as attributes:

    ========================  ===============================================
    ``client.transcribe``     Submit audio/video files and URLs
    ``client.jobs``           Poll status, fetch transcripts, manage jobs
    ``client.clips``          Render clips, discover moments
    ``client.account``        Identity and plan info (GET /me)
    ========================  ===============================================

    Parameters
    ----------
    api_key : str | None
        Your WhipScribe API key (``tk_...``).
        If ``None``, the key is read from:

        1. ``WHIPSCRIBE_API`` environment variable
        2. ``backend/.env`` file  (``WHIPSCRIBE_API=tk_...``)

    user_email : str | None
        Optional ``X-User-Email`` header for server-to-server calls that
        should be tied to a specific account.

    base_url : str
        Override the API base URL.  Useful for testing against a local
        WhipScribe instance.

    timeout : int
        Default HTTP timeout in seconds (applies to each individual request,
        not the total wait time of ``wait_for_done``).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        user_email: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
    ) -> None:
        self._http = HttpSession(
            api_key=api_key,
            user_email=user_email,
            base_url=base_url,
            timeout=timeout,
        )

        self.transcribe: TranscribeResource = TranscribeResource(self._http)
        self.jobs:       JobsResource       = JobsResource(self._http)
        self.clips:      ClipsResource      = ClipsResource(self._http)
        self.account:    AccountResource    = AccountResource(self._http)

    def __repr__(self) -> str:
        return f"WhipScribeClient(base_url={self._http._base_url!r})"
