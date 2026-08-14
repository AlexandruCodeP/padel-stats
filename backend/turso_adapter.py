"""
Padel Stats France — Turso adapter
Makes Turso (reached via its raw HTTP "pipeline" API, using plain requests)
look enough like a sqlite3.Connection that database.py's existing raw-SQL
code — hundreds of conn.execute(sql, params).fetchone()/.fetchall() calls,
dict(row) conversions, RETURNING clauses, ON CONFLICT upserts — works
unchanged whether it's talking to the local SQLite file or to Turso.

Uses plain `requests` against Turso's documented HTTP pipeline API
(https://docs.turso.tech/sdk/http/reference) rather than the official
libsql_client package: that package's sync wrapper (an asyncio loop
wrapped for sync calls) turned out to error unpredictably even on trivial
statements in testing here, including ones with no prior state. The raw
HTTP contract is simple enough that a direct implementation is both more
reliable and easier to reason about than debugging someone else's asyncio
bridge.

Each Python-level execute()/executemany()/executescript() call is its own
HTTP request (no persistent session spanning multiple calls), so each
auto-commits independently; commit()/rollback() are no-ops to match that.
"""
import base64
import requests

_TIMEOUT = 60


class TursoRow:
    """Mimics sqlite3.Row: index by int or column name, dict()-able, iterable."""
    __slots__ = ("_columns", "_values")

    def __init__(self, columns, values):
        self._columns = columns
        self._values = values

    def __getitem__(self, key):
        if isinstance(key, (int, slice)):
            return self._values[key]
        return self._values[self._columns.index(key)]

    def keys(self):
        return list(self._columns)

    def __iter__(self):
        return iter(self._values)

    def __len__(self):
        return len(self._values)

    def __repr__(self):
        return f"<TursoRow {dict(zip(self._columns, self._values))}>"


class TursoCursor:
    def __init__(self, columns, rows, lastrowid, rowcount):
        self._rows = [TursoRow(columns, tuple(_decode_cell(c) for c in row)) for row in rows]
        self.lastrowid = int(lastrowid) if lastrowid is not None else None
        self.rowcount = rowcount

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0] if self._rows else None


def _encode_param(v):
    if v is None:
        return {"type": "null"}
    if isinstance(v, bool):
        return {"type": "integer", "value": str(int(v))}
    if isinstance(v, int):
        return {"type": "integer", "value": str(v)}
    if isinstance(v, float):
        return {"type": "float", "value": v}
    if isinstance(v, bytes):
        return {"type": "blob", "base64": base64.b64encode(v).decode()}
    return {"type": "text", "value": str(v)}


def _decode_cell(cell):
    t = cell["type"]
    if t == "null":
        return None
    if t == "integer":
        return int(cell["value"])
    if t == "float":
        return float(cell["value"])
    if t == "text":
        return cell["value"]
    if t == "blob":
        return base64.b64decode(cell["base64"])
    return cell.get("value")


class TursoConnection:
    def __init__(self, url, token):
        self._url = url.replace("libsql://", "https://").rstrip("/") + "/v2/pipeline"
        self._headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        self._session = requests.Session()

    def _pipeline(self, stmts):
        if not stmts:
            return []
        payload = {"requests": [{"type": "execute", "stmt": s} for s in stmts] + [{"type": "close"}]}
        resp = self._session.post(self._url, headers=self._headers, json=payload, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        results = []
        for r in data["results"][:len(stmts)]:  # drop the trailing "close" ack
            if r["type"] == "error":
                raise RuntimeError(r.get("error", {}).get("message", f"Turso error: {r}"))
            results.append(r["response"]["result"])
        return results

    def execute(self, sql, params=()):
        stmt = {"sql": sql}
        if params:
            stmt["args"] = [_encode_param(p) for p in params]
        [result] = self._pipeline([stmt])
        cols = [c["name"] for c in result["cols"]]
        return TursoCursor(cols, result["rows"], result.get("last_insert_rowid"), result.get("affected_row_count", 0))

    def executemany(self, sql, seq_of_params):
        stmts = []
        for p in seq_of_params:
            stmt = {"sql": sql}
            if p:
                stmt["args"] = [_encode_param(x) for x in p]
            stmts.append(stmt)
        # Chunk to keep each HTTP request/response a reasonable size.
        CHUNK = 200
        for i in range(0, len(stmts), CHUNK):
            self._pipeline(stmts[i:i + CHUNK])

    def executescript(self, script):
        self._pipeline([{"sql": s} for s in _split_statements(script)])

    def commit(self):
        pass  # each call already committed independently over HTTP

    def rollback(self):
        pass  # nothing to roll back — see module docstring

    def close(self):
        pass  # keep the shared session's connection pool alive across requests


def _split_statements(script):
    """Split a SQL script into individual statements. Strips '--' line
    comments first — the schema in database.py's docstring-style comments
    are plain English prose that can contain semicolons as punctuation
    (e.g. "takes minutes; each step..."), which a naive split on ';' would
    wrongly treat as a statement boundary. No semicolons appear inside any
    string literal in this schema, so a plain split after that is safe."""
    no_comments = "\n".join(line.split("--", 1)[0] for line in script.splitlines())
    for stmt in no_comments.split(";"):
        stmt = stmt.strip()
        if stmt:
            yield stmt


_connection = None


def connect(url, auth_token):
    """One TursoConnection (and its underlying requests.Session/connection
    pool) per warm serverless instance, reused across requests."""
    global _connection
    if _connection is None:
        _connection = TursoConnection(url, auth_token)
    return _connection
