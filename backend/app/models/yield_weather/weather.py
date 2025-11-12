from sqlmodel import SQLModel, Field
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WeatherData(BaseModel):
    temperature: float
    feels_like: float
    humidity: int
    pressure: int
    wind_speed: float
    wind_direction: int
    rainfall: float
    weather_main: str
    weather_description: str
    icon: str
    visibility: float


class WeatherRecord(SQLModel, table=True):
    """Database model for storing weather records"""
    __tablename__ = "weather_records"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    location: str = Field(max_length=255)
    latitude: float
    longitude: float
    temperature: float
    feels_like: float
    humidity: int
    pressure: int
    wind_speed: float
    wind_direction: int
    rainfall: float
    weather_main: str = Field(max_length=100)
    weather_description: str = Field(max_length=255)
    icon: str = Field(max_length=10)
    visibility: float
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LocationRequest(BaseModel):
    latitude: float
    longitude: float


class WeatherResponse(BaseModel):
    success: bool
    data: Optional[WeatherData] = None
    message: str
    location: str