import pandas as pd
import joblib
import warnings
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path

warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

MODEL_PATH = Path(__file__).resolve().parent / "oil_yield_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "cinnamon_oil_yield_dataset.csv"


def encode_features(df):

    df['species_encoded'] = df['Species_Variety'].map({'Sri Gemunu': 0, 'Sri Vijaya': 1})

    df['season_encoded'] = df['Harvest_Season'].map({
        'October–December/January': 0,
        'May–August': 1
    })

    return df


def train_model(force_retrain=True):
    if MODEL_PATH.exists() and not force_retrain:
        return joblib.load(MODEL_PATH)

    data = pd.read_csv(DATA_PATH)
    data = encode_features(data)

    X = data[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    y = data['Oil_Yield_kg']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [3, 5],
        'learning_rate': [0.05, 0.1]
    }

    grid_search = GridSearchCV(
        estimator=XGBRegressor(random_state=42, verbosity=0),
        param_grid=param_grid,
        cv=3,
        scoring='r2',
        n_jobs=-1
    )
    grid_search.fit(X_train, y_train)

    model = grid_search.best_estimator_

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"MAE: {mae:.3f} L | R²: {r2:.3f}")

    joblib.dump(model, MODEL_PATH)
    return model


def load_model():
    try:
        if not MODEL_PATH.exists():
            return train_model(force_retrain=True)
        return joblib.load(MODEL_PATH)
    except Exception:
        return train_model(force_retrain=True)


if __name__ == "__main__":
    train_model(force_retrain=True)

#model train - python oil_yield_model.py