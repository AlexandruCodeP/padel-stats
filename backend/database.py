"""
Padel Stats France — Database module
SQLite schema, CRUD, and analytics queries.
"""
import sqlite3
import glob as _glob
import os
import zstandard as zstd
from contextlib import contextmanager

_VERCEL = bool(os.environ.get("VERCEL"))
_BACKEND_DIR = os.path.dirname(__file__)


def _resolve_db_path() -> str:
    """Resolve DB path, decompressing to /tmp on Vercel if needed.

    Uses zstandard rather than lzma: lzma's _lzma C extension needs liblzma,
    which isn't present on Vercel's Python runtime (import crashes the whole
    app). zstandard's wheel bundles its own libzstd, no system dependency.

    The compressed snapshot is split into several padel_stats.db.zst.aa/ab/...
    parts (github_sync.py compresses one bounded raw chunk at a time so no
    single sync request risks a serverless timeout, and pushes each as its
    own independently-compressed part) — decompress each one on its own and
    concatenate the raw output, in order.
    """
    explicit = os.environ.get("DATABASE_PATH")
    if explicit:
        return explicit

    if _VERCEL:
        tmp_db = "/tmp/padel_stats.db"
        if not os.path.exists(tmp_db):
            # Write to a temp file and rename into place atomically. If this
            # process dies mid-write (timeout, OOM, ...), tmp_db itself never
            # exists in a partial state — otherwise a later request on the
            # same instance would see it "exists" and skip re-decompressing
            # a corrupt file forever ("database disk image is malformed").
            tmp_db_partial = tmp_db + ".partial"
            parts = sorted(_glob.glob(os.path.join(_BACKEND_DIR, "padel_stats.db.zst.*")))
            decompressor = zstd.ZstdDecompressor()
            with open(tmp_db_partial, "wb") as f_out:
                for part in parts:
                    with open(part, "rb") as f_in:
                        f_out.write(decompressor.decompress(f_in.read()))
            os.rename(tmp_db_partial, tmp_db)
        return tmp_db

    return os.path.join(_BACKEND_DIR, "padel_stats.db")


DB_PATH = _resolve_db_path()


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA cache_size=-64000")  # 64 MB cache
    conn.execute("PRAGMA mmap_size=268435456")  # 256 MB mmap
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Schema ───────────────────────────────────────────────────────────────

def init_db():
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS joueurs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nom TEXT NOT NULL,
            prenom TEXT,
            genre TEXT NOT NULL CHECK(genre IN ('H','F')),
            nationalite TEXT,
            UNIQUE(nom, prenom, genre)
        );

        CREATE TABLE IF NOT EXISTS classements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            joueur_id INTEGER NOT NULL REFERENCES joueurs(id),
            mois TEXT NOT NULL,
            rang INTEGER,
            points INTEGER,
            evolution TEXT,
            nb_tournois INTEGER,
            ligue TEXT,
            meilleur_classement INTEGER,
            est_assimile BOOLEAN DEFAULT 0,
            age INTEGER,
            est_anonyme BOOLEAN DEFAULT 0,
            UNIQUE(joueur_id, mois)
        );

        CREATE INDEX IF NOT EXISTS idx_classements_mois ON classements(mois);
        CREATE INDEX IF NOT EXISTS idx_classements_joueur ON classements(joueur_id);
        CREATE INDEX IF NOT EXISTS idx_classements_rang ON classements(rang);
        CREATE INDEX IF NOT EXISTS idx_classements_mois_genre ON classements(mois, genre);
        CREATE INDEX IF NOT EXISTS idx_classements_mois_rang ON classements(mois, rang);
        CREATE INDEX IF NOT EXISTS idx_joueurs_nom ON joueurs(nom, prenom);
        CREATE INDEX IF NOT EXISTS idx_joueurs_genre ON joueurs(genre);

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

        -- Singleton row (id=1) tracking the chunked FFT import job's progress,
        -- so it can be resumed across the many short requests a serverless
        -- function requires instead of one long-running call.
        CREATE TABLE IF NOT EXISTS import_job (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            months_json TEXT NOT NULL,
            month_index INTEGER NOT NULL DEFAULT 0,
            genre TEXT NOT NULL DEFAULT 'H',
            page INTEGER NOT NULL DEFAULT 1,
            total_api INTEGER,
            imported_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'idle',
            error TEXT,
            updated_at TEXT
        );

        -- Singleton row (id=1) tracking the chunked GitHub sync's progress.
        -- Compressing the whole DB at a high ratio takes minutes; each step
        -- compresses one bounded raw chunk and uploads it as a Git blob
        -- (which doesn't touch the branch, so it can't trigger a Vercel
        -- deployment on its own). Only the final step assembles all blobs
        -- into one tree + commit + ref update, so exactly one deployment is
        -- triggered and it's always built from a fully consistent set.
        CREATE TABLE IF NOT EXISTS sync_job (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            total_size INTEGER NOT NULL,
            chunk_size INTEGER NOT NULL,
            offset INTEGER NOT NULL DEFAULT 0,
            part_index INTEGER NOT NULL DEFAULT 0,
            blob_shas_json TEXT NOT NULL DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'idle',
            error TEXT,
            updated_at TEXT
        );
        """)
        # Migrations for existing DBs
        for col, default in [("est_anonyme", "BOOLEAN DEFAULT 0"), ("genre", "TEXT"), ("club", "TEXT"), ("classement_fip", "INTEGER")]:
            try:
                conn.execute(f"ALTER TABLE classements ADD COLUMN {col} {default}")
                conn.commit()
            except Exception:
                pass  # Column already exists
        try:
            conn.execute("ALTER TABLE sync_job ADD COLUMN blob_shas_json TEXT NOT NULL DEFAULT '[]'")
            conn.commit()
        except Exception:
            pass  # Column already exists
        # Backfill genre from joueurs if needed
        conn.execute("UPDATE classements SET genre = (SELECT genre FROM joueurs WHERE joueurs.id = classements.joueur_id) WHERE genre IS NULL")
        conn.commit()
    print("Database initialized.")


# ── CRUD helpers ─────────────────────────────────────────────────────────

def upsert_joueur(conn, nom, prenom, genre, nationalite):
    cur = conn.execute(
        """INSERT INTO joueurs (nom, prenom, genre, nationalite)
           VALUES (?,?,?,?)
           ON CONFLICT(nom, prenom, genre) DO UPDATE SET nationalite=excluded.nationalite
           RETURNING id""",
        (nom, prenom or "", genre, nationalite),
    )
    return cur.fetchone()[0]


def bulk_upsert_classements(conn, rows):
    conn.executemany(
        """INSERT INTO classements
           (joueur_id, mois, rang, points, evolution, nb_tournois, ligue, meilleur_classement, est_assimile, age, est_anonyme, genre, club, classement_fip)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(joueur_id, mois) DO UPDATE SET
             rang=excluded.rang, points=excluded.points, evolution=excluded.evolution,
             nb_tournois=excluded.nb_tournois, ligue=excluded.ligue,
             meilleur_classement=excluded.meilleur_classement,
             est_assimile=excluded.est_assimile, age=excluded.age,
             est_anonyme=excluded.est_anonyme, genre=excluded.genre,
             club=excluded.club, classement_fip=excluded.classement_fip""",
        rows,
    )


# ── Query: months ────────────────────────────────────────────────────────

def get_mois_disponibles(conn):
    rows = conn.execute(
        """SELECT mois,
                  SUM(CASE WHEN genre='H' THEN 1 ELSE 0 END) as nb_hommes,
                  SUM(CASE WHEN genre='F' THEN 1 ELSE 0 END) as nb_femmes,
                  COUNT(*) as total
           FROM classements
           GROUP BY mois ORDER BY mois DESC"""
    ).fetchall()
    return [dict(r) for r in rows]


def get_dernier_mois(conn):
    row = conn.execute("SELECT MAX(mois) as mois FROM classements").fetchone()
    return row["mois"] if row else None


# ── Query: classement ────────────────────────────────────────────────────

def get_classement(conn, mois, genre=None, ligue=None, page=0, size=50, search=None, club=None, fip_only=False):
    where, params = ["c.mois=?"], [mois]
    if genre:
        where.append("c.genre=?"); params.append(genre)
    if ligue:
        where.append("c.ligue=?"); params.append(ligue)
    if club:
        where.append("c.club=?"); params.append(club)
    if fip_only:
        where.append("c.classement_fip IS NOT NULL")
    if search:
        where.append("(j.nom LIKE ? OR j.prenom LIKE ? OR c.club LIKE ?)"); params += [f"%{search}%", f"%{search}%", f"%{search}%"]
    w = " AND ".join(where)

    total = conn.execute(f"SELECT COUNT(*) as cnt FROM classements c JOIN joueurs j ON j.id=c.joueur_id WHERE {w}", params).fetchone()["cnt"]

    params += [size, page * size]
    rows = conn.execute(
        f"""SELECT j.id, j.nom, j.prenom, c.genre, j.nationalite,
                   c.rang, c.points, c.evolution, c.nb_tournois, c.ligue, c.age, c.est_assimile, c.est_anonyme, c.club, c.classement_fip
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE {w} ORDER BY c.rang ASC LIMIT ? OFFSET ?""",
        params,
    ).fetchall()
    return {"total": total, "page": page, "size": size, "joueurs": [dict(r) for r in rows]}


def get_classement_export(conn, mois, genre=None):
    """Return ALL players for a given month without pagination (for PDF export)."""
    where, params = ["c.mois=?"], [mois]
    if genre:
        where.append("c.genre=?"); params.append(genre)
    w = " AND ".join(where)

    rows = conn.execute(
        f"""SELECT c.rang, j.nom, j.prenom, j.nationalite, c.genre,
                   c.points, c.evolution, c.nb_tournois, c.ligue, c.est_assimile, c.est_anonyme, c.club
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE {w} ORDER BY c.rang ASC""",
        params,
    ).fetchall()
    return [dict(r) for r in rows]


# ── Query: joueur detail ─────────────────────────────────────────────────

def get_joueur(conn, joueur_id):
    j = conn.execute("SELECT * FROM joueurs WHERE id=?", (joueur_id,)).fetchone()
    if not j:
        return None
    historique = conn.execute(
        "SELECT * FROM classements WHERE joueur_id=? ORDER BY mois DESC", (joueur_id,)
    ).fetchall()
    return {"joueur": dict(j), "historique": [dict(r) for r in historique]}


# ── Query: search ─────────────────────────────────────────────────────────

def search_joueurs(conn, q, genre=None, limit=20):
    where, params = ["(j.nom LIKE ? OR j.prenom LIKE ?)"], [f"%{q}%", f"%{q}%"]
    if genre:
        where.append("c.genre=?"); params.append(genre)
    w = " AND ".join(where)
    dernier_mois = get_dernier_mois(conn)
    if not dernier_mois:
        return []
    rows = conn.execute(
        f"""SELECT j.id, j.nom, j.prenom, c.genre, j.nationalite,
                   c.rang, c.points, c.evolution, c.nb_tournois, c.ligue, c.age, c.est_assimile, c.club, c.classement_fip
            FROM joueurs j LEFT JOIN classements c ON c.joueur_id=j.id AND c.mois=?
            WHERE {w} ORDER BY c.rang ASC NULLS LAST LIMIT ?""",
        [dernier_mois] + params + [limit],
    ).fetchall()
    return [dict(r) for r in rows]


# ── Query: top ────────────────────────────────────────────────────────────

def get_top(conn, genre, limit=10):
    mois = get_dernier_mois(conn)
    if not mois:
        return []
    rows = conn.execute(
        """SELECT j.id, j.nom, j.prenom, c.genre, j.nationalite,
                  c.rang, c.points, c.evolution, c.nb_tournois, c.ligue, c.age, c.est_assimile, c.club, c.classement_fip
           FROM classements c JOIN joueurs j ON j.id=c.joueur_id
           WHERE c.mois=? AND c.genre=? ORDER BY c.rang ASC LIMIT ?""",
        (mois, genre, limit),
    ).fetchall()
    return [dict(r) for r in rows]


# ── Query: compare ────────────────────────────────────────────────────────

def compare_joueurs(conn, id1, id2):
    j1 = get_joueur(conn, id1)
    j2 = get_joueur(conn, id2)
    return {"joueur1": j1, "joueur2": j2}


# ── Query: ligues ─────────────────────────────────────────────────────────

def get_ligues(conn, mois=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    rows = conn.execute(
        """SELECT c.ligue,
                  COUNT(*) as total,
                  SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes,
                  SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes
           FROM classements c JOIN joueurs j ON j.id=c.joueur_id
           WHERE c.mois=? AND c.ligue IS NOT NULL AND c.ligue != ''
           GROUP BY c.ligue ORDER BY total DESC""",
        (mois,),
    ).fetchall()
    return [dict(r) for r in rows]


# ── Query: clubs ─────────────────────────────────────────────────────────

def get_clubs(conn, mois=None, genre=None, search=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    where, params = ["c.mois=?", "c.club IS NOT NULL", "c.club != ''"], [mois]
    if genre:
        where.append("c.genre=?"); params.append(genre)
    if search:
        where.append("c.club LIKE ?"); params.append(f"%{search}%")
    w = " AND ".join(where)
    rows = conn.execute(
        f"""SELECT c.club,
                  COUNT(*) as total,
                  SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes,
                  SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes,
                  MIN(c.rang) as meilleur_rang
           FROM classements c JOIN joueurs j ON j.id=c.joueur_id
           WHERE {w}
           GROUP BY c.club ORDER BY total DESC""",
        params,
    ).fetchall()
    return [dict(r) for r in rows]


# ── Query: stats globales ────────────────────────────────────────────────

def get_stats(conn):
    mois = get_dernier_mois(conn)
    if not mois:
        return {"total_joueurs": 0, "hommes": 0, "femmes": 0, "mois_disponibles": 0, "dernier_mois": None}
    row = conn.execute(
        """SELECT COUNT(*) as total,
                  SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes,
                  SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes
           FROM classements c JOIN joueurs j ON j.id=c.joueur_id WHERE c.mois=?""",
        (mois,),
    ).fetchone()
    nb_mois = conn.execute("SELECT COUNT(DISTINCT mois) as cnt FROM classements").fetchone()["cnt"]
    return {
        "total_joueurs": row["total"],
        "hommes": row["hommes"],
        "femmes": row["femmes"],
        "mois_disponibles": nb_mois,
        "dernier_mois": mois,
    }


# ── Dashboard queries ────────────────────────────────────────────────────

def dashboard_overview(conn, mois=None, genre=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return {}
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []

    # current month stats
    cur = conn.execute(
        f"""SELECT COUNT(*) as total,
                   AVG(c.points) as avg_points,
                   AVG(c.nb_tournois) as avg_tournois,
                   AVG(c.age) as avg_age
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? {gf}""",
        [mois] + gp,
    ).fetchone()

    # previous month
    prev = conn.execute(
        "SELECT MAX(mois) as m FROM classements WHERE mois < ?", (mois,)
    ).fetchone()["m"]
    prev_total = 0
    if prev:
        prev_total = conn.execute(
            f"SELECT COUNT(*) as cnt FROM classements c JOIN joueurs j ON j.id=c.joueur_id WHERE c.mois=? {gf}",
            [prev] + gp,
        ).fetchone()["cnt"]

    # distribution by points
    tranches = [
        (0, 99), (100, 499), (500, 999), (1000, 1999),
        (2000, 4999), (5000, 9999), (10000, 999999),
    ]
    distribution = []
    for lo, hi in tranches:
        label = f"{lo}-{hi}" if hi < 999999 else f"{lo}+"
        cnt = conn.execute(
            f"""SELECT COUNT(*) as cnt FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                WHERE c.mois=? AND c.points BETWEEN ? AND ? {gf}""",
            [mois, lo, hi] + gp,
        ).fetchone()["cnt"]
        distribution.append({"tranche": label, "count": cnt})

    return {
        "mois": mois,
        "total": cur["total"],
        "prev_total": prev_total,
        "avg_points": round(cur["avg_points"] or 0, 1),
        "avg_tournois": round(cur["avg_tournois"] or 0, 1),
        "avg_age": round(cur["avg_age"] or 0, 1),
        "distribution": distribution,
    }


def dashboard_progressions(conn, mois=None, genre=None, limit=10, rang_max=None, exclude_assimiles=False):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rf = "AND c.rang <= ?" if rang_max else ""
    rp = [rang_max] if rang_max else []
    af = "AND c.est_assimile=0" if exclude_assimiles else ""
    rows = conn.execute(
        f"""SELECT j.id, j.nom, j.prenom, c.genre, c.rang, c.points, c.evolution, c.ligue
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.evolution IS NOT NULL AND c.evolution != '='
              AND CAST(REPLACE(c.evolution,'+','') AS INTEGER) > 0 {gf} {rf} {af}
            ORDER BY CAST(REPLACE(c.evolution,'+','') AS INTEGER) DESC LIMIT ?""",
        [mois] + gp + rp + [limit],
    ).fetchall()
    return [dict(r) for r in rows]


def dashboard_chutes(conn, mois=None, genre=None, limit=10, rang_max=None, exclude_assimiles=False):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rf = "AND c.rang <= ?" if rang_max else ""
    rp = [rang_max] if rang_max else []
    af = "AND c.est_assimile=0" if exclude_assimiles else ""
    rows = conn.execute(
        f"""SELECT j.id, j.nom, j.prenom, c.genre, c.rang, c.points, c.evolution, c.ligue
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.evolution IS NOT NULL AND c.evolution != '='
              AND CAST(REPLACE(c.evolution,'-','') AS INTEGER) > 0
              AND c.evolution LIKE '-%' {gf} {rf} {af}
            ORDER BY CAST(REPLACE(c.evolution,'-','') AS INTEGER) DESC LIMIT ?""",
        [mois] + gp + rp + [limit],
    ).fetchall()
    return [dict(r) for r in rows]


def dashboard_evolution_mensuelle(conn, genre=None):
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT c.mois,
                   SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes,
                   SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes,
                   COUNT(*) as total
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE 1=1 {gf}
            GROUP BY c.mois ORDER BY c.mois ASC""",
        gp,
    ).fetchall()
    return [dict(r) for r in rows]


def dashboard_ages(conn, mois=None, genre=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    tranches = [(0, 17), (18, 25), (26, 35), (36, 45), (46, 55), (56, 99)]
    result = []
    for lo, hi in tranches:
        label = f"{lo}-{hi}" if hi < 99 else f"{lo}+"
        row = conn.execute(
            """SELECT
                 SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes,
                 SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes
               FROM classements c JOIN joueurs j ON j.id=c.joueur_id
               WHERE c.mois=? AND c.age BETWEEN ? AND ?""",
            (mois, lo, hi),
        ).fetchone()
        result.append({"tranche": label, "hommes": row["hommes"] or 0, "femmes": row["femmes"] or 0})
    return result


def dashboard_ligues(conn, mois=None, genre=None):
    return get_ligues(conn, mois)


# ── Analytics queries ─────────────────────────────────────────────────────

def analytics_numero_un(conn, genre=None):
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT j.id, j.nom, j.prenom, c.genre, j.nationalite, c.mois
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.rang=1 {gf} ORDER BY c.mois ASC""",
        gp,
    ).fetchall()
    # group by player
    hall = {}
    for r in rows:
        key = r["id"]
        if key not in hall:
            hall[key] = {"id": r["id"], "nom": r["nom"], "prenom": r["prenom"],
                         "genre": r["genre"], "nationalite": r["nationalite"],
                         "mois_numero_un": [], "nb_mois": 0}
        hall[key]["mois_numero_un"].append(r["mois"])
        hall[key]["nb_mois"] += 1
    return sorted(hall.values(), key=lambda x: x["nb_mois"], reverse=True)


def analytics_difficulte_progression(conn, mois=None, genre=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    tranches = [(1, 10), (11, 50), (51, 100), (101, 500), (501, 1000), (1001, 5000), (5001, 50000), (50001, 999999)]
    result = []
    for lo, hi in tranches:
        label = f"Top {lo}-{hi}" if hi < 999999 else f"Top {lo}+"
        row = conn.execute(
            f"""SELECT COUNT(*) as total,
                       SUM(CASE WHEN c.evolution IS NOT NULL AND c.evolution != '='
                           AND CAST(REPLACE(REPLACE(c.evolution,'+',''),'-','') AS INTEGER) > 0
                           AND c.evolution NOT LIKE '-%' THEN 1 ELSE 0 END) as progressions
                FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                WHERE c.mois=? AND c.rang BETWEEN ? AND ? {gf}""",
            [mois, lo, hi] + gp,
        ).fetchone()
        total = row["total"] or 1
        result.append({
            "tranche": label,
            "total": row["total"],
            "progressions": row["progressions"] or 0,
            "taux": round((row["progressions"] or 0) / total * 100, 1),
        })
    return result


def analytics_inflation_points(conn, genre=None):
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    niveaux = [1, 10, 50, 100, 500, 1000]

    result_dict = {}

    for n in niveaux:
        # Use a window of ±10% (min 3 players) around the target rank
        # and average their points to get a stable, noise-resistant value.
        margin = max(3, n // 10)
        rang_min = max(1, n - margin)
        rang_max = n + margin
        rows = conn.execute(
            f"""SELECT c.mois, AVG(c.points) as pts
                FROM classements c
                WHERE c.rang BETWEEN ? AND ? AND c.points > 0 {gf}
                GROUP BY c.mois
                ORDER BY c.mois ASC""",
            [rang_min, rang_max] + gp,
        ).fetchall()
        for row in rows:
            m = row["mois"]
            if m not in result_dict:
                result_dict[m] = {"mois": m}
            result_dict[m][f"rang_{n}"] = round(row["pts"]) if row["pts"] else None

    return sorted(result_dict.values(), key=lambda x: x["mois"])


def analytics_nationalites_par_niveau(conn, mois=None, top=100, genre=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT j.nationalite, COUNT(*) as count
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.rang <= ? AND j.nationalite IS NOT NULL AND j.nationalite != '' {gf}
            GROUP BY j.nationalite ORDER BY count DESC""",
        [mois, top] + gp,
    ).fetchall()
    return [dict(r) for r in rows]


def analytics_age_par_niveau(conn, mois=None, genre=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    tranches = [(1, 10), (11, 50), (51, 100), (101, 500), (501, 1000), (1001, 5000), (5001, 50000), (50001, 999999)]
    result = []
    for lo, hi in tranches:
        label = f"Top {lo}-{hi}" if hi < 999999 else f"Top {lo}+"
        row = conn.execute(
            f"""SELECT AVG(c.age) as avg_age, MIN(c.age) as min_age, MAX(c.age) as max_age
                FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                WHERE c.mois=? AND c.rang BETWEEN ? AND ? AND c.age IS NOT NULL {gf}""",
            [mois, lo, hi] + gp,
        ).fetchone()
        result.append({
            "tranche": label,
            "avg_age": round(row["avg_age"] or 0, 1),
            "min_age": row["min_age"] or 0,
            "max_age": row["max_age"] or 0,
        })
    return result


def analytics_frequence_tournois(conn, mois=None, genre=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    tranches = [(0, 0), (1, 3), (4, 6), (7, 10), (11, 15), (16, 20), (21, 999)]
    result = []
    for lo, hi in tranches:
        label = f"{lo}-{hi}" if hi < 999 else f"{lo}+"
        if lo == hi:
            label = str(lo)
        cnt = conn.execute(
            f"""SELECT COUNT(*) as cnt FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                WHERE c.mois=? AND c.nb_tournois BETWEEN ? AND ? {gf}""",
            [mois, lo, hi] + gp,
        ).fetchone()["cnt"]
        result.append({"tranche": label, "count": cnt})
    return result


def analytics_participations_mensuelles(conn, genre=None):
    """Monthly tournament participation stats over all available months.

    Returns for each month:
    - mois: the month (YYYY-MM)
    - total_participations: sum of nb_tournois across all players
    - nb_joueurs: number of ranked players
    - moyenne: average nb_tournois per player
    - total_hommes / total_femmes: breakdown by gender
    """
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT c.mois,
                   SUM(c.nb_tournois) as total_participations,
                   COUNT(*) as nb_joueurs,
                   ROUND(AVG(c.nb_tournois), 1) as moyenne,
                   SUM(CASE WHEN c.genre='H' THEN c.nb_tournois ELSE 0 END) as total_hommes,
                   SUM(CASE WHEN c.genre='F' THEN c.nb_tournois ELSE 0 END) as total_femmes
            FROM classements c
            JOIN joueurs j ON j.id=c.joueur_id
            WHERE 1=1 {gf}
            GROUP BY c.mois
            ORDER BY c.mois""",
        gp,
    ).fetchall()
    return [dict(r) for r in rows]


def analytics_profil_type(conn, mois=None, top=100, genre=None):
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return {}
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    row = conn.execute(
        f"""SELECT AVG(c.age) as avg_age, AVG(c.points) as avg_points,
                   AVG(c.nb_tournois) as avg_tournois,
                   COUNT(*) as total
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.rang <= ? {gf}""",
        [mois, top] + gp,
    ).fetchone()
    # most common nationality
    nat = conn.execute(
        f"""SELECT j.nationalite, COUNT(*) as cnt
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.rang <= ? AND j.nationalite IS NOT NULL AND j.nationalite != '' {gf}
            GROUP BY j.nationalite ORDER BY cnt DESC LIMIT 1""",
        [mois, top] + gp,
    ).fetchone()
    # most common ligue
    lig = conn.execute(
        f"""SELECT c.ligue, COUNT(*) as cnt
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.rang <= ? AND c.ligue IS NOT NULL AND c.ligue != '' {gf}
            GROUP BY c.ligue ORDER BY cnt DESC LIMIT 1""",
        [mois, top] + gp,
    ).fetchone()
    return {
        "top": top,
        "mois": mois,
        "total": row["total"],
        "avg_age": round(row["avg_age"] or 0, 1),
        "avg_points": round(row["avg_points"] or 0, 1),
        "avg_tournois": round(row["avg_tournois"] or 0, 1),
        "nationalite_principale": nat["nationalite"] if nat else None,
        "ligue_principale": lig["ligue"] if lig else None,
    }


# ── Advanced Analytics ───────────────────────────────────────────────────

def analytics_competitivite_ligue(conn, mois=None, genre=None):
    """Competitivity index per league: avg points of top 10 players in each league."""
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    
    ligues = conn.execute(
        f"""SELECT DISTINCT c.ligue FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.ligue IS NOT NULL AND c.ligue != '' {gf}
            ORDER BY c.ligue""",
        [mois] + gp,
    ).fetchall()
    
    result = []
    for l in ligues:
        ligue_name = l["ligue"]
        row = conn.execute(
            f"""SELECT AVG(sub.points) as avg_pts, MIN(sub.rang) as best_rank,
                       COUNT(*) as total_players
                FROM (
                    SELECT c.points, c.rang
                    FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                    WHERE c.mois=? AND c.ligue=? AND c.points > 0 {gf}
                    ORDER BY c.rang ASC LIMIT 10
                ) sub""",
            [mois, ligue_name] + gp,
        ).fetchone()
        
        total = conn.execute(
            f"""SELECT COUNT(*) as cnt FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                WHERE c.mois=? AND c.ligue=? {gf}""",
            [mois, ligue_name] + gp,
        ).fetchone()["cnt"]
        
        result.append({
            "ligue": ligue_name,
            "avg_top10_pts": round(row["avg_pts"] or 0, 1),
            "best_rank": row["best_rank"],
            "total": total,
            "competitivite": round((row["avg_pts"] or 0) / 100, 1),  # Index
        })
    
    result.sort(key=lambda x: x["avg_top10_pts"], reverse=True)
    return result


def analytics_participation_feminine(conn):
    """Female participation rate per month — trend over time."""
    rows = conn.execute(
        """SELECT c.mois,
                  COUNT(*) as total,
                  SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes,
                  SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes
           FROM classements c JOIN joueurs j ON j.id=c.joueur_id
           GROUP BY c.mois ORDER BY c.mois ASC"""
    ).fetchall()
    return [
        {
            "mois": r["mois"],
            "total": r["total"],
            "femmes": r["femmes"],
            "hommes": r["hommes"],
            "pct_femmes": round((r["femmes"] / r["total"] * 100) if r["total"] > 0 else 0, 2),
        }
        for r in rows
    ]


def analytics_predictions(conn, joueur_id):
    """Simple rank prediction based on historical evolution trend."""
    historique = conn.execute(
        "SELECT mois, rang, points, evolution FROM classements WHERE joueur_id=? ORDER BY mois ASC",
        (joueur_id,),
    ).fetchall()
    if len(historique) < 2:
        return {"prediction": None, "trend": "insufficient_data"}
    
    ranks = [h["rang"] for h in historique]
    # Linear trend
    delta = ranks[-1] - ranks[0]
    avg_delta_per_month = delta / (len(ranks) - 1)
    predicted_rank = max(1, round(ranks[-1] + avg_delta_per_month))
    
    trend = "stable"
    if avg_delta_per_month < -5:
        trend = "strong_up"
    elif avg_delta_per_month < 0:
        trend = "up"
    elif avg_delta_per_month > 5:
        trend = "strong_down"
    elif avg_delta_per_month > 0:
        trend = "down"
    
    return {
        "current_rank": ranks[-1],
        "predicted_rank": predicted_rank,
        "trend": trend,
        "avg_delta": round(avg_delta_per_month, 1),
        "months_analyzed": len(ranks),
    }


def analytics_records(conn, mois=None, genre=None):
    """Records du mois: biggest progression and most active player."""
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return {}
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []

    prog_row = conn.execute(
        f"""SELECT j.id, j.nom, j.prenom, c.genre, c.rang, c.points, c.evolution, c.ligue
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.evolution IS NOT NULL AND c.evolution != '='
              AND c.evolution NOT LIKE '-%'
              AND CAST(REPLACE(c.evolution,'+','') AS INTEGER) > 0 {gf}
            ORDER BY CAST(REPLACE(c.evolution,'+','') AS INTEGER) DESC LIMIT 1""",
        [mois] + gp,
    ).fetchone()

    actif_row = conn.execute(
        f"""SELECT j.id, j.nom, j.prenom, c.genre, c.rang, c.points, c.nb_tournois, c.ligue
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.nb_tournois IS NOT NULL {gf}
            ORDER BY c.nb_tournois DESC LIMIT 1""",
        [mois] + gp,
    ).fetchone()

    return {
        "plus_grosse_progression": dict(prog_row) if prog_row else None,
        "joueur_plus_actif": dict(actif_row) if actif_row else None,
    }


def analytics_evolution_nationalites(conn, genre=None, top_pays=5):
    """Evolution du nombre de joueurs par nationalité dans le temps (top N pays)."""
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []

    top_nats = conn.execute(
        f"""SELECT j.nationalite, COUNT(*) as cnt
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE j.nationalite IS NOT NULL AND j.nationalite != '' {gf}
            GROUP BY j.nationalite ORDER BY cnt DESC LIMIT ?""",
        gp + [top_pays],
    ).fetchall()
    nats = [r["nationalite"] for r in top_nats]

    if not nats:
        return {"nationalites": [], "data": []}

    rows = conn.execute(
        f"""SELECT c.mois, j.nationalite, COUNT(*) as count
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE j.nationalite IS NOT NULL AND j.nationalite != '' {gf}
            GROUP BY c.mois, j.nationalite ORDER BY c.mois ASC""",
        gp,
    ).fetchall()

    from collections import defaultdict
    monthly = defaultdict(dict)
    for r in rows:
        if r["nationalite"] in nats:
            monthly[r["mois"]][r["nationalite"]] = r["count"]

    result = []
    for m in sorted(monthly.keys()):
        entry = {"mois": m}
        for nat in nats:
            entry[nat] = monthly[m].get(nat, 0)
        result.append(entry)

    return {"nationalites": nats, "data": result}


def analytics_evolution_ligues(conn, genre=None):
    """Evolution du nombre de joueurs par ligue dans le temps."""
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []

    rows = conn.execute(
        f"""SELECT c.mois, c.ligue, COUNT(*) as total
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.ligue IS NOT NULL AND c.ligue != '' {gf}
            GROUP BY c.mois, c.ligue ORDER BY c.mois ASC""",
        gp,
    ).fetchall()

    from collections import defaultdict
    monthly = defaultdict(dict)
    all_ligues = set()
    for r in rows:
        monthly[r["mois"]][r["ligue"]] = r["total"]
        all_ligues.add(r["ligue"])

    # Sort ligues by their total in the latest month (desc)
    mois_sorted = sorted(monthly.keys())
    if mois_sorted:
        last = monthly[mois_sorted[-1]]
        ligues_sorted = sorted(all_ligues, key=lambda l: last.get(l, 0), reverse=True)
    else:
        ligues_sorted = sorted(all_ligues)

    result = []
    for m in mois_sorted:
        entry = {"mois": m}
        for ligue in ligues_sorted:
            entry[ligue] = monthly[m].get(ligue, 0)
        result.append(entry)

    return {"ligues": ligues_sorted, "data": result}


def analytics_rang_points_curve(conn, mois=None, genre=None):
    """Courbe rang → points moyens (forme logarithmique naturelle)."""
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []

    bands = [
        (1, 10), (11, 50), (51, 100), (101, 250), (251, 500),
        (501, 1000), (1001, 2500), (2501, 5000), (5001, 10000), (10001, 50000), (50001, 999999),
    ]
    result = []
    for lo, hi in bands:
        row = conn.execute(
            f"""SELECT AVG(c.points) as avg_pts, COUNT(*) as cnt
                FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                WHERE c.mois=? AND c.rang BETWEEN ? AND ? AND c.points > 0 {gf}""",
            [mois, lo, hi] + gp,
        ).fetchone()
        if row and row["cnt"] > 0:
            label = f"Top {lo}" if lo == 1 else (f"{lo}+" if hi >= 999999 else f"{lo}-{hi}")
            result.append({
                "tranche": label,
                "rang_centre": lo if lo == 1 else min((lo + hi) // 2, 30000),
                "avg_pts": round(row["avg_pts"] or 0),
                "count": row["cnt"],
            })
    return result


def analytics_region_tableau(conn, mois=None, genre=None):
    """Tableau récapitulatif enrichi par région/ligue avec âges et niveaux."""
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []

    ligues = conn.execute(
        f"""SELECT DISTINCT c.ligue FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.mois=? AND c.ligue IS NOT NULL AND c.ligue != '' {gf}
            ORDER BY c.ligue""",
        [mois] + gp,
    ).fetchall()

    result = []
    for l in ligues:
        ligue_name = l["ligue"]
        row = conn.execute(
            f"""SELECT COUNT(*) as total,
                       SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes,
                       SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes,
                       AVG(CASE WHEN c.age IS NOT NULL THEN c.age END) as avg_age,
                       SUM(CASE WHEN c.rang <= 100 THEN 1 ELSE 0 END) as top100,
                       SUM(CASE WHEN c.rang <= 500 THEN 1 ELSE 0 END) as top500,
                       SUM(CASE WHEN c.rang <= 1000 THEN 1 ELSE 0 END) as top1000,
                       SUM(CASE WHEN c.rang <= 5000 THEN 1 ELSE 0 END) as top5000,
                       SUM(CASE WHEN c.age < 18 THEN 1 ELSE 0 END) as age_moins18,
                       SUM(CASE WHEN c.age BETWEEN 18 AND 30 THEN 1 ELSE 0 END) as age_18_30,
                       SUM(CASE WHEN c.age BETWEEN 31 AND 50 THEN 1 ELSE 0 END) as age_31_50,
                       SUM(CASE WHEN c.age > 50 THEN 1 ELSE 0 END) as age_plus50
                FROM classements c JOIN joueurs j ON j.id=c.joueur_id
                WHERE c.mois=? AND c.ligue=? {gf}""",
            [mois, ligue_name] + gp,
        ).fetchone()
        result.append({
            "ligue": ligue_name,
            "total": row["total"],
            "hommes": row["hommes"],
            "femmes": row["femmes"],
            "pct_femmes": round((row["femmes"] / row["total"] * 100) if row["total"] > 0 else 0, 1),
            "avg_age": round(row["avg_age"] or 0, 1),
            "top100": row["top100"],
            "top500": row["top500"],
            "top1000": row["top1000"],
            "top5000": row["top5000"],
            "age_moins18": row["age_moins18"],
            "age_18_30": row["age_18_30"],
            "age_31_50": row["age_31_50"],
            "age_plus50": row["age_plus50"],
        })
    result.sort(key=lambda x: x["total"], reverse=True)
    return result


def analytics_evolution_assimiles(conn, genre=None):
    """Evolution du nombre d'assimilés dans le temps."""
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT c.mois,
                   COUNT(*) as total,
                   SUM(CASE WHEN c.est_assimile=1 THEN 1 ELSE 0 END) as assimiles
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE 1=1 {gf}
            GROUP BY c.mois ORDER BY c.mois ASC""",
        gp,
    ).fetchall()
    return [
        {
            "mois": r["mois"],
            "total": r["total"],
            "assimiles": r["assimiles"],
            "pct_assimiles": round((r["assimiles"] / r["total"] * 100) if r["total"] > 0 else 0, 2),
        }
        for r in rows
    ]


def analytics_evolution_age_moyen(conn, genre=None):
    """Evolution de l'âge moyen dans le temps."""
    rows = conn.execute(
        """SELECT c.mois,
                   AVG(c.age) as avg_age,
                   AVG(CASE WHEN c.genre='H' THEN c.age END) as avg_age_h,
                   AVG(CASE WHEN c.genre='F' THEN c.age END) as avg_age_f
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.age IS NOT NULL
            GROUP BY c.mois ORDER BY c.mois ASC""",
    ).fetchall()
    return [
        {
            "mois": r["mois"],
            "avg_age": round(r["avg_age"] or 0, 1),
            "avg_age_h": round(r["avg_age_h"], 1) if r["avg_age_h"] else None,
            "avg_age_f": round(r["avg_age_f"], 1) if r["avg_age_f"] else None,
        }
        for r in rows
    ]


def analytics_evolution_top100_par_ligue(conn, genre=None, top_n=100):
    """Evolution du nombre de joueurs Top N par ligue dans le temps."""
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT c.mois, c.ligue, COUNT(*) as total
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.rang <= ? AND c.ligue IS NOT NULL AND c.ligue != '' {gf}
            GROUP BY c.mois, c.ligue ORDER BY c.mois ASC""",
        [top_n] + gp,
    ).fetchall()

    from collections import defaultdict
    monthly = defaultdict(dict)
    all_ligues = set()
    for r in rows:
        monthly[r["mois"]][r["ligue"]] = r["total"]
        all_ligues.add(r["ligue"])

    mois_sorted = sorted(monthly.keys())
    if mois_sorted:
        last = monthly[mois_sorted[-1]]
        ligues_sorted = sorted(all_ligues, key=lambda l: last.get(l, 0), reverse=True)
    else:
        ligues_sorted = sorted(all_ligues)

    result = []
    for m in mois_sorted:
        entry = {"mois": m}
        for ligue in ligues_sorted:
            entry[ligue] = monthly[m].get(ligue, 0)
        result.append(entry)
    return {"ligues": ligues_sorted, "data": result}


def analytics_evolution_moins18_par_ligue(conn, genre=None):
    """Evolution du nombre de joueurs de moins de 18 ans par ligue."""
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT c.mois, c.ligue, COUNT(*) as total
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.age < 18 AND c.age IS NOT NULL
              AND c.ligue IS NOT NULL AND c.ligue != '' {gf}
            GROUP BY c.mois, c.ligue ORDER BY c.mois ASC""",
        gp,
    ).fetchall()

    from collections import defaultdict
    monthly = defaultdict(dict)
    all_ligues = set()
    for r in rows:
        monthly[r["mois"]][r["ligue"]] = r["total"]
        all_ligues.add(r["ligue"])

    mois_sorted = sorted(monthly.keys())
    if mois_sorted:
        last = monthly[mois_sorted[-1]]
        ligues_sorted = sorted(all_ligues, key=lambda l: last.get(l, 0), reverse=True)
    else:
        ligues_sorted = sorted(all_ligues)

    result = []
    for m in mois_sorted:
        entry = {"mois": m}
        for ligue in ligues_sorted:
            entry[ligue] = monthly[m].get(ligue, 0)
        result.append(entry)
    return {"ligues": ligues_sorted, "data": result}


def analytics_evolution_assimiles_par_ligue(conn, genre=None):
    """Evolution du nombre de joueurs assimilés par ligue."""
    gf = "AND c.genre=?" if genre else ""
    gp = [genre] if genre else []
    rows = conn.execute(
        f"""SELECT c.mois, c.ligue, COUNT(*) as total
            FROM classements c JOIN joueurs j ON j.id=c.joueur_id
            WHERE c.est_assimile = 1
              AND c.ligue IS NOT NULL AND c.ligue != '' {gf}
            GROUP BY c.mois, c.ligue ORDER BY c.mois ASC""",
        gp,
    ).fetchall()

    from collections import defaultdict
    monthly = defaultdict(dict)
    all_ligues = set()
    for r in rows:
        monthly[r["mois"]][r["ligue"]] = r["total"]
        all_ligues.add(r["ligue"])

    mois_sorted = sorted(monthly.keys())
    if mois_sorted:
        last = monthly[mois_sorted[-1]]
        ligues_sorted = sorted(all_ligues, key=lambda l: last.get(l, 0), reverse=True)
    else:
        ligues_sorted = sorted(all_ligues)

    result = []
    for m in mois_sorted:
        entry = {"mois": m}
        for ligue in ligues_sorted:
            entry[ligue] = monthly[m].get(ligue, 0)
        result.append(entry)
    return {"ligues": ligues_sorted, "data": result}


def analytics_evolution_etrangers_top100(conn):
    """Evolution du nombre d'étrangers dans le top 100 (H et F séparés)."""
    rows = conn.execute(
        """SELECT c.mois, c.genre,
                  COUNT(*) as total,
                  SUM(CASE WHEN j.nationalite != 'FRA' AND j.nationalite IS NOT NULL AND j.nationalite != '' THEN 1 ELSE 0 END) as etrangers
           FROM classements c JOIN joueurs j ON j.id=c.joueur_id
           WHERE c.rang <= 100
           GROUP BY c.mois, c.genre ORDER BY c.mois ASC""",
    ).fetchall()

    from collections import defaultdict
    monthly = defaultdict(lambda: {"total_h": 0, "total_f": 0, "etrangers_h": 0, "etrangers_f": 0})
    for r in rows:
        m = monthly[r["mois"]]
        if r["genre"] == "H":
            m["total_h"] = r["total"]
            m["etrangers_h"] = r["etrangers"]
        else:
            m["total_f"] = r["total"]
            m["etrangers_f"] = r["etrangers"]

    return [
        {
            "mois": mois,
            "etrangers_h": d["etrangers_h"],
            "etrangers_f": d["etrangers_f"],
            "total_h": d["total_h"],
            "total_f": d["total_f"],
            "pct_h": round(d["etrangers_h"] / d["total_h"] * 100, 1) if d["total_h"] else 0,
            "pct_f": round(d["etrangers_f"] / d["total_f"] * 100, 1) if d["total_f"] else 0,
        }
        for mois, d in sorted(monthly.items())
    ]


# ── Analytics: clubs ──────────────────────────────────────────────────────

def analytics_clubs_tableau(conn, mois=None, genre=None):
    """Tableau détaillé des clubs avec stats enrichies (top 200)."""
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    where, params = ["c.mois=?", "c.club IS NOT NULL", "c.club != ''"], [mois]
    if genre:
        where.append("c.genre=?"); params.append(genre)
    w = " AND ".join(where)
    rows = conn.execute(
        f"""SELECT c.club,
                  COUNT(*) as total,
                  SUM(CASE WHEN c.genre='H' THEN 1 ELSE 0 END) as hommes,
                  SUM(CASE WHEN c.genre='F' THEN 1 ELSE 0 END) as femmes,
                  MIN(c.rang) as meilleur_rang,
                  ROUND(AVG(c.points), 0) as avg_points,
                  ROUND(AVG(c.age), 1) as avg_age,
                  ROUND(AVG(c.nb_tournois), 1) as avg_tournois,
                  SUM(CASE WHEN c.rang <= 100 THEN 1 ELSE 0 END) as top100,
                  SUM(CASE WHEN c.rang <= 500 THEN 1 ELSE 0 END) as top500,
                  SUM(CASE WHEN c.rang <= 1000 THEN 1 ELSE 0 END) as top1000,
                  SUM(CASE WHEN c.age < 18 THEN 1 ELSE 0 END) as moins18,
                  c.ligue
           FROM classements c JOIN joueurs j ON j.id=c.joueur_id
           WHERE {w}
           GROUP BY c.club ORDER BY total DESC""",
        params,
    ).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["pct_femmes"] = round(d["femmes"] / d["total"] * 100, 1) if d["total"] else 0
        result.append(d)
    return result


def analytics_evolution_top_clubs(conn, genre=None, top_n=20):
    """Evolution du nombre de joueurs pour les top N clubs dans le temps."""
    from collections import defaultdict
    # Find top clubs from latest month
    dernier = get_dernier_mois(conn)
    if not dernier:
        return {"clubs": [], "data": []}
    where_top, params_top = ["c.mois=?", "c.club IS NOT NULL", "c.club != ''"], [dernier]
    if genre:
        where_top.append("c.genre=?"); params_top.append(genre)
    top_clubs = conn.execute(
        f"""SELECT c.club, COUNT(*) as total
           FROM classements c WHERE {" AND ".join(where_top)}
           GROUP BY c.club ORDER BY total DESC LIMIT ?""",
        params_top + [top_n],
    ).fetchall()
    club_names = [r["club"] for r in top_clubs]
    if not club_names:
        return {"clubs": [], "data": []}

    # Get evolution data
    placeholders = ",".join(["?"] * len(club_names))
    where_evo = [f"c.club IN ({placeholders})", "c.club IS NOT NULL"]
    params_evo = list(club_names)
    if genre:
        where_evo.append("c.genre=?"); params_evo.append(genre)
    rows = conn.execute(
        f"""SELECT c.mois, c.club, COUNT(*) as total
           FROM classements c
           WHERE {" AND ".join(where_evo)}
           GROUP BY c.mois, c.club ORDER BY c.mois ASC""",
        params_evo,
    ).fetchall()

    monthly = defaultdict(dict)
    for r in rows:
        monthly[r["mois"]][r["club"]] = r["total"]

    result = []
    for m in sorted(monthly.keys()):
        entry = {"mois": m}
        for club in club_names:
            entry[club] = monthly[m].get(club, 0)
        result.append(entry)
    return {"clubs": club_names, "data": result}


def analytics_clubs_par_ligue(conn, mois=None, genre=None):
    """Nombre de clubs par ligue."""
    if not mois:
        mois = get_dernier_mois(conn)
    if not mois:
        return []
    where, params = ["c.mois=?", "c.club IS NOT NULL", "c.club != ''", "c.ligue IS NOT NULL", "c.ligue != ''"], [mois]
    if genre:
        where.append("c.genre=?"); params.append(genre)
    rows = conn.execute(
        f"""SELECT c.ligue,
                  COUNT(DISTINCT c.club) as nb_clubs,
                  COUNT(*) as nb_joueurs
           FROM classements c
           WHERE {" AND ".join(where)}
           GROUP BY c.ligue ORDER BY nb_clubs DESC""",
        params,
    ).fetchall()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    init_db()
