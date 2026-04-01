# app/oil_yield/model.py
import pandas as pd
import joblib
import warnings
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path

warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

# Paths to saved model and training dataset
MODEL_PATH = Path(__file__).resolve().parent / "oil_yield_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "cinnamon_oil_yield_dataset.csv"


def encode_features(df):

    # Encode cinnamon species as binary (Sri Gemunu=0, Sri Vijaya=1)
    df['species_encoded'] = df['Species_Variety'].map({'Sri Gemunu': 0, 'Sri Vijaya': 1})

    # Encode harvest season as binary (Oct–Jan=0, May–Aug=1)
    df['season_encoded'] = df['Harvest_Season'].map({
        'October–December/January': 0,
        'May–August': 1
    })

    return df


def train_model(force_retrain=True):
    # Return cached model if it exists and retraining is not forced
    if MODEL_PATH.exists() and not force_retrain:
        return joblib.load(MODEL_PATH)

    data = pd.read_csv(DATA_PATH)
    data = encode_features(data)

    # Features: dry weight, species, and harvest season (using encoded columns)
    X = data[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    y = data['Oil_Yield_kg']

    # 80/20 train-test split with fixed seed for reproducibility
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Hyperparameter search space for XGBoost
    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [3, 5],
        'learning_rate': [0.05, 0.1]
    }

    # 3-fold cross-validated grid search to find best hyperparameters
    grid_search = GridSearchCV(
        estimator=XGBRegressor(random_state=42, verbosity=0),
        param_grid=param_grid,
        cv=3,
        scoring='r2',
        n_jobs=-1
    )
    grid_search.fit(X_train, y_train)

    # Select the best model from grid search
    model = grid_search.best_estimator_

    # Evaluate model performance on held-out test set
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"MAE: {mae:.3f} L | R²: {r2:.3f}")

    # Persist trained model to disk
    joblib.dump(model, MODEL_PATH)
    return model


def load_model():
    try:
        # Train from scratch if no saved model is found
        if not MODEL_PATH.exists():
            return train_model(force_retrain=True)
        return joblib.load(MODEL_PATH)
    except Exception:
        # Fallback to retraining if model file is corrupt or incompatible
        return train_model(force_retrain=True)


if __name__ == "__main__":
    train_model(force_retrain=True)

#model train - python oil_yield_model.py