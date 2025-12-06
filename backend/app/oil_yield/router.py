# app/oil_yield/router.py
from fastapi import APIRouter
from .schemas import OilYieldInput, OilYieldOutput
from .model import load_model
import numpy as np

router = APIRouter(prefix="/oil_yield", tags=["Oil Yield"])

model = load_model()

@router.post("/predict", response_model=OilYieldOutput)
def predict_yield(data: OilYieldInput):
    """
    Predict oil yield based on cinnamon characteristics.
    
    Parameters:
    - dried_mass_kg: Dried mass of cinnamon in kilograms
    - species_variety: Cinnamon species (Sri Gemunu or Sri Vijaya)
    - plant_part: Plant part used (Leaves & Twigs or Featherings & Chips)
    - age_years: Age of the plant in years
    - harvesting_season: Harvesting season
    
    Returns predicted oil yield in liters.
    """
    # Encode categorical features
    species_encoded = 0 if data.species_variety == "Sri Gemunu" else 1
    plant_part_encoded = 0 if data.plant_part == "Featherings & Chips" else 1
    season_encoded = 0 if data.harvesting_season == "May–August" else 1
    
    # Prepare feature array
    X = np.array([[
        data.dried_mass_kg,
        species_encoded,
        plant_part_encoded,
        data.age_years,
        season_encoded
    ]])
    
    # Make prediction
    prediction = model.predict(X)[0]
    
    return {
        "predicted_yield_liters": round(float(prediction), 2),
        "input_summary": {
            "dried_mass_kg": data.dried_mass_kg,
            "species_variety": data.species_variety,
            "plant_part": data.plant_part,
            "age_years": data.age_years,
            "harvesting_season": data.harvesting_season
        }
    }
