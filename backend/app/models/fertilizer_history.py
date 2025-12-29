from datetime import datetime
from typing import Optional, Dict, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB


class FertilizerHistory(SQLModel, table=True):
    """
    Simplified model for storing fertilizer analysis history
    """
    __tablename__ = "fertilizer_history"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Main analysis results
    primary_deficiency: Optional[str] = Field(default=None, index=True)  # The class name from Roboflow
    severity: Optional[str] = Field(default=None, index=True)  # Low, Medium, High
    confidence: Optional[float] = None
    image_path: Optional[str] = None
    user_id: Optional[int] = Field(default=None, index=True)
    plant_age: Optional[int] = Field(default=None, index=True)
    recommendations: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    
    # Timestamp
    analyzed_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    class Config:
        arbitrary_types_allowed = True


class FertilizerHistoryCreate(SQLModel):
    """Schema for creating a new fertilizer history record"""
    primary_deficiency: Optional[str] = None
    severity: Optional[str] = None
    confidence: Optional[float] = None
    image_path: Optional[str] = None
    user_id: Optional[int] = None
    plant_age: Optional[int] = None
    recommendations: Optional[Dict[str, Any]] = None


class FertilizerHistoryResponse(SQLModel):
    """Schema for fertilizer history response"""
    id: int
    primary_deficiency: Optional[str]
    severity: Optional[str]
    confidence: Optional[float]
    image_path: Optional[str]
    user_id: Optional[int]
    plant_age: Optional[int]
    recommendations: Optional[Dict[str, Any]]
    analyzed_at: datetime
