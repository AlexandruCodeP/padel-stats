"""One-time migration: copy the local SQLite DB's data into Turso.

Preserves exact row ids (joueurs.id, classements.id) so classements'
joueur_id foreign keys stay correct without needing an id-remapping pass.
Run with TURSO_DATABASE_URL / TURSO_AUTH_TOKEN set and pointing at an
already-schema-initialized (via init_db()) Turso database.
"""
import os
import sqlite3
import sys
import time

import turso_adapter

BATCH_SIZE = 1000


def _local_conn():
    path = os.path.join(os.path.dirname(__file__), "padel_stats.db")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def _batched(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def migrate_table(turso, local, table, columns, order_by="id"):
    total = local.execute(f"SELECT COUNT(*) as c FROM {table}").fetchone()["c"]
    print(f"[{table}] {total} rows to migrate")
    cols_sql = ", ".join(columns)
    placeholders_one = "(" + ",".join("?" * len(columns)) + ")"

    cur = local.execute(f"SELECT {cols_sql} FROM {table} ORDER BY {order_by}")
    migrated = 0
    t0 = time.time()
    while True:
        rows = cur.fetchmany(BATCH_SIZE)
        if not rows:
            break
        values_sql = ",".join([placeholders_one] * len(rows))
        params = []
        for r in rows:
            params.extend(r)
        turso.execute(f"INSERT INTO {table} ({cols_sql}) VALUES {values_sql}", params)
        migrated += len(rows)
        if migrated % 20000 < BATCH_SIZE:
            elapsed = time.time() - t0
            rate = migrated / elapsed if elapsed else 0
            eta = (total - migrated) / rate if rate else 0
            print(f"[{table}] {migrated}/{total} ({rate:.0f} rows/s, eta {eta:.0f}s)")
    print(f"[{table}] done: {migrated} rows in {time.time()-t0:.1f}s")


def main():
    url = os.environ["TURSO_DATABASE_URL"]
    token = os.environ["TURSO_AUTH_TOKEN"]
    turso = turso_adapter.TursoConnection(url, token)
    local = _local_conn()

    migrate_table(turso, local, "joueurs", ["id", "nom", "prenom", "genre", "nationalite"])
    migrate_table(turso, local, "classements", [
        "id", "joueur_id", "mois", "rang", "points", "evolution", "nb_tournois",
        "ligue", "meilleur_classement", "est_assimile", "age", "est_anonyme",
        "genre", "club", "classement_fip",
    ])

    # Verify counts match
    for table in ("joueurs", "classements"):
        local_count = local.execute(f"SELECT COUNT(*) as c FROM {table}").fetchone()["c"]
        turso_count = turso.execute(f"SELECT COUNT(*) as c FROM {table}").fetchone()[0]
        status = "OK" if local_count == turso_count else "MISMATCH"
        print(f"[verify] {table}: local={local_count} turso={turso_count} [{status}]")
        if local_count != turso_count:
            sys.exit(1)


if __name__ == "__main__":
    main()
