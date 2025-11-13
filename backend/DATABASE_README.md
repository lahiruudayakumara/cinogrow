# Cinogrow Backend - Database Integration

## Overview
The Cinogrow backend now includes full PostgreSQL database integration with the following features:

- **Weather Data Storage**: All weather API calls are automatically saved to the database
- **Farm Management**: Create and manage farms and plots
- **Yield Tracking**: Track crop yields and farm activities
- **Database Migrations**: Alembic for database schema management

## Database Schema

### Tables Created:
1. **weather_records** - Stores weather data from API calls
2. **farms** - Farm information and location data  
3. **plots** - Individual farm plots with status tracking
4. **yield_records** - Harvest and yield data
5. **farm_activities** - Farm activities and operations log

## Quick Start

### 1. Start PostgreSQL Database
```bash
docker-compose up -d db
```

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Initialize Database
```bash
python init_db.py
```

### 4. Start Backend Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Or use the Windows batch script:
```bash
start_backend.bat
```

## API Endpoints

### Weather API
- `GET /api/v1/weather/current?lat={lat}&lon={lon}` - Current weather by coordinates
- `GET /api/v1/weather/city/{city_name}` - Current weather by city name

### Farm Management API
- `POST /api/v1/farms` - Create a new farm
- `GET /api/v1/farms` - Get all farms
- `GET /api/v1/farms/{farm_id}` - Get specific farm
- `POST /api/v1/plots` - Create a new plot
- `GET /api/v1/farms/{farm_id}/plots` - Get farm plots
- `PUT /api/v1/plots/{plot_id}/status` - Update plot status
- `GET /api/v1/stats/dashboard` - Get dashboard statistics

## Database Configuration

### Environment Variables (.env)
```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret
POSTGRES_DB=mydb
DATABASE_URL=postgresql+psycopg2://postgres:secret@db:5432/mydb
```

### Sample Data
The database initialization script creates:
- Sample farm: "Udari's Cinnamon Farm" (5.2 ha)
- Plot A: Growing stage (65% progress, 12 months old)
- Plot B: Mature stage (100% progress, ready for harvest)

## Database Migrations

### Create a new migration:
```bash
cd backend
alembic revision --autogenerate -m "description"
```

### Apply migrations:
```bash
alembic upgrade head
```

### Migration history:
```bash
alembic history
```

## Features Integrated

✅ **PostgreSQL Database** - Fully configured with Docker  
✅ **SQLModel/SQLAlchemy** - Modern ORM with type hints  
✅ **Automatic Weather Logging** - All API calls saved to DB  
✅ **Farm Management** - CRUD operations for farms and plots  
✅ **Database Migrations** - Alembic setup for schema changes  
✅ **Sample Data** - Pre-populated with realistic farm data  
✅ **API Documentation** - FastAPI auto-generated docs at `/docs`  

## Accessing the Database

### Via API Documentation:
Visit `http://localhost:8000/docs` for interactive API testing

### Direct Database Access:
```bash
docker exec -it postgres-db psql -U postgres -d mydb
```

### Common SQL Queries:
```sql
-- View weather records
SELECT * FROM weather_records ORDER BY recorded_at DESC LIMIT 10;

-- View farms and plots
SELECT f.name, p.name, p.status, p.progress_percentage 
FROM farms f JOIN plots p ON f.id = p.farm_id;

-- Dashboard statistics
SELECT 
  (SELECT COUNT(*) FROM farms) as total_farms,
  (SELECT SUM(total_area) FROM farms) as total_area,
  (SELECT COUNT(*) FROM plots WHERE status IN ('planted', 'growing', 'mature')) as active_plots;
```

## Integration with Mobile App

The mobile app can now connect to these new endpoints:
- Weather data is automatically logged for analytics
- Farm and plot data can be displayed in the app
- Real-time farm status updates
- Historical weather and yield data

## Next Steps

1. **Connect Mobile App**: Update mobile app to use farm management APIs
2. **Add Authentication**: Implement user authentication and authorization
3. **Add More Features**: Pest management, fertilizer tracking, crop recommendations
4. **Analytics Dashboard**: Create data visualization for farm insights
5. **Notifications**: Add alerts for weather warnings and farm activities
