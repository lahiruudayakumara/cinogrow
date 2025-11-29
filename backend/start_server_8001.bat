@echo off
echo Starting Cinogrow Backend Server on port 8001...
echo.
echo The server will be accessible at:
echo - Local: http://localhost:8001
echo - Network: http://192.168.8.130:8001
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

pause