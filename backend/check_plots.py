#!/usr/bin/env python3
"""Check what plots exist in the database"""

from app.database import engine
from sqlmodel import text

def check_plots():
    """Check existing plots in the database"""
    try:
        print("🔍 Checking existing plots...")
        
        with engine.begin() as conn:
            # Check if plots table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='plots'"))
            if not result.fetchall():
                print("❌ plots table does not exist")
                return []
                
            # Get all plots
            result = conn.execute(text("SELECT id, name, farm_id, status FROM plots"))
            plots = result.fetchall()
            
            print(f"📊 Found {len(plots)} plots:")
            for plot in plots:
                print(f"   - Plot ID: {plot[0]}, Name: '{plot[1]}', Farm ID: {plot[2]}, Status: {plot[3]}")
            
            return plots
            
    except Exception as e:
        print(f"❌ Error checking plots: {e}")
        return []

def check_farms():
    """Check existing farms in the database"""
    try:
        print("\n🔍 Checking existing farms...")
        
        with engine.begin() as conn:
            # Check if farms table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='farms'"))
            if not result.fetchall():
                print("❌ farms table does not exist")
                return []
                
            # Get all farms
            result = conn.execute(text("SELECT id, name, location FROM farms"))
            farms = result.fetchall()
            
            print(f"📊 Found {len(farms)} farms:")
            for farm in farms:
                print(f"   - Farm ID: {farm[0]}, Name: '{farm[1]}', Location: '{farm[2]}'")
            
            return farms
            
    except Exception as e:
        print(f"❌ Error checking farms: {e}")
        return []

if __name__ == "__main__":
    farms = check_farms()
    plots = check_plots()
    
    if not plots:
        print("\n💡 Solution: The mobile app needs to create farms and plots first, or we need to use demo mode only.")
        print("   Demo mode uses negative plot IDs which should be converted to valid plot ID 1 in the backend.")