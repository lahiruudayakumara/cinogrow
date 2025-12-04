"""Check the actual structure of the fertilizer_history table"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "Password123!")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")

try:
    conn = psycopg2.connect(
        dbname=POSTGRES_DB,
        user=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        host=POSTGRES_HOST,
        port=POSTGRES_PORT
    )
    
    cursor = conn.cursor()
    
    # Get column information
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'fertilizer_history'
        ORDER BY ordinal_position;
    """)
    
    print("\n=== fertilizer_history table structure ===")
    print(f"{'Column':<30} {'Type':<20} {'Nullable':<10} {'Default'}")
    print("-" * 80)
    
    for row in cursor.fetchall():
        column_name, data_type, is_nullable, column_default = row
        default_str = str(column_default)[:20] if column_default else "None"
        print(f"{column_name:<30} {data_type:<20} {is_nullable:<10} {default_str}")
    
    # Check if there are any rows
    cursor.execute("SELECT COUNT(*) FROM fertilizer_history;")
    count = cursor.fetchone()[0]
    print(f"\nTotal rows: {count}")
    
    # Show sample data if exists
    if count > 0:
        cursor.execute("SELECT * FROM fertilizer_history LIMIT 1;")
        print("\nSample row:")
        print(cursor.fetchone())
    
    cursor.close()
    conn.close()
    
    print("\n✅ Successfully checked table structure")
    
except Exception as e:
    print(f"❌ Error: {e}")
