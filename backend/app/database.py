import os
import logging
from typing import Generator

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.exc import OperationalError

# Read DB URL (falls back to local sqlite for development)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# sqlite needs special connect args
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# create engine (may point to remote Postgres in production)
engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)


def create_db_and_tables() -> None:
    """
    Attempt to create tables on the configured engine.
    If the primary DB is unreachable, fall back to a local sqlite file for development.
    """
    global engine
    try:
        SQLModel.metadata.create_all(engine)
    except OperationalError as exc:
        logging.warning("Primary database unreachable (%s). Falling back to sqlite dev.db", exc)
        fallback_url = "sqlite:///./dev.db"
        engine = create_engine(fallback_url, echo=True, connect_args={"check_same_thread": False})
        SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI endpoints.
    """
    with Session(engine) as session:
        yield session


# Database dependency for FastAPI
def get_db():
    """Database dependency for FastAPI dependency injection"""
    with Session(engine) as session:
        try:
            yield session
        finally:
            session.close()
