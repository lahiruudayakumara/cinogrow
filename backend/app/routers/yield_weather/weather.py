from fastapi import APIRouter, HTTPException, Query
from app.models.yield_weather.weather import LocationRequest, WeatherResponse
from app.services.yield_weather.weather_service import WeatherService

router = APIRouter(prefix="/weather", tags=["yield-weather-weather"])

def get_weather_service():
    """Lazy initialization of weather service"""
    return WeatherService()


@router.get("/current", response_model=WeatherResponse)
async def get_current_weather(
    latitude: float = Query(..., description="Latitude coordinate"),
    longitude: float = Query(..., description="Longitude coordinate")
):
    """
    Get current weather data for specified coordinates
    """
    try:
        weather_service = get_weather_service()
        result = await weather_service.get_current_weather(latitude, longitude)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/current", response_model=WeatherResponse)
async def get_current_weather_post(location: LocationRequest):
    """
    Get current weather data for specified coordinates (POST method)
    """
    try:
        weather_service = get_weather_service()
        result = await weather_service.get_current_weather(location.latitude, location.longitude)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/city", response_model=WeatherResponse)
async def get_weather_by_city(
    city: str = Query(..., description="City name (e.g., 'London' or 'London,UK')")
):
    """
    Get current weather data for specified city
    """
    try:
        weather_service = get_weather_service()
        result = await weather_service.get_weather_by_city(city)
        if not result.success:
            raise HTTPException(status_code=400, detail=result.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def weather_health_check():
    """
    Health check endpoint for weather service
    """
    return {
        "status": "healthy",
        "service": "weather",
        "message": "Weather service is running"
    }