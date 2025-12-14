"""Add computed fields to plots table for auto-managed data

Revision ID: plot_computed_fields_001
Revises: cascade_fk_001
Create Date: 2025-12-03 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'plot_computed_fields_001'
down_revision = 'cascade_fk_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add computed fields to plots table that will be auto-managed by service layer
    
    # Last planting/yield dates
    op.add_column('plots', sa.Column('last_planting_date', sa.DateTime(), nullable=True))
    op.add_column('plots', sa.Column('last_yield_date', sa.DateTime(), nullable=True))
    
    # Counts for related records
    op.add_column('plots', sa.Column('planting_records_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('plots', sa.Column('yield_records_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('plots', sa.Column('trees_count', sa.Integer(), nullable=False, server_default='0'))
    
    # Yield statistics
    op.add_column('plots', sa.Column('total_yield_kg', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('plots', sa.Column('average_yield_per_harvest', sa.Float(), nullable=True))
    op.add_column('plots', sa.Column('best_yield_kg', sa.Float(), nullable=True))
    
    # Plot health indicators
    op.add_column('plots', sa.Column('health_score', sa.Float(), nullable=True))
    op.add_column('plots', sa.Column('estimated_next_harvest_date', sa.DateTime(), nullable=True))
    
    # Add farms computed fields too
    op.add_column('farms', sa.Column('active_plots_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('farms', sa.Column('total_yield_kg', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('farms', sa.Column('last_activity_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove computed fields
    op.drop_column('plots', 'last_planting_date')
    op.drop_column('plots', 'last_yield_date')
    op.drop_column('plots', 'planting_records_count')
    op.drop_column('plots', 'yield_records_count')
    op.drop_column('plots', 'trees_count')
    op.drop_column('plots', 'total_yield_kg')
    op.drop_column('plots', 'average_yield_per_harvest')
    op.drop_column('plots', 'best_yield_kg')
    op.drop_column('plots', 'health_score')
    op.drop_column('plots', 'estimated_next_harvest_date')
    
    op.drop_column('farms', 'active_plots_count')
    op.drop_column('farms', 'total_yield_kg')
    op.drop_column('farms', 'last_activity_date')