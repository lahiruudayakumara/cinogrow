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
