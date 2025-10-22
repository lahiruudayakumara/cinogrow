# Import all models to ensure they are registered with SQLModel
from .yield_weather.farm import Farm, Plot, FarmActivity, PlantingRecord
from .yield_weather.weather import WeatherRecord, WeatherResponse, LocationRequest, WeatherData
from .yield_weather.farm_assistance import ActivityHistory

__all__ = [
    "Farm", 
    "Plot", 
    "FarmActivity", 
    "PlantingRecord",
    "WeatherRecord", 
    "WeatherResponse", 
    "LocationRequest",
    "WeatherData",
    "ActivityHistory"
]