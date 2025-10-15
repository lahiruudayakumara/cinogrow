import httpx
import os
from typing import Optional
from datetime import datetime
from sqlmodel import Session
from app.models.yield_weather.weather import WeatherData, WeatherResponse, WeatherRecord
from app.database import engine


class WeatherService:
    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY")
        self.base_url = os.getenv("OPENWEATHER_BASE_URL", "https://api.openweathermap.org/data/2.5")
        
        if not self.api_key:
            raise ValueError("OPENWEATHER_API_KEY environment variable is required")
    
    async def get_current_weather(self, latitude: float, longitude: float) -> WeatherResponse:
        """
        Get current weather data for given coordinates
        """
        try:
            async with httpx.AsyncClient() as client:
                # Get current weather
                current_url = f"{self.base_url}/weather"
                current_params = {
                    "lat": latitude,
                    "lon": longitude,
                    "appid": self.api_key,
                    "units": "metric"  # Use Celsius
                }
                
                current_response = await client.get(current_url, params=current_params)
                current_response.raise_for_status()
                current_data = current_response.json()
                
                # Extract rainfall data (from rain object if present)
                rainfall = 0.0
                if "rain" in current_data:
                    rainfall = current_data["rain"].get("1h", 0.0)  # Rain in last 1 hour
                
                # Create weather data object
                weather_data = WeatherData(
                    temperature=current_data["main"]["temp"],
                    feels_like=current_data["main"]["feels_like"],
                    humidity=current_data["main"]["humidity"],
                    pressure=current_data["main"]["pressure"],
                    wind_speed=current_data["wind"]["speed"],
                    wind_direction=current_data["wind"].get("deg", 0),
                    rainfall=rainfall,
                    weather_main=current_data["weather"][0]["main"],
                    weather_description=current_data["weather"][0]["description"],
                    icon=current_data["weather"][0]["icon"],
                    visibility=current_data.get("visibility", 10000) / 1000  # Convert to km
                )
                
                location_name = f"{current_data['name']}, {current_data['sys']['country']}"
                
                # Save weather data to database
                await self._save_weather_record(
                    weather_data, location_name, latitude, longitude
                )
                
                return WeatherResponse(
                    success=True,
                    data=weather_data,
                    message="Weather data retrieved successfully",
                    location=location_name
                )
                
        except httpx.HTTPStatusError as e:
            return WeatherResponse(
                success=False,
                message=f"Weather API error: {e.response.status_code}",
                location="Unknown"
            )
        except Exception as e:
            return WeatherResponse(
                success=False,
                message=f"Error retrieving weather data: {str(e)}",
                location="Unknown"
            )
    
    async def get_weather_by_city(self, city_name: str) -> WeatherResponse:
        """
        Get current weather data by city name
        """
        try:
            async with httpx.AsyncClient() as client:
                # Get current weather by city name
                current_url = f"{self.base_url}/weather"
                current_params = {
                    "q": city_name,
                    "appid": self.api_key,
                    "units": "metric"
                }
                
                current_response = await client.get(current_url, params=current_params)
                current_response.raise_for_status()
                current_data = current_response.json()
                
                # Extract rainfall data
                rainfall = 0.0
                if "rain" in current_data:
                    rainfall = current_data["rain"].get("1h", 0.0)
                
                # Create weather data object
                weather_data = WeatherData(
                    temperature=current_data["main"]["temp"],
                    feels_like=current_data["main"]["feels_like"],
                    humidity=current_data["main"]["humidity"],
                    pressure=current_data["main"]["pressure"],
                    wind_speed=current_data["wind"]["speed"],
                    wind_direction=current_data["wind"].get("deg", 0),
                    rainfall=rainfall,
                    weather_main=current_data["weather"][0]["main"],
                    weather_description=current_data["weather"][0]["description"],
                    icon=current_data["weather"][0]["icon"],
                    visibility=current_data.get("visibility", 10000) / 1000
                )
                
                location_name = f"{current_data['name']}, {current_data['sys']['country']}"
                
                # Save weather data to database
                await self._save_weather_record(
                    weather_data, location_name, 
                    current_data["coord"]["lat"], current_data["coord"]["lon"]
                )
                
                return WeatherResponse(
                    success=True,
                    data=weather_data,
                    message="Weather data retrieved successfully",
                    location=location_name
                )
                
        except httpx.HTTPStatusError as e:
            return WeatherResponse(
                success=False,
                message=f"Weather API error: {e.response.status_code}",
                location="Unknown"
            )
        except Exception as e:
            return WeatherResponse(
                success=False,
                message=f"Error retrieving weather data: {str(e)}",
                location="Unknown"
            )
    
    async def _save_weather_record(self, weather_data: WeatherData, location: str, latitude: float, longitude: float):
        """Save weather record to database"""
        try:
            with Session(engine) as session:
                weather_record = WeatherRecord(
                    location=location,
                    latitude=latitude,
                    longitude=longitude,
                    temperature=weather_data.temperature,
                    feels_like=weather_data.feels_like,
                    humidity=weather_data.humidity,
                    pressure=weather_data.pressure,
                    wind_speed=weather_data.wind_speed,
                    wind_direction=weather_data.wind_direction,
                    rainfall=weather_data.rainfall,
                    weather_main=weather_data.weather_main,
                    weather_description=weather_data.weather_description,
                    icon=weather_data.icon,
                    visibility=weather_data.visibility,
                    recorded_at=datetime.utcnow()
                )
                session.add(weather_record)
                session.commit()
        except Exception as e:
            print(f"Error saving weather record: {e}")