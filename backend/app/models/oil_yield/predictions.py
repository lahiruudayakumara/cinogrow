from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class OilYieldPrediction(SQLModel, table=True):
    __tablename__ = "oil_yield_predictions"

    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: int = Field(index=True)
    predicted_yield_ml: float
    predicted_yield_liters: float
    # input_summary fields
    dried_mass_kg: float
    species_variety: str = Field(max_length=100)
    harvesting_season: str = Field(max_length=100)
    # recommendation fields
    recommendation_primary: str
    recommendation_tips: str          # JSON-encoded list
    recommendation_quality: str = Field(max_length=50)
    predicted_at: datetime = Field(default_factory=datetime.utcnow)


