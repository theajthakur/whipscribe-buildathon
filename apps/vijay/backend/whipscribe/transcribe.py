"""
Transcription submission resource.

Wraps:
  POST /api/v1/transcribe           (file upload)
  POST /api/v1/transcribe/url       (URL submit)
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Union

from ._http import HttpSession
from .types import SubmitResponse, TranscriptSource


class TranscribeResource:
    """
    Methods for submitting new transcription jobs.

    Access via ``client.transcribe``.

    Examples
    --------
    # File upload
    job = client.transcribe.submit_file("call.mp3", language="en")
    print(job.job_id, job.status)

    # URL submit
    job = client.transcribe.submit_url(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        language="en",
    )
    """

    def __init__(self, http: HttpSession) -> None:
        self._http = http

    # ------------------------------------------------------------------
    # File upload  — POST /api/v1/transcribe
    # ------------------------------------------------------------------

    def submit_file(
        self,
        file: Union[str, Path],
        *,
        language: Optional[str] = None,
        diarize: bool = True,
        word_timestamps: bool = True,
        source: TranscriptSource = TranscriptSource.API,
        idempotency_key: Optional[str] = None,
    ) -> SubmitResponse:
        """
        Upload an audio or video file and queue a transcription job.

        Parameters
        ----------
        file : str | Path
            Path to the local audio/video file.
            Supported: mp3 m4a wav mp4 mov ogg webm flac (up to 10 hours).
        language : str | None
            ISO 639-1 code (``"en"``, ``"hi"``, ``"es"``, …).
            Auto-detected when omitted.
        diarize : bool
            Request speaker labels.  Default ``True``.
        word_timestamps : bool
            Request per-word offsets.  Default ``True``.
        source : TranscriptSource
            Enum value sent to the API.  Default ``api``.
        idempotency_key : str | None
            If provided, retries with the same key return the original job
            instead of creating a duplicate.

        Returns
        -------
        SubmitResponse
            Contains ``job_id``, ``status``, and optionally ``claim_token``.
        """
        file_path = Path(file)
        if not file_path.exists():
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        data: dict = {
            "diarize": str(diarize).lower(),
            "word_timestamps": str(word_timestamps).lower(),
            "source": source.value,
        }
        if language:
            data["language"] = language

        files = {"file": (file_path.name, open(file_path, "rb"))}

        if idempotency_key:
            result = self._http.with_idempotency_key(idempotency_key).post(
                "/transcribe", data=data, files=files
            )
        else:
            result = self._http.post("/transcribe", data=data, files=files)

        return SubmitResponse.from_dict(result)

    # ------------------------------------------------------------------
    # URL submit  — POST /api/v1/transcribe/url
    # ------------------------------------------------------------------

    def submit_url(
        self,
        url: str,
        *,
        language: Optional[str] = None,
        diarize: bool = True,
        word_timestamps: bool = True,
        source: TranscriptSource = TranscriptSource.URL,
        idempotency_key: Optional[str] = None,
    ) -> SubmitResponse:
        """
        Ask WhipScribe to fetch media from ``url`` and transcribe it.

        Currently only Creative Commons-licensed YouTube URLs are accepted.

        Parameters
        ----------
        url : str
            A publicly accessible audio/video URL.
        language : str | None
            ISO 639-1 language code.  Auto-detected when omitted.
        diarize : bool
            Request speaker labels.  Default ``True``.
        word_timestamps : bool
            Request per-word offsets.  Default ``True``.
        source : TranscriptSource
            Defaults to ``TranscriptSource.URL``.
        idempotency_key : str | None
            Retry-safe deduplication key.

        Returns
        -------
        SubmitResponse
        """
        payload: dict = {
            "url": url,
            "diarize": diarize,
            "word_timestamps": word_timestamps,
            "source": source.value,
        }
        if language:
            payload["language"] = language

        if idempotency_key:
            result = self._http.with_idempotency_key(idempotency_key).post(
                "/transcribe/url", json=payload
            )
        else:
            result = self._http.post("/transcribe/url", json=payload)

        return SubmitResponse.from_dict(result)
