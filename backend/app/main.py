# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your oil yield router
from app.oil_yield.router import router as oil_yield_router

app = FastAPI(title="Cinogrow Backend")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can replace "*" with your frontend URL for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the oil yield router
app.include_router(oil_yield_router)

@app.get("/")
async def root():
    return {"message": "Welcome to Cinogrow Backend API"}
