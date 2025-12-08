# app/oil_yield/router.py
from fastapi import APIRouter, HTTPException
from .schemas import (
    OilYieldInput, OilYieldOutput, 
    DistillationTimeInput, DistillationTimeOutput,
    PriceForecastInput, PriceForecastOutput
)
from .model import load_model
from .distillation_time_model import load_model as load_distillation_model
from .price_forecast_model import forecast_prices
import numpy as np

router = APIRouter(prefix="/oil_yield", tags=["Oil Yield"])

model = load_model()
distillation_model = load_distillation_model()

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

@router.post("/predict_distillation_time", response_model=DistillationTimeOutput)
def predict_distillation_time(data: DistillationTimeInput):
    """
    Predict distillation time based on plant characteristics and capacity.
    
    Parameters:
    - plant_part: Plant part used (Leaves & Twigs or Featherings & Chips)
    - cinnamon_type: Cinnamon type (Sri Gamunu or Sri Wijaya)
    - distillation_capacity_liters: Distillation capacity in liters
    
    Returns predicted distillation time in hours.
    """
    # Encode categorical features
    plant_part_encoded = 0 if data.plant_part == "Featherings & Chips" else 1
    cinnamon_type_encoded = 0 if data.cinnamon_type == "Sri Gamunu" else 1
    
    # Prepare feature array
    X = np.array([[
        plant_part_encoded,
        cinnamon_type_encoded,
        data.distillation_capacity_liters
    ]])
    
    # Make prediction
    prediction = distillation_model.predict(X)[0]
    
    return {
        "predicted_time_hours": round(float(prediction), 2),
        "input_summary": {
            "plant_part": data.plant_part,
            "cinnamon_type": data.cinnamon_type,
            "distillation_capacity_liters": data.distillation_capacity_liters
        }
    }

@router.post("/price_forecast", response_model=PriceForecastOutput)
def get_price_forecast(data: PriceForecastInput):
    """
    Generate price forecast using SARIMA time series model.
    
    Parameters:
    - oil_type: Type of cinnamon oil (Leaf or Bark)
    - time_range: Forecast period (days, months, or years)
    
    Returns:
    - forecast: List of forecasted prices
    - dates: Corresponding forecast dates
    - statistics: Mean, min, and max prices
    """
    try:
        # Currently only Leaf oil data is available
        if data.oil_type != "Leaf":
            raise HTTPException(
                status_code=400,
                detail="Only Leaf oil forecasting is currently supported"
            )
        
        # Generate forecast
        result = forecast_prices(data.time_range)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating forecast: {str(e)}"
        )
