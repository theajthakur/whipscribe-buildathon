"""
Jobs resource — poll, fetch, list, delete, and wait for jobs.

Wraps:
  GET    /api/v1/jobs                     — list
  GET    /api/v1/jobs/{id}                — poll status
  GET    /api/v1/jobs/{id}/result         — get transcript
  GET    /api/v1/jobs/{id}/audio/url      — playback URL
  POST   /api/v1/jobs/claim               — claim guest job
  DELETE /api/v1/jobs/{id}               — cancel / delete
"""

from __future__ import annotations

import time
import logging
from typing import List, Optional

from ._http import HttpSession
from . import exceptions as exc
from .types import (
    JobRow,
    JobStatus,
    TranscriptFormat,
    TranscriptResult,
    AudioUrl,
)

logger = logging.getLogger(__name__)

# Default polling config
_DEFAULT_POLL_INTERVAL = 3   # seconds — matches API docs recommendation
_DEFAULT_TIMEOUT       = 600  # 10 minutes


class JobsResource:
    """
    Methods for managing and polling transcription jobs.

    Access via ``client.jobs``.

    Examples
    --------
    # Poll once
    row = client.jobs.get("35f4be54-aa3e-4adc-85b7-b44f284d1fc3")
    print(row.status, row.progress)

    # Block until done, then fetch the JSON transcript
    row    = client.jobs.wait_for_done(job_id)
    result = client.jobs.get_transcript(job_id, format=TranscriptFormat.JSON)
    for seg in result.segments:
        print(f"[{seg.start:.1f}s] {seg.speaker}: {seg.text}")

    # List recent jobs
    rows = client.jobs.list(limit=10)
    """

    def __init__(self, http: HttpSession) -> None:
        self._http = http

    # ------------------------------------------------------------------
    # List — GET /api/v1/jobs
    # ------------------------------------------------------------------

    def list(self, limit: int = 20) -> List[JobRow]:
        """
        Return the most-recent ``limit`` jobs (1-100) for this API key.

        Parameters
        ----------
        limit : int
            Number of results to return.  Clamped to 1–100.

        Returns
        -------
        list[JobRow]
        """
        limit = max(1, min(100, limit))
        data = self._http.get("/jobs", params={"limit": limit})
        # API returns a JSON array; guard against unexpected wrapping
        if isinstance(data, dict):
            # Unwrap if the response is {"jobs": [...]}
            data = data.get("jobs", data.get("items", []))
        if not isinstance(data, list):
            logger.warning("Unexpected /jobs list response type: %s", type(data))
            return []
        return [JobRow.from_dict(d) for d in data if isinstance(d, dict)]

    # ------------------------------------------------------------------
    # Poll — GET /api/v1/jobs/{id}
    # ------------------------------------------------------------------

    def get(self, job_id: str) -> JobRow:
        """
        Fetch the current status of a single job.

        Parameters
        ----------
        job_id : str
            UUID returned by a submit call.

        Returns
        -------
        JobRow
        """
        data = self._http.get(f"/jobs/{job_id}")
        return JobRow.from_dict(data)

    # ------------------------------------------------------------------
    # Wait — polls until done or raises
    # ------------------------------------------------------------------

    def wait_for_done(
        self,
        job_id: str,
        *,
        poll_interval: float = _DEFAULT_POLL_INTERVAL,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> JobRow:
        """
        Block until the job reaches ``done`` (or raises on ``failed`` / timeout).

        Recommended cadence from the API docs is every 3 seconds while
        ``status ∈ {queued, processing}``.

        Parameters
        ----------
        job_id : str
            UUID of the job to wait for.
        poll_interval : float
            Seconds between polls.  Default 3.
        timeout : float
            Maximum wall-clock seconds to wait.  Default 600 (10 min).

        Returns
        -------
        JobRow
            The final job row with status=done.

        Raises
        ------
        JobFailedError
            If the job reaches status=failed.
        JobTimeoutError
            If ``timeout`` elapses before the job finishes.
        """
        deadline = time.monotonic() + timeout
        while True:
            row = self.get(job_id)
            logger.debug(
                "Job %s: status=%s progress=%s",
                job_id, row.status, row.progress,
            )

            if row.status == JobStatus.DONE:
                return row
            if row.status == JobStatus.FAILED:
                raise exc.JobFailedError(job_id, error=row.error)
            if time.monotonic() > deadline:
                raise exc.JobTimeoutError(job_id, int(timeout))

            time.sleep(poll_interval)

    # ------------------------------------------------------------------
    # Get transcript — GET /api/v1/jobs/{id}/result
    # ------------------------------------------------------------------

    def get_transcript(
        self,
        job_id: str,
        format: TranscriptFormat = TranscriptFormat.JSON,
    ) -> TranscriptResult | str:
        """
        Fetch the completed transcript in the requested format.

        Call ``get()`` or ``wait_for_done()`` first; this endpoint requires
        ``status == done``.

        Also checks ``job.locked`` before fetching — if the transcript is
        paywalled, raises :exc:`TranscriptLockedError` immediately with the
        ``unlock_url``.

        Parameters
        ----------
        job_id : str
            UUID of a finished job.
        format : TranscriptFormat
            One of JSON (default), TXT, SRT, VTT, DOCX.

        Returns
        -------
        TranscriptResult
            If format is JSON — a fully parsed ``TranscriptResult`` with
            segments, speaker labels, and word timestamps.
        str
            For TXT / SRT / VTT / DOCX — the raw text content.

        Raises
        ------
        TranscriptLockedError
            If the job is paywalled.
        NoSpeechError
            If speech_detected is False (VAD rejected the audio).
        """
        # Pre-check lock status to give a nicer error than a raw 402
        job = self.get(job_id)
        if job.locked:
            raise exc.TranscriptLockedError(
                f"Job {job_id!r} is locked. Unlock at: {job.unlock_url}",
                raw={"unlock_url": job.unlock_url},
            )

        if format == TranscriptFormat.JSON:
            data = self._http.get(
                f"/jobs/{job_id}/result", params={"format": "json"}
            )
            result = TranscriptResult.from_dict(data)

            if result.speech_detected is False:
                raise exc.NoSpeechError(suggestion=result.suggestion)

            return result
        else:
            resp = self._http.get_raw(
                f"/jobs/{job_id}/result", params={"format": format.value}
            )
            from ._http import _raise_for_error
            _raise_for_error(resp)
            return resp.text

    # ------------------------------------------------------------------
    # Playback URL — GET /api/v1/jobs/{id}/audio/url
    # ------------------------------------------------------------------

    def get_audio_url(self, job_id: str) -> AudioUrl:
        """
        Get a short-lived URL for streaming the original audio.

        The URL expires in ``expires_in`` seconds — refetch if your player
        raises an error.

        Parameters
        ----------
        job_id : str
            UUID of a finished job.

        Returns
        -------
        AudioUrl
        """
        data = self._http.get(f"/jobs/{job_id}/audio/url")
        return AudioUrl.from_dict(data)

    # ------------------------------------------------------------------
    # Claim guest job — POST /api/v1/jobs/claim
    # ------------------------------------------------------------------

    def claim(
        self,
        claim_tokens: List[str],
        firebase_id_token: str,
    ) -> int:
        """
        Transfer anonymous jobs to a signed-in user.

        After calling this, the jobs appear in "Your files" and gain the
        user's tier retention window.

        Parameters
        ----------
        claim_tokens : list[str]
            One or more ``claim_token`` values from submit responses.
        firebase_id_token : str
            The user's Firebase ID token (``Authorization: Bearer`` value).

        Returns
        -------
        int
            Number of jobs successfully claimed.
        """
        result = self._http.post(
            "/jobs/claim",
            json={"claim_tokens": claim_tokens},
            headers={"Authorization": f"Bearer {firebase_id_token}"},
        )
        return result.get("claimed", 0)

    # ------------------------------------------------------------------
    # Cancel / delete — DELETE /api/v1/jobs/{id}
    # ------------------------------------------------------------------

    def delete(self, job_id: str) -> None:
        """
        Cancel an in-flight job or delete a completed one.

        Note: deleting a finished job does NOT refund its credits.

        Parameters
        ----------
        job_id : str
            UUID of the job to delete.
        """
        self._http.delete(f"/jobs/{job_id}")
