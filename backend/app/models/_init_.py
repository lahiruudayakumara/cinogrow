# Import all models to ensure they are registered with SQLModel

# Yield & Weather models
from .yield_weather.farm import Farm, Plot, FarmActivity, PlantingRecord
from .yield_weather.weather import WeatherRecord, WeatherResponse, LocationRequest, WeatherData
from .yield_weather.farm_assistance import ActivityHistory
from .yield_weather.tree import FertilizerType

# Fertilizer history models
from .fertilizer_history import FertilizerHistory, FertilizerHistoryCreate, FertilizerHistoryResponse

_all_ = [
    # Yield & Weather
    "Farm", 
    "Plot", 
    "FarmActivity", 
    "PlantingRecord",
    "WeatherRecord", 
    "WeatherResponse", 
    "LocationRequest",
    "WeatherData",
    "ActivityHistory",
    
    # Fertilizer  
    "FertilizerType",
    "FertilizerHistory",
    "FertilizerHistoryCreate",
    "FertilizerHistoryResponse"
]
