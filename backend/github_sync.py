"""
Padel Stats France — GitHub sync
Recompresses the live DB and pushes it to the repo so the next cold start
(and the next Vercel deployment) picks up newly imported months, instead of
losing them the moment the serverless instance goes cold.

Runs synchronously within a single request — NOT a background thread.
Vercel freezes a function's execution environment between invocations, so a
thread started in one request doesn't keep running while later polling
requests come in; it only gets to progress during the brief slices when a
request happens to be in flight, which for a multi-minute compression as a
"background" job never finishes. A fast, low zstd level keeps the whole
compress+push well inside a single request's time budget.

Fast levels compress worse, so the output is split into <90MB parts to
stay under GitHub's 100MB per-file limit (see database.py for reassembly).

Uses zstandard rather than lzma: lzma's _lzma C extension needs liblzma,
which isn't present on Vercel's Python runtime. zstandard's wheel bundles
its own libzstd, no system dependency.
"""
import base64
import string

import requests
import zstandard as zstd

from config import settings

GITHUB_API = "https://api.github.com"
COMPRESSION_LEVEL = 9
PART_SIZE = 90 * 1024 * 1024

_state = {"status": "idle", "detail": ""}


def get_sync_status():
    return dict(_state)


def start_sync():
    if not settings.github_token:
        _state.update(status="error", detail="GITHUB_TOKEN non configure")
        return dict(_state)

    _state.update(status="running", detail="Compression de la base...")
    try:
        from database import DB_PATH
        with open(DB_PATH, "rb") as f_in:
            compressed = zstd.ZstdCompressor(level=COMPRESSION_LEVEL).compress(f_in.read())

        parts = [compressed[i:i + PART_SIZE] for i in range(0, len(compressed), PART_SIZE)]

        _state["detail"] = f"Envoi vers GitHub ({len(parts)} fichier(s))..."
        _push_parts_to_github(parts)

        _state.update(status="done", detail="Base synchronisee")
    except Exception as e:
        _state.update(status="error", detail=str(e))
    return dict(_state)


def _part_suffix(i):
    """aa, ab, ac, ... matching the repo's previous split-file convention."""
    letters = string.ascii_lowercase
    return letters[i // 26] + letters[i % 26]


def _push_parts_to_github(parts):
    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
    }
    for i, part in enumerate(parts):
        path = f"{settings.github_db_path}.{_part_suffix(i)}"
        url = f"{GITHUB_API}/repos/{settings.github_repo}/contents/{path}"

        resp = requests.get(url, headers=headers, params={"ref": settings.github_branch}, timeout=30)
        sha = resp.json().get("sha") if resp.status_code == 200 else None

        payload = {
            "message": "chore: auto-sync classement DB depuis l'import Ten'Up",
            "content": base64.b64encode(part).decode(),
            "branch": settings.github_branch,
        }
        if sha:
            payload["sha"] = sha

        put_resp = requests.put(url, headers=headers, json=payload, timeout=120)
        put_resp.raise_for_status()
