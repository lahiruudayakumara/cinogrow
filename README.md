# 🌱 CinoGrow

🎓 Final Year Research Project — Fullstack AI/ML-enabled Mobile App with FastAPI Backend

---

## 🚀 1. Run With Docker (Recommended)

### 🐳 Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### ✅ Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/fullstack-project.git
cd fullstack-project

# Start all services
docker-compose up --build
````

### 📦 Services

| Service           | URL/Port                                                       |
| ----------------- | -------------------------------------------------------------- |
| FastAPI           | [http://localhost:8000/docs](http://localhost:8000/docs)       |
| PostgreSQL        | localhost:5432                                                 |
| Mobile App (Expo) | [http://localhost:8081](http://localhost:8081) or [http://localhost:8082](http://localhost:8082) (Metro Bundler) |

---

## 🔧 2. Run Without Docker (Manual Setup)

### 🧪 Backend Setup (FastAPI)

1. Navigate to backend:

```bash
cd backend
```

2. Create a virtual environment and activate it:

```bash
python -m venv venv
# On Unix/macOS
source venv/bin/activate
# On Windows
venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file inside `backend/`:

```
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# OpenWeather API Configuration
OPENWEATHER_API_KEY=your_openweather_api_key_here
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5

# Application Configuration
DEBUG=True
```

> **Get your OpenWeather API key:**
> 1. Visit [OpenWeather API](https://openweathermap.org/api)
> 2. Sign up for a free account
> 3. Get your API key from the dashboard
> 4. Replace `your_openweather_api_key_here` with your actual API key

5. Apply database migrations:

```bash
alembic upgrade head
```

6. Run the FastAPI server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to test the API.

> **Important:** Use `--host 0.0.0.0` to allow mobile app connections. You can also test the server health at [http://localhost:8000/health](http://localhost:8000/health).

**Weather API Endpoints:**
- `GET /api/v1/weather/current?latitude=X&longitude=Y` - Get weather by coordinates
- `GET /api/v1/weather/city?city=CityName` - Get weather by city name
- `POST /api/v1/weather/current` - Get weather by coordinates (POST)
- `GET /api/v1/weather/health` - Weather service health check

**Test the API:**
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test weather by coordinates (Colombo, Sri Lanka)
curl "http://localhost:8000/api/v1/weather/current?latitude=6.9271&longitude=79.8612"

# Test weather by city
curl "http://localhost:8000/api/v1/weather/city?city=Colombo,LK"

# Test network accessibility for mobile app
curl http://192.168.8.130:8001/health
```

---

### 📱 Mobile App Setup (Expo + React Native)

1. Navigate to mobile app folder:

```bash
cd mobile-app
```

2. Install dependencies:

```bash
pnpm install
```

3. Start Expo Dev Server:

```bash
pnpm expo start
```

> **Quick Test**: After starting both backend and mobile app, you can also run the integration test:
> ```bash
> node test_weather_integration.js
> ```

4. Configure API URL:

In your app's config or `.env` (or a config file), set:

```ts
export const API_URL = "http://127.0.0.1:8000";
```

> ⚠️ **For Android Emulator**: The mobile app automatically uses `http://10.0.2.2:8001` for Android emulators and `http://192.168.8.130:8001` for iOS simulators.

> 🔧 **Troubleshooting Network Issues:**
> 
> If you get "Network request failed" errors:
> 1. Make sure the backend is running on `0.0.0.0:8000` (not just `127.0.0.1`)
> 2. Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
> 3. Test backend accessibility: `curl http://192.168.8.130:8001/health`
> 4. Check your firewall settings
> 5. For physical devices, use your computer's IP address instead of localhost

**Mobile App Features:**
- **Real-time Weather Display**: Shows current temperature, rainfall, humidity, wind speed
- **Location Services**: GPS location detection with manual city input fallback
- **Dynamic Weather Alerts**: Contextual farming advice based on current weather conditions
- **Yield Prediction**: AI-powered yield estimates incorporating real weather data
- **Farm Assistant**: Weather-aware farming recommendations and activity scheduling
- **API Debugging**: Built-in connectivity testing and error diagnosis

---

## 🗃️ Environment Variables Summary

| Variable                 | Description                           |
| ------------------------ | ------------------------------------- |
| `DATABASE_URL`           | PostgreSQL DB connection string       |
| `OPENWEATHER_API_KEY`    | OpenWeather API key (free from openweathermap.org) |
| `OPENWEATHER_BASE_URL`   | OpenWeather API base URL              |
| `DEBUG`                  | Application debug mode                |
| `API_URL`                | Backend URL used by mobile app        |

---

## ✅ Project Structure

```
cinogrow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   └── __init__.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── __init__.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   ├── init_db.py
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   └── __init__.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   └── __init__.py
│   │   ├── ml/
│   │   │   ├── model.py
│   │   │   ├── inference.py
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   └── __init__.py
│   │   └── main.py
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── .env
│   ├── Dockerfile
│   └── README.md
├── mobile-app/
│   ├── assets/
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Header.tsx
│   │   └── Input.tsx
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── index.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── App.tsx
│   ├── app.json
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 📄 License

MIT © 2025 LAHIRU