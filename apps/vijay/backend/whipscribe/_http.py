"""
Internal HTTP session for the WhipScribe API.

Handles:
  - Auth header injection (X-API-Key, optional X-User-Email)
  - Automatic error-response → typed-exception conversion
  - Idempotency-Key support
  - Exponential backoff for 429 / 502 responses

Config (timeouts, retries, base URL) is read from ``settings``.
Do not import this module directly in application code; use WhipScribeClient.
"""

from __future__ import annotations

import time
import logging
from typing import Any, Optional

import requests
from requests import Response, Session

from .settings import settings
from . import exceptions as exc

logger = logging.getLogger(__name__)

# Status codes that are safe to retry with backoff
_RETRYABLE_STATUS = {429, 502}


def _raise_for_error(response: Response) -> None:
    """Convert a non-2xx response to a typed WhipScribeError."""
    if response.ok:
        return

    try:
        body = response.json()
    except Exception:
        body = {"error": response.text or f"HTTP {response.status_code}", "code": ""}

    raise exc.from_response(response.status_code, body)


class HttpSession:
    """
    Thin wrapper around requests.Session that injects auth headers and
    converts API errors to typed exceptions.

    Parameters
    ----------
    api_key : str | None
        WhipScribe API key.  If ``None``, taken from ``settings.whipscribe_api``
        (which pydantic-settings loads from ``WHIPSCRIBE_API`` env var or
        ``backend/.env``).
    user_email : str | None
        Optional ``X-User-Email`` header for server-to-server flows.
    base_url : str | None
        Override the API base URL.  Defaults to ``settings.api_base_url``.
    timeout : int | None
        Per-request timeout in seconds.  Defaults to ``settings.api_timeout``.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        user_email: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[int] = None,
    ) -> None:
        self._api_key   = api_key   or settings.whipscribe_api
        self._base_url  = (base_url or settings.api_base_url).rstrip("/")
        self._timeout   = timeout   if timeout is not None else settings.api_timeout
        self._max_retries   = settings.api_max_retries
        self._backoff_base  = settings.api_backoff_base

        self._session = Session()
        self._session.headers.update({"X-API-Key": self._api_key})
        if user_email:
            self._session.headers.update({"X-User-Email": user_email})

    # ------------------------------------------------------------------
    # Public request helpers
    # ------------------------------------------------------------------

    def get(self, path: str, **kwargs: Any) -> Any:
        return self._request("GET", path, **kwargs)

    def post(self, path: str, **kwargs: Any) -> Any:
        return self._request("POST", path, **kwargs)

    def delete(self, path: str, **kwargs: Any) -> Any:
        return self._request("DELETE", path, **kwargs)

    def get_raw(self, path: str, **kwargs: Any) -> Response:
        """Return the raw requests.Response (for non-JSON formats like txt/srt)."""
        return self._request_raw("GET", path, **kwargs)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _url(self, path: str) -> str:
        return f"{self._base_url}/{path.lstrip('/')}"

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Execute request, raise on error, return parsed JSON."""
        resp = self._request_raw(method, path, **kwargs)
        if resp.status_code == 204:
            return None
        _raise_for_error(resp)
        return resp.json()

    def _request_raw(self, method: str, path: str, **kwargs: Any) -> Response:
        """
        Execute request with exponential-backoff retry on retryable codes.
        Injects timeout unless the caller overrides it.
        """
        kwargs.setdefault("timeout", self._timeout)
        url = self._url(path)
        last_exc: Optional[Exception] = None

        for attempt in range(self._max_retries):
            try:
                resp = self._session.request(method, url, **kwargs)
            except requests.RequestException as e:
                logger.warning("Network error on attempt %d: %s", attempt + 1, e)
                last_exc = e
                time.sleep(self._backoff_base * (2 ** attempt))
                continue

            if resp.status_code in _RETRYABLE_STATUS and attempt < self._max_retries - 1:
                wait = self._backoff_base * (2 ** attempt)
                logger.warning(
                    "HTTP %s for %s %s — retrying in %.1fs (attempt %d/%d)",
                    resp.status_code, method, url, wait,
                    attempt + 1, self._max_retries,
                )
                time.sleep(wait)
                continue

            return resp

        if last_exc:
            raise WhipScribeNetworkError(str(last_exc)) from last_exc

        raise exc.WhipScribeError("Unexpected retry loop exit")

    def with_idempotency_key(self, key: str) -> "_IdempotentSession":
        """Return a context-scoped session that adds Idempotency-Key on POSTs."""
        return _IdempotentSession(self, key)


class _IdempotentSession:
    """Thin wrapper that injects an Idempotency-Key header into POST calls."""

    def __init__(self, session: HttpSession, key: str) -> None:
        self._session = session
        self._key = key

    def post(self, path: str, **kwargs: Any) -> Any:
        headers = kwargs.pop("headers", {})
        headers["Idempotency-Key"] = self._key
        return self._session.post(path, headers=headers, **kwargs)

    def get(self, path: str, **kwargs: Any) -> Any:
        return self._session.get(path, **kwargs)


class WhipScribeNetworkError(exc.WhipScribeError):
    """Raised when the HTTP request itself fails (DNS, timeout, etc.)."""
