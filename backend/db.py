"""Database setup — SQLAlchemy engine, session factory, and FastAPI dependency.

This is the first persistent server-side state in Wandr (added in Phase 4 for
user accounts). It uses SQLite by default so there's no infra to run; point
``DATABASE_URL`` at another database to switch.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./wandr.db")

# `check_same_thread` is a SQLite-only flag; FastAPI serves requests across
# threads, so the default single-thread guard would otherwise reject sessions.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    """Create tables for all imported models. Safe to call repeatedly."""
    import models  # noqa: F401  (registers models on Base before create_all)

    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency yielding a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
