"""Add hybrid yield prediction fields and table

Revision ID: hybrid_yield_fields_001
Revises: plot_computed_fields_001
Create Date: 2025-12-03 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'hybrid_yield_fields_001'
down_revision = 'plot_computed_fields_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add fields to plots table for better tracking
    op.add_column('plots', sa.Column('total_trees', sa.Integer(), nullable=True, 
                                    comment='User input required for hybrid yield scaling'))
    
    # Add fields to trees table for ML hybrid predictions
    op.add_column('trees', sa.Column('stem_diameter_mm', sa.Float(), nullable=True,
                                    comment='Required ML input for hybrid yield model'))
    op.add_column('trees', sa.Column('hybrid_yield_estimate', sa.Float(), nullable=True,
                                    comment='Predicted yield contribution from this tree'))
    
    # Add enhanced fields to yield_dataset table for better ML training
    op.add_column('yield_dataset', sa.Column('soil_type', sa.String(length=100), nullable=True))
    op.add_column('yield_dataset', sa.Column('rainfall', sa.Float(), nullable=True,
                                           comment='Annual rainfall in mm'))
    op.add_column('yield_dataset', sa.Column('temperature', sa.Float(), nullable=True,
                                           comment='Average temperature in Celsius'))
    op.add_column('yield_dataset', sa.Column('age_years', sa.Integer(), nullable=True,
                                           comment='Age of cinnamon trees in years'))
    
    # Create hybrid_yield_results table
    op.create_table('hybrid_yield_results',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('plot_id', sa.Integer(), nullable=False),
        sa.Column('total_trees', sa.Integer(), nullable=False),
        sa.Column('ml_yield_tree_level', sa.Float(), nullable=False,
                  comment='Sum of individual predicted yields from the trees table'),
        sa.Column('ml_yield_farm_level', sa.Float(), nullable=False,
                  comment='Predicted yield from the farm-level ML model'),
        sa.Column('final_hybrid_yield', sa.Float(), nullable=False,
                  comment='Average or weighted combination: (tree_model + farm_model) / 2'),
        sa.Column('confidence_score', sa.Float(), nullable=True,
                  comment='Overall prediction confidence (0-1)'),
        sa.Column('tree_model_confidence', sa.Float(), nullable=True,
                  comment='Tree-level model confidence'),
        sa.Column('farm_model_confidence', sa.Float(), nullable=True,
                  comment='Farm-level model confidence'),
        sa.Column('blending_weight_tree', sa.Float(), nullable=True, default=0.5,
                  comment='Weight given to tree model in final prediction'),
        sa.Column('blending_weight_farm', sa.Float(), nullable=True, default=0.5,
                  comment='Weight given to farm model in final prediction'),
        sa.Column('model_versions', sa.Text(), nullable=True,
                  comment='JSON string of model versions used'),
        sa.Column('features_used', sa.Text(), nullable=True,
                  comment='JSON string of features used in prediction'),
        sa.Column('calculated_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['plot_id'], ['plots.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index('ix_hybrid_yield_results_plot_id', 'hybrid_yield_results', ['plot_id'])
    op.create_index('ix_hybrid_yield_results_calculated_at', 'hybrid_yield_results', ['calculated_at'])
    
    # Create indexes on new fields
    op.create_index('ix_trees_stem_diameter_mm', 'trees', ['stem_diameter_mm'])
    op.create_index('ix_yield_dataset_age_years', 'yield_dataset', ['age_years'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_hybrid_yield_results_plot_id', 'hybrid_yield_results')
    op.drop_index('ix_hybrid_yield_results_calculated_at', 'hybrid_yield_results')
    op.drop_index('ix_trees_stem_diameter_mm', 'trees')
    op.drop_index('ix_yield_dataset_age_years', 'yield_dataset')
    
    # Drop hybrid_yield_results table
    op.drop_table('hybrid_yield_results')
    
    # Remove columns from existing tables
    op.drop_column('yield_dataset', 'age_years')
    op.drop_column('yield_dataset', 'temperature')
    op.drop_column('yield_dataset', 'rainfall')
    op.drop_column('yield_dataset', 'soil_type')
    op.drop_column('trees', 'hybrid_yield_estimate')
    op.drop_column('trees', 'stem_diameter_mm')
    op.drop_column('plots', 'total_trees')