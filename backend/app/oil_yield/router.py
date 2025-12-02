# app/oil_yield/router.py
from fastapi import APIRouter
from .schemas import OilYieldInput, OilYieldOutput
from .model import load_model
import numpy as np
import logging

router = APIRouter(prefix="/oil_yield", tags=["Oil Yield"])
logger = logging.getLogger(__name__)

# Global variable to cache the model
_cached_model = None

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

@router.post("/predict", response_model=OilYieldOutput)
def predict_yield(data: OilYieldInput):
    model = get_model()
    X = np.array([[data.cinnamon_type, data.plant_part, data.mass, data.still_capacity]])
    prediction = model.predict(X)[0]
    return {"predicted_yield": round(float(prediction), 2)}
