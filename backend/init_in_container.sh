#!/bin/bash
# Initialize database from within the container
echo "Initializing database from container..."

# Copy the initialization script into the container
docker cp init_db.py postgres-db:/tmp/init_db.py
docker cp app postgres-db:/tmp/app

# Install python dependencies in the container
docker exec postgres-db apt-get update
docker exec postgres-db apt-get install -y python3 python3-pip
docker exec postgres-db pip3 install sqlmodel psycopg2-binary python-dotenv

# Run the initialization from inside the container
docker exec -e DATABASE_URL="postgresql+psycopg2://postgres:password@localhost:5432/mydb" postgres-db python3 /tmp/init_db.py