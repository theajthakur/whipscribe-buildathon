"""
Application settings loaded via pydantic-settings.

Pydantic-settings reads values in this priority order:
  1. Environment variables (already set in the shell)
  2. .env file   — auto-discovered at ``backend/.env``
  3. Field defaults

The settings object is a module-level singleton (``settings``).
Import it wherever you need config:

    from whipscribe.settings import settings

    print(settings.whipscribe_api)
    print(settings.api_base_url)
"""

from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve the .env file next to this package (backend/.env)
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """
    WhipScribe client configuration.

    Every field can be overridden by a matching environment variable
    (case-insensitive) or a line in ``backend/.env``.
    """

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",          # ignore unknown keys in .env
    )

    # ------------------------------------------------------------------
    # Required
    # ------------------------------------------------------------------
    whipscribe_api: str
    """
    Your WhipScribe API key (``tk_...``).
    Set as ``WHIPSCRIBE_API=tk_...`` in ``backend/.env`` or as an env var.
    """

    # ------------------------------------------------------------------
    # Optional — sensible defaults
    # ------------------------------------------------------------------
    api_base_url: str = "https://whipscribe.com/api/v1"
    """Override the WhipScribe API base URL (useful for local testing)."""

    api_timeout: int = 120
    """Default per-request HTTP timeout in seconds."""

    api_max_retries: int = 3
    """Maximum retry attempts for 429 / 502 responses."""

    api_backoff_base: float = 1.5
    """Base wait time (seconds) for exponential backoff between retries."""

    jobs_poll_interval: float = 3.0
    """Seconds between status polls in ``jobs.wait_for_done()``."""

    jobs_poll_timeout: float = 600.0
    """Maximum seconds ``jobs.wait_for_done()`` will wait before raising."""

    clips_poll_interval: float = 5.0
    """Seconds between status polls in ``clips.wait_for_done()``."""

    clips_poll_timeout: float = 300.0
    """Maximum seconds ``clips.wait_for_done()`` will wait before raising."""


# Module-level singleton — import this everywhere
settings = Settings()  # type: ignore[call-arg]
