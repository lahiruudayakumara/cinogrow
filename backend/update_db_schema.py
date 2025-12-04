#!/usr/bin/env python3
"""Database schema update script"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def update_database_schema():
    """Update database schema with missing columns"""
    
    # Build database URL (using correct env vars)
    db_user = os.getenv('POSTGRES_USER', 'postgres')
    db_password = os.getenv('POSTGRES_PASSWORD', 'Password123!')
    db_host = os.getenv('POSTGRES_HOST', 'localhost')
    db_port = os.getenv('POSTGRES_PORT', '5432')
    db_name = os.getenv('POSTGRES_DB', 'postgres')
    
    database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    try:
        # Create engine
        engine = create_engine(database_url, echo=True)
        
        # SQL commands
        sql_commands = [
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PREPARING';",
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS planting_date TIMESTAMP;",
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS expected_harvest_date TIMESTAMP;", 
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS age_months INTEGER;",
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;",
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS total_trees INTEGER;",
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS stem_diameter_mm FLOAT;",
            "ALTER TABLE plots ADD COLUMN IF NOT EXISTS hybrid_yield_estimate FLOAT;"
        ]
        
        with engine.connect() as conn:
            for sql in sql_commands:
                print(f"Executing: {sql}")
                result = conn.execute(text(sql))
                conn.commit()
                print(f"✅ Success")
                
        print(f"\n🎉 Database schema updated successfully!")
        
    except Exception as e:
        print(f"❌ Error updating database schema: {e}")
        sys.exit(1)

if __name__ == "__main__":
    update_database_schema()