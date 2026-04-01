import argparse
import json
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
from scipy import stats
from statsmodels.tsa.stattools import adfuller, kpss
import joblib

warnings.filterwarnings("ignore")

MODEL_DIR                  = Path(__file__).resolve().parent
PRICE_FORECAST_MODEL_PATH  = MODEL_DIR / "price_forecast_model.pkl"
PRICE_FORECAST_META_PATH   = MODEL_DIR / "price_forecast_model_meta.pkl"

LGBM_PARAMS: Dict = {
    "n_estimators"    : 800,
    "num_leaves"      : 31,
    "max_depth"       : 6,
    "learning_rate"   : 0.03,
    "subsample"       : 0.80,
    "colsample_bytree": 0.80,
    "reg_alpha"       : 0.10,
    "reg_lambda"      : 1.00,
    "random_state"    : 42,
    "verbose"         : -1,
}

EARLY_STOPPING_ROUNDS : int   = 50
TRAIN_RATIO           : float = 0.85
CAL_RATIO             : float = 0.20
LAG_WEEKS    : List[int] = [1, 2, 3, 4, 8, 12, 26, 52]
ROLL_WINDOWS : List[int] = [4, 8, 12, 26]
MOM_GAPS     : List[int] = [1, 4, 8]
FORECAST_WEEKS         : int   = 4

CI_ALPHA           : float = 0.10
HOLD_THRESHOLD_PCT : float =  0.30
SELL_THRESHOLD_PCT : float = -0.30
CONFIDENCE_MIN     : float =  0.50
N_BOOTSTRAP        : int   = 2000
BOOTSTRAP_SEED     : int   = 42


def save_pretrained_model(model: lgb.LGBMRegressor,
                          model_metadata: Dict,
                          force_overwrite: bool = True) -> Path:
    joblib.dump(model, PRICE_FORECAST_MODEL_PATH, compress=3)
    joblib.dump(model_metadata, PRICE_FORECAST_META_PATH, compress=3)
    return PRICE_FORECAST_MODEL_PATH


def load_pretrained_model() -> Optional[Tuple[lgb.LGBMRegressor, Dict]]:
    try:
        if not PRICE_FORECAST_MODEL_PATH.exists():
            return None
        model    = joblib.load(PRICE_FORECAST_MODEL_PATH)
        metadata = joblib.load(PRICE_FORECAST_META_PATH) if PRICE_FORECAST_META_PATH.exists() else {}
        return model, metadata
    except Exception:
        return None


def load_price_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required = {"date", "price_lkr"}
    if missing := required - set(df.columns):
        raise ValueError(f"CSV missing columns: {missing}")
    df["price_lkr"] = (df["price_lkr"].astype(str)
                                       .str.replace(",", "", regex=False)
                                       .astype(float))
    df["date"] = pd.to_datetime(df["date"])
    return (df[["date", "price_lkr"]]
              .sort_values("date")
              .drop_duplicates("date")
              .reset_index(drop=True))


def stationarity_analysis(prices: np.ndarray) -> Dict:
    adf_lev  = adfuller(prices,          autolag="AIC")
    adf_diff = adfuller(np.diff(prices), autolag="AIC")
    is_i1    = (adf_lev[1] >= 0.05) and (adf_diff[1] < 0.05)

    result = {
        "adf_levels": {"stat": round(adf_lev[0],  4), "p": round(adf_lev[1],  4),
                       "crit_5pct": round(adf_lev[4]["5%"], 4)},
        "adf_diff1" : {"stat": round(adf_diff[0], 4), "p": round(adf_diff[1], 4),
                       "crit_5pct": round(adf_diff[4]["5%"], 4)},
        "integration_order": "I(1)" if is_i1 else "I(0) or higher",
        "interpretation": (
            "Series is I(1): non-stationary in levels, stationary in first differences."
            if is_i1 else
            "Integration order unclear — review manually."
        ),
    }
    try:
        kl = kpss(prices,          regression="c", nlags="auto")
        kd = kpss(np.diff(prices), regression="c", nlags="auto")
        result["kpss_levels"] = {"stat": round(kl[0], 4), "p": round(kl[1], 4)}
        result["kpss_diff1"]  = {"stat": round(kd[0], 4), "p": round(kd[1], 4)}
    except Exception:
        pass
    return result


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    d  = df.copy()
    p  = d["price_lkr"]
    p1 = p.shift(1)

    d["t"]            = np.arange(len(d), dtype=float)
    d["week_of_year"] = d["date"].dt.isocalendar().week.astype(int)
    d["month"]        = d["date"].dt.month
    d["quarter"]      = d["date"].dt.quarter
    d["sin_week"]     = np.sin(2 * np.pi * d["week_of_year"] / 52.0)
    d["cos_week"]     = np.cos(2 * np.pi * d["week_of_year"] / 52.0)

    for lag in LAG_WEEKS:
        d[f"lag_{lag}"] = p.shift(lag)

    for w in ROLL_WINDOWS:
        r = p1.rolling(w)
        d[f"roll_mean_{w}"] = r.mean()
        d[f"roll_std_{w}"]  = r.std()
        d[f"roll_min_{w}"]  = r.min()
        d[f"roll_max_{w}"]  = r.max()

    for gap in MOM_GAPS:
        d[f"mom_{gap}"] = p1 - p.shift(1 + gap)

    d["ratio_4_12"]   = d["roll_mean_4"] / (d["roll_mean_12"] + 1e-9)
    p52h = p1.rolling(52).max(); p52l = p1.rolling(52).min()
    d["pct_52w_high"] = (p1 - p52h) / (p52h + 1e-9)
    d["pct_52w_low"]  = (p1 - p52l) / (p52l + 1e-9)

    d["diff_1"] = p.diff(1)
    d["diff_4"] = p.diff(4)

    return d


def get_feature_columns(df_feat: pd.DataFrame) -> List[str]:
    return [c for c in df_feat.columns if c not in ("date", "price_lkr")]


def test_no_leakage(df: pd.DataFrame, feat_cols: List[str]) -> bool:
    df_f = engineer_features(df).dropna().reset_index(drop=True)
    p    = df_f["price_lkr"].values
    leak = [c for c in feat_cols if np.allclose(df_f[c].values, p, atol=1e-6)]
    assert not leak, f"Leakage detected: {leak}"
    return True


def temporal_split(X, y, ratio=TRAIN_RATIO):
    n = int(len(X) * ratio)
    return X[:n], X[n:], y[:n], y[n:]


def train_lightgbm(X_train, y_train, X_val, y_val,
                   params=LGBM_PARAMS) -> lgb.LGBMRegressor:
    m = lgb.LGBMRegressor(**params)
    m.fit(X_train, y_train, eval_set=[(X_val, y_val)],
          callbacks=[lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False),
                     lgb.log_evaluation(-1)])
    return m


def evaluate_predictions(actual: np.ndarray, preds: np.ndarray) -> Dict:
    mae  = float(mean_absolute_error(actual, preds))
    rmse = float(np.sqrt(mean_squared_error(actual, preds)))
    mape = float(np.mean(np.abs((actual - preds) / actual)) * 100)
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "mape": round(mape, 4)}


def sqrt_h_intervals(forecast_prices: List[float],
                     sigma_res: float,
                     z: float = 1.645) -> Tuple[List[float], List[float]]:
    lo, hi = [], []
    for h, p in enumerate(forecast_prices, start=1):
        m = z * sigma_res * np.sqrt(h)
        lo.append(p - m); hi.append(p + m)
    return lo, hi


def fit_conformal_model(X_train:   np.ndarray,
                        y_train:   np.ndarray,
                        X_val:     np.ndarray,
                        y_val:     np.ndarray,
                        cal_ratio: float = CAL_RATIO,
                        params:    Dict  = LGBM_PARAMS,
                        alpha:     float = CI_ALPHA
                       ) -> Tuple[lgb.LGBMRegressor, float, float, int]:
    n_cal  = int(len(X_train) * cal_ratio)
    X_prop = X_train[:-n_cal]; y_prop = y_train[:-n_cal]
    X_cal  = X_train[-n_cal:]; y_cal  = y_train[-n_cal:]

    model = lgb.LGBMRegressor(**params)
    model.fit(X_prop, y_prop, eval_set=[(X_val, y_val)],
              callbacks=[lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False),
                         lgb.log_evaluation(-1)])

    cal_preds = model.predict(X_cal)
    scores    = np.abs(y_cal - cal_preds)
    n_c       = len(scores)
    level     = min(np.ceil((1 - alpha) * (n_c + 1)) / n_c, 1.0)
    q_hat     = float(np.quantile(scores, level))
    emp_cov   = float(np.mean(scores <= q_hat))

    return model, q_hat, emp_cov, n_c


def conformal_step_ci(forecast_prices: List[float],
                      q_hat: float) -> Tuple[List[float], List[float]]:
    lo = [p - q_hat * np.sqrt(h+1) for h, p in enumerate(forecast_prices)]
    hi = [p + q_hat * np.sqrt(h+1) for h, p in enumerate(forecast_prices)]
    return lo, hi


def bootstrap_slope_std(forecast_prices: List[float],
                        residuals: np.ndarray,
                        n_boot: int = N_BOOTSTRAP,
                        seed: int = BOOTSTRAP_SEED) -> float:
    rng    = np.random.default_rng(seed)
    xs     = np.arange(len(forecast_prices), dtype=float)
    fc_arr = np.array(forecast_prices)
    boots  = []

    for _ in range(n_boot):
        eps       = rng.choice(residuals, size=len(fc_arr), replace=True)
        perturbed = fc_arr + eps
        sl, _     = np.polyfit(xs, perturbed, 1)
        boots.append(sl / perturbed[0] * 100)

    return float(np.std(boots))


def generate_confident_signal(
    forecast_prices : List[float],
    future_dates    : List[pd.Timestamp],
    last_price      : float,
    ci_lower        : List[float],
    ci_upper        : List[float],
    residuals       : np.ndarray,
    hold_thr        : float = HOLD_THRESHOLD_PCT,
    sell_thr        : float = SELL_THRESHOLD_PCT,
    conf_min        : float = CONFIDENCE_MIN,
    n_boot          : int   = N_BOOTSTRAP,
    epsilon         : float = 1e-6,
) -> Dict:
    xs         = np.arange(4, dtype=float)
    sl_lkr, _ = np.polyfit(xs, forecast_prices, 1)
    sl_pct     = sl_lkr / forecast_prices[0] * 100.0

    slope_std  = bootstrap_slope_std(forecast_prices, residuals, n_boot)
    confidence = round(min(abs(sl_pct) / (slope_std + epsilon), 2.0), 4)

    if   sl_pct >  hold_thr: raw_signal = "HOLD"
    elif sl_pct <  sell_thr: raw_signal = "SELL"
    else:                     raw_signal = "WATCH"

    if confidence < conf_min and raw_signal != "WATCH":
        final_signal  = "WATCH"
        override_note = (f"Confidence {confidence:.4f} < {conf_min} threshold; "
                         f"signal downgraded from {raw_signal} to WATCH.")
    else:
        final_signal  = raw_signal
        override_note = f"Confidence {confidence:.4f} supports {final_signal} signal."

    trend    = "UP" if final_signal == "HOLD" else \
               ("DOWN" if final_signal == "SELL" else "FLAT/UNCERTAIN")
    strength = ("strong"   if confidence >= 1.0 else
                "moderate" if confidence >= 0.5 else "weak")

    weekly = [
        {
            "week"         : h + 1,
            "date"         : str(future_dates[h].date()),
            "price_lkr"    : round(forecast_prices[h], 2),
            "change_pct"   : round((forecast_prices[h] - last_price) / last_price * 100, 4),
            "ci_lower_90"  : round(ci_lower[h], 2),
            "ci_upper_90"  : round(ci_upper[h], 2),
            "ci_half_width": round(ci_upper[h] - forecast_prices[h], 2),
        }
        for h in range(4)
    ]

    explanation = (
        f"Trend direction: {trend}. "
        f"OLS slope = {sl_pct:+.4f} %/week ({sl_lkr:+.2f} LKR/week). "
        f"Bootstrap slope σ = {slope_std:.4f} %/week (n={n_boot} resamples). "
        f"Signal confidence = {confidence:.4f} [{strength}]. "
        f"{override_note} "
        f"{'Recommendation: retain inventory to capture expected price appreciation.' if final_signal=='HOLD' else ''}"
        f"{'Recommendation: liquidate inventory to avoid further value loss.' if final_signal=='SELL' else ''}"
        f"{'Recommendation: monitor market; reassess at next weekly update.' if final_signal=='WATCH' else ''}"
    )

    return {
        "trend"                  : trend,
        "signal"                 : final_signal,
        "slope_pct_per_week"     : round(sl_pct,    4),
        "slope_lkr_per_week"     : round(sl_lkr,    4),
        "slope_std_bootstrap"    : round(slope_std, 4),
        "confidence"             : confidence,
        "signal_strength"        : strength,
        "raw_signal_pre_override": raw_signal,
        "hold_threshold_pct"     : hold_thr,
        "sell_threshold_pct"     : sell_thr,
        "confidence_min"         : conf_min,
        "n_bootstrap"            : n_boot,
        "explanation"            : explanation,
        "weekly_breakdown"       : weekly,
    }


def iterative_forecast(model:       lgb.LGBMRegressor,
                       df_original: pd.DataFrame,
                       feat_cols:   List[str],
                       X_train:     np.ndarray,
                       horizon:     int = FORECAST_WEEKS
                      ) -> Tuple[List[pd.Timestamp], List[float]]:
    col_means  = np.nanmean(X_train, axis=0)
    extended   = df_original.copy()
    last_date  = extended["date"].max()
    fut_dates  : List[pd.Timestamp] = []
    fut_prices : List[float]        = []

    for step in range(horizon):
        df_f = engineer_features(extended)
        row  = df_f.iloc[-1]
        xn   = np.array([row[c] for c in feat_cols], dtype=float)
        xn[np.isnan(xn)] = col_means[np.isnan(xn)]
        pred = float(model.predict(xn.reshape(1, -1))[0])
        fd   = last_date + pd.Timedelta(weeks=step + 1)
        fut_dates.append(fd)
        fut_prices.append(pred)
        extended = pd.concat(
            [extended, pd.DataFrame({"date": [fd], "price_lkr": [pred]})],
            ignore_index=True,
        )
    return fut_dates, fut_prices


def feature_importance_report(model: lgb.LGBMRegressor,
                               feat_cols: List[str],
                               top_n: int = 12) -> List[Dict]:
    scores = model.feature_importances_
    total  = scores.sum()
    ranked = sorted(zip(feat_cols, scores), key=lambda x: x[1], reverse=True)[:top_n]
    return [{"feature": f, "importance": int(imp),
             "importance_pct": round(imp / total * 100, 2)} for f, imp in ranked]


def run_feature_ablation(df_model: pd.DataFrame, feat_cols: List[str],
                         y: np.ndarray, split: int) -> List[Dict]:
    y_tr = y[:split]; y_va = y[split:]
    sets = {
        "A: Lag only"       : [c for c in feat_cols if c.startswith("lag_")],
        "B: +Rolling stats" : [c for c in feat_cols if c.startswith(("lag_", "roll_"))],
        "C: +Momentum"      : [c for c in feat_cols if any(
                                c.startswith(p) for p in ["lag_", "roll_", "mom_"])],
        "D: Full set"       : feat_cols,
    }
    ablation_params = {**LGBM_PARAMS, "n_estimators": 500, "learning_rate": 0.05}
    results = []
    for name, cols in sets.items():
        m = lgb.LGBMRegressor(**ablation_params)
        m.fit(df_model[cols].values[:split], y_tr)
        p   = m.predict(df_model[cols].values[split:])
        met = evaluate_predictions(y_va, p)
        results.append({"set": name, "n_features": len(cols), **met})
    return results


def run_full_pipeline(csv_path:     str,
                      run_ablation: bool = True,
                      verbose:      bool = True) -> Dict:
    log = (lambda s: print(s)) if verbose else (lambda s: None)

    log("\n[1/10] Loading data ...")
    df = load_price_data(csv_path)
    log(f"       {len(df)} obs  |  {df['date'].min().date()} → {df['date'].max().date()}")

    log("[2/10] Stationarity analysis ...")
    stat_res = stationarity_analysis(df["price_lkr"].values)
    log(f"       ADF levels p={stat_res['adf_levels']['p']:.4f}  "
        f"ADF diff-1 p={stat_res['adf_diff1']['p']:.4f}  "
        f"→ {stat_res['integration_order']}")

    log("[3/10] Engineering features + leakage test ...")
    df_feat   = engineer_features(df)
    feat_cols = get_feature_columns(df_feat)
    df_model  = df_feat.dropna().reset_index(drop=True)
    X         = df_model[feat_cols].values
    y         = df_model["price_lkr"].values
    test_no_leakage(df, feat_cols)
    log(f"       {len(feat_cols)} features  |  {len(df_model)} rows  |  no leakage")

    log("[4/10] Training conformal LightGBM ...")
    split = int(len(X) * TRAIN_RATIO)
    X_tr, X_va = X[:split], X[split:]
    y_tr, y_va = y[:split], y[split:]
    model, q_hat, emp_cov, n_cal = fit_conformal_model(X_tr, y_tr, X_va, y_va)
    log(f"       Best iteration: {model.best_iteration_}  q̂={q_hat:.2f} LKR  coverage={emp_cov:.4f}")

    log("[5/10] Hold-out evaluation ...")
    lgbm_preds  = model.predict(X_va)
    holdout_met = evaluate_predictions(y_va, lgbm_preds)
    sigma_res   = float(np.std(y_va - lgbm_preds))
    residuals   = y_va - lgbm_preds
    log(f"       MAPE={holdout_met['mape']:.4f}%  σ_res={sigma_res:.2f}")

    log("[6/10] 4-week iterative forecast ...")
    fut_dates, fut_prices = iterative_forecast(model, df, feat_cols, X_tr)

    log("[7/10] Step-dependent conformal CIs ...")
    ci_lo, ci_hi = conformal_step_ci(fut_prices, q_hat)

    log("[8/10] Bootstrap confidence signal ...")
    last_p = float(df["price_lkr"].iloc[-1])
    signal = generate_confident_signal(fut_prices, fut_dates, last_p, ci_lo, ci_hi, residuals)
    log(f"        Trend={signal['trend']}  Signal={signal['signal']}  "
        f"Slope={signal['slope_pct_per_week']:+.4f}%/wk  Confidence={signal['confidence']:.4f}")

    ablation: List[Dict] = []
    if run_ablation:
        log("[9/10] Feature ablation ...")
        ablation = run_feature_ablation(df_model, feat_cols, y, split)

    log("[10/10] Compiling report ...")
    report = {
        "meta": {
            "model"             : "LightGBM Regressor",
            "version"           : "3.0.0",
            "forecast_horizon"  : f"{FORECAST_WEEKS} weeks",
            "train_observations": int(split),
            "val_observations"  : int(len(y_va)),
            "total_observations": int(len(df)),
            "n_features"        : int(len(feat_cols)),
            "last_known_date"   : str(df["date"].max().date()),
            "last_known_price"  : last_p,
        },
        "stationarity"    : stat_res,
        "holdout_metrics" : holdout_met,
        "residual_std_lkr": round(sigma_res, 4),
        "conformal_calibration": {
            "q_hat"             : round(q_hat, 4),
            "empirical_coverage": round(emp_cov, 4),
            "nominal_coverage"  : 1 - CI_ALPHA,
            "n_calibration"     : n_cal,
            "alpha"             : CI_ALPHA,
            "method"            : "Split Conformal Prediction (Angelopoulos & Bates 2022)",
            "ci_widths"         : [round(q_hat * np.sqrt(h+1), 2) for h in range(4)],
        },
        "decision"           : signal,
        "feature_importance" : feature_importance_report(model, feat_cols),
        "feature_ablation"   : ablation,
    }

    model_metadata = {
        "feature_columns"   : feat_cols,
        "holdout_mae"       : holdout_met["mae"],
        "holdout_rmse"      : holdout_met["rmse"],
        "holdout_mape"      : holdout_met["mape"],
        "residual_std"      : sigma_res,
        "conformal_q_hat"   : q_hat,
        "empirical_coverage": emp_cov,
        "n_calibration"     : n_cal,
        "training_date"     : str(pd.Timestamp.now()),
        "n_train_samples"   : int(split),
        "n_val_samples"     : int(len(y_va)),
    }
    save_pretrained_model(model, model_metadata)
    report["model_save_path"] = str(PRICE_FORECAST_MODEL_PATH)

    if verbose:
        _print_summary(report)
    return report


def _print_summary(report: Dict) -> None:
    m   = report["meta"]
    dec = report["decision"]
    hm  = report["holdout_metrics"]
    cf  = report["conformal_calibration"]
    SEP = "═" * 74

    print(f"\n{SEP}")
    print("  CINOGROW v3.0 — CINNAMON LEAF OIL PRICE FORECAST")
    print(SEP)
    print(f"  Dataset : {m['total_observations']} obs  |  {m['last_known_date']}  |  {m['n_features']} features")
    print(f"  Split   : train={m['train_observations']}  val={m['val_observations']}")
    print()
    print(f"  ── Hold-Out Evaluation ─────────────────────────────────────────────")
    print(f"  LightGBM : MAE={hm['mae']:.2f}  RMSE={hm['rmse']:.2f}  MAPE={hm['mape']:.4f}%")
    print()
    print(f"  ── Conformal Prediction Intervals ──────────────────────────────────")
    print(f"  q̂ = {cf['q_hat']:.2f} LKR  |  coverage={cf['empirical_coverage']:.4f} (nominal={cf['nominal_coverage']:.2f})  |  n_cal={cf['n_calibration']}")
    print(f"  CI widths: " + "  ".join(f"h={h+1}:±{cf['ci_widths'][h]:.0f}" for h in range(4)))
    print()
    print(f"  ── 4-Week Forecast ─────────────────────────────────────────────────")
    print(f"  Current: LKR {m['last_known_price']:>10,.2f}  ({m['last_known_date']})")
    print()
    for w in dec["weekly_breakdown"]:
        sgn = "+" if w["change_pct"] >= 0 else ""
        ci_s = f"[{w['ci_lower_90']:,.0f}–{w['ci_upper_90']:,.0f}]"
        print(f"  Wk {w['week']} ({w['date']})  LKR {w['price_lkr']:>10,.2f}  ({sgn}{w['change_pct']:.2f}%)  90% CI {ci_s}  ±{w['ci_half_width']:.0f}")
    print()
    print(f"  ── Confidence-Weighted Signal ───────────────────────────────────────")
    print(f"  Trend      : {dec['trend']}")
    print(f"  Signal     : {dec['signal']}")
    print(f"  Slope      : {dec['slope_pct_per_week']:+.4f} %/wk  ({dec['slope_lkr_per_week']:+.2f} LKR/wk)")
    print(f"  Slope std  : {dec['slope_std_bootstrap']:.4f} %/wk  (bootstrap n={dec['n_bootstrap']})")
    print(f"  Confidence : {dec['confidence']:.4f}  [{dec['signal_strength']}]")
    print(f"  Override   : {dec['raw_signal_pre_override']} → {dec['signal']}")
    print(f"  {dec['explanation'][:120]}...")
    print(SEP + "\n")


def forecast_prices(time_range: str = "weeks", steps: int = 4) -> Dict:
    from datetime import datetime, timedelta

    steps = steps or 4

    possible_paths = [
        Path(__file__).parent / "data_sets" / "price_data.csv",
        Path(__file__).parent / "price_data.csv",
        Path(__file__).parent.parent / "database" / "oil" / "oil_price.csv",
    ]

    csv_path = next((p for p in possible_paths if p.exists()), None)

    try:
        pretrained = load_pretrained_model()
        if pretrained is not None:
            model, model_meta = pretrained
            feat_cols = model_meta.get("feature_columns", [])

            if csv_path and feat_cols:
                try:
                    df       = load_price_data(csv_path)
                    df_feat  = engineer_features(df)
                    df_model = df_feat.dropna().reset_index(drop=True)
                    X_tr     = df_model[feat_cols].values

                    fut_dates, fut_prices = iterative_forecast(model, df, feat_cols, X_tr)

                    q_hat        = model_meta.get("conformal_q_hat", 250.0)
                    ci_lo, ci_hi = conformal_step_ci(fut_prices, q_hat)

                    last_p    = float(df["price_lkr"].iloc[-1])
                    residuals = np.random.normal(0, model_meta.get("residual_std", 100), 100)
                    signal    = generate_confident_signal(fut_prices, fut_dates, last_p, ci_lo, ci_hi, residuals)

                    weekly_data          = signal.get("weekly_breakdown", [])
                    forecast_prices_list = [w.get("price_lkr", 0) for w in weekly_data[:steps]]
                    forecast_dates       = [w.get("date", "")      for w in weekly_data[:steps]]

                    if forecast_prices_list:
                        statistics = {
                            "mean"      : float(np.mean(forecast_prices_list)),
                            "min"       : float(np.min(forecast_prices_list)),
                            "max"       : float(np.max(forecast_prices_list)),
                            "std"       : float(np.std(forecast_prices_list)),
                            "trend"     : signal.get("trend",      "NEUTRAL"),
                            "signal"    : signal.get("signal",     "WATCH"),
                            "confidence": signal.get("confidence", 0),
                            "source"    : "pre-trained model (fast)",
                        }
                    else:
                        statistics = {"mean": 0, "min": 0, "max": 0, "std": 0}

                    return {
                        "forecast"  : forecast_prices_list,
                        "dates"     : [str(d) for d in forecast_dates],
                        "statistics": statistics,
                    }
                except Exception:
                    pass

        if csv_path:
            report       = run_full_pipeline(csv_path, run_ablation=False, verbose=False)
            decision     = report.get("decision", {})
            weekly_data  = decision.get("weekly_breakdown", [])

            forecast_prices_list = [w.get("price_lkr", 0) for w in weekly_data[:steps]]
            forecast_dates       = [w.get("date", "")      for w in weekly_data[:steps]]

            statistics = {
                "mean"      : float(np.mean(forecast_prices_list)),
                "min"       : float(np.min(forecast_prices_list)),
                "max"       : float(np.max(forecast_prices_list)),
                "std"       : float(np.std(forecast_prices_list)),
                "trend"     : decision.get("trend",      "NEUTRAL"),
                "signal"    : decision.get("signal",     "WATCH"),
                "confidence": decision.get("confidence", 0),
                "source"    : "full pipeline (trained)",
            } if forecast_prices_list else {"mean": 0, "min": 0, "max": 0, "std": 0}

            return {
                "forecast"  : forecast_prices_list,
                "dates"     : [str(d) for d in forecast_dates],
                "statistics": statistics,
            }

        now           = datetime.now()
        base_price    = 2500.0
        forecast_list = []
        dates_list    = []

        for i in range(steps):
            date  = now + (timedelta(days=30 * (i + 1)) if time_range == "months" else timedelta(weeks=i + 1))
            price = base_price + (i * 50) + np.random.normal(0, 100)
            forecast_list.append(float(price))
            dates_list.append(date.strftime("%Y-%m-%d"))

        return {
            "forecast"  : forecast_list,
            "dates"     : dates_list,
            "statistics": {
                "mean"      : float(np.mean(forecast_list)),
                "min"       : float(np.min(forecast_list)),
                "max"       : float(np.max(forecast_list)),
                "std"       : float(np.std(forecast_list)),
                "trend"     : "NEUTRAL",
                "signal"    : "WATCH",
                "confidence": 0.5,
                "note"      : "Synthetic forecast - no training data available",
            },
        }

    except Exception as e:
        now        = datetime.now()
        base_price = 2500.0
        return {
            "forecast"  : [base_price] * steps,
            "dates"     : [(now + timedelta(weeks=i + 1)).strftime("%Y-%m-%d") for i in range(steps)],
            "statistics": {
                "mean" : float(base_price),
                "min"  : float(base_price),
                "max"  : float(base_price),
                "std"  : 0.0,
                "error": str(e),
                "note" : "Default forecast due to processing error",
            },
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CinoGrow v3.0 — Price Forecasting Pipeline")
    parser.add_argument("csv_path",        help="Weekly price CSV (date, price_lkr)")
    parser.add_argument("--output-json",   default=None, metavar="PATH")
    parser.add_argument("--run-ablation",  action="store_true")
    parser.add_argument("--quiet",         action="store_true")

    args   = parser.parse_args()
    report = run_full_pipeline(
        csv_path     = args.csv_path,
        run_ablation = args.run_ablation,
        verbose      = not args.quiet,
    )
    if args.output_json:
        Path(args.output_json).write_text(json.dumps(report, indent=2, default=str))
        if not args.quiet:
            print(f"Full report → {args.output_json}")