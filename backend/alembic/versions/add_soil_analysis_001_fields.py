"""add_soil_analysis_fields

Revision ID: add_soil_analysis_001
Revises: create_fertilizer_history
Create Date: 2026-03-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_soil_analysis_001'
down_revision = 'create_fertilizer_history'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add soil analysis fields to fertilizer_history table"""
    
    # Add analysis_flow column
    op.add_column('fertilizer_history', 
        sa.Column('analysis_flow', sa.String(length=50), nullable=True, server_default='leaf_only')
    )
    op.create_index('ix_fertilizer_history_analysis_flow', 'fertilizer_history', ['analysis_flow'])
    
    # Add soil type column
    op.add_column('fertilizer_history', 
        sa.Column('soil_type', sa.String(length=100), nullable=True)
    )
    op.create_index('ix_fertilizer_history_soil_type', 'fertilizer_history', ['soil_type'])
    
    # Add soil confidence column
    op.add_column('fertilizer_history', 
        sa.Column('soil_confidence', sa.Float(), nullable=True)
    )
    
    # Add soil image path column
    op.add_column('fertilizer_history', 
        sa.Column('soil_image_path', sa.String(length=1000), nullable=True)
    )
    
    # Add soil characteristics JSON column
    op.add_column('fertilizer_history', 
        sa.Column('soil_characteristics', postgresql.JSONB(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    """Remove soil analysis fields from fertilizer_history table"""
    
    op.drop_index('ix_fertilizer_history_soil_type', 'fertilizer_history')
    op.drop_index('ix_fertilizer_history_analysis_flow', 'fertilizer_history')
    
    op.drop_column('fertilizer_history', 'soil_characteristics')
    op.drop_column('fertilizer_history', 'soil_image_path')
    op.drop_column('fertilizer_history', 'soil_confidence')
    op.drop_column('fertilizer_history', 'soil_type')
    op.drop_column('fertilizer_history', 'analysis_flow')
