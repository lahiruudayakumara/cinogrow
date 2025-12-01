import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.logger import get_logger
from dotenv import load_dotenv

load_dotenv()

logger = get_logger("db_logger")

# --------------------------
# PostgreSQL connection details
# --------------------------
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "Password123!")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")

# SQLAlchemy connection string
DATABASE_URL = f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# --------------------------
# Create SQLAlchemy engine
# --------------------------
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True if you want to see all SQL queries
    connect_args={"sslmode": "require"}  # Required for AWS RDS SSL
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --------------------------
# Test connection
# --------------------------
try:
    with engine.connect() as conn:
        logger.info("Connected to PostgreSQL via SQLAlchemy!")
except Exception as e:
    logger.error(f"Connection failed: {e}")

# --------------------------
# FastAPI dependency
# --------------------------
def get_db():
    db = SessionLocal()
    try:
        logger.info("Opening new database session")
        yield db
    finally:
        db.close()
        logger.info("Closed database session")