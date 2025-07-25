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
| Mobile App (Expo) | [http://localhost:8081](http://localhost:8081) (Metro Bundler) |

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
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
```

5. Apply database migrations:

```bash
alembic upgrade head
```

6. Run the FastAPI server:

```bash
uvicorn main:app --reload
```

Visit [http://localhost:8000/docs](http://localhost:8000/docs) to test the API.

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

In your app's config or `.env` (or a config file), set:

```ts
export const API_URL = "http://localhost:8000";
```

> ⚠️ Ensure your mobile emulator or device has access to the backend (e.g., use your IP instead of `localhost` if needed).

---

## 🗃️ Environment Variables Summary

| Variable       | Description                     |
| -------------- | ------------------------------- |
| `DATABASE_URL` | PostgreSQL DB connection string |
| `API_URL`      | Backend URL used by mobile app  |

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