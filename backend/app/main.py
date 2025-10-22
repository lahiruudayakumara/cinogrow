from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables FIRST before importing anything else
load_dotenv()

# Import database and routers
from app.database import create_db_and_tables
from app.routers.yield_weather import weather, farm, farm_assistance, yield_prediction

app = FastAPI(
    title="Cinogrow Backend",
    description="Backend API for Cinogrow farming application",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Include routers
app.include_router(weather.router, prefix="/api/v1")
app.include_router(farm.router, prefix="/api/v1")
app.include_router(farm_assistance.router, prefix="/api/v1")
app.include_router(yield_prediction.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to Cinogrow Backend API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "Cinogrow Backend API is running",
        "version": "1.0.0"
    }
