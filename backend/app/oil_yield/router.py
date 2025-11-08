# app/oil_yield/router.py
from fastapi import APIRouter
from .schemas import OilYieldInput, OilYieldOutput
from .model import load_model
import numpy as np

router = APIRouter(prefix="/oil_yield", tags=["Oil Yield"])

model = load_model()

@router.post("/predict", response_model=OilYieldOutput)
def predict_yield(data: OilYieldInput):
    X = np.array([[data.cinnamon_type, data.plant_part, data.mass, data.still_capacity]])
    prediction = model.predict(X)[0]
    return {"predicted_yield": round(float(prediction), 2)}
