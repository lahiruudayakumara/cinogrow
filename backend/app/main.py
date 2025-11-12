from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

# Import database
from app.database import create_db_and_tables

# Import routers
from app.routers.fertilizer.fertilizer_detection import router as fertilizer_router
# from app.routers.fertilizer.ml_metadata_api import router as ml_metadata_router

# Create FastAPI app
app = FastAPI(
    title='Cinogrow Backend',
    description='Backend API for Cinogrow farming application',
    version='1.0.0'
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Create upload directories if they don't exist
Path('uploads/fertilizer_analysis').mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount('/uploads', StaticFiles(directory='uploads'), name='uploads')

# Include routers
app.include_router(fertilizer_router, prefix='/api/v1/fertilizer')
# app.include_router(ml_metadata_router, prefix='/api/v1')

# Create database tables on startup
@app.on_event('startup')
async def startup_event():
    create_db_and_tables()

@app.get('/')
async def root():
    return {
        'message': 'Welcome to Cinogrow Backend API',
        'version': '1.0.0'
    }

@app.get('/health')
async def health_check():
    return {
        'status': 'healthy',
        'message': 'Cinogrow Backend API is running'
    }
