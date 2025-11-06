# Cinogrow Setup Guide

## Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file and add your OpenWeather API key:
   ```
   OPENWEATHER_API_KEY=your_api_key_here
   ```

6. **Run the backend server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Mobile App Setup

1. **Navigate to mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Start the development server:**
   ```bash
   pnpm start
   # or
   npm start
   ```

## Getting OpenWeather API Key

1. Visit [OpenWeather API](https://openweathermap.org/api)
2. Sign up for a free account
3. Go to API Keys section in your dashboard
4. Copy your API key
5. Paste it in the backend `.env` file

## Features

### Manual Location Entry
- Users can manually enter their location by city name
- Users can enter precise coordinates (latitude/longitude)
- Option to switch back to GPS location
- Location settings accessible via the header button

### Weather Data
- Real-time weather data from OpenWeather API
- Temperature, humidity, wind speed, rainfall
- Weather alerts and farming recommendations
- Pull-to-refresh functionality

## API Endpoints

- `GET /api/v1/weather/current?latitude=X&longitude=Y` - Get weather by coordinates
- `GET /api/v1/weather/city?city=CityName` - Get weather by city name
- `POST /api/v1/weather/current` - Get weather by coordinates (POST)
- `GET /api/v1/weather/health` - Health check

## Troubleshooting

1. **Backend not connecting to OpenWeather:**
   - Check your API key in `.env` file
   - Ensure you have internet connection
   - Verify API key is valid on OpenWeather dashboard

2. **Mobile app can't connect to backend:**
   - Ensure backend server is running on port 8000
   - Check network connection
   - For Android emulator, backend should be accessible at `http://10.0.2.2:8000`

3. **Location not working:**
   - Use manual location entry as fallback
   - Check location permissions in device settings
   - Verify expo-location package is installed
