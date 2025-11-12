from sqlmodel import SQLModel, Field
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import json


class ActivityHistory(SQLModel, table=True):
    """Database model for activity history"""
    __tablename__ = "activity_history"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int  # Remove foreign key constraint until users table is implemented
    plot_id: int = Field(foreign_key="plots.id")
    activity_name: str = Field(max_length=100)
    activity_date: datetime
    trigger_condition: str = Field(max_length=500)
    weather_snapshot: str = Field(max_length=1000)  # JSON string of weather data
    created_at: datetime = Field(default_factory=datetime.utcnow)

    def set_weather_snapshot(self, weather_data: Dict[str, Any]):
        """Helper method to set weather snapshot as JSON string"""
        self.weather_snapshot = json.dumps(weather_data)
    
    def get_weather_snapshot(self) -> Dict[str, Any]:
        """Helper method to get weather snapshot as dictionary"""
        try:
            return json.loads(self.weather_snapshot)
        except (json.JSONDecodeError, AttributeError):
            return {}


# Pydantic models for API
class ActivityHistoryCreate(BaseModel):
    user_id: int
    plot_id: int
    activity_name: str
    activity_date: datetime
    trigger_condition: str
    weather_snapshot: Dict[str, Any]


class ActivityHistoryRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    user_id: int
    plot_id: int
    activity_name: str
    activity_date: datetime
    trigger_condition: str
    weather_snapshot: str
    created_at: datetime
    
    def get_weather_data(self) -> Dict[str, Any]:
        """Helper method to parse weather snapshot JSON"""
        try:
            return json.loads(self.weather_snapshot)
        except json.JSONDecodeError:
            return {}


class WeatherSnapshot(BaseModel):
    """Pydantic model for weather snapshot data"""
    temperature: float
    humidity: float
    rainfall: float
    wind_speed: float
    weather_description: str


class ActivityHistoryCreateRequest(BaseModel):
    """Request model for creating activity history with structured weather data"""
    user_id: int
    plot_id: int
    activity_name: str
    activity_date: datetime
    trigger_condition: str
    weather_snapshot: WeatherSnapshot