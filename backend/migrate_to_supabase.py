"""
One-shot migration: copy SQLite database to Supabase / Postgres.

Usage (locally, after setting DATABASE_URL to your Supabase connection string):

    cd backend
    DATABASE_URL='postgresql://postgres.xxx:PASS@aws-0-eu-west-X.pooler.supabase.com:6543/postgres' \\
        python migrate_to_supabase.py

Reads ./padel_stats.db (or reassembles it from the .gz.* parts) and
streams every row of joueurs + classements + users into Postgres.

Idempotent: existing rows are upserted; running it twice is safe.
"""
import gzip
import glob
import os
import shutil
import sqlite3
import sys
import time

import psycopg2
import psycopg2.extras

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))


def _resolve_sqlite() -> str:
    target = os.path.join(BACKEND_DIR, "padel_stats.db")
    if os.path.exists(target):
        return target
    parts = sorted(glob.glob(os.path.join(BACKEND_DIR, "padel_stats.db.gz.*")))
    if not parts:
        sys.exit("Aucune base SQLite trouvée (padel_stats.db ou padel_stats.db.gz.*)")
    print(f"Reassemblage et décompression de {len(parts)} parts...")
    gz_path = target + ".gz"
    with open(gz_path, "wb") as out:
        for p in parts:
            with open(p, "rb") as f:
                shutil.copyfileobj(f, out)
    with gzip.open(gz_path, "rb") as f_in, open(target, "wb") as f_out:
        shutil.copyfileobj(f_in, f_out)
    os.remove(gz_path)
    return target


def _create_schema(pg):
    cur = pg.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS joueurs (
            id BIGINT PRIMARY KEY,
            nom TEXT NOT NULL,
            prenom TEXT,
            genre TEXT NOT NULL CHECK(genre IN ('H','F')),
            nationalite TEXT,
            UNIQUE(nom, prenom, genre)
        );
        CREATE TABLE IF NOT EXISTS classements (
            id BIGINT PRIMARY KEY,
            joueur_id BIGINT NOT NULL REFERENCES joueurs(id),
            mois TEXT NOT NULL,
            rang INTEGER,
            points INTEGER,
            evolution TEXT,
            nb_tournois INTEGER,
            ligue TEXT,
            meilleur_classement INTEGER,
            est_assimile BOOLEAN DEFAULT FALSE,
            age INTEGER,
            est_anonyme BOOLEAN DEFAULT FALSE,
            genre TEXT,
            club TEXT,
            classement_fip INTEGER,
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
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    """)
    pg.commit()
    cur.close()
    print("[OK] Schéma créé sur Postgres")


def _copy_table(sqlite_conn, pg, table: str, columns: list[str], conflict_cols: list[str], batch=2000):
    placeholders = ",".join(["%s"] * len(columns))
    col_list = ",".join(columns)
    update_cols = [c for c in columns if c not in conflict_cols and c != "id"]
    update_clause = ",".join(f"{c}=EXCLUDED.{c}" for c in update_cols)
    on_conflict = f"({','.join(conflict_cols)})" if conflict_cols else ""
    sql = (
        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) "
        f"ON CONFLICT {on_conflict} DO UPDATE SET {update_clause}"
        if update_cols else
        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders}) "
        f"ON CONFLICT {on_conflict} DO NOTHING"
    )

    sqlite_cur = sqlite_conn.execute(f"SELECT {col_list} FROM {table}")
    total = sqlite_conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    print(f"\n→ {table} : {total} lignes")
    if total == 0:
        return

    pg_cur = pg.cursor()
    inserted = 0
    t0 = time.time()
    while True:
        rows = sqlite_cur.fetchmany(batch)
        if not rows:
            break
        psycopg2.extras.execute_batch(pg_cur, sql, [tuple(r) for r in rows], page_size=batch)
        pg.commit()
        inserted += len(rows)
        rate = inserted / max(time.time() - t0, 0.001)
        print(f"  {inserted}/{total} ({rate:.0f} rows/s)", end="\r", flush=True)
    print()
    pg_cur.close()
    print(f"[OK] {table}: {inserted} lignes copiées")


def _reset_sequences(pg):
    """After inserting rows with explicit ids, bump the sequences past max(id)."""
    cur = pg.cursor()
    for table in ("joueurs", "classements"):
        cur.execute(f"SELECT setval(pg_get_serial_sequence(%s, 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1))", (table,))
    pg.commit()
    cur.close()
    print("[OK] Sequences ajustées")


def main():
    dsn = os.environ.get("DATABASE_URL", "").strip()
    if not dsn.startswith(("postgres://", "postgresql://")):
        sys.exit("DATABASE_URL non défini ou invalide. Exporte ta connection string Supabase d'abord.")

    sqlite_path = _resolve_sqlite()
    print(f"Source SQLite : {sqlite_path}")
    print(f"Cible Postgres : {dsn.split('@')[-1]}")

    sq = sqlite3.connect(sqlite_path)
    sq.row_factory = sqlite3.Row

    pg = psycopg2.connect(dsn)

    _create_schema(pg)

    _copy_table(
        sq, pg, "joueurs",
        ["id", "nom", "prenom", "genre", "nationalite"],
        conflict_cols=["id"],
    )
    _copy_table(
        sq, pg, "classements",
        ["id", "joueur_id", "mois", "rang", "points", "evolution", "nb_tournois",
         "ligue", "meilleur_classement", "est_assimile", "age", "est_anonyme",
         "genre", "club", "classement_fip"],
        conflict_cols=["id"],
    )
    # users table is small; skip if it doesn't exist on SQLite
    try:
        _copy_table(
            sq, pg, "users",
            ["id", "name", "email", "password_hash", "created_at"],
            conflict_cols=["id"],
        )
    except sqlite3.OperationalError:
        print("(table users absente de SQLite — ignorée)")

    _reset_sequences(pg)

    sq.close()
    pg.close()
    print("\n✓ Migration terminée.")


if __name__ == "__main__":
    main()
