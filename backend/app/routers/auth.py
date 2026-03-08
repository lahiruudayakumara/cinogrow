from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas import UserCreate, UserRead, UserLogin
from app.services import create_user, authenticate_user
from app.core.jwt_utils import create_access_token
from app.db import get_db
from app.models.user import User
import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

def format_member_since(created_at):
    """Return created_at as full datetime string."""
    if created_at is None:
        return None
    if hasattr(created_at, 'isoformat'):
        return created_at.isoformat()
    # Handle string values
    date_str = str(created_at)
    if date_str == 'now()':
        return datetime.datetime.now().isoformat()
    return date_str

@router.post("/register", response_model=UserRead)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = create_user(db, user_in)
    # Format created_at as 'YYYY-MM' for member_since
    member_since = format_member_since(user.created_at)
    # Return a UserRead-compatible dict with member_since as created_at
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": member_since
    }

@router.post("/login")
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, user_in.email, user_in.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    # Generate JWT token
    access_token = create_access_token({"sub": str(user.id), "email": user.email, "full_name": user.full_name, "role": user.role})
    # Format member_since as 'YYYY-MM' (year and month)
    member_since = format_member_since(user.created_at)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "member_since": member_since
    }