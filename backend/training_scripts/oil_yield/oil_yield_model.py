import pandas as pd
import joblib
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score, RandomizedSearchCV
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path
import kagglehub
from kagglehub import KaggleDatasetAdapter

BASE = Path(__file__).resolve().parent
MODEL_FILE = BASE / "oil_yield_model.pkl"

def load_data():
    df = kagglehub.load_dataset(
        KaggleDatasetAdapter.PANDAS,
        "malmiwithanage/cinnamon-oil-yield",
        "cinnamon_oil_yield_dataset.csv",
    )
    if df is None:
        raise FileNotFoundError("Could not load oil yield data from Kaggle dataset.")
    return df

def encode_features(df):
    df['species_encoded'] = df['Species_Variety'].map({'Sri Gemunu': 0, 'Sri Vijaya': 1})
    df['season_encoded'] = df['Harvest_Season'].map({'October–December/January': 0, 'May–August': 1})
    return df

def prepare_data(df):
    X = df[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    y = df['Oil_Yield_kg']
    return train_test_split(X, y, test_size=0.2, random_state=42)

def define_param_grid(n_samples):
    n_estimators_min = max(50, n_samples // 2)
    n_estimators_max = min(1000, n_samples * 2)
    
    return {
        'n_estimators': np.linspace(n_estimators_min, n_estimators_max, 5, dtype=int).tolist(),
        'max_depth': list(range(3, min(10, n_samples // 10 + 3))),
        'learning_rate': [0.01, 0.05, 0.1, 0.15],
        'subsample': np.linspace(0.6, 1.0, 5).tolist(),
        'colsample_bytree': np.linspace(0.6, 1.0, 5).tolist(),
        'min_child_weight': list(range(1, min(6, n_samples // 50 + 2))),
    }

def train(df):
    X_train, X_test, y_train, y_test = prepare_data(df)
    param_grid = define_param_grid(len(df))
    search = RandomizedSearchCV(
        estimator=XGBRegressor(random_state=42, verbosity=0, reg_alpha=0.1, reg_lambda=1.5),
        param_distributions=param_grid,
        n_iter=25,
        cv=5,
        scoring='r2',
        n_jobs=-1,
        random_state=42
    )
    search.fit(X_train, y_train)
    model = search.best_estimator_

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    X_full = df[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    y_full = df['Oil_Yield_kg']
    cv_scores = cross_val_score(model, X_full, y_full, cv=5, scoring='r2')

    data = {
        "model": model,
        "mae": round(mae, 3),
        "r2": round(r2, 3),
        "cv_r2_mean": round(cv_scores.mean(), 3),
        "cv_r2_std": round(cv_scores.std(), 3),
        "best_params": search.best_params_,
        "n": len(df),
    }
    joblib.dump(data, MODEL_FILE, compress=3)
    return data

def forecast_yield():
    df = load_data()
    df = encode_features(df)
    try:
        data = joblib.load(MODEL_FILE)
        if data.get("n") != len(df):
            raise ValueError
    except Exception:
        data = train(df)
    return data["model"]