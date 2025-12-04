"""create fertilizer history table

Revision ID: create_fertilizer_history
Revises: 
Create Date: 2025-12-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'create_fertilizer_history'
down_revision = None  # Update this to your latest migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create fertilizer_history table"""
    op.create_table(
        'fertilizer_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('image_filename', sa.String(), nullable=False),
        sa.Column('image_path', sa.String(), nullable=True),
        sa.Column('image_size_bytes', sa.Integer(), nullable=False),
        sa.Column('image_dimensions', sa.String(), nullable=False),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('detections', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('primary_deficiency', sa.String(), nullable=True),
        sa.Column('max_confidence', sa.Float(), nullable=True),
        sa.Column('severity', sa.String(), nullable=True),
        sa.Column('roboflow_output', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('model_type', sa.String(), nullable=False),
        sa.Column('workspace', sa.String(), nullable=False),
        sa.Column('workflow_id', sa.String(), nullable=False),
        sa.Column('analyzed_at', sa.DateTime(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_feedback', sa.Text(), nullable=True),
        sa.Column('is_accurate', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for better query performance
    op.create_index('ix_fertilizer_history_image_filename', 'fertilizer_history', ['image_filename'])
    op.create_index('ix_fertilizer_history_primary_deficiency', 'fertilizer_history', ['primary_deficiency'])
    op.create_index('ix_fertilizer_history_analyzed_at', 'fertilizer_history', ['analyzed_at'])
    op.create_index('ix_fertilizer_history_user_id', 'fertilizer_history', ['user_id'])


def downgrade() -> None:
    """Drop fertilizer_history table"""
    op.drop_index('ix_fertilizer_history_user_id', table_name='fertilizer_history')
    op.drop_index('ix_fertilizer_history_analyzed_at', table_name='fertilizer_history')
    op.drop_index('ix_fertilizer_history_primary_deficiency', table_name='fertilizer_history')
    op.drop_index('ix_fertilizer_history_image_filename', table_name='fertilizer_history')
    op.drop_table('fertilizer_history')
