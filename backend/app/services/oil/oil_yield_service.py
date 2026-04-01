import logging
import numpy as np
from typing import Dict

logger = logging.getLogger(__name__)

_cached_model = None


def _get_model():
    global _cached_model
    if _cached_model is None:
        from training_scripts.oil_yield.oil_yield_model import load_model
        _cached_model = load_model()
    return _cached_model


def predict_oil_yield(
    dried_mass_kg: float,
    species_variety: str,
    harvesting_season: str
) -> float:
    if dried_mass_kg <= 0:
        raise ValueError("dried_mass_kg must be greater than 0")

    if species_variety not in ["Sri Gemunu", "Sri Vijaya"]:
        raise ValueError(f"Invalid species_variety: {species_variety}")

    if harvesting_season not in ["January-May", "June-December"]:
        raise ValueError(f"Invalid harvesting_season: {harvesting_season}")

    species_encoded = 0 if species_variety == "Sri Gemunu" else 1
    season_encoded  = 0 if harvesting_season == "January-May" else 1

    X = np.array([[dried_mass_kg, species_encoded, season_encoded]])

    model = _get_model()
    prediction = round(float(model.predict(X)[0]), 2)

    return prediction


def get_prediction_summary(
    dried_mass_kg: float,
    species_variety: str,
    harvesting_season: str,
    predicted_yield_kg: float
) -> Dict:
    return {
        "input_summary": {
            "dried_mass_kg": dried_mass_kg,
            "species_variety": species_variety,
            "harvesting_season": harvesting_season,
        },
        "predicted_yield_kg": predicted_yield_kg,
    }