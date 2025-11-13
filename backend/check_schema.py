#!/usr/bin/env python3
"""
Check database schema for farms and plots tables
"""

import sqlite3
import os

def check_database_schema():
    """Check the current database schema"""
    
    db_path = "cinogrow_dev.db"
    
    if not os.path.exists(db_path):
        print("❌ Database file not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print("📋 Available tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check farms table if it exists
        if ('farms',) in tables:
            print("\n🏠 Farms table structure:")
            cursor.execute("PRAGMA table_info(farms);")
            columns = cursor.fetchall()
            for col in columns:
                print(f"   - {col[1]} ({col[2]})")
        
        # Check plots table if it exists
        if ('plots',) in tables:
            print("\n🌱 Plots table structure:")
            cursor.execute("PRAGMA table_info(plots);")
            columns = cursor.fetchall()
            for col in columns:
                print(f"   - {col[1]} ({col[2]})")
        
        # Check planting_records table if it exists
        if ('planting_records',) in tables:
            print("\n🌿 Planting records table structure:")
            cursor.execute("PRAGMA table_info(planting_records);")
            columns = cursor.fetchall()
            for col in columns:
                print(f"   - {col[1]} ({col[2]})")
            
            # Show some sample data
            cursor.execute("SELECT * FROM planting_records LIMIT 3;")
            records = cursor.fetchall()
            print(f"\n📊 Sample planting records ({len(records)} found):")
            for record in records:
                print(f"   {record}")
        
        # Check if there's any sample data in farms
        if ('farms',) in tables:
            cursor.execute("SELECT * FROM farms LIMIT 3;")
            farms = cursor.fetchall()
            print(f"\n🏠 Sample farms data ({len(farms)} found):")
            for farm in farms:
                print(f"   {farm}")
        
        # Check if there's any sample data in plots
        if ('plots',) in tables:
            cursor.execute("SELECT * FROM plots LIMIT 3;")
            plots = cursor.fetchall()
            print(f"\n🌱 Sample plots data ({len(plots)} found):")
            for plot in plots:
                print(f"   {plot}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        conn.close()

if __name__ == "__main__":
    check_database_schema()