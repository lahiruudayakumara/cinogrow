# app/oil_yield/schemas.py
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

class OilYieldInput(BaseModel):
    dried_mass_kg: float = Field(..., description="Leaf dry weight in kilograms", gt=0)
    species_variety: Literal["Sri Gemunu", "Sri Vijaya"] = Field(..., description="Cinnamon species and variety")
    harvesting_season: Literal["January-May", "June-December"] = Field(..., description="Harvesting season")

class OilYieldOutput(BaseModel):
    predicted_yield_liters: float = Field(..., description="Predicted oil yield in liters")
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
        description="Raw/fresh mass of material in kilograms. Optional for own_farm, required for purchased."
    )
    dried_mass_kg: float | None = Field(
        None, gt=0,
        description="Dried weight (kg). Required when source='purchased'; can be omitted for own_farm and updated later."
    )
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
    harvest_season: str
    source: str
    process_stage: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --------------------------
# Prediction Storage Schemas
# --------------------------

class OilYieldPredictionCreate(BaseModel):
    batch_id: int
    predicted_yield_ml: float
    predicted_yield_liters: float
    input_summary: dict
    recommendation: dict
    predicted_at: str


class OilYieldPredictionRead(BaseModel):
    id: int
    batch_id: int
    predicted_yield_ml: float
    predicted_yield_liters: float
    dried_mass_kg: float
    species_variety: str
    harvesting_season: str
    recommendation_primary: str
    recommendation_tips: str
    recommendation_quality: str
    predicted_at: datetime

    model_config = {"from_attributes": True}




