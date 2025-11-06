# Farm Management with PostgreSQL Integration

This document explains the updated farm management system that now integrates with a PostgreSQL database through FastAPI.

## 🚀 Quick Start

### 1. Start the Backend

Use the provided batch file to start the backend with PostgreSQL:

```bash
# Windows
start_backend.bat

# Or manually:
cd backend
docker-compose up -d db
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Mobile App

```bash
cd mobile-app
pnpm install
pnpm start
```

## 📊 Database Schema

### Farms Table
- `id`: Primary key
- `name`: Farm name
- `owner_name`: Owner's name
- `total_area`: Total area in hectares
- `location`: Farm location
- `latitude`, `longitude`: GPS coordinates
- `created_at`, `updated_at`: Timestamps

### Plots Table
- `id`: Primary key
- `farm_id`: Foreign key to farms
- `name`: Plot name (Plot A, Plot B, etc.)
- `area`: Plot area in hectares
- `status`: preparing, planted, growing, mature, harvesting, harvested, resting
- `crop_type`: Type of crop (default: Cinnamon)
- `planting_date`: When the plot was planted
- `progress_percentage`: Growth progress (0-100)
- `age_months`: Age of the crop in months

### Planting Records Table
- `record_id`: Primary key
- `user_id`: User identifier
- `plot_id`: Foreign key to plots
- `plot_area`: Area of the plot when planted
- `cinnamon_variety`: Variety of cinnamon
- `seedling_count`: Number of seedlings planted
- `planted_date`: Planting date

## 🛠️ API Endpoints

### Farm Management
- `POST /api/v1/farms` - Create a new farm
- `GET /api/v1/farms` - Get all farms
- `GET /api/v1/farms/{farm_id}` - Get specific farm
- `PUT /api/v1/farms/{farm_id}` - Update farm
- `DELETE /api/v1/farms/{farm_id}` - Delete farm

### Plot Management
- `POST /api/v1/plots` - Create a new plot
- `GET /api/v1/farms/{farm_id}/plots` - Get all plots for a farm
- `GET /api/v1/plots/{plot_id}` - Get specific plot
- `PUT /api/v1/plots/{plot_id}/status` - Update plot status
- `DELETE /api/v1/plots/{plot_id}` - Delete plot

### Planting Records
- `POST /api/v1/planting-records` - Create planting record
- `GET /api/v1/users/{user_id}/planting-records` - Get user's records
- `PUT /api/v1/planting-records/{record_id}` - Update record
- `DELETE /api/v1/planting-records/{record_id}` - Delete record

## 📱 Mobile App Features

### Editable Number of Plots
- Users can now edit the number of plots when creating or updating a farm
- The system automatically generates plots with equal area distribution
- Confirmation dialog when changing plot count on existing farms
- Real-time calculation showing area per plot

### Database Integration
- All farm and plot data is stored in PostgreSQL
- Real-time synchronization with the backend API
- Offline mode with mock data fallback when backend is unavailable
- Automatic retry and error handling

### Data Persistence
- Farm details, plot information, and planting records are permanently stored
- Data survives app restarts and device changes
- Backup and restore capabilities through the database

## 🔄 How Plot Editing Works

1. **Creating a New Farm**: User specifies number of plots, system creates them automatically
2. **Editing Existing Farm**: 
   - If plot count changes, user gets a confirmation dialog
   - System deletes existing plots and creates new ones with updated count
   - Area is redistributed equally among all plots
3. **Validation**: 
   - Ensures each plot has minimum 0.1 hectares
   - Maximum 50 plots per farm
   - Real-time area calculation display

## 🎯 Backend Configuration

The backend runs on `localhost:8000` by default. To change this:

1. Update `mobile-app/config/api.ts`
2. Change the `baseUrl` in the development configuration
3. Restart the mobile app

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://cinogrow_user:your_password@localhost:5432/cinogrow_db
OPENWEATHER_API_KEY=your_openweather_api_key
```

## 📈 Data Flow

1. **Mobile App** → **FastAPI Backend** → **PostgreSQL Database**
2. User creates/edits farm → API validates data → Stores in database
3. Plot creation → Batch API calls → Individual plot records
4. Real-time updates → Database triggers → Consistent state

## 🛡️ Error Handling

- **Network Issues**: Falls back to mock data
- **Backend Down**: Continues with cached data
- **Database Errors**: Graceful error messages
- **Validation Errors**: User-friendly feedback

## 📋 Testing

1. Start the backend: `start_backend.bat`
2. Verify API is running: `http://localhost:8000/docs`
3. Start mobile app and test farm creation
4. Check database records in PostgreSQL

## 🔮 Future Enhancements

- Real-time sync across multiple devices
- Offline data synchronization
- Advanced plot management (custom shapes, GPS boundaries)
- Historical data analytics
- Export/import functionality