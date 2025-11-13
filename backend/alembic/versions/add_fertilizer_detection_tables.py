"""Add fertilizer deficiency detection tables

Revision ID: add_fertilizer_detection_tables
Revises: f8e4cd409da0
Create Date: 2024-11-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'add_fertilizer_detection_tables'
down_revision: Union[str, None] = 'f8e4cd409da0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create deficiency_analyses table
    op.create_table('deficiency_analyses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('farm_id', sa.Integer(), nullable=True),
        sa.Column('plot_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('leaf_image_path', sa.String(length=1000), nullable=False),
        sa.Column('soil_image_path', sa.String(length=1000), nullable=True),
        sa.Column('primary_deficiency', sa.Enum('nitrogen_deficiency', 'phosphorus_deficiency', 'potassium_deficiency', 'healthy', name='deficiencytype'), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('detected_issues', sa.String(length=1000), nullable=False),
        sa.Column('visual_signs', sa.String(length=1000), nullable=True),
        sa.Column('leaf_nitrogen_percentage', sa.Float(), nullable=True),
        sa.Column('leaf_phosphorus_percentage', sa.Float(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=False, default='v1.0'),
        sa.Column('preprocessing_applied', sa.String(length=500), nullable=True),
        sa.Column('analysis_date', sa.DateTime(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', name='analysisstatus'), nullable=False, default='PENDING'),
        sa.Column('processing_time_seconds', sa.Float(), nullable=True),
        sa.Column('expert_contact_required', sa.Boolean(), nullable=False, default=False),
        sa.Column('expert_notes', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create index on farm_id for deficiency_analyses
    op.create_index('ix_deficiency_analyses_farm_id', 'deficiency_analyses', ['farm_id'], unique=False)
    
    # Create cinnamon_fertilizer_recommendations table
    op.create_table('cinnamon_fertilizer_recommendations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('deficiency_analysis_id', sa.Integer(), nullable=False),
        sa.Column('deficiency_type', sa.Enum('nitrogen_deficiency', 'phosphorus_deficiency', 'potassium_deficiency', 'healthy', name='deficiencytype'), nullable=False),
        sa.Column('inorganic_fertilizer_type', sa.String(length=255), nullable=False),
        sa.Column('inorganic_dosage_per_plant', sa.Float(), nullable=False),
        sa.Column('inorganic_application_method', sa.String(length=500), nullable=False),
        sa.Column('inorganic_frequency', sa.String(length=200), nullable=False),
        sa.Column('inorganic_split_schedule', sa.String(length=500), nullable=True),
        sa.Column('organic_fertilizer_type', sa.String(length=255), nullable=False),
        sa.Column('organic_application_rate', sa.Float(), nullable=False),
        sa.Column('organic_timing', sa.String(length=200), nullable=False),
        sa.Column('application_method_details', sa.String(length=1000), nullable=False),
        sa.Column('best_application_season', sa.String(length=200), nullable=False),
        sa.Column('estimated_cost_per_plant', sa.Float(), nullable=True),
        sa.Column('estimated_cost_per_hectare', sa.Float(), nullable=True),
        sa.Column('research_source', sa.String(length=500), nullable=False, default='Cinnamon Research Center, Matale, Sri Lanka'),
        sa.Column('expert_contact', sa.String(length=100), nullable=False, default='+94 66 224 5463'),
        sa.Column('additional_notes', sa.String(length=1000), nullable=True),
        sa.Column('priority_level', sa.Integer(), nullable=False, default=3),
        sa.Column('action_required_within_days', sa.Integer(), nullable=True),
        sa.Column('is_applied', sa.Boolean(), nullable=False, default=False),
        sa.Column('application_date', sa.DateTime(), nullable=True),
        sa.Column('effectiveness_rating', sa.Integer(), nullable=True),
        sa.Column('user_feedback', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['deficiency_analysis_id'], ['deficiency_analyses.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create image_analysis_logs table
    op.create_table('image_analysis_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=True),
        sa.Column('image_size_bytes', sa.Integer(), nullable=True),
        sa.Column('image_dimensions', sa.String(length=100), nullable=True),
        sa.Column('image_format', sa.String(length=20), nullable=True),
        sa.Column('preprocessing_steps', sa.String(length=500), nullable=True),
        sa.Column('model_used', sa.String(length=100), nullable=False),
        sa.Column('processing_duration_ms', sa.Integer(), nullable=True),
        sa.Column('analysis_success', sa.Boolean(), nullable=False, default=True),
        sa.Column('error_message', sa.String(length=1000), nullable=True),
        sa.Column('confidence_threshold_met', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('image_analysis_logs')
    op.drop_table('cinnamon_fertilizer_recommendations')
    op.drop_index('ix_deficiency_analyses_farm_id', table_name='deficiency_analyses')
    op.drop_table('deficiency_analyses')
    
    # Drop custom enums
    op.execute("DROP TYPE IF EXISTS deficiencytype")
    op.execute("DROP TYPE IF EXISTS analysisstatus")
