"""
Script to drop and recreate the fertilizer_history table with simplified schema
"""
import os
from sqlmodel import create_engine, Session, text
from app.models.fertilizer_history import FertilizerHistory

def recreate_table():
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return

    print(f"🔗 Connecting to database...")
    engine = create_engine(database_url, echo=True)

    # Drop the old table
    print("\n🗑️ Dropping old fertilizer_history table...")
    with Session(engine) as session:
        session.exec(text("DROP TABLE IF EXISTS fertilizer_history CASCADE"))
        session.commit()
    print("✅ Old table dropped")

    # Create the new simplified table
    print("\n📋 Creating new simplified fertilizer_history table...")
    FertilizerHistory.metadata.create_all(engine)
    print("✅ New table created with columns:")
    print("   - id (Primary Key)")
    print("   - deficiency_name (String)")
    print("   - severity (String: Low/Medium/High)")
    print("   - confidence (Float)")
    print("   - analyzed_at (DateTime)")

if __name__ == "__main__":
    recreate_table()
