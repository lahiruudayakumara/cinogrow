# Cinogrow Backend - Weather API Integration

This backend provides weather data integration using the OpenWeather API for the Cinogrow farming application.

## 📦 Prerequisites

* Python >= 3.10
* OpenWeather API Key (free from [OpenWeather](https://openweathermap.org/api))
* `virtualenv` or `poetry`

---

## 🚀 Getting Started

### Set Up Virtual Environment

```bash
python -m venv venv
source venv\Scripts\activate
```

### Install Python Dependencies

#### With `requirements.txt`

```bash
pip install -r requirements.txt
```

---

## 🔐 Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Get your OpenWeather API key:
- Visit [OpenWeather API](https://openweathermap.org/api)
- Sign up for a free account
- Get your API key from the dashboard

Edit `.env` with your API key:

```
OPENWEATHER_API_KEY=your_actual_api_key_here
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
DEBUG=True
```

---

## ▶️ Run the Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Your server will start on `http://localhost:8000`

## 📡 API Endpoints

### Weather Endpoints

#### GET `/api/v1/weather/current`
Get current weather by coordinates
- Query Parameters: `latitude`, `longitude`
- Example: `/api/v1/weather/current?latitude=6.9271&longitude=79.8612`

#### POST `/api/v1/weather/current`
Get current weather by coordinates (POST method)
- Body: `{"latitude": 6.9271, "longitude": 79.8612}`

#### GET `/api/v1/weather/city`
Get current weather by city name
- Query Parameter: `city`
- Example: `/api/v1/weather/city?city=Colombo,LK`

#### GET `/api/v1/weather/health`
Health check for weather service

## 📱 Mobile App Integration

The mobile app's weather API client is configured to connect to:
- Android Emulator: `http://10.0.2.2:8000/api/v1`
- iOS Simulator: `http://localhost:8000/api/v1`

Make sure the backend server is running when testing the mobile app.

## 🧪 Testing the API

1. Start the server
2. Visit `http://localhost:8000/docs` for interactive API documentation
3. Test endpoints using the Swagger UI
