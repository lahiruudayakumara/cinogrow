"""Fix user created_at column from string to date

Revision ID: fix_created_at_date
Revises: 
Create Date: 2026-03-08

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'fix_created_at_date'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Convert created_at from VARCHAR to DATE
    # First, update existing rows to have a valid date format
    op.execute("""
        UPDATE users 
        SET created_at = CURRENT_DATE::text 
        WHERE created_at = 'now()' OR created_at IS NULL OR created_at = ''
    """)
    
    # Alter the column type from VARCHAR to DATE
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN created_at TYPE DATE 
        USING created_at::date
    """)
    
    # Set the default to current_date
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN created_at SET DEFAULT CURRENT_DATE
    """)


def downgrade():
    # Revert back to VARCHAR
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN created_at TYPE VARCHAR 
        USING created_at::text
    """)
    op.execute("""
        ALTER TABLE users 
        ALTER COLUMN created_at SET DEFAULT 'now()'
    """)
