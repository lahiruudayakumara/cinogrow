# app/oil_yield/router.py
from fastapi import APIRouter, HTTPException, Depends
from .schemas import (
    OilYieldInput, OilYieldOutput, 
    DistillationTimeInput, DistillationTimeOutput,
    PriceForecastInput, PriceForecastOutput,
    MaterialBatchCreate, MaterialBatchUpdate, MaterialBatchRead,
    OilQualityInput, OilQualityOutput
)
from .model import load_model
from .distillation_time_model import load_model as load_distillation_model
from .price_forecast_model import forecast_prices
from .oil_quality_model import load_model as load_quality_model
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
_cached_quality_model = None

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

def get_quality_model():
    """
    Get the oil quality prediction model, loading it if not already cached.
    """
    global _cached_quality_model
    if _cached_quality_model is None:
        logger.info("🔧 Loading oil quality model...")
        _cached_quality_model = load_quality_model()
    return _cached_quality_model

@router.post("/predict", response_model=OilYieldOutput)
def predict_yield(data: OilYieldInput):
    """
    Predict leaf oil yield based on cinnamon characteristics.

    Parameters:
    - dried_mass_kg: Leaf dry weight in kilograms
    - species_variety: Cinnamon species (Sri Gemunu or Sri Vijaya)
    - harvesting_season: Harvesting season (January-May or June-December)

    Returns predicted oil yield in liters.
    """
    model = get_model()

    # Encode categorical features
    species_encoded = 0 if data.species_variety == "Sri Gemunu" else 1
    season_encoded = 0 if data.harvesting_season == "January-May" else 1

    # Feature vector: [Leaf_Dry_Weight_kg, species_encoded, season_encoded]
    X = np.array([[
        data.dried_mass_kg,
        species_encoded,
        season_encoded,
    ]])

    # Make prediction
    prediction = model.predict(X)[0]

    return {
        "predicted_yield_liters": round(float(prediction), 2),
        "input_summary": {
            "dried_mass_kg": data.dried_mass_kg,
            "species_variety": data.species_variety,
            "harvesting_season": data.harvesting_season,
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

@router.post("/quality", response_model=OilQualityOutput)
def predict_oil_quality(data: OilQualityInput):
    """
    Predict oil quality score based on batch characteristics.

    Inputs include cinnamon type, plant part, mass, plant age, season,
    and observed sensory properties (color, clarity, aroma).
    """
    model = get_quality_model()

    # Encode categorical features consistent with training
    cinnamon_type_encoded = 0 if data.cinnamon_type == "Sri Gamunu" else 1
    plant_part_encoded = 0 if data.plant_part == "Featherings & Chips" else 1
    season_map = {"January": 0, "April": 1, "July": 2, "October": 3}
    color_map = {"pale_yellow": 0, "golden": 1, "amber": 2, "dark": 3}
    clarity_map = {"clear": 0, "slightly_cloudy": 1, "cloudy": 2}
    aroma_map = {"mild": 0, "aromatic": 1, "pungent": 2}

    season_encoded = season_map[data.harvest_season]
    color_encoded = color_map[data.color]
    clarity_encoded = clarity_map[data.clarity]
    aroma_encoded = aroma_map[data.aroma]

    # Feature order must match training
    X = np.array([[
        data.mass_kg,
        data.plant_age_years,
        cinnamon_type_encoded,
        plant_part_encoded,
        season_encoded,
        color_encoded,
        clarity_encoded,
        aroma_encoded,
    ]])

    prediction = float(model.predict(X)[0])

    return {
        "predicted_quality_score": round(prediction, 2),
        "input_summary": {
            "cinnamon_type": data.cinnamon_type,
            "plant_part": data.plant_part,
            "mass_kg": data.mass_kg,
            "plant_age_years": data.plant_age_years,
            "harvest_season": data.harvest_season,
            "color": data.color,
            "clarity": data.clarity,
            "aroma": data.aroma,
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
        
        # Generate forecast with optional steps override
        steps_override = getattr(data, 'steps', None)
        result = forecast_prices(data.time_range, steps_override)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating forecast: {str(e)}"
        )


@router.post("/batch", response_model=MaterialBatchRead, status_code=201)
def create_material_batch(payload: MaterialBatchCreate, session: Session = Depends(get_session)):
    """
    Create a material batch record for oil yield processing.

    **Scene 1 – Own Farm** (`source="own_farm"`):
    - User harvests and dries the bark themselves.
    - `dried_mass_kg` is optional at creation; update it later once drying is complete.
    - `process_stage` defaults to `"raw"` if not supplied.

    **Scene 2 – Purchased** (`source="purchased"`):
    - Bark was already dried by a supplier before purchase.
    - `dried_mass_kg` should be provided (equals purchase weight).
    - `process_stage` defaults to `"distilling"` (drying stage is auto-completed).

    **Fields:**
    - `batch_name`: Optional label for the batch
    - `cinnamon_type`: Variety / type of cinnamon
    - `mass_kg`: Raw/fresh weight at intake (kg)
    - `dried_mass_kg`: Weight after drying (kg) — required for purchased, optional for own_farm
    - `plant_part`: Plant part harvested
    - `plant_age_years`: Age of tree at harvest
    - `harvest_season`: Season description
    - `source`: `"own_farm"` | `"purchased"`
    - `process_stage`: `"raw"` | `"drying"` | `"distilling"` | `"quality_check"` | `"complete"`
    """
    # Derive sensible defaults based on source
    if payload.source == "purchased":
        stage = payload.process_stage or "distilling"
        # For purchased batches, dried_mass_kg defaults to mass_kg if not supplied
        dried_kg = payload.dried_mass_kg if payload.dried_mass_kg is not None else payload.mass_kg
    else:
        stage = payload.process_stage or "raw"
        dried_kg = payload.dried_mass_kg  # may be None; can be patched later

    try:
        MaterialBatch.__table__.create(session.get_bind(), checkfirst=True)

        batch = MaterialBatch(
            batch_name=payload.batch_name,
            cinnamon_type=payload.cinnamon_type,
            mass_kg=payload.mass_kg if payload.mass_kg is not None else 0.0,
            dried_mass_kg=dried_kg,
            harvest_season=payload.harvest_season,
            source=payload.source,
            process_stage=stage,
        )
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return batch
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create material batch: {str(e)}")


@router.put("/batch/{batch_id}", response_model=MaterialBatchRead)
def update_material_batch(
    batch_id: int,
    payload: MaterialBatchUpdate,
    session: Session = Depends(get_session),
):
    """
    Partially update a material batch (all fields optional).

    Common use cases:
    - **Record dried weight** (own_farm): set `dried_mass_kg` — automatically advances
      `process_stage` from `drying` → `distilling` if not overridden.
    - **Advance pipeline stage**: set `process_stage` to the next stage value.
    - **Edit any other field** without touching the rest.
    """
    batch = session.get(MaterialBatch, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Auto-advance stage when dried_mass_kg is recorded on an own_farm/drying batch
    if (
        "dried_mass_kg" in update_data
        and update_data["dried_mass_kg"] is not None
        and "process_stage" not in update_data
        and batch.source == "own_farm"
        and batch.process_stage == "drying"
    ):
        update_data["process_stage"] = "distilling"

    for field, value in update_data.items():
        setattr(batch, field, value)

    try:
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return batch
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update batch: {str(e)}")


@router.get("/batch", response_model=list[MaterialBatchRead])
def list_material_batches(
    source: str | None = None,
    process_stage: str | None = None,
    session: Session = Depends(get_session),
):
    """
    List all material batch records, newest first.

    **Optional query filters:**
    - `source`: Filter by batch origin — `own_farm` or `purchased`
    - `process_stage`: Filter by current pipeline stage — `raw`, `drying`, `distilling`, `quality_check`, `complete`

    Returns a list of `MaterialBatchRead` items.
    """
    try:
        MaterialBatch.__table__.create(session.get_bind(), checkfirst=True)

        stmt = select(MaterialBatch)
        if source:
            stmt = stmt.where(MaterialBatch.source == source)
        if process_stage:
            stmt = stmt.where(MaterialBatch.process_stage == process_stage)
        stmt = stmt.order_by(MaterialBatch.created_at.desc())

        results = session.exec(stmt).all()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list material batches: {str(e)}")
