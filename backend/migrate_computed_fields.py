#!/usr/bin/env python3
"""
Migration script to apply cascade logic and computed fields
Run this after creating the Alembic migrations
"""
import sys
import os
from datetime import datetime

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import get_session
from app.models.yield_weather.farm import Farm, Plot, PlantingRecord, UserYieldRecord
from app.models.yield_weather.tree import Tree
from app.services.farm_service import FarmService
from app.services.plot_service import PlotService
from sqlmodel import select


def populate_computed_fields():
    """Populate the new computed fields for existing data"""
    print("🔄 Populating computed fields for existing data...")
    
    with next(get_session()) as db:
        try:
            # Get all farms
            farms = db.exec(select(Farm)).all()
            print(f"📊 Processing {len(farms)} farms...")
            
            farm_service = FarmService(db)
            plot_service = PlotService(db)
            
            for farm in farms:
                print(f"🏭 Processing farm: {farm.name}")
                
                # Get all plots for this farm
                plots = db.exec(select(Plot).where(Plot.farm_id == farm.id)).all()
                
                for plot in plots:
                    print(f"  📍 Processing plot: {plot.name}")
                    
                    # Update plot computed fields
                    _update_plot_computed_fields(db, plot, plot_service)
                
                # Update farm computed fields
                farm_service.recalculate_farm_statistics(farm.id)
                print(f"  ✅ Farm {farm.name} statistics updated")
            
            db.commit()
            print("✅ All computed fields populated successfully!")
            
        except Exception as e:
            print(f"❌ Error populating computed fields: {e}")
            db.rollback()
            raise


def _update_plot_computed_fields(db, plot, plot_service):
    """Update computed fields for a single plot"""
    
    # Get planting records
    planting_records = list(db.exec(
        select(PlantingRecord)
        .where(PlantingRecord.plot_id == plot.id)
        .order_by(PlantingRecord.planted_date.desc())
    ).all())
    
    # Get yield records  
    yield_records = list(db.exec(
        select(UserYieldRecord)
        .where(UserYieldRecord.plot_id == plot.id)
        .order_by(UserYieldRecord.yield_date.desc())
    ).all())
    
    # Get trees
    trees = list(db.exec(select(Tree).where(Tree.plot_id == plot.id)).all())
    
    # Update planting-related fields
    if planting_records:
        latest_planting = planting_records[0]
        plot.last_planting_date = latest_planting.planted_date
        plot.planting_records_count = len(planting_records)
        
        # Update plot age and status if needed
        plot_service._calculate_plot_age_and_harvest(plot, latest_planting.planted_date)
    else:
        plot.planting_records_count = 0
        plot.last_planting_date = None
    
    # Update yield-related fields
    if yield_records:
        plot.yield_records_count = len(yield_records)
        plot.total_yield_kg = sum(record.yield_amount for record in yield_records)
        plot.average_yield_per_harvest = plot.total_yield_kg / len(yield_records)
        plot.best_yield_kg = max(record.yield_amount for record in yield_records)
        plot.last_yield_date = yield_records[0].yield_date
    else:
        plot.yield_records_count = 0
        plot.total_yield_kg = 0.0
        plot.average_yield_per_harvest = None
        plot.best_yield_kg = None
        plot.last_yield_date = None
    
    # Update trees count
    plot.trees_count = len(trees)
    
    plot.updated_at = datetime.utcnow()
    db.add(plot)


if __name__ == "__main__":
    populate_computed_fields()