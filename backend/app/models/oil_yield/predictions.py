from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Float


class OilYieldPrediction(SQLModel, table=True):
    __tablename__ = "oil_yield_predictions"

    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: int = Field(index=True)
    # Map Python attribute predicted_yield_kg to existing DB column predicted_yield_ml
    predicted_yield_kg: float = Field(sa_column=Column("predicted_yield_ml", Float))
    # Legacy column kept for compatibility (non-null in DB); mirror the same value or default to 0.0
    predicted_yield_liters: float = Field(default=0.0)
    # Legacy non-null column in existing DB; we no longer use plant_part in the app
    # but keep it here with a safe default to satisfy the constraint.
    plant_part: str = Field(default="", max_length=100)
    dried_mass_kg: float
    species_variety: str = Field(max_length=100)
    age_years: float
    harvesting_season: str = Field(max_length=100)
    recommendation_primary: str
    recommendation_tips: str         
    recommendation_quality: str = Field(max_length=50)
    predicted_at: datetime = Field(default_factory=datetime.utcnow)