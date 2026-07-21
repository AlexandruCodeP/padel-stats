"""
Padel Stats France — GitHub sync
Recompresses the live DB and pushes it to the repo so the next cold start
(and the next Vercel deployment) picks up newly imported months, instead of
losing them the moment the serverless instance goes cold.

Compressing the whole DB at a high enough ratio to fit the 225MB Vercel
function bundle takes minutes — too long for one request, and a background
thread doesn't help: Vercel freezes a function's execution environment
between invocations, so a thread only gets CPU time during the brief slices
when a request happens to be in flight. Progress is instead persisted in
the sync_job table and advanced one bounded raw chunk at a time by
run_sync_step(), mirroring how the FFT import itself is chunked.

Each chunk is uploaded as its own Git *blob* — a blob create doesn't touch
any branch, so it can't trigger a Vercel deployment. Only the final step
assembles every blob into one tree, one commit, and one branch-ref update,
so exactly one deployment is triggered and it's always built from a fully
consistent set of parts. (An earlier version committed each part through
the Contents API individually — each commit updates the branch ref on its
own, so partial syncs triggered several overlapping deployments, each
built from whatever inconsistent mix of old/new parts existed at that
moment, corrupting the DB. Don't reintroduce per-part commits.)

Uses zstandard rather than lzma: lzma's _lzma C extension needs liblzma,
which isn't present on Vercel's Python runtime. zstandard's wheel bundles
its own libzstd, no system dependency.
"""
import base64
import json
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
            """INSERT INTO sync_job (id, total_size, chunk_size, offset, part_index, blob_shas_json, status, error, updated_at)
               VALUES (1, ?, ?, 0, 0, '[]', 'running', NULL, datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                 total_size=excluded.total_size, chunk_size=excluded.chunk_size,
                 offset=0, part_index=0, blob_shas_json='[]', status='running',
                 error=NULL, updated_at=datetime('now')""",
            (total_size, CHUNK_SIZE),
        )
        conn.commit()
    return {"status": "running", "part_index": 0, "total_size": total_size}


def run_sync_step():
    """Compress+upload one chunk as a blob, or — once every chunk is done —
    assemble the final commit. Call repeatedly until status != 'running'."""
    from database import DB_PATH
    with get_db() as conn:
        job = _get_job(conn)
        if not job or job["status"] != "running":
            return job or {"status": "idle"}

        offset = job["offset"]
        total_size = job["total_size"]
        part_index = job["part_index"]
        chunk_size = job["chunk_size"]
        blob_shas = json.loads(job["blob_shas_json"])

        try:
            if offset < total_size:
                with open(DB_PATH, "rb") as f:
                    f.seek(offset)
                    chunk = f.read(chunk_size)

                compressed = zstd.ZstdCompressor(level=COMPRESSION_LEVEL).compress(chunk)
                blob_shas.append(_create_blob(compressed))
                offset += len(chunk)
                part_index += 1
                conn.execute(
                    """UPDATE sync_job SET offset=?, part_index=?, blob_shas_json=?,
                       updated_at=datetime('now') WHERE id=1""",
                    (offset, part_index, json.dumps(blob_shas)),
                )
                conn.commit()

            if offset >= total_size:
                _finalize_commit(blob_shas)
                conn.execute("UPDATE sync_job SET status='done', updated_at=datetime('now') WHERE id=1")
                conn.commit()
                return {"status": "done", "parts": len(blob_shas)}

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


def _create_blob(data):
    """Upload one chunk as a Git blob. Doesn't touch any branch/ref, so it
    can't trigger a deployment — safe to call from every intermediate step."""
    url = f"{GITHUB_API}/repos/{settings.github_repo}/git/blobs"
    resp = requests.post(
        url, headers=_github_headers(),
        json={"content": base64.b64encode(data).decode(), "encoding": "base64"},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["sha"]


def _finalize_commit(blob_shas):
    """Build one tree from every part's blob, one commit, and move the
    branch ref to it in a single update — the only step that can trigger a
    Vercel deployment, and it always points at a fully consistent set."""
    headers = _github_headers()
    repo = settings.github_repo
    branch = settings.github_branch

    ref_resp = requests.get(f"{GITHUB_API}/repos/{repo}/git/refs/heads/{branch}", headers=headers, timeout=30)
    ref_resp.raise_for_status()
    base_commit_sha = ref_resp.json()["object"]["sha"]

    commit_resp = requests.get(f"{GITHUB_API}/repos/{repo}/git/commits/{base_commit_sha}", headers=headers, timeout=30)
    commit_resp.raise_for_status()
    base_tree_sha = commit_resp.json()["tree"]["sha"]

    tree = [
        {"path": f"{settings.github_db_path}.{_part_suffix(i)}", "mode": "100644", "type": "blob", "sha": sha}
        for i, sha in enumerate(blob_shas)
    ]
    tree += _stale_part_deletions(len(blob_shas), headers)

    tree_resp = requests.post(
        f"{GITHUB_API}/repos/{repo}/git/trees", headers=headers,
        json={"base_tree": base_tree_sha, "tree": tree}, timeout=60,
    )
    tree_resp.raise_for_status()
    new_tree_sha = tree_resp.json()["sha"]

    commit_create_resp = requests.post(
        f"{GITHUB_API}/repos/{repo}/git/commits", headers=headers,
        json={
            "message": "chore: auto-sync classement DB depuis l'import Ten'Up",
            "tree": new_tree_sha,
            "parents": [base_commit_sha],
        },
        timeout=30,
    )
    commit_create_resp.raise_for_status()
    new_commit_sha = commit_create_resp.json()["sha"]

    update_resp = requests.patch(
        f"{GITHUB_API}/repos/{repo}/git/refs/heads/{branch}", headers=headers,
        json={"sha": new_commit_sha}, timeout=30,
    )
    update_resp.raise_for_status()


def _stale_part_deletions(final_part_count, headers):
    """Tree entries removing any leftover parts from a previous sync that
    produced more parts than this one (sha=None deletes a path from a tree
    built with base_tree)."""
    deletions = []
    for i in range(final_part_count, final_part_count + 10):
        path = f"{settings.github_db_path}.{_part_suffix(i)}"
        url = f"{GITHUB_API}/repos/{settings.github_repo}/contents/{path}"
        resp = requests.get(url, headers=headers, params={"ref": settings.github_branch}, timeout=20)
        if resp.status_code != 200:
            break
        deletions.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
    return deletions
