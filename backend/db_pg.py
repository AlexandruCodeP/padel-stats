"""
PostgreSQL connection wrapper that mimics the sqlite3 API used in this codebase.

Allows database.py to keep using `?` placeholders and `LIKE` (case-insensitive
matching SQLite default behavior) while transparently running on Supabase.
"""
import os
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

import psycopg2
import psycopg2.extras


def _normalize_url(url: str) -> str:
    """Ensure sslmode=require for Supabase pooled connections."""
    if "sslmode=" in url:
        return url
    parsed = urlparse(url)
    q = parse_qs(parsed.query)
    q["sslmode"] = ["require"]
    return urlunparse(parsed._replace(query=urlencode(q, doseq=True)))


def _translate(sql: str) -> str:
    """Convert SQLite-style SQL to Postgres-compatible SQL.

    - `?` → `%s`
    - `LIKE` → `ILIKE` (SQLite LIKE is case-insensitive for ASCII by default;
      Postgres LIKE is case-sensitive — ILIKE matches the SQLite behaviour).
    """
    # Replace ? placeholders, but skip ?-inside-string-literals.
    out = []
    in_str = False
    quote = None
    for ch in sql:
        if in_str:
            out.append(ch)
            if ch == quote:
                in_str = False
        else:
            if ch in ("'", '"'):
                in_str = True
                quote = ch
                out.append(ch)
            elif ch == "?":
                out.append("%s")
            else:
                out.append(ch)
    sql = "".join(out)
    # Replace LIKE (word-boundary) with ILIKE — but only when used as operator
    sql = re.sub(r"\bLIKE\b", "ILIKE", sql)
    sql = re.sub(r"\bNOT\s+ILIKE\b", "NOT ILIKE", sql, flags=re.IGNORECASE)
    return sql


class _PgCursor:
    """Mimics the cursor returned by sqlite3.Connection.execute()."""

    def __init__(self, cur):
        self._cur = cur

    def fetchone(self):
        row = self._cur.fetchone()
        self._cur.close()
        return row

    def fetchall(self):
        rows = self._cur.fetchall()
        self._cur.close()
        return rows

    def __iter__(self):
        try:
            for row in self._cur:
                yield row
        finally:
            self._cur.close()


class PgConnection:
    """Wraps a psycopg2 connection to mimic sqlite3.Connection."""

    def __init__(self, dsn: str):
        self._conn = psycopg2.connect(_normalize_url(dsn))
        self._conn.autocommit = False

    def execute(self, sql, params=()):
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(_translate(sql), tuple(params) if params else None)
        return _PgCursor(cur)

    def executemany(self, sql, rows):
        cur = self._conn.cursor()
        psycopg2.extras.execute_batch(cur, _translate(sql), rows, page_size=500)
        cur.close()

    def executescript(self, sql):
        # Postgres can run multi-statement strings via cursor.execute
        cur = self._conn.cursor()
        cur.execute(sql)
        cur.close()

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def connect(dsn: str | None = None) -> PgConnection:
    dsn = dsn or os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL not set")
    return PgConnection(dsn)
