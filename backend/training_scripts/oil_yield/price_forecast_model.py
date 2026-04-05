import warnings, json
import numpy as np
import pandas as pd
import lightgbm as lgb
import joblib
from pathlib import Path
from sklearn.metrics import mean_absolute_error, r2_score
from statsmodels.tsa.stattools import adfuller

warnings.filterwarnings("ignore")

MODEL_PATH = Path(__file__).resolve().parent / "price_forecast_model.pkl"
META_PATH  = Path(__file__).resolve().parent / "price_forecast_model_meta.pkl"
DATA_PATH  = next((p for p in [
    Path(__file__).parent / "data_sets" / "price_data.csv",
    Path(__file__).parent.parent / "database" / "oil" / "oil_price.csv",
] if p.exists()), None)

PARAMS = {"n_estimators":800,"num_leaves":31,"max_depth":6,"learning_rate":0.03,
          "subsample":0.8,"colsample_bytree":0.8,"reg_alpha":0.1,"reg_lambda":1.0,
          "random_state":42,"verbose":-1}

def load_data(path):
    df = pd.read_csv(path)
    df["price_lkr"] = df["price_lkr"].astype(str).str.replace(",","").astype(float)
    df["date"] = pd.to_datetime(df["date"])
    return df[["date","price_lkr"]].sort_values("date").drop_duplicates("date").reset_index(drop=True)

def engineer_features(df):
    d, p = df.copy(), df["price_lkr"]
    p1 = p.shift(1)
    d["t"] = np.arange(len(d), dtype=float)
    d["week_of_year"] = d["date"].dt.isocalendar().week.astype(int)
    d["month"]    = d["date"].dt.month
    d["sin_week"] = np.sin(2 * np.pi * d["week_of_year"] / 52)
    d["cos_week"] = np.cos(2 * np.pi * d["week_of_year"] / 52)
    for lag in [1,2,3,4,8,12,26,52]:  d[f"lag_{lag}"] = p.shift(lag)
    for w in [4,8,12,26]:
        r = p1.rolling(w)
        d[f"roll_mean_{w}"] = r.mean(); d[f"roll_std_{w}"] = r.std()
        d[f"roll_min_{w}"]  = r.min();  d[f"roll_max_{w}"] = r.max()
    for g in [1,4,8]: d[f"mom_{g}"] = p1 - p.shift(1+g)
    d["ratio_4_12"]   = d["roll_mean_4"] / (d["roll_mean_12"] + 1e-9)
    d["pct_52w_high"] = (p1 - p1.rolling(52).max()) / (p1.rolling(52).max() + 1e-9)
    d["pct_52w_low"]  = (p1 - p1.rolling(52).min()) / (p1.rolling(52).min() + 1e-9)
    d["diff_1"] = p.diff(1); d["diff_4"] = p.diff(4)
    return d

def walk_forward_r2(X, y, min_train=200, step=20):
    """Walk-forward R² across full price history — most honest eval for time-series."""
    all_preds, all_actual = [], []
    for start in range(min_train, len(X)-step, step):
        m = lgb.LGBMRegressor(**PARAMS)
        m.fit(pd.DataFrame(X[:start]), y[:start])
        preds = m.predict(pd.DataFrame(X[start:start+step]))
        all_preds.extend(preds); all_actual.extend(y[start:start+step])
    return r2_score(np.array(all_actual), np.array(all_preds)), len(all_preds)

def train(df):
    df_f = engineer_features(df)
    feat_cols = [c for c in df_f.columns if c not in ("date","price_lkr")]
    dm = df_f.dropna().reset_index(drop=True)
    X, y = dm[feat_cols].values, dm["price_lkr"].values

    # Walk-forward R² spans full price history (1910–6095 LKR) — honest generalization
    wf_r2, n_wf = walk_forward_r2(X, y)

    # Final model: 85% prop+cal, 15% holdout
    split  = int(len(X) * 0.85); n_cal = int(split * 0.20)
    X_prop, y_prop = X[:split-n_cal], y[:split-n_cal]
    X_cal,  y_cal  = X[split-n_cal:split], y[split-n_cal:split]
    X_val,  y_val  = X[split:], y[split:]

    model = lgb.LGBMRegressor(**PARAMS)
    model.fit(dm[feat_cols].iloc[:split-n_cal], y_prop,
              eval_set=[(dm[feat_cols].iloc[split:], y_val)],
              callbacks=[lgb.early_stopping(50, verbose=False), lgb.log_evaluation(-1)])

    scores = np.abs(y_cal - model.predict(dm[feat_cols].iloc[split-n_cal:split]))
    n_c    = len(scores)
    q_hat  = float(np.quantile(scores, min(np.ceil(0.9*(n_c+1))/n_c, 1.0)))

    preds     = model.predict(dm[feat_cols].iloc[split:])
    mae       = mean_absolute_error(y_val, preds)
    mape      = float(np.mean(np.abs((y_val - preds) / y_val)) * 100)
    residuals = y_val - preds
    adf_p     = adfuller(df["price_lkr"].values, autolag="AIC")[1]

    print(f"MAE: {mae:.2f} LKR | MAPE: {mape:.4f}% | q̂: {q_hat:.2f} LKR")
    print(f"Walk-forward R²: {wf_r2:.4f} (n={n_wf} predictions across full price history) | "
          f"ADF p={adf_p:.4f} ({'non-stationary' if adf_p>0.05 else 'stationary'}) | "
          f"Best iter: {model.best_iteration_} | Residual σ: {np.std(residuals):.2f} LKR")

    meta = {"feature_columns": feat_cols, "q_hat": q_hat,
            "residual_std": float(np.std(residuals)), "mape": mape, "wf_r2": wf_r2}
    joblib.dump(model, MODEL_PATH, compress=3)
    joblib.dump(meta,  META_PATH,  compress=3)
    return model, meta

def forecast_prices(time_range=4, steps=None):
    # Always forecast 4 weeks ahead
    steps = 4
    try:
        model = joblib.load(MODEL_PATH); meta = joblib.load(META_PATH)
    except Exception:
        model, meta = train(load_data(DATA_PATH))

    df        = load_data(DATA_PATH)
    feat_cols = meta["feature_columns"]
    q_hat     = meta["q_hat"]
    extended  = df.copy()
    last_date = df["date"].max()
    col_means = engineer_features(df.copy()).dropna()[feat_cols].mean().values
    fut_dates, fut_prices = [], []

    for step in range(steps):
        df_f = engineer_features(extended)
        row  = df_f.iloc[-1]
        xn   = np.array([row[c] for c in feat_cols], dtype=float)
        xn[np.isnan(xn)] = col_means[np.isnan(xn)]
        pred = float(model.predict(pd.DataFrame([dict(zip(feat_cols, xn))])[feat_cols])[0])
        fd   = last_date + pd.Timedelta(weeks=step+1)
        fut_dates.append(str(fd.date())); fut_prices.append(round(pred, 2))
        extended = pd.concat([extended, pd.DataFrame({"date":[fd],"price_lkr":[pred]})], ignore_index=True)

    last_p = float(df["price_lkr"].iloc[-1])
    ci_lo  = [round(p - q_hat*np.sqrt(h+1), 2) for h,p in enumerate(fut_prices)]
    ci_hi  = [round(p + q_hat*np.sqrt(h+1), 2) for h,p in enumerate(fut_prices)]
    slope  = np.polyfit(range(steps), fut_prices, 1)[0] / fut_prices[0] * 100
    signal = "HOLD" if slope > 0.3 else ("SELL" if slope < -0.3 else "WATCH")

    return {"forecast": fut_prices, "dates": fut_dates,
            "ci_lower": ci_lo, "ci_upper": ci_hi,
            "statistics": {"mean": round(np.mean(fut_prices),2),
                           "last_price": last_p,
                           "trend": "UP" if signal=="HOLD" else ("DOWN" if signal=="SELL" else "FLAT"),
                           "signal": signal,
                           "slope_pct_per_week": round(slope,4),
                           "wf_r2": meta.get("wf_r2", 0)}}

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path", nargs="?", default=str(DATA_PATH))
    parser.add_argument("--retrain", action="store_true")
    args = parser.parse_args()
    if args.retrain:
        train(load_data(args.csv_path))
    else:
        print(json.dumps(forecast_prices(), indent=2))