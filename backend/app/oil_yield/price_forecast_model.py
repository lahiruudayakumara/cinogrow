# app/oil_yield/price_forecast_model.py
import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Paths
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "DEMO_cinnamon_leaf_oil_prices.csv"

def load_price_data():
    """
    Load historical cinnamon leaf oil price data.
    """
    df = pd.read_csv(DATA_PATH)
    df['date'] = pd.to_datetime(df['date'], format='%m/%d/%Y')
    df = df.sort_values('date')
    df.set_index('date', inplace=True)
    return df

def forecast_prices(time_range: str = 'months'):
    """
    Generate price forecast using SARIMA model.
    
    Parameters:
    - time_range: 'days', 'months', or 'years'
    
    Returns:
    - forecast: List of forecasted prices
    - dates: List of forecast dates
    - statistics: Dictionary with mean, min, max values
    """
    # Load data
    df = load_price_data()
    prices = df['cinnamon_leaf_oil_price_Rs']
    
    # Determine forecast parameters based on time range
    if time_range == 'days':
        steps = 30
        freq = 'D'
        # For daily forecast, use simpler model due to limited data granularity
        order = (1, 0, 1)
        seasonal_order = (0, 0, 0, 0)  # No seasonal component
    elif time_range == 'years':
        steps = 5
        freq = 'Y'
        order = (1, 1, 1)
        seasonal_order = (1, 0, 0, 12)  # Simplified seasonal
    else:  # months (default)
        steps = 12
        freq = 'M'
        order = (1, 1, 1)
        seasonal_order = (1, 0, 0, 12)  # Simplified seasonal
    
    try:
        # Fit SARIMA model
        model = SARIMAX(
            prices,
            order=order,
            seasonal_order=seasonal_order,
            enforce_stationarity=False,
            enforce_invertibility=False
        )
        
        fitted_model = model.fit(disp=False, maxiter=200, method='lbfgs')
        
        # Generate forecast
        forecast_result = fitted_model.forecast(steps=steps)
        forecast_values = forecast_result.values
        
        # Ensure no negative prices and apply realistic bounds
        min_price = prices.min() * 0.8  # 20% below historical min
        max_price = prices.max() * 1.2  # 20% above historical max
        forecast_values = np.clip(forecast_values, min_price, max_price)
        forecast_values = forecast_values.tolist()
        
        # Generate dates based on time range
        last_date = df.index[-1]
        if time_range == 'days':
            forecast_dates = pd.date_range(
                start=last_date + pd.Timedelta(days=1),
                periods=steps,
                freq='D'
            )
        elif time_range == 'years':
            forecast_dates = pd.date_range(
                start=last_date + pd.DateOffset(years=1),
                periods=steps,
                freq='YS'
            )
        else:  # months
            forecast_dates = pd.date_range(
                start=last_date + pd.DateOffset(months=1),
                periods=steps,
                freq='MS'
            )
        
        # Convert dates to string format
        dates_str = [date.strftime('%Y-%m-%d') for date in forecast_dates]
        
        # Calculate statistics
        statistics = {
            'mean': float(np.mean(forecast_values)),
            'min': float(np.min(forecast_values)),
            'max': float(np.max(forecast_values))
        }
        
        # Round forecast values to 2 decimal places
        forecast_values = [round(val, 2) for val in forecast_values]
        
        return {
            'forecast': forecast_values,
            'dates': dates_str,
            'statistics': statistics
        }
        
    except Exception as e:
        print(f"❌ SARIMA model error: {str(e)}")
        # Fallback: Use exponential smoothing with realistic bounds
        last_price = prices.iloc[-1]
        mean_price = prices.mean()
        std_price = prices.std()
        
        # Simple trend calculation
        recent_prices = prices.iloc[-5:]
        trend = (recent_prices.iloc[-1] - recent_prices.iloc[0]) / len(recent_prices)
        
        forecast_values = []
        for i in range(1, steps + 1):
            # Exponential smoothing with trend
            alpha = 0.3  # Smoothing factor
            forecast_price = last_price + (trend * i * alpha)
            
            # Add controlled variation
            noise = np.random.normal(0, std_price * 0.05)
            forecast_price += noise
            
            # Mean reversion (prices tend to return to historical mean over time)
            reversion_factor = 0.1 * (i / steps)
            forecast_price = (1 - reversion_factor) * forecast_price + reversion_factor * mean_price
            
            # Ensure realistic bounds
            forecast_price = max(mean_price * 0.7, min(mean_price * 1.3, forecast_price))
            
            forecast_values.append(round(float(forecast_price), 2))
        
        # Generate dates
        last_date = df.index[-1]
        if time_range == 'days':
            forecast_dates = pd.date_range(
                start=last_date + pd.Timedelta(days=1),
                periods=steps,
                freq='D'
            )
        elif time_range == 'years':
            forecast_dates = pd.date_range(
                start=last_date + pd.DateOffset(years=1),
                periods=steps,
                freq='YS'
            )
        else:
            forecast_dates = pd.date_range(
                start=last_date + pd.DateOffset(months=1),
                periods=steps,
                freq='MS'
            )
        
        dates_str = [date.strftime('%Y-%m-%d') for date in forecast_dates]
        
        statistics = {
            'mean': float(np.mean(forecast_values)),
            'min': float(np.min(forecast_values)),
            'max': float(np.max(forecast_values))
        }
        
        return {
            'forecast': forecast_values,
            'dates': dates_str,
            'statistics': statistics
        }

# --- Test the model if executed directly ---
if __name__ == "__main__":
    print("🧪 Testing SARIMA Price Forecast Model\n")
    
    for time_range in ['days', 'months', 'years']:
        print(f"\n📊 Forecast for {time_range.upper()}:")
        result = forecast_prices(time_range)
        print(f"   - Forecast points: {len(result['forecast'])}")
        print(f"   - Average price: Rs {result['statistics']['mean']:.2f}")
        print(f"   - Min price: Rs {result['statistics']['min']:.2f}")
        print(f"   - Max price: Rs {result['statistics']['max']:.2f}")
        print(f"   - First 3 predictions: {result['forecast'][:3]}")
        print(f"   - First 3 dates: {result['dates'][:3]}")
