"""
Typed dataclasses and enums that mirror the WhipScribe API v1 response shapes.

Every field name here matches the exact JSON key returned by the API so that
callers can rely on them without parsing raw dicts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class JobStatus(str, Enum):
    """Possible values of the `status` field on a job row."""
    QUEUED     = "queued"
    PROCESSING = "processing"
    DONE       = "done"
    FAILED     = "failed"


class TranscriptFormat(str, Enum):
    """Supported export formats for GET /jobs/{id}/result."""
    JSON = "json"
    TXT  = "txt"
    SRT  = "srt"
    VTT  = "vtt"
    DOCX = "docx"


class TranscriptSource(str, Enum):
    """How the file reached WhipScribe (the `source` field)."""
    UPLOAD    = "upload"
    URL       = "url"
    RECORDING = "recording"
    API       = "api"


class AccountTier(str, Enum):
    GUEST = "guest"
    FREE  = "free"
    PAID  = "paid"


class ClipStatus(str, Enum):
    RENDERING = "rendering"
    DONE      = "done"
    FAILED    = "failed"


class CandidateKind(str, Enum):
    HOOK           = "hook"
    QUESTION       = "question"
    NUMBER         = "number"
    SPEAKER_CHANGE = "speaker_change"
    HIGH_ENERGY    = "high_energy"


# ---------------------------------------------------------------------------
# Job-level types
# ---------------------------------------------------------------------------

@dataclass
class SubmitResponse:
    """202 Accepted response from POST /v1/transcribe or /v1/transcribe/url."""
    job_id: str
    status: JobStatus
    tier: Optional[int] = None
    claim_token: Optional[str] = None   # present only when no user identity sent

    @classmethod
    def from_dict(cls, d: dict) -> "SubmitResponse":
        return cls(
            job_id=d["job_id"],
            status=JobStatus(d["status"]),
            tier=d.get("tier"),
            claim_token=d.get("claim_token"),
        )


@dataclass
class JobRow:
    """One row from GET /v1/jobs (list) or GET /v1/jobs/{id} (poll)."""
    job_id: str
    status: JobStatus
    filename: Optional[str] = None
    audio_duration_seconds: Optional[float] = None
    language: Optional[str] = None
    source: Optional[TranscriptSource] = None
    created_at: Optional[float] = None
    progress: Optional[float] = None       # 0.0–1.0, processing only
    speech_detected: Optional[bool] = None
    speech_ratio: Optional[float] = None   # 0.0–1.0
    locked: Optional[bool] = None
    locked_code: Optional[str] = None
    unlock_url: Optional[str] = None
    error: Optional[str] = None

    @classmethod
    def from_dict(cls, d: dict) -> "JobRow":
        src = d.get("source")
        return cls(
            job_id=d["job_id"],
            status=JobStatus(d["status"]),
            filename=d.get("filename"),
            audio_duration_seconds=d.get("audio_duration_seconds"),
            language=d.get("language"),
            source=TranscriptSource(src) if src else None,
            created_at=d.get("created_at"),
            progress=d.get("progress"),
            speech_detected=d.get("speech_detected"),
            speech_ratio=d.get("speech_ratio"),
            locked=d.get("locked"),
            locked_code=d.get("locked_code"),
            unlock_url=d.get("unlock_url"),
            error=d.get("error"),
        )


# ---------------------------------------------------------------------------
# Transcript result types
# ---------------------------------------------------------------------------

@dataclass
class Word:
    """Per-word timestamp entry inside a segment."""
    start: float
    end: float
    text: str

    @classmethod
    def from_dict(cls, d: dict) -> "Word":
        return cls(start=d["start"], end=d["end"], text=d["text"])


@dataclass
class Segment:
    """One transcribed segment (sentence / speaker turn)."""
    start: float
    end: float
    text: str
    speaker: Optional[str] = None       # e.g. "SPEAKER_00"
    words: List[Word] = field(default_factory=list)

    @classmethod
    def from_dict(cls, d: dict) -> "Segment":
        raw_words = d.get("words") or []
        return cls(
            start=d.get("start", 0.0),
            end=d.get("end", 0.0),
            text=d.get("text", ""),
            speaker=d.get("speaker"),
            words=[Word.from_dict(w) for w in raw_words if isinstance(w, dict)],
        )


@dataclass
class TranscriptResult:
    """JSON transcript from GET /v1/jobs/{id}/result?format=json."""
    text: str
    language: Optional[str]
    segments: List[Segment]
    speech_detected: Optional[bool] = None
    speech_ratio: Optional[float] = None
    suggestion: Optional[str] = None   # present on VAD-rejected files

    @classmethod
    def from_dict(cls, d: dict) -> "TranscriptResult":
        raw_segments = d.get("segments") or []
        return cls(
            text=d.get("text", ""),
            language=d.get("language"),
            segments=[Segment.from_dict(s) for s in raw_segments if isinstance(s, dict)],
            speech_detected=d.get("speech_detected"),
            speech_ratio=d.get("speech_ratio"),
            suggestion=d.get("suggestion"),
        )


# ---------------------------------------------------------------------------
# Audio / playback URL
# ---------------------------------------------------------------------------

@dataclass
class AudioUrl:
    """Response from GET /v1/jobs/{id}/audio/url."""
    url: str
    storage: str          # "vultr" | "disk"
    expires_in: int       # seconds
    retention_days: Optional[int] = None  # only on 410 responses

    @classmethod
    def from_dict(cls, d: dict) -> "AudioUrl":
        return cls(
            url=d["url"],
            storage=d["storage"],
            expires_in=d["expires_in"],
            retention_days=d.get("retention_days"),
        )


# ---------------------------------------------------------------------------
# Account / me
# ---------------------------------------------------------------------------

@dataclass
class AccountInfo:
    """Response from GET /v1/me."""
    email: Optional[str]
    tier: AccountTier
    retention_days: int
    signed_in: bool

    @classmethod
    def from_dict(cls, d: dict) -> "AccountInfo":
        return cls(
            email=d.get("email"),
            tier=AccountTier(d["tier"]),
            retention_days=d["retention_days"],
            signed_in=d["signed_in"],
        )


# ---------------------------------------------------------------------------
# Clips
# ---------------------------------------------------------------------------

@dataclass
class ClipSubmitResponse:
    """202 response from POST /v1/jobs/{id}/clips."""
    clip_id: str
    status: ClipStatus
    duration_s: float
    billed: bool
    poll: str   # relative path, e.g. /v1/clips/<id>

    @classmethod
    def from_dict(cls, d: dict) -> "ClipSubmitResponse":
        return cls(
            clip_id=d["clip_id"],
            status=ClipStatus(d["status"]),
            duration_s=d["duration_s"],
            billed=d["billed"],
            poll=d["poll"],
        )


@dataclass
class ClipResult:
    """Clip row from GET /v1/clips/{clip_id}."""
    status: ClipStatus
    video_url: Optional[str]
    duration_s: Optional[float]

    @classmethod
    def from_dict(cls, d: dict) -> "ClipResult":
        clip = d.get("clip", d)   # API wraps in {"clip": {...}}
        return cls(
            status=ClipStatus(clip["status"]),
            video_url=clip.get("video_url"),
            duration_s=clip.get("duration_s"),
        )


# ---------------------------------------------------------------------------
# Clip candidates / moments
# ---------------------------------------------------------------------------

@dataclass
class ClipCandidate:
    """One sentence from GET /v1/jobs/{id}/clips/candidates."""
    start_s: float
    end_s: float
    text: str

    @classmethod
    def from_dict(cls, d: dict) -> "ClipCandidate":
        return cls(start_s=d["start_s"], end_s=d["end_s"], text=d["text"])
