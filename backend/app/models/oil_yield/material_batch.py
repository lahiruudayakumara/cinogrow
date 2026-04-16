from typing import Optional, Literal
from datetime import datetime
from sqlmodel import SQLModel, Field

# Valid values for process_stage
PROCESS_STAGES = ("raw", "drying", "distilling", "quality_check", "complete")


class MaterialBatch(SQLModel, table=True):
    __tablename__ = "oil_material_batches"

    id: Optional[int] = Field(default=None, primary_key=True)
    batch_name: Optional[str] = Field(default=None, max_length=120)
    cinnamon_type: str = Field(max_length=100)
    mass_kg: float = Field(default=0.0)
    dried_mass_kg: Optional[float] = Field(default=None, description="Dried weight (kg). Required for purchased; recorded later for own_farm.")
    plant_age_years: Optional[float] = Field(default=0.0)
    harvest_season: str = Field(max_length=100)
    source: str = Field(max_length=20)
    process_stage: str = Field(max_length=20)
    created_at: datetime = Field(default_factory=datetime.utcnow)
