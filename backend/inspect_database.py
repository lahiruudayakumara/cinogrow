"""
Inspect actual database schema
"""
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import create_engine, Session, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost/cinogrow_db")
print(f"Connecting to database: {DATABASE_URL.replace('password', '***')}")

# Create engine
engine = create_engine(DATABASE_URL)

def inspect_tables():
    """Inspect actual table schemas"""
    
    with Session(engine) as session:
        try:
            # Get farms table columns
            farms_columns = session.exec(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'farms' 
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("🏪 FARMS TABLE COLUMNS:")
            print("-" * 40)
            for col in farms_columns:
                print(f"  {col.column_name} | {col.data_type} | {'NULL' if col.is_nullable == 'YES' else 'NOT NULL'}")
            
            # Get plots table columns
            plots_columns = session.exec(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'plots' 
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("\n🌱 PLOTS TABLE COLUMNS:")
            print("-" * 40)
            for col in plots_columns:
                print(f"  {col.column_name} | {col.data_type} | {'NULL' if col.is_nullable == 'YES' else 'NOT NULL'}")
            
            # Get trees table columns
            trees_columns = session.exec(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'trees' 
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("\n🌳 TREES TABLE COLUMNS:")
            print("-" * 40)
            for col in trees_columns:
                print(f"  {col.column_name} | {col.data_type} | {'NULL' if col.is_nullable == 'YES' else 'NOT NULL'}")
            
            # Check hybrid_yield_results table
            hybrid_columns = session.exec(text("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'hybrid_yield_results' 
                ORDER BY ordinal_position
            """)).fetchall()
            
            print("\n🤖 HYBRID_YIELD_RESULTS TABLE COLUMNS:")
            print("-" * 40)
            if hybrid_columns:
                for col in hybrid_columns:
                    print(f"  {col.column_name} | {col.data_type} | {'NULL' if col.is_nullable == 'YES' else 'NOT NULL'}")
            else:
                print("  Table does not exist")
                
        except Exception as e:
            print(f"❌ Error inspecting database: {e}")

if __name__ == "__main__":
    print("🔍 Inspecting database schema...")
    print("=" * 60)
    inspect_tables()
    print("\n" + "=" * 60)