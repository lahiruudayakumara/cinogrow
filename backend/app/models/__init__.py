# Import all models to ensure they are registered with SQLModel
from .yield_weather.farm import Farm, Plot, FarmActivity, PlantingRecord, UserYieldRecord, YieldPrediction
from .yield_weather.weather import WeatherRecord, WeatherResponse, LocationRequest, WeatherData
from .yield_weather.farm_assistance import ActivityHistory
from .yield_weather.hybrid_yield import HybridYieldResult

# Import fertilizer history model (Roboflow only)
from .fertilizer_history import FertilizerHistory, FertilizerHistoryCreate, FertilizerHistoryResponse

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
    # Fertilizer models (Roboflow only)
    "FertilizerHistory",
    "FertilizerHistoryCreate",
    "FertilizerHistoryResponse"
]