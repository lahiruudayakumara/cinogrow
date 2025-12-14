"""Add CASCADE foreign key constraints for proper relationship management

Revision ID: cascade_fk_001
Revises: 07fa7e129ca8
Create Date: 2025-12-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'cascade_fk_001'
down_revision = '07fa7e129ca8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing foreign key constraints and recreate with CASCADE
    
    # 1. plots table - farm_id foreign key with CASCADE
    op.drop_constraint('plots_farm_id_fkey', 'plots', type_='foreignkey')
    op.create_foreign_key(
        'plots_farm_id_fkey', 
        'plots', 
        'farms', 
        ['farm_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # 2. planting_records table - plot_id foreign key with CASCADE
    op.drop_constraint('planting_records_plot_id_fkey', 'planting_records', type_='foreignkey')
    op.create_foreign_key(
        'planting_records_plot_id_fkey',
        'planting_records', 
        'plots', 
        ['plot_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # 3. user_yield_records table - plot_id foreign key with CASCADE
    op.drop_constraint('user_yield_records_plot_id_fkey', 'user_yield_records', type_='foreignkey')
    op.create_foreign_key(
        'user_yield_records_plot_id_fkey',
        'user_yield_records', 
        'plots', 
        ['plot_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # 4. yield_predictions table - plot_id foreign key with CASCADE
    op.drop_constraint('yield_predictions_plot_id_fkey', 'yield_predictions', type_='foreignkey')
    op.create_foreign_key(
        'yield_predictions_plot_id_fkey',
        'yield_predictions', 
        'plots', 
        ['plot_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # 5. trees table - plot_id foreign key with CASCADE
    op.drop_constraint('trees_plot_id_fkey', 'trees', type_='foreignkey')
    op.create_foreign_key(
        'trees_plot_id_fkey',
        'trees', 
        'plots', 
        ['plot_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # 6. farm_activities table - farm_id and plot_id foreign keys with CASCADE
    op.drop_constraint('farm_activities_farm_id_fkey', 'farm_activities', type_='foreignkey')
    op.create_foreign_key(
        'farm_activities_farm_id_fkey',
        'farm_activities', 
        'farms', 
        ['farm_id'], 
        ['id'], 
        ondelete='CASCADE'
    )
    
    # plot_id in farm_activities is optional, so SET NULL on cascade
    op.drop_constraint('farm_activities_plot_id_fkey', 'farm_activities', type_='foreignkey')
    op.create_foreign_key(
        'farm_activities_plot_id_fkey',
        'farm_activities', 
        'plots', 
        ['plot_id'], 
        ['id'], 
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Revert to original foreign key constraints without CASCADE
    
    # plots table
    op.drop_constraint('plots_farm_id_fkey', 'plots', type_='foreignkey')
    op.create_foreign_key('plots_farm_id_fkey', 'plots', 'farms', ['farm_id'], ['id'])
    
    # planting_records table
    op.drop_constraint('planting_records_plot_id_fkey', 'planting_records', type_='foreignkey')
    op.create_foreign_key('planting_records_plot_id_fkey', 'planting_records', 'plots', ['plot_id'], ['id'])
    
    # user_yield_records table
    op.drop_constraint('user_yield_records_plot_id_fkey', 'user_yield_records', type_='foreignkey')
    op.create_foreign_key('user_yield_records_plot_id_fkey', 'user_yield_records', 'plots', ['plot_id'], ['id'])
    
    # yield_predictions table
    op.drop_constraint('yield_predictions_plot_id_fkey', 'yield_predictions', type_='foreignkey')
    op.create_foreign_key('yield_predictions_plot_id_fkey', 'yield_predictions', 'plots', ['plot_id'], ['id'])
    
    # trees table
    op.drop_constraint('trees_plot_id_fkey', 'trees', type_='foreignkey')
    op.create_foreign_key('trees_plot_id_fkey', 'trees', 'plots', ['plot_id'], ['id'])
    
    # farm_activities table
    op.drop_constraint('farm_activities_farm_id_fkey', 'farm_activities', type_='foreignkey')
    op.create_foreign_key('farm_activities_farm_id_fkey', 'farm_activities', 'farms', ['farm_id'], ['id'])
    
    op.drop_constraint('farm_activities_plot_id_fkey', 'farm_activities', type_='foreignkey')
    op.create_foreign_key('farm_activities_plot_id_fkey', 'farm_activities', 'plots', ['plot_id'], ['id'])