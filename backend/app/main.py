from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
import platform
import os

# Load environment variables FIRST before importing anything else
load_dotenv(os.path.join(os.path.dirname(__file__), '../..', '.env'))

# Import all models FIRST to ensure they are registered with SQLModel
from app.models.yield_weather.farm import Farm, Plot, FarmActivity, PlantingRecord, UserYieldRecord, YieldPrediction
from app.models.yield_weather.tree import Tree, TreeMeasurement, TreeHarvestRecord
from app.models.yield_weather.weather import WeatherRecord
from app.models.yield_weather.farm_assistance import ActivityHistory
from app.models.yield_weather.hybrid_yield import HybridYieldResult

# Import database and routers
from app.db.session import create_db_and_tables
from app.routers.yield_weather import weather, farm, farm_assistance, hybrid_prediction, hybrid_prediction_storage
from app.routers.hybrid_yield import router as hybrid_yield_router
from app.routers.fertilizer.roboflow_simple import router as roboflow_simple_router
from app.routers import auth

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

# Include routers
app.include_router(oil_yield_router, prefix='/api/v1')  # Oil yield prediction
app.include_router(roboflow_simple_router, prefix='/api/v1')  # Roboflow deficiency detection
app.include_router(weather.router, prefix="/api/v1")  # Weather endpoints at /api/v1/weather/
app.include_router(farm.router, prefix="/api/v1/yield-weather")
app.include_router(farm_assistance.router, prefix="/api/v1/yield-weather")
app.include_router(hybrid_prediction.router, prefix="/api/v1/yield-weather")
app.include_router(hybrid_prediction_storage.router, prefix="/api/v1/yield-weather")
app.include_router(hybrid_yield_router, prefix="/api/v1")  # New hybrid yield endpoints
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
