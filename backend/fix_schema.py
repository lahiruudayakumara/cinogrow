#!/usr/bin/env python3
"""Update database schema using the app's existing connection"""

import sys
import os

# Add the current directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

def update_schema():
    """Update database schema with missing columns"""
    
    # SQL commands to add missing columns
    sql_commands = [
        # Farms table columns
        "ALTER TABLE farms ADD COLUMN IF NOT EXISTS active_plots_count INTEGER DEFAULT 0;",
        "ALTER TABLE farms ADD COLUMN IF NOT EXISTS total_yield_kg FLOAT DEFAULT 0.0;",
        "ALTER TABLE farms ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP;",
        
        # Plots table columns
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PREPARING';",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS planting_date TIMESTAMP;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS expected_harvest_date TIMESTAMP;", 
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS age_months INTEGER;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS total_trees INTEGER;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS stem_diameter_mm FLOAT;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS hybrid_yield_estimate FLOAT;",
        # Add computed fields for plots
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS last_planting_date TIMESTAMP;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS last_yield_date TIMESTAMP;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS planting_records_count INTEGER DEFAULT 0;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS yield_records_count INTEGER DEFAULT 0;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS trees_count INTEGER DEFAULT 0;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS total_yield_kg FLOAT DEFAULT 0.0;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS average_yield_per_harvest FLOAT;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS best_yield_kg FLOAT;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS health_score FLOAT;",
        "ALTER TABLE plots ADD COLUMN IF NOT EXISTS estimated_next_harvest_date TIMESTAMP;",
        
        # Trees table columns for hybrid yield
        "ALTER TABLE trees ADD COLUMN IF NOT EXISTS stem_diameter_mm FLOAT;",
        "ALTER TABLE trees ADD COLUMN IF NOT EXISTS hybrid_yield_estimate FLOAT;",
        "ALTER TABLE trees ADD COLUMN IF NOT EXISTS tree_age_years INTEGER;",
        "ALTER TABLE trees ADD COLUMN IF NOT EXISTS stem_count INTEGER DEFAULT 1;",
        "ALTER TABLE trees ADD COLUMN IF NOT EXISTS variety VARCHAR(100) DEFAULT 'Ceylon';"
    ]
    
    try:
        with engine.connect() as conn:
            for sql in sql_commands:
                print(f"Executing: {sql}")
                conn.execute(text(sql))
                conn.commit()
                print(f"✅ Success")
                
        print(f"\n🎉 Database schema updated successfully!")
        
    except Exception as e:
        print(f"❌ Error updating database schema: {e}")
        return False
        
    return True

if __name__ == "__main__":
    if update_schema():
        print("Schema update completed!")
    else:
        print("Schema update failed!")
        sys.exit(1)