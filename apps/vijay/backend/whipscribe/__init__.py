"""
WhipScribe API client and Agentic AI package.

Usage:
    from whipscribe import WhipScribeClient
    from whipscribe.agent import AgentOrchestrator, CallIntent
    from whipscribe.types import TranscriptFormat, JobStatus

    client = WhipScribeClient()          # reads WHIPSCRIBE_API from .env
    job    = client.transcribe.submit_file("call.mp3", language="en")
    result = client.jobs.wait_for_done(job.job_id)
    tx     = client.jobs.get_transcript(job.job_id, format=TranscriptFormat.JSON)

    orchestrator = AgentOrchestrator()
    proposal = orchestrator.process_call(tx)
"""

from .client import WhipScribeClient
from .agent import AgentOrchestrator, RouterAgent, CallIntent
from . import types
from . import exceptions

__all__ = ["WhipScribeClient", "AgentOrchestrator", "RouterAgent", "CallIntent", "types", "exceptions"]
