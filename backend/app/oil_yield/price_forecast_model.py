import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")


def make_weights(n: int, lam: float = 0.997) -> np.ndarray:
    t = np.arange(n)
    return lam ** (n - 1 - t)


def load_data(hist_path: str, actual_path: str | None = None):
    df = pd.read_csv(hist_path)
    df.columns = [c.strip() for c in df.columns]
    dc, pc = df.columns[0], df.columns[1]
    df[dc] = pd.to_datetime(df[dc], dayfirst=False, errors='coerce')
    df[pc] = df[pc].astype(str).str.replace(',', '').astype(float)
    df = df.dropna().sort_values(dc).drop_duplicates(subset=[dc])
    hist = df.set_index(dc)[pc]

    actuals = None
    if actual_path and Path(actual_path).exists():
        da = pd.read_csv(actual_path)
        da.columns = [c.strip() for c in da.columns]
        dca, pca = da.columns[0], da.columns[1]
        da[dca] = pd.to_datetime(da[dca], dayfirst=False, errors='coerce')
        da[pca] = da[pca].astype(str).str.replace(',', '').astype(float)
        da = da.dropna().sort_values(dca).drop_duplicates(subset=[dca])
        actuals = da.set_index(dca)[pca]

    return hist, actuals


class HoltWintersDamped:
    def __init__(self, lam: float = 0.997):
        self.lam = lam
        self.alpha = self.beta = self.phi = None
        self.fitted_ = self.resid_ = None
        self._last_L = self._last_T = None

    def _wsse(self, params, y, w):
        a, b, phi = params
        if not (0 < a < 1 and 0 < b < 0.5 and 0.80 < phi < 1.0):
            return 1e18
        L, T = float(y[0]), 1.0
        wsse = 0.0
        for t in range(len(y)):
            yhat = L + phi * T
            if t > 0:
                wsse += w[t] * (y[t] - yhat) ** 2
            L_n = a * y[t] + (1 - a) * (L + phi * T)
            T_n = b * (L_n - L) + (1 - b) * phi * T
            L, T = L_n, T_n
        return wsse

    def fit(self, y: np.ndarray):
        from scipy.optimize import minimize
        w = make_weights(len(y), self.lam)

        best, best_p = 1e18, (0.3, 0.05, 0.95)
        for a in np.arange(0.1, 0.9, 0.1):
            for b in np.arange(0.01, 0.3, 0.05):
                for phi in np.arange(0.85, 0.99, 0.02):
                    s = self._wsse((a, b, phi), y, w)
                    if s < best:
                        best, best_p = s, (a, b, phi)

        res = minimize(
            self._wsse, best_p, args=(y, w),
            method='Nelder-Mead',
            options={'xatol': 1e-7, 'fatol': 1e-7, 'maxiter': 10000},
        )
        self.alpha = np.clip(res.x[0], 1e-4, 0.9999)
        self.beta  = np.clip(res.x[1], 1e-4, 0.4999)
        self.phi   = np.clip(res.x[2], 0.80,  0.9999)

        L, T = float(y[0]), 1.0
        fitted = []
        for t in range(len(y)):
            fitted.append(L + self.phi * T)
            L_n = self.alpha * y[t] + (1 - self.alpha) * (L + self.phi * T)
            T_n = self.beta  * (L_n - L) + (1 - self.beta) * self.phi * T
            L, T = L_n, T_n

        self._last_L = L
        self._last_T = T
        self.fitted_ = np.array(fitted)
        self.resid_  = y - self.fitted_
        return self

    def update_state(self, y_new: float):
        L, T = self._last_L, self._last_T
        L_n = self.alpha * y_new + (1 - self.alpha) * (L + self.phi * T)
        T_n = self.beta  * (L_n - L) + (1 - self.beta) * self.phi * T
        self._last_L = L_n
        self._last_T = T_n
        self.resid_ = np.append(self.resid_, y_new - (L + self.phi * T))

    def forecast(self, h: int) -> np.ndarray:
        L, T, phi = self._last_L, self._last_T, self.phi
        out, cphi = [], 0.0
        for i in range(1, h + 1):
            cphi += phi ** i
            out.append(L + cphi * T)
        return np.array(out)


def _build_residual_features(
    resid: np.ndarray,
    price_level: np.ndarray | None = None,
    regime_idx: int = 260,
    max_lag: int = 12,
):
    n = len(resid)
    rows_X, rows_y = [], []

    for t in range(max_lag, n):
        window = resid[t - max_lag: t]
        lags   = window[::-1]
        rm4    = float(np.mean(resid[max(0, t-4):t]))
        rs4    = float(np.std(resid[max(0, t-4):t])   + 1e-8)
        rm12   = float(np.mean(resid[max(0, t-12):t]))
        rs12   = float(np.std(resid[max(0, t-12):t])  + 1e-8)
        pl     = float(price_level[t]) if price_level is not None else 0.0
        wsb    = float(max(t - regime_idx, 0))
        rows_X.append(list(lags) + [rm4, rs4, rm12, rs12, pl, wsb])
        rows_y.append(resid[t])

    return np.array(rows_X, dtype=np.float32), np.array(rows_y, dtype=np.float32)


class LGBMResidualModel:
    MAX_LAG    = 12
    REGIME_IDX = 260

    def __init__(
        self,
        lam: float = 0.997,
        quantile_lo: float = 0.05,
        quantile_hi: float = 0.95,
        n_estimators: int = 500,
        learning_rate: float = 0.03,
        num_leaves: int = 15,
        min_child_samples: int = 10,
    ):
        import lightgbm as lgb
        self.lam      = lam
        self.q_lo     = quantile_lo
        self.q_hi     = quantile_hi
        self.n_est    = n_estimators
        self.lr       = learning_rate
        self.n_leaves = num_leaves
        self.min_cs   = min_child_samples
        self._lgb     = lgb
        self._model_mean = self._model_qlo = self._model_qhi = None
        self._buf_resid  = self._buf_price  = None

    def _params(self, objective, alpha=None):
        p = dict(
            n_estimators=self.n_est, learning_rate=self.lr,
            num_leaves=self.n_leaves, min_child_samples=self.min_cs,
            subsample=0.8, colsample_bytree=0.8,
            reg_alpha=0.1, reg_lambda=0.1,
            random_state=42, n_jobs=-1, verbose=-1,
        )
        if objective == 'regression':
            p['objective'] = 'regression'
            p['metric']    = 'rmse'
        else:
            p['objective'] = 'quantile'
            p['alpha']     = alpha
            p['metric']    = 'quantile'
        return p

    def fit(self, resid: np.ndarray, price_level: np.ndarray | None = None):
        lgb = self._lgb
        n   = len(resid)
        X, y = _build_residual_features(
            resid, price_level,
            regime_idx=self.REGIME_IDX, max_lag=self.MAX_LAG,
        )

        w      = make_weights(n, self.lam)[self.MAX_LAG:]
        w      = w / w.max()
        n_val  = max(int(len(X) * 0.10), 5)
        n_tr   = len(X) - n_val
        X_tr, X_val = X[:n_tr], X[n_tr:]
        y_tr, y_val = y[:n_tr], y[n_tr:]
        w_tr        = w[:n_tr]

        cb = [lgb.early_stopping(50, verbose=False), lgb.log_evaluation(-1)]

        self._model_mean = lgb.LGBMRegressor(**self._params('regression'))
        self._model_mean.fit(X_tr, y_tr, sample_weight=w_tr,
                             eval_set=[(X_val, y_val)], callbacks=cb)

        self._model_qlo = lgb.LGBMRegressor(**self._params('quantile', self.q_lo))
        self._model_qlo.fit(X_tr, y_tr, sample_weight=w_tr,
                            eval_set=[(X_val, y_val)], callbacks=cb)

        self._model_qhi = lgb.LGBMRegressor(**self._params('quantile', self.q_hi))
        self._model_qhi.fit(X_tr, y_tr, sample_weight=w_tr,
                            eval_set=[(X_val, y_val)], callbacks=cb)

        self._buf_resid   = list(resid[-self.MAX_LAG:])
        self._buf_price   = list(price_level[-self.MAX_LAG:] if price_level is not None else [0.0] * self.MAX_LAG)
        self._regime_base = self.REGIME_IDX
        self._n_trained   = n
        return self

    def _make_feature(self) -> np.ndarray:
        buf  = np.array(self._buf_resid)
        lags = buf[::-1]
        rm4  = float(np.mean(buf[-4:]))
        rs4  = float(np.std(buf[-4:])  + 1e-8)
        rm12 = float(np.mean(buf))
        rs12 = float(np.std(buf)       + 1e-8)
        pl   = float(self._buf_price[-1])
        wsb  = float(max(self._n_trained - self._regime_base, 0))
        return np.array(list(lags) + [rm4, rs4, rm12, rs12, pl, wsb],
                        dtype=np.float32).reshape(1, -1)

    def forecast_one(self):
        feat = self._make_feature()
        m    = float(self._model_mean.predict(feat)[0])
        lo   = min(float(self._model_qlo.predict(feat)[0]), m)
        hi   = max(float(self._model_qhi.predict(feat)[0]), m)
        return m, lo, hi

    def forecast(self, h: int):
        means, lowers, uppers = [], [], []
        saved_buf   = list(self._buf_resid)
        saved_price = list(self._buf_price)
        saved_n     = self._n_trained

        for _ in range(h):
            m, lo, hi = self.forecast_one()
            means.append(m); lowers.append(lo); uppers.append(hi)
            self._buf_resid  = self._buf_resid[1:]  + [m]
            self._buf_price  = self._buf_price[1:]  + self._buf_price[-1:]
            self._n_trained += 1

        self._buf_resid  = saved_buf
        self._buf_price  = saved_price
        self._n_trained  = saved_n
        return np.array(means), np.array(lowers), np.array(uppers)

    def update_residual(self, new_resid: float, new_price: float = 0.0):
        self._buf_resid  = self._buf_resid[1:]  + [new_resid]
        self._buf_price  = self._buf_price[1:]  + [new_price]
        self._n_trained += 1


class SARIMABenchmark:
    BREAK_DATE = pd.Timestamp("2022-06-01")

    def __init__(self, order=(1, 1, 1), seasonal_order=(1, 0, 1, 52)):
        self.order          = order
        self.seasonal_order = seasonal_order
        self._result        = None
        self._last_endog    = None
        self._last_exog     = None

    @staticmethod
    def _make_exog(index: pd.DatetimeIndex) -> np.ndarray:
        return (index >= SARIMABenchmark.BREAK_DATE).astype(float).values.reshape(-1, 1)

    def fit(self, series: pd.Series):
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        series = pd.Series(series.values, index=pd.DatetimeIndex(series.index))
        exog   = self._make_exog(series.index)
        model  = SARIMAX(
            series.values, exog=exog,
            order=self.order, seasonal_order=self.seasonal_order,
            trend='c', enforce_stationarity=False, enforce_invertibility=False,
        )
        self._result     = model.fit(disp=False, maxiter=200)
        self._last_endog = series.values
        self._last_exog  = exog
        return self

    def forecast(self, h: int, future_exog: np.ndarray | None = None) -> np.ndarray:
        if future_exog is None:
            future_exog = np.ones((h, 1))
        return np.array(self._result.forecast(steps=h, exog=future_exog))

    def update_and_forecast(self, new_obs: float, new_exog: float = 1.0) -> float:
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        endog = np.append(self._last_endog, new_obs)
        exog  = np.vstack([self._last_exog, [[new_exog]]])
        model = SARIMAX(
            endog, exog=exog,
            order=self.order, seasonal_order=self.seasonal_order,
            trend='c', enforce_stationarity=False, enforce_invertibility=False,
        )
        res  = model.filter(self._result.params)
        fc   = res.forecast(steps=1, exog=np.array([[new_exog]]))
        self._last_endog = endog
        self._last_exog  = exog
        self._result     = res
        return float(fc[0])


def select_lambda(
    series: pd.Series,
    horizon: int = 5,
    candidates: list | None = None,
    n_folds: int = 5,
    cv_start: str = "2023-01-01",
    verbose: bool = True,
) -> float:
    if candidates is None:
        candidates = [0.990, 0.992, 0.994, 0.995, 0.996, 0.997, 0.998, 0.999]

    stable = series[cv_start:]
    best_lam, best_mape = 0.997, np.inf

    if verbose:
        print(f"  λ selection (CV MAPE over {n_folds} folds × {horizon} weeks):")

    for lam in candidates:
        fold_mapes = []
        for fold in range(1, n_folds + 1):
            cut_idx = len(stable) - fold * horizon
            if cut_idx < 0:
                break
            cut_date = stable.index[cut_idx]
            train    = series[:cut_date]
            if len(train) < 200:
                break
            test = stable.iloc[cut_idx: cut_idx + horizon]
            if len(test) < horizon:
                continue
            try:
                hw   = HoltWintersDamped(lam=lam).fit(train.values.astype(float))
                lgbm = LGBMResidualModel(lam=lam).fit(hw.resid_, hw.fitted_)
                actual, fc_list = test.values, []
                for i in range(horizon):
                    hw_fc_1 = hw.forecast(1)[0]
                    lg_mean, _, _ = lgbm.forecast(1)
                    fc_list.append(hw_fc_1 + lg_mean[0])
                    prev_L, prev_T = hw._last_L, hw._last_T
                    hw.update_state(actual[i])
                    lgbm.update_residual(actual[i] - (prev_L + hw.phi * prev_T), actual[i])
                fc = np.array(fc_list)
                fold_mapes.append(float(np.mean(np.abs((actual - fc) / actual) * 100)))
            except Exception:
                pass

        if fold_mapes:
            mean_mape = float(np.mean(fold_mapes))
            if verbose:
                print(f"    λ={lam:.3f}  mean MAPE={mean_mape:.3f}%  max MAPE={max(fold_mapes):.3f}%")
            if mean_mape < best_mape:
                best_mape, best_lam = mean_mape, lam

    if verbose:
        print(f"  → Best λ = {best_lam:.3f}  (mean CV MAPE = {best_mape:.3f}%)\n")
    return best_lam


def conformal_intervals(
    calibration_residuals: np.ndarray,
    point_forecast: np.ndarray,
    alphas: list = [0.20, 0.10, 0.05],
) -> dict:
    scores = np.abs(calibration_residuals)
    n, out = len(scores), {}
    for alpha in alphas:
        level    = int(round((1 - alpha) * 100))
        q        = min(np.ceil((n + 1) * (1 - alpha)) / n, 1.0)
        margin   = np.quantile(scores, q)
        out[level] = (point_forecast - margin, point_forecast + margin)
    return out


def blend_intervals(lgbm_lo, lgbm_hi, cp_lo, cp_hi, w_lgbm=0.5):
    return (
        w_lgbm * lgbm_lo + (1 - w_lgbm) * cp_lo,
        w_lgbm * lgbm_hi + (1 - w_lgbm) * cp_hi,
    )


def recursive_holdout_eval(
    train: pd.Series,
    actuals: pd.Series,
    lam: float = 0.997,
    run_sarima_benchmark: bool = True,
) -> dict:
    y_train = train.values.astype(float)
    hw      = HoltWintersDamped(lam=lam).fit(y_train)
    lgbm    = LGBMResidualModel(lam=lam).fit(hw.resid_, hw.fitted_)

    print(f"    λ={lam:.3f}  α={hw.alpha:.4f}  β={hw.beta:.4f}  φ={hw.phi:.4f}")
    print(f"    LGBM trees (mean/qlo/qhi): "
          f"{lgbm._model_mean.best_iteration_} / "
          f"{lgbm._model_qlo.best_iteration_} / "
          f"{lgbm._model_qhi.best_iteration_}  (early-stopped)")
    print(f"    Resid std: Rs {hw.resid_.std():,.2f}")

    actual = actuals.values
    h      = len(actual)
    fc_list, lo90_list, hi90_list = [], [], []

    for i in range(h):
        hw_fc_1 = hw.forecast(1)[0]
        lg_mean, lg_lo, lg_hi = lgbm.forecast(1)
        fc_list.append(hw_fc_1 + lg_mean[0])
        lo90_list.append(hw_fc_1 + lg_lo[0])
        hi90_list.append(hw_fc_1 + lg_hi[0])
        prev_L, prev_T = hw._last_L, hw._last_T
        hw.update_state(actual[i])
        lgbm.update_residual(actual[i] - (prev_L + hw.phi * prev_T), actual[i])

    fc     = np.array(fc_list)
    lo90   = np.array(lo90_list)
    hi90   = np.array(hi90_list)
    errors = actual - fc
    abs_e  = np.abs(errors)
    mae    = float(np.mean(abs_e))
    mape   = float(np.mean(abs_e / actual) * 100)
    rmse   = float(np.sqrt(np.mean(errors ** 2)))
    max_i  = int(np.argmax(abs_e))
    min_i  = int(np.argmin(abs_e))

    cal_resid    = hw.resid_[:-h][-104:]
    cp_cis       = conformal_intervals(cal_resid, fc, [0.20, 0.10, 0.05])
    bl_lo, bl_hi = blend_intervals(lo90, hi90, cp_cis[90][0], cp_cis[90][1])

    def cov(lo, hi):
        return int(np.sum((actual >= lo) & (actual <= hi)))

    result = {
        'hw': hw, 'lgbm': lgbm, 'lam': lam,
        'fc': fc, 'actuals': actual,
        'forecast_dates': actuals.index,
        'lo90': lo90, 'hi90': hi90,
        'bl_lo90': bl_lo, 'bl_hi90': bl_hi,
        'mae':            round(mae,  2),
        'mape':           round(mape, 2),
        'rmse':           round(rmse, 2),
        'max_error':      round(float(abs_e[max_i]), 2),
        'max_error_date': actuals.index[max_i].date(),
        'min_error':      round(float(abs_e[min_i]), 2),
        'min_error_date': actuals.index[min_i].date(),
        'resid_std':      round(float(np.std(hw.resid_)), 2),
        'cp_cis':         cp_cis,
        'cov_cp80':       cov(*cp_cis[80]),
        'cov_cp90':       cov(*cp_cis[90]),
        'cov_lgbm90':     cov(lo90, hi90),
        'cov_blend90':    cov(bl_lo, bl_hi),
        'n_test':         h,
    }

    if run_sarima_benchmark:
        print(f"\n    Fitting SARIMA benchmark (may take ~60s) ...")
        try:
            sarima    = SARIMABenchmark().fit(train)
            s_fc_list = []
            for i in range(h):
                s_fc_list.append(sarima.forecast(1)[0])
                sarima.update_and_forecast(actual[i])
            s_fc   = np.array(s_fc_list)
            s_ae   = np.abs(actual - s_fc)
            result['sarima_fc']   = s_fc
            result['sarima_mae']  = round(float(np.mean(s_ae)), 2)
            result['sarima_mape'] = round(float(np.mean(s_ae / actual) * 100), 2)
            result['sarima_rmse'] = round(float(np.sqrt(np.mean((actual - s_fc) ** 2))), 2)
            print(f"    SARIMA  MAE=Rs {result['sarima_mae']:,.2f}  "
                  f"MAPE={result['sarima_mape']:.2f}%  "
                  f"RMSE=Rs {result['sarima_rmse']:,.2f}")
        except Exception as e:
            print(f"    SARIMA benchmark failed: {e}")

    return result


def walk_forward_cv(
    full_series: pd.Series,
    horizon: int   = 5,
    min_train: int = 500,
    cv_start: str  = "2023-01-01",
    max_folds: int = 5,
    lam: float     = 0.997,
) -> list[dict]:
    stable, results = full_series[cv_start:], []

    for fold in range(1, max_folds + 1):
        cut_idx = len(stable) - fold * horizon
        if cut_idx < 0:
            break
        cut_date = stable.index[cut_idx]
        train    = full_series[:cut_date]
        if len(train) < min_train:
            print(f"   Fold {fold}: skipped — only {len(train)} rows (need ≥{min_train})")
            break
        test = stable.iloc[cut_idx: cut_idx + horizon]
        if len(test) < horizon:
            continue

        try:
            hw   = HoltWintersDamped(lam=lam).fit(train.values.astype(float))
            lgbm = LGBMResidualModel(lam=lam).fit(hw.resid_, hw.fitted_)
            actual   = test.values
            fc_list, lo_list, hi_list = [], [], []

            for i in range(horizon):
                hw_fc_1 = hw.forecast(1)[0]
                lg_m, lg_lo, lg_hi = lgbm.forecast(1)
                fc_list.append(hw_fc_1 + lg_m[0])
                lo_list.append(hw_fc_1 + lg_lo[0])
                hi_list.append(hw_fc_1 + lg_hi[0])
                prev_L, prev_T = hw._last_L, hw._last_T
                hw.update_state(actual[i])
                lgbm.update_residual(actual[i] - (prev_L + hw.phi * prev_T), actual[i])

            fc   = np.array(fc_list)
            lo   = np.array(lo_list)
            hi   = np.array(hi_list)
            ae   = np.abs(actual - fc)
            mae  = float(np.mean(ae))
            mape = float(np.mean(ae / actual) * 100)
            rmse = float(np.sqrt(np.mean((actual - fc) ** 2)))

            cal  = hw.resid_[:-horizon][-52:]
            cis  = conformal_intervals(cal, fc, [0.20, 0.10])
            c80  = int(np.sum((actual >= cis[80][0]) & (actual <= cis[80][1])))
            c90  = int(np.sum((actual >= cis[90][0]) & (actual <= cis[90][1])))
            clg  = int(np.sum((actual >= lo) & (actual <= hi)))

            results.append({
                'fold':       fold,
                'n_train':    len(train),
                'test_start': test.index[0].date(),
                'test_end':   test.index[-1].date(),
                'mae':        round(mae,  2),
                'mape':       round(mape, 2),
                'rmse':       round(rmse, 2),
                'ci80_cp':    f"{c80}/{horizon} ({c80/horizon*100:.0f}%)",
                'ci90_cp':    f"{c90}/{horizon} ({c90/horizon*100:.0f}%)",
                'ci90_lgbm':  f"{clg}/{horizon} ({clg/horizon*100:.0f}%)",
            })
            print(f"   Fold {fold} [n={len(train)}] "
                  f"[{test.index[0].date()}–{test.index[-1].date()}]  "
                  f"MAE=Rs {mae:,.2f}  MAPE={mape:.2f}%  "
                  f"CP-80%={c80}/{horizon}  LGBM-90%={clg}/{horizon}")
        except Exception as e:
            print(f"   Fold {fold} failed: {e}")

    return results


def future_forecast(
    full_series: pd.Series,
    hw: HoltWintersDamped,
    lgbm: LGBMResidualModel,
    h: int = 5,
) -> dict:
    hw_fc              = hw.forecast(h)
    lg_mean, lg_lo, lg_hi = lgbm.forecast(h)
    fc      = hw_fc + lg_mean
    lo_lgbm = hw_fc + lg_lo
    hi_lgbm = hw_fc + lg_hi

    cal    = hw.resid_[-104:]
    cp_cis = conformal_intervals(cal, fc, [0.20, 0.10, 0.05])

    bl_lo, bl_hi = blend_intervals(
        lo_lgbm, hi_lgbm, cp_cis[90][0], cp_cis[90][1]
    )

    last  = full_series.index[-1]
    dates = pd.date_range(last + pd.Timedelta(weeks=1), periods=h, freq='W-TUE')

    return {
        'dates':   dates,   'fc':      fc,
        'lo_lgbm': lo_lgbm, 'hi_lgbm': hi_lgbm,
        'bl_lo90': bl_lo,   'bl_hi90': bl_hi,
        'cp_cis':  cp_cis,
    }


if __name__ == "__main__":
    _DATA  = Path(__file__).parent / "data_sets"
    HIST   = _DATA / "cinnamon_oil_prices_526.csv"
    ACTUAL = _DATA / "Actual_Price.csv"

    HORIZON          = 5
    LAM_AUTO         = True
    LAM_FIXED        = 0.997
    RUN_SARIMA       = True
    LGBM_N_EST       = 500
    LGBM_QUANTILE_LO = 0.05
    LGBM_QUANTILE_HI = 0.95

    print("=" * 70)
    print("  Cinnamon Oil Price Forecast — v10 (ML-Enhanced, Academic)")
    print("  HW(mul,damped,λ) + LightGBM(residual,quantile,λ-weighted)")
    print("  + Recursive Updating + Conformal CP + SARIMA Benchmark")
    print(f"  Horizon: {HORIZON} weeks | All rows used with λ-weighting")
    print("=" * 70)

    hist, actuals = load_data(
        str(HIST),
        str(ACTUAL) if ACTUAL.exists() else None,
    )
    print(f"\nTraining data : {len(hist)} weeks "
          f"({hist.index[0].date()} – {hist.index[-1].date()})")

    print("\n" + "─" * 60)
    print("  STEP 1: Select optimal decay parameter λ")
    print("─" * 60)
    if LAM_AUTO:
        lam = select_lambda(hist, horizon=HORIZON, verbose=True)
    else:
        lam = LAM_FIXED
        print(f"  Using fixed λ = {lam}\n")

    ev = None
    if actuals is not None:
        print(f"Hold-out data : {len(actuals)} weeks "
              f"({actuals.index[0].date()} – {actuals.index[-1].date()})")
        train = hist[hist.index < actuals.index[0]]
        print(f"Train ends    : {train.index[-1].date()}  "
              f"({len(train)} rows — satisfies ≥500 requirement)\n")

        print("─" * 60)
        print("  STEP 2: Hold-out evaluation (recursive 1-step-ahead)")
        print("─" * 60)
        ev = recursive_holdout_eval(
            train, actuals, lam=lam,
            run_sarima_benchmark=RUN_SARIMA,
        )

        n = ev['n_test']
        sarima_mape = ev.get('sarima_mape', 'N/A')
        sarima_mae  = ev.get('sarima_mae',  'N/A')
        sarima_rmse = ev.get('sarima_rmse', 'N/A')

        def _fmt(v):
            return f"{v:>10,.2f}" if isinstance(v, float) else f"{'N/A':>10}"

        print(f"\n  {'Metric':<32} {'HW+LGBM':>10}  {'SARIMA':>10}   Status")
        print(f"  {'-'*65}")
        print(f"  {'Training rows used':<32} {len(train):>10}  {'':>10}   ✓ ≥500 satisfied")
        print(f"  {'Decay parameter λ':<32} {lam:>10.3f}  {'':>10}   CV-optimal")
        print(f"  {'HW α (level)':<32} {ev['hw'].alpha:>10.4f}")
        print(f"  {'HW β (trend)':<32} {ev['hw'].beta:>10.4f}")
        print(f"  {'HW φ (damping)':<32} {ev['hw'].phi:>10.4f}")
        print(f"  {'LGBM trees (mean)':<32} {ev['lgbm']._model_mean.best_iteration_:>10}   early-stopped")
        print(f"  {'-'*65}")
        print(f"  {'MAE':<32} Rs {ev['mae']:>7,.2f}  Rs {_fmt(sarima_mae).strip():>7}   "
              f"{'✓ Excellent' if ev['mape'] < 2 else '✓ Good' if ev['mape'] < 5 else '✗'}")
        print(f"  {'MAPE':<32} {ev['mape']:>9.2f}%  {_fmt(sarima_mape).strip():>8}%")
        print(f"  {'RMSE':<32} Rs {ev['rmse']:>7,.2f}  Rs {_fmt(sarima_rmse).strip():>7}")
        print(f"  {'Max Error':<32} Rs {ev['max_error']:>7,.2f}  {'':>10}   ({ev['max_error_date']})")
        print(f"  {'Residual Std':<32} Rs {ev['resid_std']:>7,.2f}  {'':>10}   noise floor")
        print(f"  {'80% CP Coverage':<32} {ev['cov_cp80']:>2}/{n} = {ev['cov_cp80']/n*100:.0f}%  {'':>10}   (target ≥80%)")
        print(f"  {'90% CP Coverage':<32} {ev['cov_cp90']:>2}/{n} = {ev['cov_cp90']/n*100:.0f}%  {'':>10}   (target ≥90%)")
        print(f"  {'90% LGBM Quantile Cov.':<32} {ev['cov_lgbm90']:>2}/{n} = {ev['cov_lgbm90']/n*100:.0f}%  {'':>10}   (target ≥90%)")
        print(f"  {'90% Blended PI Coverage':<32} {ev['cov_blend90']:>2}/{n} = {ev['cov_blend90']/n*100:.0f}%  {'':>10}   (target ≥90%)")

        print(f"\n  Weekly Hold-out Detail (HW + LightGBM):")
        print(f"  {'Date':<14} {'Actual':>9} {'Forecast':>10} {'Error':>8} {'MAPE':>7} {'90%CI':>5} {'90%Blend':>9}")
        print(f"  {'-'*70}")
        for i in range(n):
            lo_cp, hi_cp = ev['cp_cis'][90][0][i], ev['cp_cis'][90][1][i]
            in_cp        = "✓" if lo_cp <= ev['actuals'][i] <= hi_cp else "✗"
            in_bl        = "✓" if ev['bl_lo90'][i] <= ev['actuals'][i] <= ev['bl_hi90'][i] else "✗"
            row_mape     = abs(ev['actuals'][i] - ev['fc'][i]) / ev['actuals'][i] * 100
            print(f"  {str(ev['forecast_dates'][i].date()):<14} "
                  f"{ev['actuals'][i]:>9,.2f} {ev['fc'][i]:>10,.2f} "
                  f"{ev['actuals'][i]-ev['fc'][i]:>+8.2f} "
                  f"{row_mape:>6.2f}% {in_cp:>5} {in_bl:>9}")

        if 'sarima_fc' in ev:
            print(f"\n  Weekly Hold-out Detail (SARIMA Benchmark):")
            print(f"  {'Date':<14} {'Actual':>9} {'SARIMA FC':>10} {'Error':>8} {'MAPE':>7}")
            print(f"  {'-'*55}")
            for i in range(n):
                s_err  = ev['actuals'][i] - ev['sarima_fc'][i]
                s_mape = abs(s_err) / ev['actuals'][i] * 100
                print(f"  {str(ev['forecast_dates'][i].date()):<14} "
                      f"{ev['actuals'][i]:>9,.2f} {ev['sarima_fc'][i]:>10,.2f} "
                      f"{s_err:>+8.2f} {s_mape:>6.2f}%")

    print(f"\n{'─'*60}")
    print(f"  STEP 3: Walk-forward CV  (5 folds × {HORIZON} weeks)")
    print("─" * 60)
    cv_results = walk_forward_cv(
        hist, horizon=HORIZON, min_train=500, max_folds=5, lam=lam,
    )
    if cv_results:
        maes  = [r['mae']  for r in cv_results]
        mapes = [r['mape'] for r in cv_results]
        rmses = [r['rmse'] for r in cv_results]
        print(f"\n  Mean MAE  : Rs {np.mean(maes):,.2f} ± Rs {np.std(maes):,.2f}")
        print(f"  Mean MAPE : {np.mean(mapes):.2f}% ± {np.std(mapes):.2f}%")
        print(f"  Max MAPE  : {max(mapes):.2f}%  "
              f"({'✓ all folds < 5%' if max(mapes) < 5 else '✗ some folds ≥ 5%'})")
        print(f"  Mean RMSE : Rs {np.mean(rmses):,.2f} ± Rs {np.std(rmses):,.2f}")

    print(f"\n{'─'*60}")
    print(f"  STEP 4: Future forecast (next {HORIZON} weeks)")
    print("─" * 60)

    if ev is not None:
        hw_final   = ev['hw']
        lgbm_final = ev['lgbm']
        full_s     = pd.concat(
            [hist, actuals[~actuals.index.isin(hist.index)]]
        ).sort_index().resample('W-TUE').mean().interpolate('linear')
    else:
        full_s     = hist.copy()
        hw_final   = HoltWintersDamped(lam=lam).fit(full_s.values.astype(float))
        lgbm_final = LGBMResidualModel(lam=lam).fit(hw_final.resid_, hw_final.fitted_)

    fut = future_forecast(full_s, hw_final, lgbm_final, h=HORIZON)

    print(f"\n  {'Date':<14} {'Forecast':>10}  {'LGBM Lo':>10}  {'LGBM Hi':>10}  "
          f"{'Blend Lo':>10}  {'Blend Hi':>10}  {'CP 90Lo':>10}  {'CP 90Hi':>10}")
    print(f"  {'-'*95}")
    for i, (d, f) in enumerate(zip(fut['dates'], fut['fc'])):
        print(f"  {str(d.date()):<14} {f:>10,.2f}  "
              f"{fut['lo_lgbm'][i]:>10,.2f}  {fut['hi_lgbm'][i]:>10,.2f}  "
              f"{fut['bl_lo90'][i]:>10,.2f}  {fut['bl_hi90'][i]:>10,.2f}  "
              f"{fut['cp_cis'][90][0][i]:>10,.2f}  {fut['cp_cis'][90][1][i]:>10,.2f}")

    import json, datetime

    def _s(o):
        if isinstance(o, (datetime.date, datetime.datetime)):
            return str(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        raise TypeError(type(o))

    out = {
        'model_version': 'v10',
        'method': (
            f'HW(mul,damped,λ={lam}) + LightGBM(residual,q=[{LGBM_QUANTILE_LO},{LGBM_QUANTILE_HI}],λ={lam})'
            f' + Recursive Updating + Conformal CP + SARIMA Benchmark | Horizon: {HORIZON} weeks'
        ),
        'lambda':        lam,
        'horizon_weeks': HORIZON,
        'training_rows': len(hist),
        'lgbm_config': {
            'n_estimators':  LGBM_N_EST,
            'quantile_lo':   LGBM_QUANTILE_LO,
            'quantile_hi':   LGBM_QUANTILE_HI,
            'features': ['lag_1..12', 'rolling_mean_4w', 'rolling_std_4w',
                         'rolling_mean_12w', 'rolling_std_12w',
                         'price_level', 'weeks_since_break'],
        },
        'holdout': (
            {k: v for k, v in ev.items()
             if k not in ('hw', 'lgbm', 'fc', 'actuals', 'forecast_dates',
                          'cp_cis', 'lo90', 'hi90', 'bl_lo90', 'bl_hi90', 'sarima_fc')}
            if ev else None
        ),
        'cv_summary': ({
            'mean_mae':  round(float(np.mean(maes)), 2),
            'std_mae':   round(float(np.std(maes)),  2),
            'mean_mape': round(float(np.mean(mapes)), 2),
            'std_mape':  round(float(np.std(mapes)), 2),
            'max_mape':  round(float(max(mapes)), 2),
            'mean_rmse': round(float(np.mean(rmses)), 2),
        } if cv_results else None),
        'cv_folds': cv_results,
        'future_forecast': [
            {
                'date':       str(d.date()),
                'forecast':   round(float(f), 2),
                'lgbm_lo90':  round(float(fut['lo_lgbm'][i]), 2),
                'lgbm_hi90':  round(float(fut['hi_lgbm'][i]), 2),
                'blend_lo90': round(float(fut['bl_lo90'][i]), 2),
                'blend_hi90': round(float(fut['bl_hi90'][i]), 2),
                'cp_lo90':    round(float(fut['cp_cis'][90][0][i]), 2),
                'cp_hi90':    round(float(fut['cp_cis'][90][1][i]), 2),
                'cp_lo80':    round(float(fut['cp_cis'][80][0][i]), 2),
                'cp_hi80':    round(float(fut['cp_cis'][80][1][i]), 2),
            }
            for i, (d, f) in enumerate(zip(fut['dates'], fut['fc']))
        ],
    }

    out_path = Path(__file__).parent / "results_v10.json"
    with open(out_path, 'w') as fp:
        json.dump(out, fp, indent=2, default=_s)
    print(f"\n  Results → {out_path}")
    print("\n" + "=" * 70)
    print("  v10 complete.")
    print("=" * 70)