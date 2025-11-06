#!/usr/bin/env python3
"""
Comprehensive database setup script
Connects to postgres database first, creates mydb if needed, then initializes tables
"""
import psycopg2
import os
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database():
    """Setup database and create mydb if it doesn't exist"""
    print("🔧 Setting up database...")
    
    # First connect to postgres database to check/create mydb
    try:
        conn = psycopg2.connect(
            host="127.0.0.1",
            port="5432",
            database="postgres",
            user="postgres", 
            password="password"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if mydb exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname='mydb'")
        exists = cursor.fetchone()
        
        if not exists:
            print("📦 Creating database 'mydb'...")
            cursor.execute("CREATE DATABASE mydb")
            print("✅ Database 'mydb' created successfully")
        else:
            print("✅ Database 'mydb' already exists")
            
        cursor.close()
        conn.close()
        
        # Now connect to mydb and create tables
        print("🏗️  Creating tables in mydb...")
        conn = psycopg2.connect(
            host="127.0.0.1", 
            port="5432",
            database="mydb",
            user="postgres",
            password="password"
        )
        
        cursor = conn.cursor()
        
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