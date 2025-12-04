"""
Create fertilizer_history table
"""
from app.database import engine
from app.models.fertilizer_history import FertilizerHistory
from sqlmodel import SQLModel

def create_table():
    """Create the fertilizer_history table"""
    print("Creating fertilizer_history table...")
    try:
        FertilizerHistory.metadata.create_all(engine)
        print("✅ Table created successfully!")
    except Exception as e:
        print(f"❌ Error creating table: {e}")

if __name__ == "__main__":
    create_table()
