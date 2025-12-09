#!/usr/bin/env python3
"""
Startup script for Cinogrow FastAPI backend server
"""
import os
import sys
from pathlib import Path
import uvicorn
from dotenv import load_dotenv

# Load environment variables from root directory first
root_env = Path(__file__).parent.parent / ".env"
if root_env.exists():
    load_dotenv(root_env)

# Then load from backend directory (overrides root if exists)
load_dotenv()

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

if __name__ == "__main__":
    # Set required environment variables if not already set
    if not os.getenv("OPENWEATHER_API_KEY"):
        os.environ["OPENWEATHER_API_KEY"] = "26d881253eab0efa434216cc5d9f5409"
    
    # Ensure DATABASE_URL is set for AWS connection
    if not os.getenv("DATABASE_URL"):
        postgres_user = os.getenv("POSTGRES_USER", "postgres")
        postgres_pass = os.getenv("POSTGRES_PASSWORD", "")
        postgres_host = os.getenv("POSTGRES_HOST", "localhost")
        postgres_db = os.getenv("POSTGRES_DB", "postgres")
        postgres_port = os.getenv("POSTGRES_PORT", "5432")
        
        os.environ["DATABASE_URL"] = f"postgresql://{postgres_user}:{postgres_pass}@{postgres_host}:{postgres_port}/{postgres_db}"
        print(f"📊 Database URL: postgresql://{postgres_user}:****@{postgres_host}:{postgres_port}/{postgres_db}")
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
