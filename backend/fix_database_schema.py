#!/usr/bin/env python3
"""
Apply missing database schema changes that alembic thinks are already applied
"""
import sys
import os
sys.path.append('.')

from sqlalchemy import text
from app.db.session import engine

def apply_missing_schema_changes():
    """Apply the schema changes that should have been applied by migrations"""
    
    print("🔧 Applying missing schema changes to bring database up to date...")
    
    schema_changes = [
        # Add computed fields to plots table
        {
            'name': 'Add total_trees to plots',
            'sql': 'ALTER TABLE plots ADD COLUMN IF NOT EXISTS total_trees INTEGER DEFAULT 0;'
        },
        {
            'name': 'Add last_planting_date to plots',
            'sql': 'ALTER TABLE plots ADD COLUMN IF NOT EXISTS last_planting_date TIMESTAMP;'
        },
        {
            'name': 'Add last_harvest_date to plots',
            'sql': 'ALTER TABLE plots ADD COLUMN IF NOT EXISTS last_harvest_date TIMESTAMP;'
        },
        {
            'name': 'Add average_tree_age to plots',
            'sql': 'ALTER TABLE plots ADD COLUMN IF NOT EXISTS average_tree_age FLOAT DEFAULT 0.0;'
        },
        {
            'name': 'Add total_yield_to_date to plots',
            'sql': 'ALTER TABLE plots ADD COLUMN IF NOT EXISTS total_yield_to_date FLOAT DEFAULT 0.0;'
        },
        
        # Add hybrid yield fields to trees table
        {
            'name': 'Add stem_diameter_mm to trees',
            'sql': 'ALTER TABLE trees ADD COLUMN IF NOT EXISTS stem_diameter_mm FLOAT;'
        },
        {
            'name': 'Add hybrid_yield_estimate to trees',
            'sql': 'ALTER TABLE trees ADD COLUMN IF NOT EXISTS hybrid_yield_estimate FLOAT;'
        },
        
        # Create hybrid_yield_results table if it doesn't exist (but it already does)
        {
            'name': 'Create hybrid_yield_results table',
            'sql': '''
            CREATE TABLE IF NOT EXISTS hybrid_yield_results (
                id SERIAL PRIMARY KEY,
                plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
                total_trees INTEGER NOT NULL,
                ml_yield_tree_level FLOAT NOT NULL,
                ml_yield_farm_level FLOAT NOT NULL,
                final_hybrid_yield FLOAT NOT NULL,
                confidence_score FLOAT NOT NULL DEFAULT 0.0,
                tree_model_confidence FLOAT,
                farm_model_confidence FLOAT,
                blending_weight_tree FLOAT NOT NULL DEFAULT 0.5,
                blending_weight_farm FLOAT NOT NULL DEFAULT 0.5,
                model_versions JSONB,
                features_used JSONB,
                calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            '''
        },
        
        # Add indexes for performance
        {
            'name': 'Add index on hybrid_yield_results plot_id',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_hybrid_yield_results_plot_id ON hybrid_yield_results(plot_id);'
        },
        {
            'name': 'Add index on hybrid_yield_results calculated_at',
            'sql': 'CREATE INDEX IF NOT EXISTS idx_hybrid_yield_results_calculated_at ON hybrid_yield_results(calculated_at);'
        },
    ]
    
    successful_changes = 0
    failed_changes = 0
    
    try:
        with engine.connect() as conn:
            with conn.begin() as trans:
                for change in schema_changes:
                    try:
                        print(f"  📝 {change['name']}...")
                        conn.execute(text(change['sql']))
                        print(f"     ✅ Success")
                        successful_changes += 1
                    except Exception as e:
                        print(f"     ⚠️ Warning: {e}")
                        failed_changes += 1
                        # Continue with other changes even if one fails
                        
                print(f"\n🎉 Schema update completed!")
                print(f"   ✅ {successful_changes} changes applied successfully")
                if failed_changes > 0:
                    print(f"   ⚠️ {failed_changes} changes had warnings (likely already existed)")
    
    except Exception as e:
        print(f"❌ Failed to apply schema changes: {e}")
        return False
    
    return True

def verify_schema_changes():
    """Verify that the schema changes were applied correctly"""
    
    print("\n🔍 Verifying schema changes...")
    
    verification_queries = [
        {
            'name': 'plots.total_trees column',
            'sql': 'SELECT total_trees FROM plots LIMIT 1;'
        },
        {
            'name': 'plots.last_planting_date column',
            'sql': 'SELECT last_planting_date FROM plots LIMIT 1;'
        },
        {
            'name': 'plots.last_harvest_date column',
            'sql': 'SELECT last_harvest_date FROM plots LIMIT 1;'
        },
        {
            'name': 'plots.average_tree_age column',
            'sql': 'SELECT average_tree_age FROM plots LIMIT 1;'
        },
        {
            'name': 'plots.total_yield_to_date column',
            'sql': 'SELECT total_yield_to_date FROM plots LIMIT 1;'
        },
        {
            'name': 'trees.stem_diameter_mm column',
            'sql': 'SELECT stem_diameter_mm FROM trees LIMIT 1;'
        },
        {
            'name': 'trees.hybrid_yield_estimate column',
            'sql': 'SELECT hybrid_yield_estimate FROM trees LIMIT 1;'
        },
        {
            'name': 'hybrid_yield_results table',
            'sql': 'SELECT COUNT(*) FROM hybrid_yield_results;'
        }
    ]
    
    verified = 0
    failed = 0
    
    try:
        with engine.connect() as conn:
            for verification in verification_queries:
                try:
                    result = conn.execute(text(verification['sql']))
                    print(f"  ✅ {verification['name']} - exists and accessible")
                    verified += 1
                except Exception as e:
                    print(f"  ❌ {verification['name']} - failed: {e}")
                    failed += 1
        
        print(f"\n📊 Verification Summary:")
        print(f"   ✅ {verified} schema elements verified")
        if failed > 0:
            print(f"   ❌ {failed} schema elements failed verification")
            return False
        else:
            print(f"   🎉 All schema changes verified successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False

def main():
    print("🚀 Starting manual schema update to fix migration sync issue...")
    
    # Apply missing schema changes
    if not apply_missing_schema_changes():
        print("❌ Failed to apply schema changes")
        sys.exit(1)
    
    # Verify the changes
    if not verify_schema_changes():
        print("❌ Schema verification failed")
        sys.exit(1)
    
    print("\n🎯 Next Steps:")
    print("  1. ✅ Database schema is now up to date")
    print("  2. 🔄 You can run: python migrate_computed_fields.py")
    print("  3. 🧪 Test the hybrid yield prediction APIs")
    print("  4. 📱 Update the mobile app to use new fields")

if __name__ == "__main__":
    main()