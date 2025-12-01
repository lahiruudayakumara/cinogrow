# 25-26J-338

# CinoGrow: Machine Learning-Based Decision Support System for Cinnamon Cultivation

## 👥 Team Members

### Group Leader: IT22312044 - Malmi W.U. - it22312044@my.sliit.lk

### Member 1: IT22319692 - Nimsara N.A.D. - it22319692@my.sliit.lk

### Member 2: IT22308498 - Jayawardana N.G.U.D. - it22308498@my.sliit.lk

### Member 3: IT22889324 - Udayakumara W.D.L. - it22889324@my.sliit.lk


## Overview 

**CinoGrow** is a machine learning–based decision support system designed to optimize cinnamon cultivation in Sri Lanka.  
It integrates AI-driven insights for **fertilizer recommendations, disease detection, yield forecasting, and oil yield optimization**, empowering farmers to make data-driven, efficient, and sustainable agricultural decisions.  

---

## Problem Statement

Cinnamon cultivation in Sri Lanka heavily relies on traditional knowledge, leading to **inconsistent yields, late disease detection, and inefficient resource use**.  
Farmers lack access to digital tools that can analyze real-time environmental data and provide precise recommendations tailored to their fields.  

As a result:
- Fertilizer usage is often excessive or insufficient.
- Pests and diseases are identified too late for effective control.
- Yield and oil production vary unpredictably.

---

## Purpose

The **CinoGrow** system aims to:

- 🌱 **Recommend fertilizers** precisely using ML-based analysis of leaf and soil images.  
- 🪲 **Detect pests and diseases** in real-time with stage-based image recognition.  
- 🌦️ **Predict yield outcomes** using weather and soil data.  
- 🧴 **Forecast cinnamon oil yield** and suggest optimal drying and distillation durations.  
- 📲 **Provide an all-in-one mobile platform** for farmers to access insights easily in Sinhala or English.

---

## System Overview Diagram
![System Diagram](SystemDiagram_CinoGrow.png)

---

## Components

### 🧴 Cinnamon Oil Yield Prediction and Distillation Support (Malmi W.U.)
   ✔️ Predict cinnamon oil yield using **XGBoost regression** based on farm and process data.  
   ✔️ Recommend **optimal drying and distillation durations** to improve efficiency.  
   ✔️ Visualize expected yield outcomes and performance trends.  
   ✔️ Report Generation.  

---

### 🌾 Smart Fertilizer Recommendation via Dual-Image Analysis (Nimsara N.A.D.)
   ✔️ Analyze **leaf and soil images** using **CNN models (TensorFlow + OpenCV)**.  
   ✔️ Detect nutrient deficiencies and recommend suitable fertilizer type and quantity.  
   ✔️ Help farmers reduce costs and environmental impact.  
   ✔️ Report Generation.  

---

### 🌦️ Weather-Aware Yield Prediction and Crop Planning (Jayawardana N.G.U.D.)
   ✔️ Integrate **real-time weather data** with historical yield records.  
   ✔️ Predict **crop yield** using **Random Forest regression models**.  
   ✔️ Provide **actionable insights** on planting, pruning, and harvesting schedules.  
   ✔️ Report Generation.  

---

### 🪲 Stage-Based Disease and Pest Detection (Udayakumara W.D.L.)
   ✔️ Detect **diseases and pests** through image-based classification using CNNs.  
   ✔️ Identify the **growth stage** and **severity level**.  
   ✔️ Suggest treatment methods and preventive actions.  
   ✔️ Report Generation.  

---

## Dependencies

### **Frontend** 
- **Framework**: React Native (Expo)
- **Styling**: Tailwind CSS  
- **Libraries**: Axios, React Navigation, React Icons  

### **Backend**
- **Framework**: FastAPI (Python-based API framework)  
- **Containerization**: Docker

### **Database**
- **Database**: PostgreSQL

### **Machine Learning**
- **Frameworks**: TensorFlow, Scikit-learn, XGBoost  
- **Libraries**: OpenCV, Pandas, NumPy  

### **Other Tools**
- **Weather API**: OpenWeatherMap  
- **Version Control**: GitHub  
- **Deployment**: Docker & CI/CD Pipelines  

---

## Expected Outcomes

- **Fertilizer recommendation accuracy**: 75–90%  
- **Disease detection accuracy**: 85–95%  
- **Yield prediction accuracy**: 70–85%  
- **Oil yield prediction error margin**: ≤15%  

---

## Social & Economic Impact

- 📈 Increased cinnamon productivity and export quality.  
- 🧑‍🌾 Reduced costs through efficient fertilizer and resource use.  
- 🌱 Promotes **sustainable agriculture** and **data-driven decision-making**.  
- 🇱🇰 Supports Sri Lanka’s cinnamon industry competitiveness globally.

---

## Key Technologies Used

| Category | Tools |
|-----------|--------|
| Machine Learning | TensorFlow, Scikit-learn, XGBoost |
| Backend | FastAPI, Docker |
| Frontend | React Native, Expo |
| Database | PostgreSQL |
| Image Processing | OpenCV |
| External APIs | OpenWeatherMap |
| Version Control | GitHub |

---

## Commercialization Potential

| User Type | Subscription Plan | Benefits |
|------------|------------------|-----------|
| Individual Farmer | Rs. 800/month | Access to all modules |
| Cooperative / Society | Rs. 3,000/month | Multi-farm insights & reports |
| Research Institution | Rs. 8,000/month | Data analytics dashboard |

---

## Ethical & Data Considerations
- Farmer data anonymized and securely stored.  
- Consent obtained before data collection.  
- Compliance with **SLIIT Research Ethical Guidelines**.

---

## Summary

**CinoGrow** bridges the gap between traditional cinnamon farming and modern precision agriculture.  
By combining **machine learning**, **real-time data**, and **farmer-focused UX**, it transforms Sri Lanka’s cinnamon industry into a **smart, sustainable, and profitable ecosystem**. 

---

## 1. Run With Docker (Recommended)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/lahiruudayakumara/cinogrow.git
cd cinogrow

# Start all services
docker-compose up --build
````

### Services

| Service           | URL/Port                                                       |
| ----------------- | -------------------------------------------------------------- |
| FastAPI           | [http://localhost:8000/docs](http://localhost:8000/docs)       |
| PostgreSQL        | localhost:5432                                                 |
| Mobile App (Expo) | [http://localhost:8081](http://localhost:8081) or [http://localhost:8082](http://localhost:8082) (Metro Bundler) |

---

## 2. Run Without Docker (Manual Setup)

### Backend Setup (FastAPI)

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

 **Get your OpenWeather API key:**
1. Visit [OpenWeather API](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Replace `your_openweather_api_key_here` with your actual API key

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

# Test network accessibility for mobile app (replace with your IP)
curl http://YOUR_IP_HERE:8000/health
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


 ⚠️ **For Android Emulator**: The mobile app automatically uses `http://10.0.2.2:8000` for Android emulators and `http://YOUR_IP_HERE:8000` for iOS simulators.



 🔧 **Troubleshooting Network Issues:**
 
 If you get "Network request failed" errors:
 1. Make sure the backend is running on `0.0.0.0:8000` (not just `127.0.0.1`)
 2. Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
 3. Test backend accessibility: `curl http://YOUR_IP_HERE:8000/health`
 4. Check your firewall settings
 5. For physical devices, use your computer's IP address instead of localhost

**Mobile App Features:**
- **Real-time Weather Display**: Shows current temperature, rainfall, humidity, wind speed
- **Location Services**: GPS location detection with manual city input fallback
- **Dynamic Weather Alerts**: Contextual farming advice based on current weather conditions
- **Yield Prediction**: AI-powered yield estimates incorporating real weather data
- **Farm Assistant**: Weather-aware farming recommendations and activity scheduling
- **API Debugging**: Built-in connectivity testing and error diagnosis

---

## Environment Variables Summary

| Variable                 | Description                           |
| ------------------------ | ------------------------------------- |
| `DATABASE_URL`           | PostgreSQL DB connection string       |
| `OPENWEATHER_API_KEY`    | OpenWeather API key (free from openweathermap.org) |
| `OPENWEATHER_BASE_URL`   | OpenWeather API base URL              |
| `DEBUG`                  | Application debug mode                |
| `API_URL`                | Backend URL used by mobile app        |

---

## Project Structure

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