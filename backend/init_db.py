#!/usr/bin/env python3
"""
Database initialization script
Creates tables and adds sample data
"""
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from .env file BEFORE importing database
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from sqlmodel import Session
from app.db.session import engine, create_db_and_tables
from app.models.farm import Farm, Plot, PlotStatus


def init_database():
    """Initialize database with tables and sample data"""
    print("🚀 Initializing Cinogrow database...")
    
    # Create tables
    create_db_and_tables()
    print("✅ Database tables created")
    
    # Add sample data
    with Session(engine) as session:
        # Check if we already have sample data
        existing_farms = session.query(Farm).first()
        if existing_farms:
            print("ℹ️  Sample data already exists, skipping...")
            return
        
        # Create sample farm
        sample_farm = Farm(
            name="Udari's Cinnamon Farm",
            owner_name="Udari Kumara",
            total_area=5.2,
            location="Matale, Sri Lanka",
            latitude=7.4675,
            longitude=80.6234,
            created_at=datetime.utcnow()
        )
        session.add(sample_farm)
        session.commit()
        session.refresh(sample_farm)
        
        # Create sample plots
        plot_a = Plot(
            farm_id=sample_farm.id,
            name="Plot A",
            area=2.8,
            status=PlotStatus.GROWING,
            crop_type="Cinnamon",
            planting_date=datetime.utcnow() - timedelta(days=365),  # 12 months ago
            age_months=12,
            progress_percentage=65,
            notes="Young plants in good condition"
        )
        
        plot_b = Plot(
            farm_id=sample_farm.id,
            name="Plot B",
            area=2.4,
            status=PlotStatus.MATURE,
            crop_type="Cinnamon",
            planting_date=datetime.utcnow() - timedelta(days=1095),  # 3 years ago
            age_months=36,
            progress_percentage=100,
            notes="Mature plants ready for harvest"
        )
        
        session.add(plot_a)
        session.add(plot_b)
        session.commit()
        
        print(f"✅ Sample farm '{sample_farm.name}' created with 2 plots")
        print(f"   - {plot_a.name}: {plot_a.status} ({plot_a.progress_percentage}%)")
        print(f"   - {plot_b.name}: {plot_b.status} ({plot_b.progress_percentage}%)")


if __name__ == "__main__":
    init_database()
    print("🎉 Database initialization completed!")
