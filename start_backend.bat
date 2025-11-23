@echo off
echo Starting Cinogrow Backend with PostgreSQL...
echo.

echo 1. Starting PostgreSQL database...
docker-compose up -d db

echo 2. Waiting for database to be ready...
timeout /t 10 /nobreak

echo 3. Installing Python dependencies...
cd backend
pip install -r requirements.txt

echo 4. Initializing database...
python init_db.py

echo 5. Starting FastAPI backend...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo Backend is running at http://localhost:8000
echo API documentation at http://localhost:8000/docs
pause
