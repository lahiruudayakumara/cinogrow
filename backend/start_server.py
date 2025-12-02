#!/usr/bin/env python3
"""
Startup script for Cinogrow FastAPI backend server
"""
import os
import sys
from pathlib import Path
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

if __name__ == "__main__":
    # Set required environment variables if not already set
    if not os.getenv("OPENWEATHER_API_KEY"):
        os.environ["OPENWEATHER_API_KEY"] = "26d881253eab0efa434216cc5d9f5409"
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
