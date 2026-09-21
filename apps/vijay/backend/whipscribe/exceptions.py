"""
WhipScribe-specific exceptions.

Every error code from the API docs is represented here so that callers can
catch specific failures without string-matching on raw responses.

Error response shape from the API:
    {"error": "<human sentence>", "code": "<MACHINE_ENUM>"}
"""

from __future__ import annotations
from typing import Optional


class WhipScribeError(Exception):
    """Base class for all WhipScribe client errors."""

    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
        raw: Optional[dict] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.raw = raw or {}

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"status={self.status_code}, code={self.code!r}, message={self.message!r})"
        )


# ---------------------------------------------------------------------------
# 4xx client errors
# ---------------------------------------------------------------------------

class BadRequestError(WhipScribeError):
    """400 — malformed request (BAD_ID, BAD_URL, BAD_IDEMPOTENCY_KEY, etc.)."""


class AuthenticationError(WhipScribeError):
    """401 — missing or wrong API key / user-identity headers."""


class InsufficientCreditsError(WhipScribeError):
    """402 NO_CREDITS — account balance too low to submit the job.

    Extra attributes:
        credits     — snapshot dict from the API (may be None)
        upgrade_url — URL to top up (may be None)
    """

    def __init__(self, message: str, raw: Optional[dict] = None) -> None:
        super().__init__(message, code="NO_CREDITS", status_code=402, raw=raw)
        self.credits: Optional[dict] = (raw or {}).get("credits")
        self.upgrade_url: Optional[str] = (raw or {}).get("upgrade_url")


class TranscriptLockedError(WhipScribeError):
    """402 transcript_locked — transcript is paywalled for this account.

    Extra attributes:
        unlock_url — URL to add credit and unlock (may be None)
    """

    def __init__(self, message: str, raw: Optional[dict] = None) -> None:
        super().__init__(message, code="transcript_locked", status_code=402, raw=raw)
        self.unlock_url: Optional[str] = (raw or {}).get("unlock_url")


class ForbiddenError(WhipScribeError):
    """403 — action not allowed for this job type (e.g. CLIPS_UPLOAD_ONLY)."""


class NotFoundError(WhipScribeError):
    """404 NOT_FOUND — unknown job_id or job doesn't belong to caller."""


class AudioExpiredError(WhipScribeError):
    """410 AUDIO_EXPIRED — audio retention window has elapsed.

    Extra attributes:
        retention_days — policy window that applied (may be None)
    """

    def __init__(self, message: str, raw: Optional[dict] = None) -> None:
        super().__init__(message, code="AUDIO_EXPIRED", status_code=410, raw=raw)
        self.retention_days: Optional[int] = (raw or {}).get("retention_days")


class AudioMissingError(WhipScribeError):
    """410 AUDIO_MISSING — audio was deleted or never persisted."""


class FileTooLargeError(WhipScribeError):
    """413 FILE_TOO_LARGE — multipart upload exceeds the max size."""


class BadMimeError(WhipScribeError):
    """415 BAD_MIME — file's detected MIME type is unsupported."""


class BadSourceError(WhipScribeError):
    """422 BAD_SOURCE — `source` field value is not in the allowed enum."""


class FeaturesNotReadyError(WhipScribeError):
    """409 FEATURES_NOT_READY — call POST /clips/preprocess first."""


class TranscriptNotDoneError(WhipScribeError):
    """409 TRANSCRIPT_NOT_DONE — clip endpoints need a finished job."""


class QuotaExceededError(WhipScribeError):
    """429 QUOTA_EXCEEDED — free daily minutes spent.

    Extra attributes:
        upgrade_url — URL to top up (may be None)
    """

    def __init__(self, message: str, raw: Optional[dict] = None) -> None:
        super().__init__(message, code="QUOTA_EXCEEDED", status_code=429, raw=raw)
        self.upgrade_url: Optional[str] = (raw or {}).get("upgrade_url")


class ClipRateLimitedError(WhipScribeError):
    """429 CLIP_RATE_LIMITED — daily clip count for this tier reached."""


class RateLimitedError(WhipScribeError):
    """429 RATE_LIMITED — too many submits; retry with backoff."""


# ---------------------------------------------------------------------------
# 5xx server errors
# ---------------------------------------------------------------------------

class BackendError(WhipScribeError):
    """502 BACKEND_ERROR — upstream transcription service error; retry."""


class BackendUnreachableError(WhipScribeError):
    """502 BACKEND_UNREACHABLE — couldn't reach transcription backend; retry."""


# ---------------------------------------------------------------------------
# Client-side errors (not from the API)
# ---------------------------------------------------------------------------

class JobTimeoutError(WhipScribeError):
    """Raised by wait_for_done() when the job hasn't finished in time."""

    def __init__(self, job_id: str, timeout_seconds: int) -> None:
        super().__init__(
            f"Job {job_id!r} did not finish within {timeout_seconds}s",
            code="CLIENT_TIMEOUT",
        )
        self.job_id = job_id
        self.timeout_seconds = timeout_seconds


class JobFailedError(WhipScribeError):
    """Raised by wait_for_done() when the job reaches status=failed."""

    def __init__(self, job_id: str, error: Optional[str] = None) -> None:
        super().__init__(
            f"Job {job_id!r} failed on the server: {error or '(no error message)'}",
            code="JOB_FAILED",
        )
        self.job_id = job_id
        self.server_error = error


class NoSpeechError(WhipScribeError):
    """Raised when speech_detected=False — audio had no transcribable speech."""

    def __init__(self, suggestion: Optional[str] = None) -> None:
        super().__init__(
            suggestion or "Audio contains no transcribable speech (VAD rejected).",
            code="NO_SPEECH",
        )
        self.suggestion = suggestion


# ---------------------------------------------------------------------------
# Error factory — map raw API response → typed exception
# ---------------------------------------------------------------------------

_CODE_MAP: dict[str, type] = {
    "BAD_ID":                BadRequestError,
    "BAD_URL":               BadRequestError,
    "BAD_IDEMPOTENCY_KEY":   BadRequestError,
    "MISSING_API_KEY":       AuthenticationError,
    "AUTHENTICATION_REQUIRED": AuthenticationError,
    "NO_CREDITS":            InsufficientCreditsError,
    "transcript_locked":     TranscriptLockedError,
    "CLIPS_UPLOAD_ONLY":     ForbiddenError,
    "NOT_FOUND":             NotFoundError,
    "AUDIO_EXPIRED":         AudioExpiredError,
    "AUDIO_MISSING":         AudioMissingError,
    "FILE_TOO_LARGE":        FileTooLargeError,
    "BAD_MIME":              BadMimeError,
    "BAD_SOURCE":            BadSourceError,
    "FEATURES_NOT_READY":    FeaturesNotReadyError,
    "TRANSCRIPT_NOT_DONE":   TranscriptNotDoneError,
    "QUOTA_EXCEEDED":        QuotaExceededError,
    "CLIP_RATE_LIMITED":     ClipRateLimitedError,
    "RATE_LIMITED":          RateLimitedError,
    "BACKEND_ERROR":         BackendError,
    "BACKEND_UNREACHABLE":   BackendUnreachableError,
}


def from_response(status_code: int, body: dict) -> WhipScribeError:
    """Build the most-specific exception from an API error response body."""
    code    = body.get("code", "")
    message = body.get("error", f"HTTP {status_code}")

    cls = _CODE_MAP.get(code)

    # Special-case classes that accept `raw` in __init__ to extract extra fields
    if cls in (InsufficientCreditsError, TranscriptLockedError,
               QuotaExceededError, AudioExpiredError):
        return cls(message, raw=body)

    if cls is not None:
        return cls(message, code=code, status_code=status_code, raw=body)

    # Fallback by status code range
    if status_code == 401:
        return AuthenticationError(message, code=code, status_code=status_code, raw=body)
    if status_code == 403:
        return ForbiddenError(message, code=code, status_code=status_code, raw=body)
    if status_code == 404:
        return NotFoundError(message, code=code, status_code=status_code, raw=body)
    if status_code >= 500:
        return BackendError(message, code=code, status_code=status_code, raw=body)

    return WhipScribeError(message, code=code, status_code=status_code, raw=body)
