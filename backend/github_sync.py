"""
Padel Stats France — GitHub sync
Recompresses the live DB and pushes it to the repo so the next cold start
(and the next Vercel deployment) picks up newly imported months, instead of
losing them the moment the serverless instance goes cold.

Compressing the whole DB at a high enough ratio to fit the 225MB Vercel
function bundle takes minutes — too long for one request, and a background
thread doesn't help: Vercel freezes a function's execution environment
between invocations, so a thread only gets CPU time during the brief slices
when a request happens to be in flight.

Instead, progress is persisted in the sync_job table and advanced one
bounded raw chunk at a time by run_sync_step(), mirroring how the FFT
import itself is chunked. Each chunk is compressed and pushed to GitHub as
its own independent part — see database.py for the matching reassembly.

Uses zstandard rather than lzma: lzma's _lzma C extension needs liblzma,
which isn't present on Vercel's Python runtime. zstandard's wheel bundles
its own libzstd, no system dependency.
"""
import base64
import os
import string

import requests
import zstandard as zstd

from config import settings
from database import get_db

GITHUB_API = "https://api.github.com"
COMPRESSION_LEVEL = 22
CHUNK_SIZE = 40 * 1024 * 1024  # raw bytes per step — a few seconds to compress


def _get_job(conn):
    row = conn.execute("SELECT * FROM sync_job WHERE id=1").fetchone()
    return dict(row) if row else None


def get_sync_status():
    with get_db() as conn:
        job = _get_job(conn)
    return job or {"status": "idle"}


def start_sync():
    if not settings.github_token:
        return {"status": "error", "error": "GITHUB_TOKEN non configure"}

    from database import DB_PATH
    with get_db() as conn:
        job = _get_job(conn)
        if job and job["status"] == "running":
            return job

        total_size = os.path.getsize(DB_PATH)
        conn.execute(
            """INSERT INTO sync_job (id, total_size, chunk_size, offset, part_index, status, error, updated_at)
               VALUES (1, ?, ?, 0, 0, 'running', NULL, datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                 total_size=excluded.total_size, chunk_size=excluded.chunk_size,
                 offset=0, part_index=0, status='running', error=NULL,
                 updated_at=datetime('now')""",
            (total_size, CHUNK_SIZE),
        )
        conn.commit()
    return {"status": "running", "part_index": 0, "total_size": total_size}


def run_sync_step():
    """Compress and push one chunk. Call repeatedly until status != 'running'."""
    from database import DB_PATH
    with get_db() as conn:
        job = _get_job(conn)
        if not job or job["status"] != "running":
            return job or {"status": "idle"}

        offset = job["offset"]
        total_size = job["total_size"]
        part_index = job["part_index"]
        chunk_size = job["chunk_size"]

        try:
            with open(DB_PATH, "rb") as f:
                f.seek(offset)
                chunk = f.read(chunk_size)

            if chunk:
                compressed = zstd.ZstdCompressor(level=COMPRESSION_LEVEL).compress(chunk)
                _push_part_to_github(part_index, compressed)
                offset += len(chunk)
                part_index += 1
                conn.execute(
                    "UPDATE sync_job SET offset=?, part_index=?, updated_at=datetime('now') WHERE id=1",
                    (offset, part_index),
                )
                conn.commit()

            if offset >= total_size:
                _cleanup_stale_parts(part_index)
                conn.execute("UPDATE sync_job SET status='done', updated_at=datetime('now') WHERE id=1")
                conn.commit()
                return {"status": "done", "parts": part_index}

            return {"status": "running", "part_index": part_index, "offset": offset, "total_size": total_size}
        except Exception as e:
            conn.execute(
                "UPDATE sync_job SET status='error', error=?, updated_at=datetime('now') WHERE id=1",
                (str(e),),
            )
            conn.commit()
            return {"status": "error", "error": str(e)}


def _part_suffix(i):
    """aa, ab, ac, ... matching the repo's previous split-file convention."""
    letters = string.ascii_lowercase
    return letters[i // 26] + letters[i % 26]


def _github_headers():
    return {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
    }


def _push_part_to_github(index, data):
    path = f"{settings.github_db_path}.{_part_suffix(index)}"
    url = f"{GITHUB_API}/repos/{settings.github_repo}/contents/{path}"
    headers = _github_headers()

    resp = requests.get(url, headers=headers, params={"ref": settings.github_branch}, timeout=30)
    sha = resp.json().get("sha") if resp.status_code == 200 else None

    payload = {
        "message": "chore: auto-sync classement DB depuis l'import Ten'Up",
        "content": base64.b64encode(data).decode(),
        "branch": settings.github_branch,
    }
    if sha:
        payload["sha"] = sha

    put_resp = requests.put(url, headers=headers, json=payload, timeout=60)
    put_resp.raise_for_status()


def _cleanup_stale_parts(final_part_count):
    """Delete any leftover parts from a previous sync that produced more
    parts than this one (DB shrinking is rare, but avoids a stale trailing
    part corrupting the next reassembly)."""
    headers = _github_headers()
    for i in range(final_part_count, final_part_count + 10):
        path = f"{settings.github_db_path}.{_part_suffix(i)}"
        url = f"{GITHUB_API}/repos/{settings.github_repo}/contents/{path}"
        resp = requests.get(url, headers=headers, params={"ref": settings.github_branch}, timeout=30)
        if resp.status_code != 200:
            break
        sha = resp.json().get("sha")
        requests.delete(
            url, headers=headers,
            json={"message": "chore: cleanup stale DB part", "sha": sha, "branch": settings.github_branch},
            timeout=30,
        )
