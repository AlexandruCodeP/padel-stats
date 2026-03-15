# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY frontend/ .
RUN npm run build

# ── Stage 2: Python backend + static frontend ───────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Backend code
COPY backend/main.py backend/database.py backend/config.py backend/auth.py backend/import_data.py ./

# Database (compressed in repo, decompress at build)
COPY backend/padel_stats.db.gz ./
RUN gunzip padel_stats.db.gz

# Frontend static files
COPY --from=frontend-builder /app/frontend/dist ./static

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}
