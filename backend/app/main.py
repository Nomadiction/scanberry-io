"""ScanBerry.io — FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.services.pipeline import pipeline
from app.services.storage import storage

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("scanberry")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables + load ML models. Shutdown: cleanup."""
    logger.info("Starting ScanBerry.io backend (env=%s, device=%s)", settings.app_env, settings.device)

    # Database
    if not settings.is_production:
        await init_db()
        logger.info("Database tables ensured (dev mode)")

    # ML models
    status = pipeline.load_models()
    logger.info("ML models loaded: %s", status)

    yield

    # Cleanup
    await storage.close()
    logger.info("Shutting down ScanBerry.io backend")


app = FastAPI(
    title="ScanBerry.io API",
    description=(
        "REST API for automated assessment of blueberry plant health using "
        "deep learning. Upload a photo and receive detection, classification, "
        "segmentation, and damage quantification results."
    ),
    version="2.6.7",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — explicit origins from CORS_ORIGINS plus optional regex for SWA previews
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register routers ---
from app.api.health import router as health_router
from app.api.analyze import router as analyze_router
from app.api.results import router as results_router

app.include_router(health_router, prefix=settings.api_v1_prefix)
app.include_router(analyze_router, prefix=settings.api_v1_prefix)
app.include_router(results_router, prefix=settings.api_v1_prefix)


@app.get("/", tags=["system"])
async def root():
    return {
        "service": "ScanBerry.io",
        "version": "2.6.7",
        "docs": "/docs",
    }
