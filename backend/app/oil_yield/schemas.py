# app/oil_yield/schemas.py
from pydantic import BaseModel, Field
from typing import Literal

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

class PriceForecastOutput(BaseModel):
    forecast: list[float] = Field(..., description="List of forecasted prices")
    dates: list[str] = Field(..., description="List of forecast dates")
    statistics: dict = Field(..., description="Forecast statistics (mean, min, max)")
