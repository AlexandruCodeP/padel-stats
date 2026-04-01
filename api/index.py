"""
Vercel serverless entry point — exposes the FastAPI app as an ASGI handler.
"""
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# Set environment for Vercel
os.environ.setdefault("ENVIRONMENT", "production")

from main import app  # noqa: E402
