import logging
import numpy as np
from typing import Dict

logger = logging.getLogger(__name__)


def get_price_forecast() -> Dict:
    from training_scripts.oil_yield.price_forecast_model import forecast_prices
    result = forecast_prices(time_range="weeks", steps=4)
    return result