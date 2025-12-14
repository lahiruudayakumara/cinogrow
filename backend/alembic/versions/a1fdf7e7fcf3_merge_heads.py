"""merge_heads

Revision ID: a1fdf7e7fcf3
Revises: hybrid_yield_fields_001, create_fertilizer_history
Create Date: 2025-12-14 12:29:11.038869

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1fdf7e7fcf3'
down_revision = ('hybrid_yield_fields_001', 'create_fertilizer_history')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
