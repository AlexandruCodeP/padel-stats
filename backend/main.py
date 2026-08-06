"""
Padel Stats France — FastAPI application
REST API with base, dashboard, and analytics endpoints.
"""
import datetime
import logging
import os

from fastapi import FastAPI, Query, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from typing import Optional

from config import settings
from auth import router as auth_router
from database import (
    init_db, get_db, get_stats, get_mois_disponibles, get_classement,
    get_classement_export,
    get_joueur, search_joueurs, get_top, compare_joueurs, get_ligues, get_clubs,
    dashboard_overview, dashboard_progressions, dashboard_chutes,
    dashboard_evolution_mensuelle, dashboard_ages, dashboard_ligues,
    analytics_numero_un, analytics_difficulte_progression,
    analytics_inflation_points, analytics_nationalites_par_niveau,
    analytics_age_par_niveau, analytics_frequence_tournois, analytics_participations_mensuelles,
    analytics_profil_type,
    analytics_competitivite_ligue, analytics_participation_feminine,
    analytics_predictions, analytics_records,
    analytics_evolution_nationalites, analytics_rang_points_curve,
    analytics_region_tableau,
    analytics_evolution_assimiles, analytics_evolution_age_moyen,
    analytics_evolution_ligues,
    analytics_evolution_top100_par_ligue, analytics_evolution_moins18_par_ligue,
    analytics_evolution_assimiles_par_ligue, analytics_evolution_etrangers_top100,
    analytics_clubs_tableau, analytics_evolution_top_clubs, analytics_clubs_par_ligue,
)

logger = logging.getLogger("padel.scheduler")
logging.basicConfig(level=logging.INFO)

_VERCEL = bool(os.environ.get("VERCEL"))

app = FastAPI(title="Padel Stats France", version="1.0.0",
              description="API de statistiques Padel France — données FFT Ten'Up")

scheduler = None if _VERCEL else BackgroundScheduler(timezone="Europe/Paris")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def routing_middleware(request: Request, call_next):
    """Route requests: /api/* -> strip prefix and hit API endpoints.
    Direct browser navigation (non-/api, non-/health, non-/auth) -> serve SPA."""
    path = request.url.path
    if path.startswith("/api"):
        # Frontend API calls: strip /api prefix so /api/stats -> /stats
        request.scope["path"] = path[4:] or "/"
        return await call_next(request)

    # Serve SPA for browser navigation to frontend routes
    # (skip /health, /auth, /assets, and actual static files)
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if (os.path.isdir(static_dir)
            and not path.startswith(("/health", "/auth", "/assets"))
            and "text/html" in request.headers.get("accept", "")):
        # Check if it's an actual static file first
        file_path = os.path.join(static_dir, path.lstrip("/"))
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))

    return await call_next(request)


@app.get("/health")
def health():
    """Healthcheck endpoint — responds immediately."""
    return {"status": "ok"}


app.include_router(auth_router)


def _auto_import_month(mois_str: str | None = None):
    """Import FFT data for the given month (or current month if None)."""
    if not mois_str:
        mois_str = datetime.date.today().strftime("%Y-%m")
    logger.info(f"[Scheduler] Démarrage import automatique pour {mois_str}")
    try:
        from import_data import import_from_api
        import_from_api(mois_str)
        logger.info(f"[Scheduler] Import {mois_str} terminé avec succès")
    except Exception as e:
        logger.error(f"[Scheduler] Erreur import {mois_str}: {e}")


@app.on_event("startup")
def startup():
    init_db()
    if scheduler:
        # Import automatique : 1er mardi de chaque mois à 8h00 (heure Paris)
        # day='1-7' + day_of_week='tue' = premier mardi du mois
        scheduler.add_job(
            _auto_import_month,
            CronTrigger(day="1-7", day_of_week="tue", hour=8, minute=0),
            id="monthly_import",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("[Scheduler] Démarré — import automatique le 1er mardi de chaque mois à 8h00")


# ── Admin endpoints ───────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)


def _check_admin(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)):
    token = getattr(creds, "credentials", None)
    if not token or token != settings.secret_key:
        raise HTTPException(status_code=401, detail="Token admin requis")


@app.post("/admin/import", dependencies=[Depends(_check_admin)], tags=["admin"])
def admin_import(mois: Optional[str] = None):
    """Déclenche un import FFT pour le mois donné (ou le mois courant)."""
    import threading
    t = threading.Thread(target=_auto_import_month, args=(mois,), daemon=True)
    t.start()
    target = mois or datetime.date.today().strftime("%Y-%m")
    return {"status": "started", "mois": target}


@app.get("/admin/scheduler", dependencies=[Depends(_check_admin)], tags=["admin"])
def admin_scheduler_info():
    """Informations sur le scheduler et le prochain import planifié."""
    if not scheduler:
        return {"running": False, "jobs": [], "note": "Vercel cron used instead"}
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
        })
    return {"running": scheduler.running, "jobs": jobs}


@app.post("/import/start", tags=["import"])
def import_start(mois: Optional[str] = None):
    """Probe FFT Ten'Up for new months and (re)start the chunked import job.

    Fast — just enqueues. Call POST /import/step repeatedly afterwards to
    actually advance it, and GET /import/status to check/resume progress.

    Pass mois=YYYY-MM to force re-importing that specific month even if it
    already has data — for recovering one that got interrupted or
    under-imported (upserts are idempotent, so this only fills in gaps).
    """
    from import_data import start_import_job
    try:
        return start_import_job(force_month=mois)
    except Exception as e:
        logger.error(f"[Import] Probe failed: {e}")
        raise HTTPException(status_code=502, detail="Impossible de contacter Ten'Up")


@app.post("/import/step", tags=["import"])
def import_step():
    """Advance the running import job by a bounded number of FFT pages.
    Safe to call repeatedly (e.g. every request from the frontend) until the
    returned status is no longer 'running'."""
    from import_data import run_import_step
    return run_import_step()


@app.get("/import/status", tags=["import"])
def import_status():
    """Current import job state, so the frontend can resume polling after a
    page reload instead of losing track of an in-progress import."""
    from import_data import get_import_job_status
    return get_import_job_status()


@app.post("/import/sync/start", tags=["import"])
def import_sync_start():
    """Start the chunked GitHub sync (recompress + push), so newly imported
    months survive a cold start / redeploy. Call POST /import/sync/step
    repeatedly afterwards to advance it."""
    import github_sync
    return github_sync.start_sync()


@app.post("/import/sync/step", tags=["import"])
def import_sync_step():
    """Advance the running sync by one chunk. Safe to call repeatedly until
    the returned status is no longer 'running'."""
    import github_sync
    return github_sync.run_sync_step()


@app.get("/import/sync/status", tags=["import"])
def import_sync_status():
    import github_sync
    return github_sync.get_sync_status()


@app.get("/cron/import", tags=["cron"])
def cron_import(request: Request):
    """Vercel Cron Job endpoint — enqueues the monthly FFT import on first Tuesday.

    Only starts the job; a visitor's browser advances it via /import/step the
    next time the site is open (see the frontend's auto-resume-on-load)."""
    auth = request.headers.get("authorization", "")
    cron_secret = os.environ.get("CRON_SECRET", "")
    if cron_secret and auth != f"Bearer {cron_secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    # Only run on the first Tuesday of the month (day 1-7)
    today = datetime.date.today()
    if today.day > 7:
        return {"status": "skipped", "reason": "Not first Tuesday of month"}
    from import_data import start_import_job
    return start_import_job()


# ── Base endpoints ────────────────────────────────────────────────────────

@app.get("/")
def root():
    # In production, serve frontend; in dev, return API info
    index = os.path.join(os.path.dirname(__file__), "static", "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return {"name": "Padel Stats France", "version": "1.0.0"}


@app.get("/stats")
def stats():
    with get_db() as conn:
        return get_stats(conn)


@app.get("/mois")
def mois():
    with get_db() as conn:
        return get_mois_disponibles(conn)


@app.get("/classement/{mois}/export")
def classement_export(mois: str, genre: Optional[str] = None):
    with get_db() as conn:
        return get_classement_export(conn, mois, genre)


@app.get("/classement/{mois}")
def classement(
    mois: str,
    genre: Optional[str] = None,
    ligue: Optional[str] = None,
    page: int = 0,
    size: int = 50,
    search: Optional[str] = None,
    club: Optional[str] = None,
    fip_only: bool = False,
):
    with get_db() as conn:
        return get_classement(conn, mois, genre, ligue, page, size, search, club, fip_only)


@app.get("/joueur/{joueur_id}")
def joueur(joueur_id: int):
    with get_db() as conn:
        result = get_joueur(conn, joueur_id)
        if not result:
            raise HTTPException(status_code=404, detail="Joueur non trouvé")
        return result


@app.get("/recherche")
def recherche(q: str = Query(..., min_length=2), genre: Optional[str] = None, limit: int = 20):
    with get_db() as conn:
        return search_joueurs(conn, q, genre, limit)


@app.get("/top/{genre}")
def top(genre: str, limit: int = 10):
    with get_db() as conn:
        return get_top(conn, genre, limit)


@app.get("/comparaison")
def comparaison(joueur1: int = Query(...), joueur2: int = Query(...)):
    with get_db() as conn:
        return compare_joueurs(conn, joueur1, joueur2)


@app.get("/ligues")
def ligues(mois: Optional[str] = None):
    with get_db() as conn:
        return get_ligues(conn, mois)


@app.get("/clubs")
def clubs(mois: Optional[str] = None, genre: Optional[str] = None, search: Optional[str] = None):
    with get_db() as conn:
        return get_clubs(conn, mois, genre, search)


# ── Dashboard endpoints ──────────────────────────────────────────────────

@app.get("/dashboard/overview")
def dash_overview(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return dashboard_overview(conn, mois, genre)


@app.get("/dashboard/progressions")
def dash_progressions(mois: Optional[str] = None, genre: Optional[str] = None, limit: int = 10, rang_max: Optional[int] = None, exclude_assimiles: bool = False):
    with get_db() as conn:
        return dashboard_progressions(conn, mois, genre, limit, rang_max, exclude_assimiles)


@app.get("/dashboard/chutes")
def dash_chutes(mois: Optional[str] = None, genre: Optional[str] = None, limit: int = 10, rang_max: Optional[int] = None, exclude_assimiles: bool = False):
    with get_db() as conn:
        return dashboard_chutes(conn, mois, genre, limit, rang_max, exclude_assimiles)


@app.get("/dashboard/evolution-mensuelle")
def dash_evolution_mensuelle(genre: Optional[str] = None):
    with get_db() as conn:
        return dashboard_evolution_mensuelle(conn, genre)


@app.get("/dashboard/ages")
def dash_ages(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return dashboard_ages(conn, mois, genre)


@app.get("/dashboard/ligues")
def dash_ligues(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return dashboard_ligues(conn, mois, genre)


# ── Analytics endpoints ──────────────────────────────────────────────────

@app.get("/analytics/numero-un")
def ana_numero_un(genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_numero_un(conn, genre)


@app.get("/analytics/difficulte-progression")
def ana_difficulte(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_difficulte_progression(conn, mois, genre)


@app.get("/analytics/inflation-points")
def ana_inflation(genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_inflation_points(conn, genre)


@app.get("/analytics/nationalites-par-niveau")
def ana_nationalites(mois: Optional[str] = None, top: int = 100, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_nationalites_par_niveau(conn, mois, top, genre)


@app.get("/analytics/age-par-niveau")
def ana_age(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_age_par_niveau(conn, mois, genre)


@app.get("/analytics/frequence-tournois")
def ana_frequence(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_frequence_tournois(conn, mois, genre)


@app.get("/analytics/participations-mensuelles")
def ana_participations_mensuelles(genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_participations_mensuelles(conn, genre)


@app.get("/analytics/profil-type")
def ana_profil(mois: Optional[str] = None, top: int = 100, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_profil_type(conn, mois, top, genre)


@app.get("/analytics/competitivite")
def ana_competitivite(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_competitivite_ligue(conn, mois, genre)


@app.get("/analytics/participation-feminine")
def ana_feminine():
    with get_db() as conn:
        return analytics_participation_feminine(conn)


@app.get("/analytics/predictions/{joueur_id}")
def ana_prediction(joueur_id: int):
    with get_db() as conn:
        return analytics_predictions(conn, joueur_id)


@app.get("/analytics/records")
def ana_records(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_records(conn, mois, genre)


@app.get("/analytics/evolution-nationalites")
def ana_evolution_nationalites(genre: Optional[str] = None, top_pays: int = 5):
    with get_db() as conn:
        return analytics_evolution_nationalites(conn, genre, top_pays)


@app.get("/analytics/rang-points")
def ana_rang_points(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_rang_points_curve(conn, mois, genre)


@app.get("/analytics/region-tableau")
def ana_region_tableau(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_region_tableau(conn, mois, genre)


@app.get("/analytics/evolution-assimiles")
def ana_evolution_assimiles(genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_evolution_assimiles(conn, genre)


@app.get("/analytics/evolution-age-moyen")
def ana_evolution_age_moyen():
    with get_db() as conn:
        return analytics_evolution_age_moyen(conn)


@app.get("/analytics/evolution-ligues")
def ana_evolution_ligues(genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_evolution_ligues(conn, genre)


@app.get("/analytics/evolution-top100-par-ligue")
def ana_evolution_top100_par_ligue(genre: Optional[str] = None, top_n: int = 100):
    with get_db() as conn:
        return analytics_evolution_top100_par_ligue(conn, genre, top_n)


@app.get("/analytics/evolution-moins18-par-ligue")
def ana_evolution_moins18_par_ligue(genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_evolution_moins18_par_ligue(conn, genre)


@app.get("/analytics/evolution-assimiles-par-ligue")
def ana_evolution_assimiles_par_ligue(genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_evolution_assimiles_par_ligue(conn, genre)


@app.get("/analytics/evolution-etrangers-top100")
def ana_evolution_etrangers_top100():
    with get_db() as conn:
        return analytics_evolution_etrangers_top100(conn)


@app.get("/analytics/clubs-tableau")
def ana_clubs_tableau(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_clubs_tableau(conn, mois, genre)


@app.get("/analytics/evolution-top-clubs")
def ana_evolution_top_clubs(genre: Optional[str] = None, top_n: int = 20):
    with get_db() as conn:
        return analytics_evolution_top_clubs(conn, genre, top_n)


@app.get("/analytics/clubs-par-ligue")
def ana_clubs_par_ligue(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return analytics_clubs_par_ligue(conn, mois, genre)


# ── Serve frontend static files in production ────────────────────────────────

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")

    # Serve other static files (favicon, etc.)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA fallback — serve index.html for all non-API routes."""
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
