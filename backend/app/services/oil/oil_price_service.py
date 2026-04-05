import logging
import numpy as np
from typing import Dict

logger = logging.getLogger(__name__)


def get_price_forecast() -> Dict:
    try:
        from training_scripts.oil_yield.price_forecast_model import forecast_prices
        result = forecast_prices(time_range="weeks", steps=4)
        return result
    except FileNotFoundError as e:
        logger.warning(f"Price dataset not found: {e}")
        return _fallback_forecast(message="Dataset not available")
    except Exception as e:
        logger.error(f"Error generating price forecast: {e}")
        return _fallback_forecast(message=str(e))


def _fallback_forecast(message: str = "") -> Dict:
    from datetime import datetime, timedelta

    now = datetime.now()
    base_price = 5200.0

    forecast_list = []
    dates_list = []
    prices_list = []

    for i in range(4):
        date = now + timedelta(weeks=i + 1)
        price = base_price + (i * 25) + np.random.normal(0, 50)
        forecast_list.append(float(price))
        prices_list.append(float(price))
        dates_list.append(date.strftime("%Y-%m-%d"))

    return {
        "forecast": forecast_list,
        "dates": dates_list,
        "statistics": {
            "mean": float(np.mean(prices_list)),
            "min": float(np.min(prices_list)),
            "max": float(np.max(prices_list)),
            "std": float(np.std(prices_list)),
            "trend": "UNCERTAIN",
            "signal": "WATCH",
            "confidence": 0.0,
            "note": f"Fallback forecast — {message}" if message else "Fallback forecast"
        }
    }


def validate_forecast_result(result: Dict) -> bool:
    required_keys = {"forecast", "dates", "statistics"}
    if not required_keys.issubset(result.keys()):
        logger.error(f"Missing required keys: {required_keys - set(result.keys())}")
        return False

    forecast = result.get("forecast", [])
    dates = result.get("dates", [])

    if len(forecast) != len(dates):
        logger.error(f"Forecast/dates length mismatch: {len(forecast)} vs {len(dates)}")
        return False

    if not all(isinstance(p, (int, float)) for p in forecast):
        logger.error("Forecast contains non-numeric values")
        return False

    if any(p < 0 for p in forecast):
        logger.error("Forecast contains negative prices")
        return False

    return True