"""
Oil Price Forecasting Service

This service wraps the LightGBM-based price forecasting model to provide
price predictions for cinnamon oil using the CSV dataset.
"""

import logging
from pathlib import Path
from typing import Dict, List
import numpy as np

logger = logging.getLogger(__name__)


def get_price_forecast() -> Dict:
    """
    Generate a 4-week cinnamon leaf oil price forecast using LightGBM.
    
    This function:
    1. Loads historical price data from CSV
    2. Runs the full forecasting pipeline with feature engineering
    3. Generates conformal prediction intervals
    4. Produces a confidence-weighted trading signal
    5. Returns structured forecast with decision support
    
    Returns
    -------
    Dict with keys:
        - 'forecast': List[float] — 4-week point predictions (LKR/kg)
        - 'dates': List[str] — ISO date strings for forecast period
        - 'statistics': Dict — aggregate statistics and decision signal
            - 'mean': float — average forecast price
            - 'min': float — minimum forecast price
            - 'max': float — maximum forecast price
            - 'std': float — standard deviation of forecasts
            - 'trend': str — "UP", "DOWN", or "FLAT/UNCERTAIN"
            - 'signal': str — "HOLD", "SELL", or "WATCH"
            - 'confidence': float — signal confidence score [0, 2]
    
    Raises
    ------
    FileNotFoundError
        If CSV dataset cannot be located
    Exception
        If model training or inference fails (returns fallback forecast)
    
    Notes
    -----
    - Data source: backend/app/database/oil/oil_price.csv
    - Historical range: Jan 2017 – present (526+ weekly observations)
    - Model: LightGBM Regressor with split-conformal prediction intervals
    - Forecast: 4-week iterative recursive multi-step
    - CI method: Step-dependent scaled by √h (Papadopoulos et al. 2002)
    - Signal: OLS-slope with bootstrap confidence weighting
    """
    try:
        # Import here to avoid circular imports and defer expensive model loading
        from training_scripts.oil_yield.price_forecast_model import forecast_prices
        
        logger.info("🔮 Generating oil price forecast...")
        
        # Call the wrapper function with default 4-week horizon
        result = forecast_prices(time_range="weeks", steps=4)
        
        logger.info(f"✅ Price forecast generated successfully")
        return result
        
    except FileNotFoundError as e:
        logger.warning(f"⚠️  Price dataset not found: {e}")
        return _fallback_forecast(message="Dataset not available")
    except Exception as e:
        logger.error(f"❌ Error generating price forecast: {e}")
        return _fallback_forecast(message=str(e))


def _fallback_forecast(message: str = "") -> Dict:
    """
    Return a safe default forecast when model inference fails.
    
    This is used as a graceful degradation to prevent API crashes
    while still providing structure for downstream consumers.
    """
    from datetime import datetime, timedelta
    
    now = datetime.now()
    base_price = 5200.0  # LKR/kg — reasonable recent average
    
    forecast_list = []
    dates_list = []
    prices_list = []
    
    for i in range(4):
        date = now + timedelta(weeks=i + 1)
        # Slight upward trend with noise for realistic default
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
    """
    Validate forecast result structure against expected schema.
    
    Parameters
    ----------
    result : Dict
        Result from forecast_prices or fallback function
    
    Returns
    -------
    bool
        True if result is valid, False otherwise
    """
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
