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


def get_date_classement(mois_str):
    """Return the FFT dateClassement for a given YYYY-MM (first Tuesday of the month)."""
    y, m = map(int, mois_str.split("-"))
    d = datetime.date(y, m, 1)
    while d.weekday() != 1:  # 1 = Tuesday
        d += datetime.timedelta(days=1)
    return d.isoformat()


def probe_classement_date(mois_str):
    """Probe the FFT API to find the actual publication date for a given month.

    Tries each day from the first Tuesday up to day 14 of the month and returns
    the first date that returns real data, or None if not yet available.
    """
    if not HAS_REQUESTS:
        return None

    y, m = map(int, mois_str.split("-"))
    # Start from the first Tuesday of the month
    start = datetime.date(y, m, 1)
    while start.weekday() != 1:
        start += datetime.timedelta(days=1)

    # Probe up to 8 days past the first Tuesday (covers any publication delay)
    for delta in range(8):
        candidate = start + datetime.timedelta(days=delta)
        if candidate.month != m:
            break
        try:
            resp = requests.post(
                API_URL,
                json={"pratique": "PADEL", "sexe": "H", "page": 1, "dateClassement": candidate.isoformat()},
                headers={"Content-Type": "application/json", "Referer": "https://tenup.fft.fr/classement-padel"},
                timeout=8,
            )
            if resp.ok and resp.json().get("total", 0) > 0:
                return candidate.isoformat()
        except Exception:
            continue

    return None

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


def import_from_api(mois_str=None, serie=None, progress_callback=None, date_classement=None):
    """Import data from FFT Ten'Up API (v2).

    progress_callback: optional callable(str) for real-time progress updates.
    date_classement: the exact FFT publication date (YYYY-MM-DD); computed if not provided.
    """
    def _progress(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)

    if not HAS_REQUESTS:
        _progress("ERROR: 'requests' library not installed. Run: pip install requests")
        return

    if not mois_str:
        now = datetime.date.today()
        mois_str = now.strftime("%Y-%m")

    if date_classement is None:
        date_classement = get_date_classement(mois_str)
    _progress(f"Utilisation de la date de classement : {date_classement}")

    init_db()
    series = [serie] if serie else ["H", "F"]

    for s in series:
        label = "Hommes" if s == "H" else "Femmes"
        _progress(f"Récupération du classement {label}...")
        page = 1
        total_imported = 0
        with get_db() as conn:
            classement_rows = []
            while True:
                payload = {
                    "pratique": "PADEL",
                    "sexe": s,
                    "page": page,
                    "dateClassement": date_classement,
                }
                try:
                    resp = requests.post(
                        API_URL, json=payload,
                        headers={"Content-Type": "application/json", "Referer": "https://tenup.fft.fr/classement-padel"},
                        timeout=30,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                except Exception as e:
                    _progress(f"Erreur page {page} : {e}")
                    break

                items = data.get("joueurs", [])
                if not items:
                    break

                for item in items:
                    nom = (item.get("nom") or "").upper().strip()
                    prenom = (item.get("prenom") or "").strip()
                    genre = s
                    nat = item.get("nationalite") or ""
                    rang = item.get("position")

                    # Anonymous player: no name returned by API
                    # Use idCrm (or position) as unique identifier to avoid UNIQUE constraint conflicts
                    est_anonyme = not bool(nom)
                    if est_anonyme:
                        id_crm = item.get("idCrm") or rang
                        nom = f"ANONYME_{id_crm}"
                        prenom = ""

                    joueur_id = upsert_joueur(conn, nom, prenom, genre, nat)

                    points = item.get("points") or 0
                    evolution = item.get("evolution") or "="
                    nb_tournois = item.get("nombreTournoisJoues") or 0
                    ligue = item.get("ligue") or ""
                    meilleur = item.get("meilleurClassement") or rang
                    est_assimile = item.get("assimilation", False)
                    age = item.get("ageSportif")  # ageSportif = real age, categorieAge = code
                    club = item.get("club") or ""
                    classement_fip = item.get("classementFip") or None
                    classement_rows.append((joueur_id, mois_str, rang, points, str(evolution), nb_tournois, ligue, meilleur, est_assimile, age, est_anonyme, s, club, classement_fip))

                total_imported += len(items)
                total_api = data.get("total", 0)
                _progress(f"{label} : {total_imported} / {total_api} joueurs récupérés")

                # v2 API returns 100 per page, stop when we have all
                if total_imported >= total_api:
                    break
                page += 1

            _progress(f"Sauvegarde des {label} en base de données...")
            bulk_upsert_classements(conn, classement_rows)
            conn.commit()
            _progress(f"{total_imported} {label} importés avec succès")


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
