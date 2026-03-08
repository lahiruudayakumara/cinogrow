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
    mass_kg: float
    dried_mass_kg: Optional[float] = Field(default=None, description="Dried weight (kg). Required for purchased; recorded later for own_farm.")
    plant_part: str = Field(max_length=100)
    plant_age_years: float
    harvest_season: str = Field(max_length=100)
    # Scene 1 = own_farm (user dries); Scene 2 = purchased (pre-dried by supplier)
    source: str = Field(max_length=20)
    # Processing pipeline stage: raw → drying → distilling → quality_check → complete
    process_stage: str = Field(max_length=20)
    created_at: datetime = Field(default_factory=datetime.utcnow)
