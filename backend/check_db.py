#!/usr/bin/env python3
"""Check database tables and create missing ones"""

from app.database import engine, create_db_and_tables
from sqlmodel import text, SQLModel
from app.models.yield_weather.farm_assistance import ActivityHistory
import sys

def check_database():
    """Check if tables exist and create if missing"""
    try:
        print("🔍 Checking database connection...")
        
        # Check if activity_history table exists
        with engine.begin() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_history'"))
            tables = result.fetchall()
            
            if len(tables) > 0:
                print("✅ activity_history table exists")
                
                # Check table structure
                result = conn.execute(text("PRAGMA table_info(activity_history)"))
                columns = result.fetchall()
                print(f"📋 Table has {len(columns)} columns:")
                for col in columns:
                    print(f"   - {col[1]} ({col[2]})")
                    
            else:
                print("❌ activity_history table does not exist")
                print("🔧 Creating tables...")
                
                # Create all tables
                SQLModel.metadata.create_all(engine)
                print("✅ Tables created successfully")
                
                # Verify creation
                with engine.begin() as conn2:
                    result = conn2.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_history'"))
                    tables = result.fetchall()
                    if len(tables) > 0:
                        print("✅ activity_history table created successfully")
                    else:
                        print("❌ Failed to create activity_history table")
                        
        # Test connection to the farm assistance API endpoint
        print("\n🧪 Testing basic database operations...")
        
        # Try to count existing records
        with engine.begin() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM activity_history"))
            count = result.fetchone()
            print(f"📊 Activity history records: {count[0] if count else 0}")
            
        print("\n✅ Database check completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return False

if __name__ == "__main__":
    success = check_database()
    sys.exit(0 if success else 1)