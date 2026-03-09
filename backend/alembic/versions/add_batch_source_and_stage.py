"""add source and process_stage to oil_material_batches

Revision ID: add_batch_source_and_stage
Revises: a1fdf7e7fcf3
Create Date: 2026-03-05

Adds:
  - source        VARCHAR(20)  NOT NULL DEFAULT 'own_farm'
  - dried_mass_kg FLOAT        NULLABLE
  - process_stage VARCHAR(20)  NOT NULL DEFAULT 'raw'

Scene 1 (own_farm): user dries bark themselves; dried_mass_kg recorded later.
Scene 2 (purchased): bark pre-dried by supplier; process_stage starts at 'distilling'.
"""
from alembic import op
import sqlalchemy as sa

revision = "add_batch_source_and_stage"
down_revision = "fa930909db28"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: add columns as nullable so existing rows are accepted
    with op.batch_alter_table("oil_material_batches") as batch_op:
        batch_op.add_column(sa.Column("dried_mass_kg", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("source", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("process_stage", sa.String(length=20), nullable=True))

    # Step 2: backfill existing rows with sensible values
    op.execute("UPDATE oil_material_batches SET source = 'own_farm' WHERE source IS NULL")
    op.execute("UPDATE oil_material_batches SET process_stage = 'raw' WHERE process_stage IS NULL")

    # Step 3: now enforce NOT NULL
    with op.batch_alter_table("oil_material_batches") as batch_op:
        batch_op.alter_column("source", nullable=False)
        batch_op.alter_column("process_stage", nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("oil_material_batches") as batch_op:
        batch_op.drop_column("process_stage")
        batch_op.drop_column("source")
        batch_op.drop_column("dried_mass_kg")
