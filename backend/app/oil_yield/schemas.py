# app/oil_yield/schemas.py
from pydantic import BaseModel

class OilYieldInput(BaseModel):
    cinnamon_type: int
    plant_part: int
    mass: float
    still_capacity: float

class OilYieldOutput(BaseModel):
    predicted_yield: float
