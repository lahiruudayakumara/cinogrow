import pandas as pd
import joblib
import warnings
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path

warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

# Kaggle integration for cinnamon oil yield dataset
try:
    import kagglehub
    from kagglehub import KaggleDatasetAdapter
    KAGGLEHUB_AVAILABLE = True
except ImportError:
    KAGGLEHUB_AVAILABLE = False

MODEL_PATH = Path(__file__).resolve().parent / "oil_yield_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "cinnamon_oil_yield_dataset.csv"

# Kaggle dataset info
KAGGLE_DATASET = "malmiwithanage/cinnamon-oil-yield"
KAGGLE_FILE_PATH = "cinnamon_oil_yield_dataset.csv"

def load_data_from_kaggle():
    """Load cinnamon oil yield dataset from Kaggle using kagglehub"""
    if not KAGGLEHUB_AVAILABLE:
        return None
    
    try:
        df = kagglehub.load_dataset(
            KaggleDatasetAdapter.PANDAS,
            KAGGLE_DATASET,
            KAGGLE_FILE_PATH
        )
        print(f"✅ Loaded from Kaggle: {len(df)} rows")
        return df
    except Exception:
        return None

def load_data(path=None):
    """Load cinnamon oil yield data from Kaggle or local CSV"""
    df = load_data_from_kaggle()
    
    if df is None and path:
        df = pd.read_csv(path)
    elif df is None:
        df = pd.read_csv(DATA_PATH)
    
    return df


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

    data = load_data()
    data = encode_features(data)

    X = data[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    y = data['Oil_Yield_kg']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    param_grid = {
        'n_estimators': [200, 400, 600],
        'max_depth': [3, 4, 5],
        'learning_rate': [0.01, 0.05, 0.1],
        'subsample': [0.8, 1.0],
        'colsample_bytree': [0.8, 1.0],
        'min_child_weight': [1, 3],
    }

    grid_search = GridSearchCV(
        estimator=XGBRegressor(random_state=42, verbosity=0, reg_alpha=0.1, reg_lambda=1.5),
        param_grid=param_grid,
        cv=5,
        scoring='r2',
        n_jobs=-1
    )
    grid_search.fit(X_train, y_train)

    model = grid_search.best_estimator_

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"MAE: {mae:.3f} L | R²: {r2:.3f}")
    print(f"Best params: {grid_search.best_params_}")

    cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2')
    print(f"CV R²: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

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

