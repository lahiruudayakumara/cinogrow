from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON

class FertilizerBase(SQLModel):
    image_path: str
    prediction_result: str
    confidence_score: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    image_metadata: Optional[str] = Field(default=None, sa_column=Column("image_metadata", JSON))

class FertilizerPrediction(FertilizerBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_feedback: Optional[str] = None
    is_correct: Optional[bool] = None

class FertilizerAnalysis(FertilizerBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nitrogen_level: float
    phosphorus_level: float
    deficiency_details_json: Optional[str] = Field(default=None, sa_column=Column("deficiency_details", JSON))
    recommendations_json: Optional[str] = Field(default=None, sa_column=Column("recommendations", JSON))