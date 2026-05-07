"""
Authentication module — JWT utilities and register/login/me endpoints.
"""
from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings
from database import get_db

# ── Crypto helpers ────────────────────────────────────────────────────────────

ALGORITHM = "HS256"

bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int, email: str, name: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.access_token_expire_days)
    payload = {"sub": str(user_id), "email": email, "name": name, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


# ── Auth dependency ───────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalide")
        return {"id": int(user_id), "email": payload.get("email"), "name": payload.get("name")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
def register(req: RegisterRequest):
    if len(req.name.strip()) < 2:
        raise HTTPException(status_code=422, detail="Nom trop court")
    if "@" not in req.email or "." not in req.email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Email invalide")
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Mot de passe trop court (8 caractères minimum)")

    email = req.email.strip().lower()
    name = req.name.strip()

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email déjà utilisé")

        hashed = hash_password(req.password)
        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?,?,?) RETURNING id",
            (name, email, hashed),
        )
        user_id = cur.fetchone()["id"]

    token = create_access_token(user_id, email, name)
    return {"token": token, "user": {"id": user_id, "email": email, "name": name}}


@router.post("/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()

    with get_db() as conn:
        user = conn.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email=?",
            (email,),
        ).fetchone()

    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token(user["id"], user["email"], user["name"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user
