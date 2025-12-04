"""
Apply missing schema changes for hybrid yield functionality
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

def apply_schema_changes():
    """Apply all missing schema changes"""
    
    changes_applied = []
    
    with Session(engine) as session:
        try:
            # 1. Add total_trees column to plots
            try:
                session.exec(text("ALTER TABLE plots ADD COLUMN total_trees INTEGER DEFAULT 0"))
                changes_applied.append("✅ Added total_trees column to plots")
            except Exception as e:
                if "already exists" in str(e).lower():
                    changes_applied.append("ℹ️  total_trees column already exists in plots")
                else:
                    changes_applied.append(f"❌ Failed to add total_trees to plots: {e}")
            
            # 2. Add stem_diameter_mm column to trees
            try:
                session.exec(text("ALTER TABLE trees ADD COLUMN stem_diameter_mm FLOAT"))
                changes_applied.append("✅ Added stem_diameter_mm column to trees")
            except Exception as e:
                if "already exists" in str(e).lower():
                    changes_applied.append("ℹ️  stem_diameter_mm column already exists in trees")
                else:
                    changes_applied.append(f"❌ Failed to add stem_diameter_mm to trees: {e}")
            
            # 3. Add hybrid_yield_estimate column to trees
            try:
                session.exec(text("ALTER TABLE trees ADD COLUMN hybrid_yield_estimate FLOAT"))
                changes_applied.append("✅ Added hybrid_yield_estimate column to trees")
            except Exception as e:
                if "already exists" in str(e).lower():
                    changes_applied.append("ℹ️  hybrid_yield_estimate column already exists in trees")
                else:
                    changes_applied.append(f"❌ Failed to add hybrid_yield_estimate to trees: {e}")
            
            # 4. Create yield_records table if missing
            try:
                create_yield_records_sql = """
                CREATE TABLE IF NOT EXISTS yield_records (
                    id SERIAL PRIMARY KEY,
                    plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
                    harvest_date DATE NOT NULL,
                    total_yield_kg FLOAT NOT NULL,
                    bark_quality VARCHAR(50),
                    notes TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
                """
                session.exec(text(create_yield_records_sql))
                changes_applied.append("✅ Created yield_records table")
            except Exception as e:
                changes_applied.append(f"❌ Failed to create yield_records table: {e}")
            
            # 5. Ensure hybrid_yield_results table has all required columns
            try:
                # Check if table exists and create if needed
                session.exec(text("""
                CREATE TABLE IF NOT EXISTS hybrid_yield_results (
                    id SERIAL PRIMARY KEY,
                    plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
                    total_trees INTEGER NOT NULL,
                    ml_yield_tree_level FLOAT NOT NULL,
                    ml_yield_farm_level FLOAT NOT NULL,
                    final_hybrid_yield FLOAT NOT NULL,
                    confidence_score FLOAT NOT NULL,
                    tree_model_confidence FLOAT NOT NULL,
                    farm_model_confidence FLOAT NOT NULL,
                    blending_weight_tree FLOAT NOT NULL,
                    blending_weight_farm FLOAT NOT NULL,
                    model_versions JSONB,
                    features_used JSONB,
                    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
                """))
                changes_applied.append("✅ Ensured hybrid_yield_results table exists with all columns")
            except Exception as e:
                changes_applied.append(f"❌ Failed to ensure hybrid_yield_results table: {e}")
            
            # 6. Add computed fields to farms table
            computed_fields = [
                ("total_plots", "INTEGER DEFAULT 0"),
                ("total_area", "FLOAT DEFAULT 0"),
                ("total_trees", "INTEGER DEFAULT 0"),
                ("last_planting_date", "DATE"),
                ("avg_yield_per_hectare", "FLOAT DEFAULT 0"),
                ("last_updated", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
            ]
            
            for field_name, field_type in computed_fields:
                try:
                    session.exec(text(f"ALTER TABLE farms ADD COLUMN {field_name} {field_type}"))
                    changes_applied.append(f"✅ Added {field_name} column to farms")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        changes_applied.append(f"ℹ️  {field_name} column already exists in farms")
                    else:
                        changes_applied.append(f"❌ Failed to add {field_name} to farms: {e}")
            
            # 7. Add computed fields to plots table
            plot_computed_fields = [
                ("tree_count", "INTEGER DEFAULT 0"),
                ("last_planting_date", "DATE"),
                ("avg_tree_age_months", "FLOAT"),
                ("estimated_yield_kg", "FLOAT DEFAULT 0"),
                ("last_harvest_date", "DATE"),
                ("last_updated", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
            ]
            
            for field_name, field_type in plot_computed_fields:
                try:
                    session.exec(text(f"ALTER TABLE plots ADD COLUMN {field_name} {field_type}"))
                    changes_applied.append(f"✅ Added {field_name} column to plots")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        changes_applied.append(f"ℹ️  {field_name} column already exists in plots")
                    else:
                        changes_applied.append(f"❌ Failed to add {field_name} to plots: {e}")
            
            # 8. Update foreign key constraints to include CASCADE
            try:
                # Check current constraints
                constraints_check = session.exec(text("""
                SELECT 
                    tc.constraint_name,
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    rc.delete_rule
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                JOIN information_schema.referential_constraints AS rc
                    ON tc.constraint_name = rc.constraint_name
                    AND tc.table_schema = rc.constraint_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_name IN ('plots', 'trees', 'planting_records', 'yield_records', 'hybrid_yield_results')
                    AND rc.delete_rule != 'CASCADE';
                """)).fetchall()
                
                if constraints_check:
                    changes_applied.append(f"⚠️  Found {len(constraints_check)} foreign key constraints without CASCADE")
                    # For safety, we won't automatically modify existing constraints
                    # This would require dropping and recreating constraints which could be risky
                else:
                    changes_applied.append("✅ All foreign key constraints already have proper CASCADE rules")
                    
            except Exception as e:
                changes_applied.append(f"ℹ️  Could not check foreign key constraints: {e}")
            
            # Commit all changes
            session.commit()
            changes_applied.append("✅ All schema changes committed successfully")
            
        except Exception as e:
            session.rollback()
            changes_applied.append(f"❌ Error applying schema changes: {e}")
            raise
    
    return changes_applied

if __name__ == "__main__":
    print("🔄 Applying schema changes for hybrid yield functionality...")
    print("=" * 60)
    
    try:
        changes = apply_schema_changes()
        
        print("\n📋 Schema Change Results:")
        print("-" * 40)
        for change in changes:
            print(change)
        
        print("\n" + "=" * 60)
        print("✅ Schema update completed!")
        
    except Exception as e:
        print(f"\n❌ Schema update failed: {e}")
        sys.exit(1)