import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from statsmodels.tsa.arima.model import ARIMA
import kagglehub
from kagglehub import KaggleDatasetAdapter

BASE = Path(__file__).resolve().parent
MODEL_FILE = BASE / "price_forecast.pkl"

def load_data():
    df = kagglehub.load_dataset(
        KaggleDatasetAdapter.PANDAS,
        "malmiwithanage/cinnamon-leaf-oil-prices",
        "price_data.csv",
    )
    if df is None:
        raise FileNotFoundError("Could not load price data from Kaggle dataset.")
    df["price_lkr"] = df["price_lkr"].astype(str).str.replace(",", "").astype(float)
    df["date"] = pd.to_datetime(df["date"])
    return (
        df[["date", "price_lkr"]]
        .sort_values("date")
        .drop_duplicates("date")
        .reset_index(drop=True)
    )

def select_arima_order(series, max_p=3, max_q=3):
    best_aic, best_order = 1e18, (1, 1, 0)
    for p in range(max_p + 1):
        for q in range(max_q + 1):
            if p == q == 0:
                continue
            try:
                aic = ARIMA(series, order=(p, 1, q)).fit().aic
                if aic < best_aic:
                    best_aic, best_order = aic, (p, 1, q)
            except Exception:
                pass
    return best_order

def train(df):
    from statsmodels.tsa.stattools import adfuller, kpss
    series = df["price_lkr"].values
    order = select_arima_order(series)
    model = ARIMA(series, order=order).fit()
    
    diff_series = np.diff(series)
    data = {
        "model": model,
        "order": order,
        "aic": round(model.aic, 2),
        "adf_p": round(adfuller(series, autolag="AIC")[1], 4),
        "kpss_p": round(kpss(series, regression="c", nlags="auto")[1], 4),
        "adf_p_diff": round(adfuller(diff_series, autolag="AIC")[1], 4),
        "kpss_p_diff": round(kpss(diff_series, regression="c", nlags="auto")[1], 4),
        "n": len(series),
    }
    joblib.dump(data, MODEL_FILE, compress=3)
    return data

def forecast_prices():
    df = load_data()
    try:
        data = joblib.load(MODEL_FILE)
        if data.get("n") != len(df):
            raise ValueError
    except Exception:
        data = train(df)
    fc = data["model"].forecast(4)
    last_date = df["date"].max()
    dates = [str((last_date + pd.Timedelta(weeks=h)).date()) for h in range(1, 5)]
    forecasts = [round(float(fc[h - 1]), 2) for h in range(1, 5)]
    slope = np.polyfit(range(4), forecasts, 1)[0] / forecasts[0] * 100
    signal = "HOLD" if slope > 0.3 else ("SELL" if slope < -0.3 else "WATCH")
    return {
        "forecast": forecasts,
        "dates": dates,
        "model": f"ARIMA{data['order']} selected by AIC",
        "statistics": {
            "trend": "UP" if signal == "HOLD" else ("DOWN" if signal == "SELL" else "FLAT"),
            "signal": signal,
            "slope_pct_per_week": round(slope, 4),
            "aic": data["aic"],
            "adf_p": data["adf_p"],
            "kpss_p": data["kpss_p"],
            "adf_p_diff": data["adf_p_diff"],
            "kpss_p_diff": data["kpss_p_diff"],
        },
    }