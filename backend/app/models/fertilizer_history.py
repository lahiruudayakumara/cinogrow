from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class FertilizerHistory(SQLModel, table=True):
    """
    Simplified model for storing fertilizer analysis history
    """
    __tablename__ = "fertilizer_history"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Main analysis results
    deficiency: Optional[str] = Field(default=None, index=True)  # The class name from Roboflow
    severity: Optional[str] = Field(default=None, index=True)  # Low, Medium, High
    confidence: Optional[float] = None
    
    # Timestamp
    analyzed_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    
    class Config:
        arbitrary_types_allowed = True


class FertilizerHistoryCreate(SQLModel):
    """Schema for creating a new fertilizer history record"""
    deficiency: Optional[str] = None
    severity: Optional[str] = None
    confidence: Optional[float] = None


class FertilizerHistoryResponse(SQLModel):
    """Schema for fertilizer history response"""
    id: int
    deficiency: Optional[str]
    severity: Optional[str]
    confidence: Optional[float]
    analyzed_at: datetime
