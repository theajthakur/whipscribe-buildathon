"""
Quick smoke-test for the WhipScribe client.

Run from the backend directory:
    python -m whipscribe.test_client

What it does:
  1. Loads the API key from .env
  2. Calls GET /me to verify auth
  3. Lists recent jobs (if any)

It does NOT upload a file or consume credits.
"""

from __future__ import annotations

import sys
from whipscribe import WhipScribeClient
from whipscribe.types import JobStatus


def main() -> None:
    print("=== WhipScribe Client Smoke Test ===\n")

    client = WhipScribeClient()
    print(f"Client ready: {client}\n")

    # 1. Who am I?
    me = client.account.me()
    print(f"Account:  email={me.email!r}  tier={me.tier.value}  "
          f"retention={me.retention_days}d  signed_in={me.signed_in}")

    # 2. List recent jobs
    print("\nRecent jobs (limit=5):")
    jobs = client.jobs.list(limit=5)
    if not jobs:
        print("  (no jobs yet)")
    for j in jobs:
        dur = f"{j.audio_duration_seconds:.0f}s" if j.audio_duration_seconds else "?"
        print(f"  [{j.status.value:10s}] {j.job_id}  {j.filename or '(no name)'}  {dur}")

    print("\n[OK] Smoke test passed -- API key is valid and reachable.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n[ERROR]: {e}", file=sys.stderr)
        sys.exit(1)
