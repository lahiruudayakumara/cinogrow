# Import all models to ensure they are registered with SQLModel
from .yield_weather.farm import Farm, Plot, FarmActivity, PlantingRecord, UserYieldRecord, YieldPrediction
from .yield_weather.weather import WeatherRecord, WeatherResponse, LocationRequest, WeatherData
from .yield_weather.farm_assistance import ActivityHistory
from .yield_weather.hybrid_yield import HybridYieldResult

# Import fertilizer prediction models
from .fertilizer_predictions import FertilizerPrediction, FertilizerAnalysis

# Import fertilizer models from fertilizer package
from .fertilizer.fertilizer import (
    FertilizerType,
    FertilizerApplication,
    FertilizerSchedule,
    FertilizerRecommendation
)

from .user import User

__all__ = [
    "Farm", 
    "Plot", 
    "FarmActivity", 
    "PlantingRecord",
    "UserYieldRecord",
    "YieldPrediction",
    "WeatherRecord", 
    "WeatherResponse", 
    "LocationRequest",
    "WeatherData",
    "ActivityHistory",
    # Fertilizer models
    "FertilizerPrediction",
    "FertilizerAnalysis",
    "FertilizerType",
    "FertilizerApplication",
    "FertilizerSchedule",
    "FertilizerRecommendation"
]