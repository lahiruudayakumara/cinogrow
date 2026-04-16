import logging
import numpy as np
from typing import Dict

logger = logging.getLogger(__name__)

_cached_model = None


def predict_oil_yield(dried_mass_kg: float, species_variety: str, harvesting_season: str) -> Dict:
    global _cached_model
    if dried_mass_kg <= 0:
        raise ValueError("dried_mass_kg must be greater than 0")
    if species_variety not in ["Sri Gemunu", "Sri Vijaya"]:
        raise ValueError(f"Invalid species_variety: {species_variety}")
    if harvesting_season not in ["January-May", "June-December"]:
        raise ValueError(f"Invalid harvesting_season: {harvesting_season}")

    if _cached_model is None:
        from training_scripts.oil_yield.oil_yield_model import forecast_yield
        _cached_model = forecast_yield()

    species_encoded = 0 if species_variety == "Sri Gemunu" else 1
    season_encoded = 0 if harvesting_season == "January-May" else 1

    X = np.array([[dried_mass_kg, species_encoded, season_encoded]])
    prediction = round(float(_cached_model.predict(X)[0]), 2)

    return {
        "input_summary": {
            "dried_mass_kg": dried_mass_kg,
            "species_variety": species_variety,
            "harvesting_season": harvesting_season,
        },
        "predicted_yield_kg": prediction,
    }