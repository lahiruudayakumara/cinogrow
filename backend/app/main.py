from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
import platform
import os
from app.routers import auth
from app.db import Base, engine

# Load environment variables FIRST before importing anything else
load_dotenv()

# Import database and routers
from app.db.session import create_db_and_tables
from app.routers.yield_weather import weather, farm, farm_assistance, yield_prediction
from app.routers.fertilizer.roboflow_simple import router as roboflow_simple_router

# Import your oil yield router
from app.oil_yield.router import router as oil_yield_router

# Create FastAPI app
app = FastAPI(
    title='Cinogrow Backend',
    description='Backend API for Cinogrow farming application',
    version='1.0.0'
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can replace "*" with your frontend URL for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directories if they don't exist
Path('uploads/fertilizer_analysis').mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount('/uploads', StaticFiles(directory='uploads'), name='uploads')

# Create database tables on startup
@app.on_event('startup')
async def startup_event():
    create_db_and_tables()
    Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(oil_yield_router, prefix='/api/v1')  # Oil yield prediction
app.include_router(roboflow_simple_router, prefix='/api/v1')  # Roboflow deficiency detection
app.include_router(weather.router, prefix="/api/v1")
app.include_router(farm.router, prefix="/api/v1")
app.include_router(farm_assistance.router, prefix="/api/v1")
app.include_router(yield_prediction.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")

@app.get('/')
async def root():
    return {
        "message": "Welcome to Cinogrow Backend API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "python_version": platform.python_version(),
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get('/health')
async def health_check():
    return {
        'status': 'healthy',
        'message': 'Cinogrow Backend API is running',
        'version': '1.0.0'
    }
