# Cinogrow Backend

## 📦 Prerequisites

* Python >= 3.10
* PostgreSQL (local or remote)
* `virtualenv` or `poetry`
* `alembic` for migrations

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

Edit `.env` with your DB credentials:

```
DATABASE_URL=postgresql://user:password@localhost:5432/yourdbname
```

---

## 🛠️ Database Setup

Make sure PostgreSQL is running and database is created.

Run migrations with Alembic:

```bash
alembic upgrade head
```

---

## ▶️ Run the Backend Server

```bash
uvicorn app.main:app --reload
```

Your server will start on `http://127.0.0.1:8000`
