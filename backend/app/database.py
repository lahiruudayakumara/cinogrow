import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

# Get database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mydb.db")

# Create database engine with appropriate settings for SQLite or PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        echo=True if os.getenv("DEBUG", "False").lower() == "true" else False,
        connect_args={"check_same_thread": False}
    )
else:
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
