"""
Apply remaining computed fields with individual transactions
"""
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import create_engine, Session, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/cinogrow_db")
print(f"Connecting to database: {DATABASE_URL.replace('password', '***')}")

# Create engine
engine = create_engine(DATABASE_URL)

def apply_computed_fields():
    """Apply remaining computed fields with individual transactions"""
    
    changes_applied = []
    
    # Fields to add to farms table
    farm_fields = [
        ("total_trees", "INTEGER DEFAULT 0"),
        ("last_planting_date", "DATE"),
        ("avg_yield_per_hectare", "FLOAT DEFAULT 0"),
        ("last_updated", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    ]
    
    # Fields to add to plots table
    plot_fields = [
        ("tree_count", "INTEGER DEFAULT 0"),
        ("last_planting_date", "DATE"),
        ("avg_tree_age_months", "FLOAT"),
        ("estimated_yield_kg", "FLOAT DEFAULT 0"),
        ("last_harvest_date", "DATE"),
        ("last_updated", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    ]
    
    # Apply farm fields individually
    for field_name, field_type in farm_fields:
        with Session(engine) as session:
            try:
                session.exec(text(f"ALTER TABLE farms ADD COLUMN {field_name} {field_type}"))
                session.commit()
                changes_applied.append(f"✅ Added {field_name} column to farms")
            except Exception as e:
                session.rollback()
                if "already exists" in str(e).lower():
                    changes_applied.append(f"ℹ️  {field_name} column already exists in farms")
                else:
                    changes_applied.append(f"❌ Failed to add {field_name} to farms: {e}")
    
    # Apply plot fields individually
    for field_name, field_type in plot_fields:
        with Session(engine) as session:
            try:
                session.exec(text(f"ALTER TABLE plots ADD COLUMN {field_name} {field_type}"))
                session.commit()
                changes_applied.append(f"✅ Added {field_name} column to plots")
            except Exception as e:
                session.rollback()
                if "already exists" in str(e).lower():
                    changes_applied.append(f"ℹ️  {field_name} column already exists in plots")
                else:
                    changes_applied.append(f"❌ Failed to add {field_name} to plots: {e}")
    
    return changes_applied

if __name__ == "__main__":
    print("🔄 Applying remaining computed fields...")
    print("=" * 50)
    
    try:
        changes = apply_computed_fields()
        
        print("\n📋 Computed Fields Results:")
        print("-" * 30)
        for change in changes:
            print(change)
        
        print("\n" + "=" * 50)
        print("✅ Computed fields update completed!")
        
    except Exception as e:
        print(f"\n❌ Computed fields update failed: {e}")
        sys.exit(1)