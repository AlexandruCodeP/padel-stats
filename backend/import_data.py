"""
Padel Stats France — Data import script
Import from FFT Ten'Up API, CSV, or generate test data.
"""
import argparse
import json
import os
import sys
import random
import datetime

# Add parent dir for imports
sys.path.insert(0, os.path.dirname(__file__))
from database import init_db, get_db, upsert_joueur, bulk_upsert_classements

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

API_URL = "https://tenup.fft.fr/back/public/v2/classements/recherche"

# Mapping from YYYY-MM to the FFT dateClassement (first Tuesday of the month)
DATE_CLASSEMENT_MAP = {
    "2026-07": "2026-07-07",
    "2026-06": "2026-06-03",
    "2026-05": "2026-05-05",
    "2026-04": "2026-04-08",
    "2026-03": "2026-03-04",
    "2026-02": "2026-02-03",
    "2026-01": "2026-01-07",
    "2025-12": "2025-12-03",
    "2025-11": "2025-11-04",
    "2025-10": "2025-10-07",
    "2025-09": "2025-09-02",
    "2025-08": "2025-08-05",
    "2025-07": "2025-07-01",
    "2025-06": "2025-06-03",
    "2025-05": "2025-05-06",
    "2025-04": "2025-04-01",
    "2025-03": "2025-03-04",
    "2025-02": "2025-02-04",
    "2025-01": "2025-01-07",
}


def get_date_classement(mois_str):
    """Convert YYYY-MM to the FFT dateClassement (first Tuesday)."""
    if mois_str in DATE_CLASSEMENT_MAP:
        return DATE_CLASSEMENT_MAP[mois_str]
    # Compute first Tuesday of the month
    y, m = map(int, mois_str.split("-"))
    d = datetime.date(y, m, 1)
    # Move to first Tuesday (weekday 1)
    while d.weekday() != 1:
        d += datetime.timedelta(days=1)
    return d.isoformat()

LIGUES = [
    "AURA", "BFC", "BRE", "CVL", "COR", "GES", "HDF",
    "IDF", "NOR", "NAQ", "OCC", "PDL", "PAC", "GUA",
    "GUY", "MAR", "MAY", "REU", "NCL", "PYF",
]

NATIONALITES = ["FRA"] * 85 + ["ESP"] * 5 + ["ARG"] * 3 + ["BRA"] * 2 + ["ITA"] * 2 + ["POR", "BEL", "SUI"]

PRENOMS_H = ["Lucas", "Thomas", "Hugo", "Arthur", "Louis", "Jules", "Adam", "Raphaël", "Léo", "Nathan",
             "Gabriel", "Ethan", "Paul", "Maxime", "Antoine", "Alexandre", "Mathis", "Théo", "Nicolas", "Pierre",
             "Julien", "Benjamin", "Clément", "Romain", "François", "Jean", "Marc", "David", "Kevin", "Sébastien"]
PRENOMS_F = ["Emma", "Léa", "Chloé", "Manon", "Inès", "Louise", "Jade", "Camille", "Sarah", "Alice",
             "Juliette", "Charlotte", "Marie", "Clara", "Anna", "Eva", "Zoé", "Lola", "Margaux", "Laura",
             "Julie", "Pauline", "Mathilde", "Marine", "Sophie", "Céline", "Aurélie", "Nathalie", "Isabelle", "Valérie"]
NOMS = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau",
        "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier",
        "Morel", "Girard", "André", "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez", "Legrand",
        "Garnier", "Faure", "Rousseau", "Blanc", "Guérin", "Muller", "Henry", "Roussel", "Nicolas", "Perrin",
        "Morin", "Mathieu", "Clément", "Gauthier", "Dumont", "Lopez", "Fontaine", "Chevalier", "Robin", "Masson"]


def generate_test_data(mois_str=None, nb_hommes=2000, nb_femmes=1000):
    """Generate realistic test data for development."""
    if not mois_str:
        now = datetime.date.today()
        mois_str = now.strftime("%Y-%m")

    init_db()
    with get_db() as conn:
        classement_rows = []
        # Generate men
        for i in range(nb_hommes):
            prenom = random.choice(PRENOMS_H)
            nom = random.choice(NOMS)
            nat = random.choice(NATIONALITES)
            joueur_id = upsert_joueur(conn, nom, prenom, "H", nat)
            rang = i + 1
            points = max(0, int(15000 * (1 - (i / nb_hommes) ** 0.5) + random.randint(-200, 200)))
            evol_val = random.choice(list(range(-20, 21)))
            evolution = f"+{evol_val}" if evol_val > 0 else ("=" if evol_val == 0 else str(evol_val))
            nb_tournois = random.randint(0, 20)
            ligue = random.choice(LIGUES)
            age = random.randint(16, 65)
            est_assimile = random.random() < 0.05
            classement_rows.append((joueur_id, mois_str, rang, points, evolution, nb_tournois, ligue, rang, est_assimile, age, False, "H", ""))

        # Generate women
        for i in range(nb_femmes):
            prenom = random.choice(PRENOMS_F)
            nom = random.choice(NOMS)
            nat = random.choice(NATIONALITES)
            joueur_id = upsert_joueur(conn, nom, prenom, "F", nat)
            rang = i + 1
            points = max(0, int(12000 * (1 - (i / nb_femmes) ** 0.5) + random.randint(-150, 150)))
            evol_val = random.choice(list(range(-15, 16)))
            evolution = f"+{evol_val}" if evol_val > 0 else ("=" if evol_val == 0 else str(evol_val))
            nb_tournois = random.randint(0, 18)
            ligue = random.choice(LIGUES)
            age = random.randint(16, 55)
            est_assimile = random.random() < 0.03
            classement_rows.append((joueur_id, mois_str, rang, points, evolution, nb_tournois, ligue, rang, est_assimile, age, False, "F", ""))

        bulk_upsert_classements(conn, classement_rows)
        conn.commit()
        print(f"[OK] Generated {nb_hommes} men + {nb_femmes} women for {mois_str}")


def _fetch_page(genre, page, date_classement):
    resp = requests.post(
        API_URL,
        json={"pratique": "PADEL", "sexe": genre, "page": page, "dateClassement": date_classement},
        headers={"Content-Type": "application/json", "Referer": "https://tenup.fft.fr/classement-padel"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def _parse_item(item):
    """Parse one FFT API player entry into a (nom, prenom, nat, rang, points, evolution,
    nb_tournois, ligue, meilleur, est_assimile, age, est_anonyme, club, classement_fip) tuple."""
    nom = (item.get("nom") or "").upper().strip()
    prenom = (item.get("prenom") or "").strip()
    nat = item.get("nationalite") or ""
    rang = item.get("position")

    # Anonymous player: no name returned by API.
    # Use idCrm (or position) as unique identifier to avoid UNIQUE constraint conflicts.
    est_anonyme = not bool(nom)
    if est_anonyme:
        id_crm = item.get("idCrm") or rang
        nom = f"ANONYME_{id_crm}"
        prenom = ""

    points = item.get("points") or 0
    evolution = str(item.get("evolution") or "=")
    nb_tournois = item.get("nombreTournoisJoues") or 0
    ligue = item.get("ligue") or ""
    meilleur = item.get("meilleurClassement") or rang
    est_assimile = item.get("assimilation", False)
    age = item.get("ageSportif")  # ageSportif = real age, categorieAge = code
    club = item.get("club") or ""
    classement_fip = item.get("classementFip") or None
    return nom, prenom, nat, rang, points, evolution, nb_tournois, ligue, meilleur, est_assimile, age, est_anonyme, club, classement_fip


def import_from_api(mois_str=None, serie=None):
    """Import data from FFT Ten'Up API (v2). Blocking — fine for CLI/local use,
    but too slow for a single serverless request once a month has 100k+ players.
    See start_import_job()/run_import_step() for the chunked equivalent used by the API."""
    if not HAS_REQUESTS:
        print("ERROR: 'requests' library not installed. Run: pip install requests")
        return

    if not mois_str:
        now = datetime.date.today()
        mois_str = now.strftime("%Y-%m")

    date_classement = get_date_classement(mois_str)
    print(f"Using dateClassement: {date_classement} for month {mois_str}")

    init_db()
    series = [serie] if serie else ["H", "F"]

    for s in series:
        print(f"\n--- Importing {s} for {mois_str} ---")
        page = 1
        total_imported = 0
        with get_db() as conn:
            classement_rows = []
            while True:
                try:
                    data = _fetch_page(s, page, date_classement)
                except Exception as e:
                    print(f"  Error on page {page}: {e}")
                    break

                items = data.get("joueurs", [])
                if not items:
                    break

                for item in items:
                    nom, prenom, nat, rang, points, evolution, nb_tournois, ligue, meilleur, est_assimile, age, est_anonyme, club, classement_fip = _parse_item(item)
                    joueur_id = upsert_joueur(conn, nom, prenom, s, nat)
                    classement_rows.append((joueur_id, mois_str, rang, points, evolution, nb_tournois, ligue, meilleur, est_assimile, age, est_anonyme, s, club, classement_fip))

                total_imported += len(items)
                total_api = data.get("total", 0)
                print(f"  Page {page}: {len(items)} players (total: {total_imported}/{total_api})")

                # v2 API returns 100 per page, stop when we have all
                if total_imported >= total_api:
                    break
                page += 1

            bulk_upsert_classements(conn, classement_rows)
            conn.commit()
            print(f"  [OK] {total_imported} {s} imported for {mois_str}")


def _probe_date_has_data(date_classement):
    try:
        data = _fetch_page("H", 1, date_classement)
    except Exception:
        return False
    return bool(data.get("joueurs"))


def _find_date_classement_for_month(mois_str):
    """Find the FFT dateClassement that actually has data for a month.

    Normally the first Tuesday, but FFT occasionally publishes a day or two
    later (seen for 2026-06: Wednesday the 3rd instead of Tuesday the 2nd).
    Returns None if no date in the month has data yet.
    """
    if mois_str in DATE_CLASSEMENT_MAP:
        candidate = DATE_CLASSEMENT_MAP[mois_str]
        return candidate if _probe_date_has_data(candidate) else None

    base_date = datetime.date.fromisoformat(get_date_classement(mois_str))
    for offset in (0, 1, 2, 3, -1):
        candidate_date = base_date + datetime.timedelta(days=offset)
        if candidate_date.strftime("%Y-%m") != mois_str:
            continue
        candidate = candidate_date.isoformat()
        if _probe_date_has_data(candidate):
            return candidate
    return None


def check_new_months_available():
    """Probe the FFT API for months newer than the latest month in our DB.

    Returns a list of {"mois": "YYYY-MM", "date_classement": "YYYY-MM-DD"} for
    each month found available, in order. Stops at the first month with no
    data yet (avoids wasted requests on far-future months).
    """
    if not HAS_REQUESTS:
        return []

    init_db()
    with get_db() as conn:
        row = conn.execute(
            "SELECT mois FROM classements ORDER BY mois DESC LIMIT 1"
        ).fetchone()
    latest = row["mois"] if row else None
    if not latest:
        return []

    new_months = []
    y, m = map(int, latest.split("-"))
    today = datetime.date.today()
    for _ in range(6):
        m += 1
        if m > 12:
            m = 1
            y += 1
        candidate_mois = f"{y}-{m:02d}"
        naive_date = get_date_classement(candidate_mois)
        if datetime.date.fromisoformat(naive_date) > today:
            break
        date_classement = _find_date_classement_for_month(candidate_mois)
        if not date_classement:
            break
        new_months.append({"mois": candidate_mois, "date_classement": date_classement})
    return new_months


# ── Chunked import job (for the "Import donnees" button) ─────────────────
#
# A single serverless request can't paginate through 100k+ players per
# gender before Vercel's function timeout. Instead, progress is persisted in
# the import_job table (singleton row, id=1) and advanced a bounded number
# of pages at a time by run_import_step(), which the frontend calls
# repeatedly until the job reports "done".

def _get_job(conn):
    row = conn.execute("SELECT * FROM import_job WHERE id=1").fetchone()
    return dict(row) if row else None


def get_import_job_status():
    with get_db() as conn:
        job = _get_job(conn)
    if not job:
        return {"status": "idle"}
    job["months"] = json.loads(job["months_json"])
    del job["months_json"]
    return job


def start_import_job():
    """Probe FFT for new months and (re)start the chunked job if any are found."""
    with get_db() as conn:
        job = _get_job(conn)
        if job and job["status"] == "running":
            return {"status": "running", "already_running": True}

    new_months = check_new_months_available()
    if not new_months:
        return {"status": "up_to_date"}

    with get_db() as conn:
        conn.execute(
            """INSERT INTO import_job (id, months_json, month_index, genre, page, total_api, imported_count, status, error, updated_at)
               VALUES (1, ?, 0, 'H', 1, NULL, 0, 'running', NULL, datetime('now'))
               ON CONFLICT(id) DO UPDATE SET
                 months_json=excluded.months_json, month_index=0, genre='H', page=1,
                 total_api=NULL, imported_count=0, status='running', error=NULL,
                 updated_at=datetime('now')""",
            (json.dumps(new_months),),
        )
        conn.commit()
    return {"status": "running", "months": [m["mois"] for m in new_months]}


def run_import_step(max_pages=20):
    """Process up to max_pages FFT pages for the running job. Call repeatedly
    (e.g. from the frontend, every request) until status is no longer 'running'."""
    if not HAS_REQUESTS:
        return {"status": "error", "error": "requests non installe"}

    with get_db() as conn:
        job = _get_job(conn)
        if not job or job["status"] != "running":
            return {"status": job["status"] if job else "idle"}

        months = json.loads(job["months_json"])
        month_index = job["month_index"]
        genre = job["genre"]
        page = job["page"]
        total_api = job["total_api"]
        imported_count = job["imported_count"]

        pages_done = 0
        try:
            while pages_done < max_pages and month_index < len(months):
                mois_str = months[month_index]["mois"]
                date_classement = months[month_index]["date_classement"]
                data = _fetch_page(genre, page, date_classement)
                items = data.get("joueurs", [])

                if not items:
                    if genre == "H":
                        genre, page, total_api, imported_count = "F", 1, None, 0
                    else:
                        month_index += 1
                        genre, page, total_api, imported_count = "H", 1, None, 0
                    pages_done += 1
                    continue

                rows = []
                for item in items:
                    nom, prenom, nat, rang, points, evolution, nb_tournois, ligue, meilleur, est_assimile, age, est_anonyme, club, classement_fip = _parse_item(item)
                    joueur_id = upsert_joueur(conn, nom, prenom, genre, nat)
                    rows.append((joueur_id, mois_str, rang, points, evolution, nb_tournois, ligue, meilleur, est_assimile, age, est_anonyme, genre, club, classement_fip))

                bulk_upsert_classements(conn, rows)
                total_api = data.get("total", total_api)
                imported_count += len(items)
                page += 1
                pages_done += 1

                conn.execute(
                    """UPDATE import_job SET month_index=?, genre=?, page=?, total_api=?,
                       imported_count=?, updated_at=datetime('now') WHERE id=1""",
                    (month_index, genre, page, total_api, imported_count),
                )
                conn.commit()

            if month_index >= len(months):
                conn.execute("UPDATE import_job SET status='done', updated_at=datetime('now') WHERE id=1")
                conn.commit()
                return {"status": "done", "months": [m["mois"] for m in months]}

            return {
                "status": "running",
                "mois": months[month_index]["mois"],
                "genre": genre,
                "page": page,
                "total_api": total_api,
                "imported": imported_count,
                "month_index": month_index,
                "total_months": len(months),
            }
        except Exception as e:
            conn.execute(
                "UPDATE import_job SET status='error', error=?, updated_at=datetime('now') WHERE id=1",
                (str(e),),
            )
            conn.commit()
            return {"status": "error", "error": str(e)}


def import_from_csv(filepath):
    """Import data from a CSV file."""
    import csv
    init_db()
    with get_db() as conn:
        classement_rows = []
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                joueur_id = upsert_joueur(
                    conn,
                    row.get("nom", ""),
                    row.get("prenom", ""),
                    row.get("genre", "H"),
                    row.get("nationalite", ""),
                )
                classement_rows.append((
                    joueur_id,
                    row.get("mois", ""),
                    int(row.get("rang", 0)),
                    int(row.get("points", 0)),
                    row.get("evolution", "="),
                    int(row.get("nb_tournois", 0)),
                    row.get("ligue", ""),
                    int(row.get("meilleur_classement", 0)),
                    row.get("est_assimile", "0") == "1",
                    int(row.get("age", 0)) or None,
                    row.get("est_anonyme", "0") == "1",
                    row.get("genre", "H"),
                    row.get("club", ""),
                ))
        bulk_upsert_classements(conn, classement_rows)
        conn.commit()
        print(f"[OK] Imported from CSV: {filepath}")


def import_historical(range_str):
    """Import a range of months, e.g. 2025-01:2026-02"""
    parts = range_str.split(":")
    if len(parts) != 2:
        print("ERROR: Format must be YYYY-MM:YYYY-MM")
        return
    start = datetime.date.fromisoformat(parts[0] + "-01")
    end = datetime.date.fromisoformat(parts[1] + "-01")
    current = start
    while current <= end:
        mois_str = current.strftime("%Y-%m")
        import_from_api(mois_str)
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)


def show_stats():
    """Show database statistics."""
    init_db()
    with get_db() as conn:
        joueurs = conn.execute("SELECT COUNT(*) as cnt FROM joueurs").fetchone()["cnt"]
        classements = conn.execute("SELECT COUNT(*) as cnt FROM classements").fetchone()["cnt"]
        mois = conn.execute("SELECT COUNT(DISTINCT mois) as cnt FROM classements").fetchone()["cnt"]
        hommes = conn.execute("SELECT COUNT(*) as cnt FROM joueurs WHERE genre='H'").fetchone()["cnt"]
        femmes = conn.execute("SELECT COUNT(*) as cnt FROM joueurs WHERE genre='F'").fetchone()["cnt"]
        print(f"=== Padel Stats DB ===")
        print(f"Joueurs: {joueurs} (H: {hommes}, F: {femmes})")
        print(f"Classements: {classements}")
        print(f"Mois: {mois}")
        mois_list = conn.execute("SELECT DISTINCT mois FROM classements ORDER BY mois DESC").fetchall()
        for m in mois_list:
            cnt = conn.execute("SELECT COUNT(*) as cnt FROM classements WHERE mois=?", (m["mois"],)).fetchone()["cnt"]
            print(f"  {m['mois']}: {cnt} entries")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Padel Stats — Data Importer")
    parser.add_argument("--month", help="Import specific month (YYYY-MM)")
    parser.add_argument("--from-csv", help="Import from CSV file")
    parser.add_argument("--historical", help="Import range YYYY-MM:YYYY-MM")
    parser.add_argument("--stats", action="store_true", help="Show DB stats")
    parser.add_argument("--generate-test", action="store_true", help="Generate test data")
    parser.add_argument("--test-months", type=int, default=1, help="Number of months of test data to generate")
    args = parser.parse_args()

    if args.stats:
        show_stats()
    elif args.generate_test:
        now = datetime.date.today()
        for i in range(args.test_months):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12
                y -= 1
            mois_str = f"{y}-{m:02d}"
            generate_test_data(mois_str)
    elif args.from_csv:
        import_from_csv(args.from_csv)
    elif args.historical:
        import_historical(args.historical)
    else:
        import_from_api(args.month)
