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
    
    # Analysis flow type
    analysis_flow: Optional[str] = Field(default="leaf_only", index=True)  # leaf_only, soil_only, combined
    
    # Leaf analysis results
    primary_deficiency: Optional[str] = Field(default=None, index=True)  # The class name from Roboflow
    severity: Optional[str] = Field(default=None, index=True)  # Low, Medium, High
    confidence: Optional[float] = None
    image_path: Optional[str] = None
    
    # Soil analysis results
    soil_type: Optional[str] = Field(default=None, index=True)  # sandy_soil, laterite_soil, black_soil
    soil_confidence: Optional[float] = None
    soil_image_path: Optional[str] = None
    soil_characteristics: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    
    # Common fields
    user_id: Optional[int] = Field(default=None, index=True)
    plant_age: Optional[int] = Field(default=None, index=True)
    recommendations: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    
    # Timestamp
    analyzed_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    class Config:
        arbitrary_types_allowed = True


class FertilizerHistoryCreate(SQLModel):
    """Schema for creating a new fertilizer history record"""
    analysis_flow: Optional[str] = "leaf_only"
    primary_deficiency: Optional[str] = None
    severity: Optional[str] = None
    confidence: Optional[float] = None
    image_path: Optional[str] = None
    soil_type: Optional[str] = None
    soil_confidence: Optional[float] = None
    soil_image_path: Optional[str] = None
    soil_characteristics: Optional[Dict[str, Any]] = None
    user_id: Optional[int] = None
    plant_age: Optional[int] = None
    recommendations: Optional[Dict[str, Any]] = None


class FertilizerHistoryResponse(SQLModel):
    """Schema for fertilizer history response"""
    id: int
    analysis_flow: Optional[str]
    primary_deficiency: Optional[str]
    severity: Optional[str]
    confidence: Optional[float]
    image_path: Optional[str]
    soil_type: Optional[str]
    soil_confidence: Optional[float]
    soil_image_path: Optional[str]
    soil_characteristics: Optional[Dict[str, Any]]
    user_id: Optional[int]
    plant_age: Optional[int]
    recommendations: Optional[Dict[str, Any]]
    analyzed_at: datetime
