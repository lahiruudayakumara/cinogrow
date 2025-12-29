# app/oil_yield/router.py
from fastapi import APIRouter, HTTPException, Depends
from .schemas import (
    OilYieldInput, OilYieldOutput, 
    DistillationTimeInput, DistillationTimeOutput,
    PriceForecastInput, PriceForecastOutput,
    MaterialBatchCreate, MaterialBatchRead
)
from .model import load_model
from .distillation_time_model import load_model as load_distillation_model
from .price_forecast_model import forecast_prices
import numpy as np
import logging
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.oil_yield.material_batch import MaterialBatch

router = APIRouter(prefix="/oil_yield", tags=["Oil Yield"])
logger = logging.getLogger(__name__)

# Global variable to cache the model
_cached_model = None
_cached_distillation_model = None

def get_model():
    """
    Get the XGBoost model, loading it if not already cached.
    This avoids loading the model during import.
    """
    global _cached_model
    if _cached_model is None:
        logger.info("🔧 Loading XGBoost model for oil yield prediction...")
        _cached_model = load_model()
    return _cached_model

def get_distillation_model():
    """
    Get the distillation time model, loading it if not already cached.
    """
    global _cached_distillation_model
    if _cached_distillation_model is None:
        logger.info("🔧 Loading distillation time model...")
        _cached_distillation_model = load_distillation_model()
    return _cached_distillation_model

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
    model = get_model()

    # Encode categorical features
    species_encoded = 0 if data.species_variety == "Sri Gemunu" else 1
    plant_part_encoded = 0 if data.plant_part == "Featherings & Chips" else 1
    season_encoded = 0 if data.harvesting_season == "May–August" else 1

    # Build features based on model expectation to avoid shape mismatch
    try:
        n_features = getattr(model, "n_features_in_", None)
    except Exception:
        n_features = None

    if n_features == 4:
        # Older model without season feature: [mass, species, part, age]
        X = np.array([[
            data.dried_mass_kg,
            species_encoded,
            plant_part_encoded,
            data.age_years,
        ]])
        logger.info("Using 4-feature input vector for oil yield model (season excluded)")
    else:
        # Default/newer model with season feature: [mass, species, part, age, season]
        X = np.array([[
            data.dried_mass_kg,
            species_encoded,
            plant_part_encoded,
            data.age_years,
            season_encoded
        ]])
        if n_features is not None and n_features != 5:
            logger.warning(f"Model expects {n_features} features; attempting with 5-feature vector.")

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
    distillation_model = get_distillation_model()
    
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


@router.post("/batch", response_model=MaterialBatchRead)
def create_material_batch(payload: MaterialBatchCreate, session: Session = Depends(get_session)):
    """
    Create a material batch record for oil yield processing.

    Fields:
    - cinnamon_type: Cinnamon type or variety
    - mass_kg: Mass of material in kilograms
    - plant_part: Plant part used
    - plant_age_years: Age of the plant in years
    - harvest_season: Harvest season description
    """
    try:
        # Ensure table exists (in case app started before model import)
        MaterialBatch.__table__.create(session.get_bind(), checkfirst=True)

        batch = MaterialBatch(
            batch_name=payload.batch_name,
            cinnamon_type=payload.cinnamon_type,
            mass_kg=payload.mass_kg,
            plant_part=payload.plant_part,
            plant_age_years=payload.plant_age_years,
            harvest_season=payload.harvest_season,
        )
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return batch
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create material batch: {str(e)}")


@router.get("/batch", response_model=list[MaterialBatchRead])
def list_material_batches(session: Session = Depends(get_session)):
    """
    List all material batch records, newest first.

    Returns a list of `MaterialBatchRead` items.
    """
    try:
        # Ensure table exists
        MaterialBatch.__table__.create(session.get_bind(), checkfirst=True)

        stmt = select(MaterialBatch).order_by(MaterialBatch.created_at.desc())
        results = session.exec(stmt).all()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list material batches: {str(e)}")
