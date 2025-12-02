#!/usr/bin/env python3
"""
Debug script to test database and plot creation issues
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_session
from app.models.yield_weather.farm import Farm, Plot, PlotCreate
from sqlmodel import select
from datetime import datetime

def test_database_connection():
    """Test basic database connectivity"""
    print("🔧 Testing Database Connection...")
    
    try:
        db = next(get_session())
        try:
            # Test basic query
            farms = db.exec(select(Farm)).all()
            print(f"✅ Database connection successful. Found {len(farms)} farms.")
            
            for farm in farms:
                print(f"  - Farm {farm.id}: {farm.name} (Owner: {farm.owner_name})")
            
            return farms
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return []

def test_plot_creation_direct():
    """Test plot creation directly with the database"""
    print("\n🏗️  Testing Direct Plot Creation...")
    
    try:
        db = next(get_session())
        try:
            # Get first farm
            farm = db.exec(select(Farm)).first()
            if not farm:
                print("❌ No farms found for testing")
                return False
            
            print(f"Using farm: {farm.name} (ID: {farm.id})")
            
            # Create plot directly
            plot_data = {
                "farm_id": farm.id,
                "name": "Debug Test Plot",
                "area": 1.0,
                "crop_type": "Ceylon Cinnamon",
                "notes": "Debug test",
                "status": "PREPARING",
                "progress_percentage": 0,
                "seedling_count": 0,
                "cinnamon_variety": "Ceylon Cinnamon",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            plot = Plot(**plot_data)
            db.add(plot)
            db.commit()
            db.refresh(plot)
            
            print(f"✅ Plot created successfully: {plot.name} (ID: {plot.id})")
            return True
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Direct plot creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_plot_creation_via_pydantic():
    """Test plot creation using Pydantic model"""
    print("\n📋 Testing Plot Creation via Pydantic...")
    
    try:
        db = next(get_session())
        try:
            # Get first farm
            farm = db.exec(select(Farm)).first()
            if not farm:
                print("❌ No farms found for testing")
                return False
            
            print(f"Using farm: {farm.name} (ID: {farm.id})")
            
            # Create PlotCreate instance
            plot_create = PlotCreate(
                farm_id=farm.id,
                name="Pydantic Test Plot",
                area=1.0,
                crop_type="Ceylon Cinnamon",
                notes="Pydantic test",
                seedling_count=0,
                cinnamon_variety="Ceylon Cinnamon"
            )
            
            print(f"PlotCreate data: {plot_create.model_dump()}")
            
            # Create plot with explicit datetime fields like in the API
            plot_dict = plot_create.model_dump()
            plot_dict['created_at'] = datetime.utcnow()
            plot_dict['updated_at'] = datetime.utcnow()
            
            print(f"Plot dict with timestamps: {plot_dict}")
            
            plot = Plot(**plot_dict)
            db.add(plot)
            db.commit()
            db.refresh(plot)
            
            print(f"✅ Pydantic plot created successfully: {plot.name} (ID: {plot.id})")
            return True
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Pydantic plot creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_plots():
    """Clean up test plots"""
    print("\n🧹 Cleaning up test plots...")
    
    try:
        db = next(get_session())
        try:
            test_plots = db.exec(select(Plot).where(Plot.name.like("%Test Plot%"))).all()
            for plot in test_plots:
                db.delete(plot)
                print(f"  Deleted plot: {plot.name}")
            db.commit()
            print(f"✅ Cleaned up {len(test_plots)} test plots")
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")

if __name__ == "__main__":
    print("🔍 Database and Plot Creation Debug Tool")
    print("=" * 60)
    
    farms = test_database_connection()
    
    if farms:
        success1 = test_plot_creation_direct()
        success2 = test_plot_creation_via_pydantic()
        
        if success1 or success2:
            print("\n✅ Plot creation is working at the database level")
            print("❓ The issue might be in the API endpoint implementation")
        else:
            print("\n❌ Plot creation failing at database level")
            print("❓ Check database schema or model definitions")
        
        cleanup_test_plots()
    else:
        print("\n❌ Cannot test plot creation without farms")
    
    print("\n" + "=" * 60)