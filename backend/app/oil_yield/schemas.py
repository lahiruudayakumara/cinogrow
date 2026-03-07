# app/oil_yield/schemas.py
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

class OilYieldInput(BaseModel):
    dried_mass_kg: float = Field(..., description="Dried mass of cinnamon in kilograms", gt=0)
    species_variety: Literal["Sri Gemunu", "Sri Vijaya"] = Field(..., description="Cinnamon species and variety")
    plant_part: Literal["Leaves & Twigs", "Featherings & Chips"] = Field(..., description="Part of the plant used")
    age_years: float = Field(..., description="Age of the plant in years", gt=0)
    harvesting_season: Literal["May–August", "October–December/January"] = Field(..., description="Harvesting season")

class OilYieldOutput(BaseModel):
    predicted_yield_liters: float = Field(..., description="Predicted oil yield in liters")
    input_summary: dict = Field(..., description="Summary of input parameters")

class DistillationTimeInput(BaseModel):
    plant_part: Literal["Leaves & Twigs", "Featherings & Chips"] = Field(..., description="Part of the plant used")
    cinnamon_type: Literal["Sri Gamunu", "Sri Wijaya"] = Field(..., description="Cinnamon type")
    distillation_capacity_liters: float = Field(..., description="Distillation capacity in liters", gt=0)

class DistillationTimeOutput(BaseModel):
    predicted_time_hours: float = Field(..., description="Predicted distillation time in hours")
    input_summary: dict = Field(..., description="Summary of input parameters")

class PriceForecastInput(BaseModel):
    oil_type: Literal["Leaf", "Bark"] = Field(..., description="Type of cinnamon oil")
    time_range: Literal["days", "months", "years"] = Field(..., description="Forecast time range")
    steps: int | None = Field(None, description="Override the default number of forecast steps for the given range")

class PriceForecastOutput(BaseModel):
    forecast: list[float] = Field(..., description="List of forecasted prices")
    dates: list[str] = Field(..., description="List of forecast dates")
    statistics: dict = Field(..., description="Forecast statistics (mean, min, max)")


# --------------------------
# Material Batch Schemas
# --------------------------

_BATCH_SOURCE      = Literal["own_farm", "purchased"]
_PROCESS_STAGE     = Literal["raw", "drying", "distilling", "quality_check", "complete"]


class MaterialBatchCreate(BaseModel):
    batch_name: str | None = Field(None, description="Optional batch name for identification")
    cinnamon_type: str = Field(..., description="Cinnamon type or variety")
    mass_kg: float | None = Field(
        None, ge=0,
        description="Raw/fresh mass of material in kilograms. Omit or set to 0 for own_farm batches — actual weight is recorded later as dried_mass_kg."
    )
    dried_mass_kg: float | None = Field(
        None, gt=0,
        description="Dried weight (kg). Required when source='purchased'; can be omitted for own_farm and updated later."
    )
    plant_part: str = Field(..., description="Plant part used")
    plant_age_years: float = Field(..., gt=0, description="Age of the plant in years")
    harvest_season: str = Field(..., description="Harvest season description")
    source: _BATCH_SOURCE = Field(
        "own_farm",
        description="'own_farm' – user dries the bark themselves; 'purchased' – bark already dried by supplier."
    )
    process_stage: _PROCESS_STAGE | None = Field(
        None,
        description=(
            "Current pipeline stage. Defaults to 'raw' for own_farm or 'distilling' for purchased "
            "(drying already completed externally). "
            "Allowed values: raw, drying, distilling, quality_check, complete."
        )
    )


class MaterialBatchUpdate(BaseModel):
    """All fields optional — only provided fields are applied (partial update)."""
    batch_name: str | None = Field(None, description="Optional batch name")
    cinnamon_type: str | None = Field(None, description="Cinnamon type or variety")
    mass_kg: float | None = Field(None, gt=0, description="Raw/fresh mass (kg)")
    dried_mass_kg: float | None = Field(None, gt=0, description="Dried weight (kg)")
    plant_part: str | None = Field(None, description="Plant part used")
    plant_age_years: float | None = Field(None, gt=0, description="Age of the plant in years")
    harvest_season: str | None = Field(None, description="Harvest season description")
    source: _BATCH_SOURCE | None = Field(None, description="'own_farm' or 'purchased'")
    process_stage: _PROCESS_STAGE | None = Field(
        None,
        description="Pipeline stage: raw, drying, distilling, quality_check, complete"
    )


class MaterialBatchRead(BaseModel):
    id: int
    batch_name: str | None
    cinnamon_type: str
    mass_kg: float
    dried_mass_kg: float | None
    plant_part: str
    plant_age_years: float
    harvest_season: str
    source: str
    process_stage: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --------------------------
# Oil Quality Schemas
# --------------------------
class OilQualityInput(BaseModel):
    cinnamon_type: Literal["Sri Gamunu", "Sri Wijaya"] = Field(..., description="Cinnamon type or variety")
    plant_part: Literal["Leaves & Twigs", "Featherings & Chips"] = Field(..., description="Part of the plant used")
    mass_kg: float = Field(..., description="Mass of material in kilograms")
    plant_age_years: float = Field(..., gt=0, description="Age of the plant in years")
    harvest_season: Literal["January", "April", "July", "October"] = Field(..., description="Harvest season month")
    color: Literal["pale_yellow", "golden", "amber", "dark"] = Field(..., description="Oil color observed")
    clarity: Literal["clear", "slightly_cloudy", "cloudy"] = Field(..., description="Oil clarity observed")
    aroma: Literal["mild", "aromatic", "pungent"] = Field(..., description="Oil aroma intensity/type")


class OilQualityOutput(BaseModel):
    predicted_quality_score: float = Field(..., description="Predicted quality score (0-100)")
    input_summary: dict = Field(..., description="Summary of input parameters")
