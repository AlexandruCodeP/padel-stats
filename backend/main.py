"""
Padel Stats France — FastAPI application
REST API with base, dashboard, and analytics endpoints.
"""
import datetime
import logging

from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from typing import Optional

from config import settings
from auth import router as auth_router
from database import (
    init_db, get_db, get_stats, get_mois_disponibles, get_classement,
    get_classement_export,
    get_joueur, search_joueurs, get_top, compare_joueurs, get_ligues,
    dashboard_overview, dashboard_progressions, dashboard_chutes,
    dashboard_evolution_mensuelle, dashboard_ages, dashboard_ligues,
    analytics_numero_un, analytics_difficulte_progression,
    analytics_inflation_points, analytics_nationalites_par_niveau,
    analytics_age_par_niveau, analytics_frequence_tournois,
    analytics_profil_type,
    analytics_competitivite_ligue, analytics_participation_feminine,
    analytics_predictions, analytics_records,
)

logger = logging.getLogger("padel.scheduler")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Padel Stats France", version="1.0.0",
              description="API de statistiques Padel France — données FFT Ten'Up")

scheduler = BackgroundScheduler(timezone="Europe/Paris")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
        })
    return {"running": scheduler.running, "jobs": jobs}


# ── Base endpoints ────────────────────────────────────────────────────────

@app.get("/")
def root():
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
):
    with get_db() as conn:
        return get_classement(conn, mois, genre, ligue, page, size, search)


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


# ── Dashboard endpoints ──────────────────────────────────────────────────

@app.get("/dashboard/overview")
def dash_overview(mois: Optional[str] = None, genre: Optional[str] = None):
    with get_db() as conn:
        return dashboard_overview(conn, mois, genre)


@app.get("/dashboard/progressions")
def dash_progressions(mois: Optional[str] = None, genre: Optional[str] = None, limit: int = 10):
    with get_db() as conn:
        return dashboard_progressions(conn, mois, genre, limit)


@app.get("/dashboard/chutes")
def dash_chutes(mois: Optional[str] = None, genre: Optional[str] = None, limit: int = 10):
    with get_db() as conn:
        return dashboard_chutes(conn, mois, genre, limit)


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
