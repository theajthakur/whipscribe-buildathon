"""
Clips resource — render, poll, and discover clip moments.

Wraps:
  POST /api/v1/jobs/{id}/clips              — render a clip
  GET  /api/v1/clips/{clip_id}              — poll clip status
  GET  /api/v1/shorts                       — list all clips
  POST /api/v1/clips/{clip_id}/retrim       — re-cut without billing again
  DELETE /api/v1/clips/{clip_id}            — remove a clip

  POST /api/v1/jobs/{id}/clips/preprocess   — one-time feature extraction
  GET  /api/v1/jobs/{id}/clips/summary      — recording summary
  GET  /api/v1/jobs/{id}/clips/candidates   — high-signal moments
  GET  /api/v1/jobs/{id}/clips/search       — sentence search
"""

from __future__ import annotations

import time
import logging
from typing import Dict, List, Optional, Any

from ._http import HttpSession
from .types import (
    ClipSubmitResponse,
    ClipResult,
    ClipStatus,
    ClipCandidate,
    CandidateKind,
)

logger = logging.getLogger(__name__)

_CLIP_POLL_INTERVAL = 5   # seconds
_CLIP_TIMEOUT       = 300  # 5 minutes


class ClipsResource:
    """
    Methods for creating and managing short video clips from transcribed jobs.

    Access via ``client.clips``.

    Examples
    --------
    # Render a clip
    submit = client.clips.render(job_id, start_s=312.4, end_s=358.0,
                                 title="Key moment", caption_style="bold-yellow")
    result = client.clips.wait_for_done(submit.clip_id)
    print(result.video_url)

    # Find the best hook moments first
    client.clips.preprocess(job_id)        # one-time, idempotent
    candidates = client.clips.candidates(job_id, kind=CandidateKind.HOOK, limit=5)
    for c in candidates:
        print(f"{c.start_s:.1f}s — {c.text}")
    """

    def __init__(self, http: HttpSession) -> None:
        self._http = http

    # ------------------------------------------------------------------
    # Render  — POST /api/v1/jobs/{id}/clips
    # ------------------------------------------------------------------

    def render(
        self,
        job_id: str,
        start_s: float,
        end_s: float,
        *,
        title: Optional[str] = None,
        caption_style: Optional[str] = None,
    ) -> ClipSubmitResponse:
        """
        Render a vertical 9:16 MP4 clip from a finished job.

        Only jobs submitted by file upload or recording are supported
        (URL jobs return ``403 CLIPS_UPLOAD_ONLY``).

        Parameters
        ----------
        job_id : str
            UUID of the source transcription job (must be done).
        start_s : float
            Start offset in seconds.
        end_s : float
            End offset in seconds.  ``end_s - start_s`` must be 3–180 s.
        title : str | None
            Label shown in your Shorts library (max 120 chars).
        caption_style : str | None
            Burned-in caption preset:
            ``bold-yellow`` | ``rounded-white`` | ``bold-bg`` | ``karaoke``.
            Omit for no captions.

        Returns
        -------
        ClipSubmitResponse
            Contains ``clip_id`` and ``poll`` path for status checks.
        """
        payload: Dict[str, Any] = {"start_s": start_s, "end_s": end_s}
        if title:
            payload["title"] = title
        if caption_style:
            payload["caption_style"] = caption_style

        data = self._http.post(f"/jobs/{job_id}/clips", json=payload)
        return ClipSubmitResponse.from_dict(data)

    # ------------------------------------------------------------------
    # Poll clip  — GET /api/v1/clips/{clip_id}
    # ------------------------------------------------------------------

    def get(self, clip_id: str) -> ClipResult:
        """
        Fetch the current status of a clip render job.

        Parameters
        ----------
        clip_id : str
            UUID from a ``render()`` response.

        Returns
        -------
        ClipResult
        """
        data = self._http.get(f"/clips/{clip_id}")
        return ClipResult.from_dict(data)

    # ------------------------------------------------------------------
    # Wait  — polls until done
    # ------------------------------------------------------------------

    def wait_for_done(
        self,
        clip_id: str,
        *,
        poll_interval: float = _CLIP_POLL_INTERVAL,
        timeout: float = _CLIP_TIMEOUT,
    ) -> ClipResult:
        """
        Block until a clip finishes rendering (or raises on failure / timeout).

        Parameters
        ----------
        clip_id : str
            UUID from a ``render()`` response.
        poll_interval : float
            Seconds between polls.  Default 5.
        timeout : float
            Maximum seconds to wait.  Default 300 (5 min).

        Returns
        -------
        ClipResult
            With ``video_url`` set.

        Raises
        ------
        WhipScribeError
            If clip reaches ``failed`` status.
        JobTimeoutError
            If timeout elapses.
        """
        from . import exceptions as exc

        deadline = time.monotonic() + timeout
        while True:
            result = self.get(clip_id)
            logger.debug("Clip %s: status=%s", clip_id, result.status)

            if result.status == ClipStatus.DONE:
                return result
            if result.status == ClipStatus.FAILED:
                raise exc.WhipScribeError(
                    f"Clip {clip_id!r} failed to render.",
                    code="CLIP_FAILED",
                )
            if time.monotonic() > deadline:
                raise exc.JobTimeoutError(clip_id, int(timeout))

            time.sleep(poll_interval)

    # ------------------------------------------------------------------
    # List  — GET /api/v1/shorts
    # ------------------------------------------------------------------

    def list(self) -> List[dict]:
        """Return all clips (Shorts) for this account as raw dicts."""
        return self._http.get("/shorts")

    # ------------------------------------------------------------------
    # Retrim  — POST /api/v1/clips/{clip_id}/retrim
    # ------------------------------------------------------------------

    def retrim(
        self,
        clip_id: str,
        start_s: float,
        end_s: float,
        *,
        title: Optional[str] = None,
        caption_style: Optional[str] = None,
    ) -> ClipSubmitResponse:
        """
        Re-cut an existing clip without spending extra credits.

        Parameters mirror ``render()``.

        Returns
        -------
        ClipSubmitResponse
        """
        payload: Dict[str, Any] = {"start_s": start_s, "end_s": end_s}
        if title:
            payload["title"] = title
        if caption_style:
            payload["caption_style"] = caption_style

        data = self._http.post(f"/clips/{clip_id}/retrim", json=payload)
        return ClipSubmitResponse.from_dict(data)

    # ------------------------------------------------------------------
    # Delete  — DELETE /api/v1/clips/{clip_id}
    # ------------------------------------------------------------------

    def delete(self, clip_id: str) -> None:
        """Remove a clip from your library."""
        self._http.delete(f"/clips/{clip_id}")

    # ==================================================================
    # Clip discovery / moment-finding
    # ==================================================================

    # ------------------------------------------------------------------
    # Preprocess  — POST /api/v1/jobs/{id}/clips/preprocess
    # ------------------------------------------------------------------

    def preprocess(self, job_id: str) -> None:
        """
        Trigger the one-time analysis needed for candidate / summary / search
        endpoints.  Idempotent — safe to call multiple times.

        Returns immediately (202); the analysis takes 10–60 s.  If you call
        ``candidates()`` or ``summary()`` before it finishes, you'll receive
        a ``409 FEATURES_NOT_READY`` which this client raises as
        :exc:`FeaturesNotReadyError`.

        Parameters
        ----------
        job_id : str
            UUID of a finished transcription job.
        """
        self._http.post(f"/jobs/{job_id}/clips/preprocess")

    # ------------------------------------------------------------------
    # Summary  — GET /api/v1/jobs/{id}/clips/summary
    # ------------------------------------------------------------------

    def summary(self, job_id: str) -> dict:
        """
        Return duration, speaker turns, silence breaks, and a short summary
        of the recording.

        Requires ``preprocess()`` to have completed first.

        Returns
        -------
        dict
            Raw summary dict from the API.
        """
        return self._http.get(f"/jobs/{job_id}/clips/summary")

    # ------------------------------------------------------------------
    # Candidates  — GET /api/v1/jobs/{id}/clips/candidates
    # ------------------------------------------------------------------

    def candidates(
        self,
        job_id: str,
        *,
        kind: CandidateKind = CandidateKind.HOOK,
        limit: int = 10,
    ) -> List[ClipCandidate]:
        """
        Return high-signal sentences with timestamps to use as clip seeds.

        Requires ``preprocess()`` to have completed first.

        Parameters
        ----------
        job_id : str
            UUID of a finished job.
        kind : CandidateKind
            Signal type: ``hook`` | ``question`` | ``number`` |
            ``speaker_change`` | ``high_energy``.
        limit : int
            Maximum number of candidates to return.

        Returns
        -------
        list[ClipCandidate]
        """
        data = self._http.get(
            f"/jobs/{job_id}/clips/candidates",
            params={"kind": kind.value, "limit": limit},
        )
        return [ClipCandidate.from_dict(s) for s in data.get("sentences", [])]

    # ------------------------------------------------------------------
    # Search  — GET /api/v1/jobs/{id}/clips/search
    # ------------------------------------------------------------------

    def search(
        self,
        job_id: str,
        *,
        q: Optional[str] = None,
        start_s: Optional[float] = None,
        end_s: Optional[float] = None,
    ) -> List[ClipCandidate]:
        """
        Find sentences matching a keyword or within a time range.

        Requires ``preprocess()`` to have completed first.

        Pass either ``q`` (keyword search) or ``start_s``/``end_s`` (range).

        Parameters
        ----------
        job_id : str
            UUID of a finished job.
        q : str | None
            Keyword to search for inside the transcript.
        start_s : float | None
            Start of the time range in seconds.
        end_s : float | None
            End of the time range in seconds.

        Returns
        -------
        list[ClipCandidate]
        """
        params: Dict[str, Any] = {}
        if q:
            params["q"] = q
        if start_s is not None:
            params["start_s"] = start_s
        if end_s is not None:
            params["end_s"] = end_s

        data = self._http.get(
            f"/jobs/{job_id}/clips/search", params=params
        )
        return [ClipCandidate.from_dict(s) for s in data.get("matches", [])]
