#!/usr/bin/env python3
"""
Comprehensive database setup script
Connects to AWS RDS PostgreSQL database and initializes tables
"""
import psycopg2
import os
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def setup_database():
    """Setup database and create tables on AWS RDS PostgreSQL"""
    print("🔧 Setting up database on AWS RDS...")
    
    # Get database connection details from environment
    host = os.getenv('POSTGRES_HOST', 'localhost')
    port = os.getenv('POSTGRES_PORT', '5432')
    user = os.getenv('POSTGRES_USER', 'postgres')
    password = os.getenv('POSTGRES_PASSWORD', 'password')
    database = os.getenv('POSTGRES_DB', 'postgres')
    
    print(f"📡 Connecting to database: {user}@{host}:{port}/{database}")
    
    # Connect directly to the AWS RDS database
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user, 
            password=password,
            sslmode='require'  # AWS RDS requires SSL
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✅ Connected to AWS RDS PostgreSQL database")
        
        # Create tables directly (no need to create a separate database on RDS)
        print("🏗️  Creating tables in AWS RDS database...")
        
        # Create a simple test table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS farms (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                owner_name VARCHAR(255),
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS plots (
                id SERIAL PRIMARY KEY, 
                farm_id INTEGER REFERENCES farms(id),
                name VARCHAR(255) NOT NULL,
                area FLOAT,
                crop_type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        conn.commit()
        print("✅ Tables created successfully")
        
        # Insert sample data
        cursor.execute("""
            INSERT INTO farms (name, owner_name, location) 
            VALUES (%s, %s, %s) 
            ON CONFLICT DO NOTHING
        """, ("Sample Farm", "Udari Kumara", "Matale, Sri Lanka"))
        
        conn.commit()
        print("✅ Sample data inserted")
        
        cursor.close()
        conn.close()
        
        print("🎉 Database setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    if success:
        print("\n✅ Ready to start the backend server!")
        print("Run: python start_server.py")
    else:
        print("\n❌ Database setup failed. Please check the logs above.")