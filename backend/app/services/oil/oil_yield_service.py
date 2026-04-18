import logging
import numpy as np
from typing import Dict

logger = logging.getLogger(__name__)

_cached_model = None


def predict_oil_yield(dried_mass_kg: float, species_variety: str, harvesting_season: str) -> Dict:
    global _cached_model
    
    # Normalize season format (handle both mobile app and backend formats)
    season_mapping = {
        "May–August": "June-December",
        "October–December/January": "January-May",
        "May-August": "June-December",
        "October-December/January": "January-May",
    }
    
    original_season = harvesting_season
    normalized_season = season_mapping.get(harvesting_season, harvesting_season)
    
    if dried_mass_kg <= 0:
        raise ValueError("dried_mass_kg must be greater than 0")
    if species_variety not in ["Sri Gemunu", "Sri Vijaya"]:
        raise ValueError(f"Invalid species_variety: {species_variety}")
    if normalized_season not in ["January-May", "June-December"]:
        raise ValueError(f"Invalid harvesting_season: {harvesting_season}")

    if _cached_model is None:
        from training_scripts.oil_yield.oil_yield_model import forecast_yield
        model_data = forecast_yield()
        _cached_model = model_data["model"]

    species_encoded = 0 if species_variety == "Sri Gemunu" else 1
    season_encoded = 0 if normalized_season == "January-May" else 1

    X = np.array([[dried_mass_kg, species_encoded, season_encoded]])
    prediction = round(float(_cached_model.predict(X)[0]), 2)

    return {
        "input_summary": {
            "dried_mass_kg": dried_mass_kg,
            "species_variety": species_variety,
            "harvesting_season": original_season,
        },
        "predicted_yield_kg": prediction,
    }