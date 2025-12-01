import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

# Import all models to ensure they are registered with SQLModel
from app.models import *

# Get database URL from environment variables (PostgreSQL required)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable must be set. Please configure PostgreSQL connection.")

# Create database engine for PostgreSQL
engine = create_engine(
    DATABASE_URL,
    echo=True if os.getenv("DEBUG", "False").lower() == "true" else False,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args={
        "options": "-c timezone=utc"
    }
)


def create_db_and_tables():
    """Create database tables"""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get database session"""
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
