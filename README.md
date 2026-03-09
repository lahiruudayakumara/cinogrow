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

### 🧴 Cinnamon Oil Yield Prediction and Decision Support (Malmi W.U.)
   ✔️ Predict cinnamon oil yield using **Regression** based on farm and process data.  
   ✔️ Recommend **optimal drying and distillation durations** to improve efficiency.  
   ✔️ Visualize expected yield outcomes and performance trends.  
   ✔️ Report Generation.  

---

### 🌾 Smart Fertilizer Recommendation via Dual-Image Analysis (Nimsara N.A.D.)
   ✔️ Analyze **leaf and soil images** using **DinoV3 model Roboflow**.  
   ✔️ Detect nutrient deficiencies and recommend suitable fertilizer type and quantity.  
   ✔️ Help farmers reduce costs and environmental impact.  
   ✔️ Report Generation.  

---

### 🌦️ Weather-Aware Yield Prediction and Crop Planning (Jayawardana N.G.U.D.)
   ✔️ Integrate **real-time weather data** with historical yield records.  
   ✔️ Predict **crop yield** using **Random Forest regression models**.  
   ✔️ Provide **weather based actionable insights** on planting, pruning, and harvesting schedules.  
   ✔️ Automate **tree stem analysis** using **Roboflow workflow** for accurate stem count and circumference measurement.  
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
- **Database**: PostgreSQL(hosted on AWS)

### **Machine Learning & Image Processing**
- **Frameworks**: Scikit-learn, XGBoost  
- **Tools**: Roboflow (for image processing & model training), Kaggle, Pandas, NumPy  

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

Category             | Tools
-------------------- | -----------------------------------------------
Machine Learning     | Scikit-learn, XGBoost, Random Forest Regression
Image Processing     | Roboflow
Backend              | FastAPI, Docker
Frontend             | React Native, Expo
Database             | PostgreSQL (AWS hosted)
Data Handling        | Pandas, NumPy
External APIs        | OpenWeatherMap
Data Sources         | Kaggle
Version Control      | GitHub
Deployment           | Docker, CI/CD Pipelines

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

4. Run the FastAPI server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to access the API documentation.

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

4. Configure API URL:

In your app's config, set the backend URL to connect to your FastAPI server.

---

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
