"""
Padel Stats France — GitHub sync
Recompresses the live DB and pushes it to the repo so the next cold start
(and the next Vercel deployment) picks up newly imported months, instead of
losing them the moment the serverless instance goes cold.

Compressing the full DB at a high ratio takes minutes, far longer than a
single serverless request should run. It runs in a background thread
instead, driven forward across several short /import/sync-status polls
from the frontend while the instance stays warm.

Uses zstandard rather than lzma: lzma's _lzma C extension needs liblzma,
which isn't present on Vercel's Python runtime. zstandard's wheel bundles
its own libzstd, no system dependency — see database.py for the same fix
on the read side.
"""
import base64
import os
import threading

import requests
import zstandard as zstd

from config import settings

GITHUB_API = "https://api.github.com"

_state = {"status": "idle", "detail": ""}
_lock = threading.Lock()


def get_sync_status():
    with _lock:
        return dict(_state)


def start_sync():
    with _lock:
        if _state["status"] == "running":
            return dict(_state)
        if not settings.github_token:
            _state["status"] = "error"
            _state["detail"] = "GITHUB_TOKEN non configure"
            return dict(_state)
        _state["status"] = "running"
        _state["detail"] = "Compression de la base..."
    thread = threading.Thread(target=_run_sync, daemon=True)
    thread.start()
    return {"status": "running", "detail": _state["detail"]}


def _run_sync():
    from database import DB_PATH
    tmp_zst = DB_PATH + ".sync.zst"
    try:
        with open(DB_PATH, "rb") as f_in, open(tmp_zst, "wb") as f_out:
            zstd.ZstdCompressor(level=22).copy_stream(f_in, f_out)

        with _lock:
            _state["detail"] = "Envoi vers GitHub..."

        _push_to_github(tmp_zst)

        with _lock:
            _state["status"] = "done"
            _state["detail"] = "Base synchronisee"
    except Exception as e:
        with _lock:
            _state["status"] = "error"
            _state["detail"] = str(e)
    finally:
        if os.path.exists(tmp_zst):
            os.remove(tmp_zst)


def _push_to_github(zst_path):
    if not settings.github_token:
        raise RuntimeError("GITHUB_TOKEN non configure")

    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
    }
    url = f"{GITHUB_API}/repos/{settings.github_repo}/contents/{settings.github_db_path}"

    resp = requests.get(url, headers=headers, params={"ref": settings.github_branch}, timeout=30)
    sha = resp.json().get("sha") if resp.status_code == 200 else None

    with open(zst_path, "rb") as f:
        content_b64 = base64.b64encode(f.read()).decode()

    payload = {
        "message": "chore: auto-sync classement DB depuis l'import Ten'Up",
        "content": content_b64,
        "branch": settings.github_branch,
    }
    if sha:
        payload["sha"] = sha

    put_resp = requests.put(url, headers=headers, json=payload, timeout=180)
    put_resp.raise_for_status()
