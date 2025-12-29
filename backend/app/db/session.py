import os
import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, Session
from app.logger import get_logger
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '../../..', '.env'))

logger = get_logger("db_logger")
# --------------------------
# PostgreSQL connection details
# --------------------------
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "Password123!")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")

# PostgreSQL connection string
DATABASE_URL = os.getenv("DATABASE_URL", 
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")

# PostgreSQL connection args
connect_args = {"sslmode": "prefer"}

# --------------------------
# Create SQLAlchemy engine
# --------------------------
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Set to True if you want to see all SQL queries
    connect_args=connect_args
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --------------------------
# Test PostgreSQL connection
# --------------------------
def create_db_and_tables() -> None:
    """
    Create tables on the configured PostgreSQL engine.
    """
    try:
        SQLModel.metadata.create_all(engine)
        logger.info("Database tables created successfully!")
    except Exception as exc:
        logger.error(f"Failed to create database tables: {exc}")
        raise

try:
    with engine.connect() as conn:
        logger.info("Connected to PostgreSQL database!")
except Exception as e:
    logger.error(f"PostgreSQL connection failed: {e}")

# --------------------------
# FastAPI dependencies
# --------------------------
def get_session() -> Generator[Session, None, None]:
    """
    Dependency for FastAPI endpoints using SQLModel Session.
    """
    with Session(engine) as session:
        yield session

def get_db():
    """Database dependency for FastAPI dependency injection (SQLAlchemy style)"""
    db = SessionLocal()
    try:
        logger.info("Opening new database session")
        yield db
    finally:
        db.close()
        logger.info("Closed database session")