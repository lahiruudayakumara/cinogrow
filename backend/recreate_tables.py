#!/usr/bin/env python3
"""
Script to drop and recreate database tables with correct schema
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from sqlmodel import SQLModel
from app.database import engine
from app.models.yield_weather.farm import Farm, Plot, FarmActivity, PlantingRecord
from app.models.yield_weather.weather import WeatherRecord

def recreate_tables():
    print("🔄 Dropping and recreating database tables...")
    
    try:
        # Drop all tables
        SQLModel.metadata.drop_all(engine)
        print("✅ Dropped existing tables")
        
        # Create all tables
        SQLModel.metadata.create_all(engine)
        print("✅ Created new tables with correct schema")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    recreate_tables()