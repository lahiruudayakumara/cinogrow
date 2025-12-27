from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class MaterialBatch(SQLModel, table=True):
    __tablename__ = "oil_material_batches"

    id: Optional[int] = Field(default=None, primary_key=True)
    batch_name: Optional[str] = Field(default=None, max_length=120)
    cinnamon_type: str = Field(max_length=100)
    mass_kg: float
    plant_part: str = Field(max_length=100)
    plant_age_years: float
    harvest_season: str = Field(max_length=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
