"""add_cascade_delete_to_foreign_keys

Revision ID: fa930909db28
Revises: a1fdf7e7fcf3
Create Date: 2025-12-14 12:29:21.073465

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fa930909db28'
down_revision = 'a1fdf7e7fcf3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add CASCADE delete to all foreign key constraints referencing farms and plots.
    This ensures that when a farm or plot is deleted, all related records are automatically deleted.
    """
    
    # List of tables and their foreign keys that need CASCADE delete
    tables_with_foreign_keys = [
        # Tables referencing farms.id
        ('plots', 'plots_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('farm_activities', 'farm_activities_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('fertilizer_applications', 'fertilizer_applications_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('fertilizer_schedules', 'fertilizer_schedules_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('fertilizer_recommendations', 'fertilizer_recommendations_farm_id_fkey', 'farm_id', 'farms', 'id'),
        
        # Tables referencing plots.id
        ('planting_records', 'planting_records_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('farm_activities', 'farm_activities_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('trees', 'trees_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('user_yield_records', 'user_yield_records_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('yield_predictions', 'yield_predictions_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('hybrid_yield_results', 'hybrid_yield_results_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('activity_history', 'activity_history_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('fertilizer_applications', 'fertilizer_applications_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('fertilizer_schedules', 'fertilizer_schedules_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('fertilizer_recommendations', 'fertilizer_recommendations_plot_id_fkey', 'plot_id', 'plots', 'id'),
    ]
    
    # Drop and recreate each foreign key with CASCADE delete
    for table_name, constraint_name, column_name, ref_table, ref_column in tables_with_foreign_keys:
        # Check if the constraint exists before trying to drop it
        # Some constraints might not exist depending on the database state
        op.execute(f"""
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = '{constraint_name}' 
                    AND table_name = '{table_name}'
                ) THEN
                    ALTER TABLE {table_name} DROP CONSTRAINT {constraint_name};
                END IF;
            END $$;
        """)
        
        # Add the foreign key with CASCADE delete
        op.execute(f"""
            ALTER TABLE {table_name}
            ADD CONSTRAINT {constraint_name}
            FOREIGN KEY ({column_name})
            REFERENCES {ref_table} ({ref_column})
            ON DELETE CASCADE;
        """)


def downgrade() -> None:
    """
    Remove CASCADE delete from foreign key constraints.
    Reverts to the original behavior (RESTRICT or NO ACTION).
    """
    
    # List of tables and their foreign keys to revert
    tables_with_foreign_keys = [
        # Tables referencing farms.id
        ('plots', 'plots_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('farm_activities', 'farm_activities_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('fertilizer_applications', 'fertilizer_applications_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('fertilizer_schedules', 'fertilizer_schedules_farm_id_fkey', 'farm_id', 'farms', 'id'),
        ('fertilizer_recommendations', 'fertilizer_recommendations_farm_id_fkey', 'farm_id', 'farms', 'id'),
        
        # Tables referencing plots.id
        ('planting_records', 'planting_records_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('farm_activities', 'farm_activities_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('trees', 'trees_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('user_yield_records', 'user_yield_records_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('yield_predictions', 'yield_predictions_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('hybrid_yield_results', 'hybrid_yield_results_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('activity_history', 'activity_history_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('fertilizer_applications', 'fertilizer_applications_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('fertilizer_schedules', 'fertilizer_schedules_plot_id_fkey', 'plot_id', 'plots', 'id'),
        ('fertilizer_recommendations', 'fertilizer_recommendations_plot_id_fkey', 'plot_id', 'plots', 'id'),
    ]
    
    # Drop and recreate each foreign key without CASCADE
    for table_name, constraint_name, column_name, ref_table, ref_column in tables_with_foreign_keys:
        op.execute(f"""
            DO $$ 
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = '{constraint_name}' 
                    AND table_name = '{table_name}'
                ) THEN
                    ALTER TABLE {table_name} DROP CONSTRAINT {constraint_name};
                END IF;
            END $$;
        """)
        
        # Add the foreign key without CASCADE (default behavior)
        op.execute(f"""
            ALTER TABLE {table_name}
            ADD CONSTRAINT {constraint_name}
            FOREIGN KEY ({column_name})
            REFERENCES {ref_table} ({ref_column});
        """)
