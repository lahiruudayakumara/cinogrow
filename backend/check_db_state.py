#!/usr/bin/env python3
"""
Check current database migration state and look for potential conflicts
"""
import sys
import os
sys.path.append('.')

from sqlalchemy import text, inspect
from app.db.session import engine

def check_current_migration():
    """Check the current migration version"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version ORDER BY version_num DESC LIMIT 1;"))
            row = result.fetchone()
            if row:
                print(f"✅ Current migration version: {row[0]}")
                return row[0]
            else:
                print("❌ No migration version found in database")
                return None
    except Exception as e:
        print(f"❌ Error checking migration version: {e}")
        return None

def check_table_exists(table_name):
    """Check if a table exists in the database"""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        exists = table_name in tables
        print(f"{'✅' if exists else '❌'} Table '{table_name}' {'exists' if exists else 'does not exist'}")
        return exists
    except Exception as e:
        print(f"❌ Error checking table '{table_name}': {e}")
        return False

def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    try:
        inspector = inspect(engine)
        columns = inspector.get_columns(table_name)
        column_names = [col['name'] for col in columns]
        exists = column_name in column_names
        print(f"{'✅' if exists else '❌'} Column '{table_name}.{column_name}' {'exists' if exists else 'does not exist'}")
        return exists
    except Exception as e:
        print(f"❌ Error checking column '{table_name}.{column_name}': {e}")
        return False

def check_foreign_key_constraints():
    """Check existing foreign key constraints"""
    try:
        inspector = inspect(engine)
        
        # Check plots table foreign keys
        if check_table_exists('plots'):
            fks = inspector.get_foreign_keys('plots')
            print(f"\n📋 Foreign keys on 'plots' table:")
            for fk in fks:
                print(f"  - {fk['name']}: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        
        # Check trees table foreign keys
        if check_table_exists('trees'):
            fks = inspector.get_foreign_keys('trees')
            print(f"\n📋 Foreign keys on 'trees' table:")
            for fk in fks:
                print(f"  - {fk['name']}: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        
        # Check yield_records table foreign keys
        if check_table_exists('yield_records'):
            fks = inspector.get_foreign_keys('yield_records')
            print(f"\n📋 Foreign keys on 'yield_records' table:")
            for fk in fks:
                print(f"  - {fk['name']}: {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
        
        return True
    except Exception as e:
        print(f"❌ Error checking foreign keys: {e}")
        return False

def main():
    print("🔍 Checking database state for migration safety...\n")
    
    # Check current migration
    current_version = check_current_migration()
    
    print("\n🏗️ Checking existing table structure:")
    
    # Check core tables
    farms_exists = check_table_exists('farms')
    plots_exists = check_table_exists('plots')
    trees_exists = check_table_exists('trees')
    yield_records_exists = check_table_exists('yield_records')
    planting_records_exists = check_table_exists('planting_records')
    
    print("\n🔧 Checking for new columns that will be added:")
    
    # Check for columns that our migration will add
    if plots_exists:
        check_column_exists('plots', 'total_trees')
        check_column_exists('plots', 'last_planting_date')
        check_column_exists('plots', 'last_harvest_date')
        check_column_exists('plots', 'average_tree_age')
        check_column_exists('plots', 'total_yield_to_date')
    
    if trees_exists:
        check_column_exists('trees', 'stem_diameter_mm')
        check_column_exists('trees', 'hybrid_yield_estimate')
    
    # Check if hybrid yield table already exists
    hybrid_yield_exists = check_table_exists('hybrid_yield_results')
    
    print("\n🔗 Checking foreign key constraints:")
    check_foreign_key_constraints()
    
    print("\n🚦 Migration Safety Assessment:")
    
    conflicts = []
    
    # Check for potential conflicts
    if current_version == "hybrid_yield_fields_001":
        print("⚠️  Database is already at the latest migration version")
        conflicts.append("Already up to date")
    
    if hybrid_yield_exists:
        print("⚠️  hybrid_yield_results table already exists")
        conflicts.append("Hybrid yield table exists")
    
    # Check if columns already exist
    if plots_exists:
        with engine.connect() as conn:
            try:
                result = conn.execute(text("SELECT total_trees FROM plots LIMIT 1;"))
                print("⚠️  Column 'plots.total_trees' already exists")
                conflicts.append("total_trees column exists")
            except:
                pass  # Column doesn't exist, which is good
            
            try:
                result = conn.execute(text("SELECT stem_diameter_mm FROM trees LIMIT 1;"))
                print("⚠️  Column 'trees.stem_diameter_mm' already exists")
                conflicts.append("stem_diameter_mm column exists")
            except:
                pass  # Column doesn't exist, which is good
    
    print(f"\n{'🟢 SAFE' if not conflicts else '🟡 CAUTION'} to run migration:")
    if conflicts:
        print("  Potential issues detected:")
        for conflict in conflicts:
            print(f"    - {conflict}")
        print("  You may need to run 'alembic downgrade' first or resolve conflicts manually")
    else:
        print("  No conflicts detected. Migration should run safely.")
    
    print(f"\nNext steps:")
    if not conflicts:
        print("  1. Run: alembic upgrade head")
        print("  2. Run: python migrate_computed_fields.py")
    else:
        print("  1. Review conflicts above")
        print("  2. Consider running: alembic downgrade <previous_version>")
        print("  3. Then: alembic upgrade head")

if __name__ == "__main__":
    main()