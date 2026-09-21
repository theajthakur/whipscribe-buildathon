"""
Account resource — identity and billing info.

Wraps:
  GET /api/v1/me
"""

from __future__ import annotations

from ._http import HttpSession
from .types import AccountInfo


class AccountResource:
    """
    Methods for reading account identity and plan details.

    Access via ``client.account``.

    Examples
    --------
    me = client.account.me()
    print(me.tier, me.retention_days, me.email)
    """

    def __init__(self, http: HttpSession) -> None:
        self._http = http

    def me(self) -> AccountInfo:
        """
        Return what the server sees when this API key calls.

        Use this to discover the caller's tier and the audio retention window
        rather than hardcoding values.

        Returns
        -------
        AccountInfo
            Contains ``tier`` (guest | free | paid), ``retention_days``,
            ``email``, and ``signed_in``.
        """
        data = self._http.get("/me")
        return AccountInfo.from_dict(data)
