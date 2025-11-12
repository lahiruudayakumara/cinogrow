from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON

class FertilizerPrediction(SQLModel, table=True):
    """Model for storing fertilizer deficiency predictions"""
    __tablename__ = "fertilizer_predictions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    image_path: str
    prediction_result: str
    confidence_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    image_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    user_feedback: Optional[str] = None
    is_correct: Optional[bool] = None

class FertilizerAnalysis(SQLModel, table=True):
    """Model for storing detailed fertilizer analysis results"""
    __tablename__ = "fertilizer_analyses"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    image_path: str
    prediction_result: str
    confidence_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    image_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    nitrogen_level: float
    phosphorus_level: float
    deficiency_details: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    recommendations: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))