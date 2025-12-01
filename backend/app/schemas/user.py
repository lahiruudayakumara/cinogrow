from pydantic import BaseModel, EmailStr
from typing import Optional
from app.enums import UserRole
import uuid

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: uuid.UUID
    is_active: bool

    class Config:
        orm_mode = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str