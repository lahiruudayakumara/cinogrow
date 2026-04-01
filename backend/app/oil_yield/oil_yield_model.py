# app/oil_yield/model.py
import pandas as pd
import joblib
import logging
import warnings
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path
import numpy as np

# Suppress XGBoost warnings
warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Paths
MODEL_PATH = Path(__file__).resolve().parent / "oil_yield_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "cinnamon_oil_yield_dataset.csv"

def encode_features(df):
    """Normalize column names and encode categorical features"""
    # Rename columns to standard names
    df = df.rename(columns={
        'Dried Mass (kg)': 'Leaf_Dry_Weight_kg',
        'Species & Variety': 'Species_Variety',
        'Harvesting Season': 'Harvest_Season',
        'Oil Yield (L)': 'Oil_Yield_L'
    })
    
    # Encode species
    df['species_encoded'] = df['Species_Variety'].map({'Sri Gemunu': 0, 'Sri Vijaya': 1})
    
    # Map harvest seasons to normalized format
    season_mapping = {
        'October–December/January': 0,  # Early season → January-May equivalent
        'May–August': 1                  # Late season → June-December equivalent
    }
    df['season_encoded'] = df['Harvest_Season'].map(season_mapping)
    
    return df

def train_model(force_retrain=True):
    if MODEL_PATH.exists() and not force_retrain:
        logger.info(f"Model already exists at {MODEL_PATH}, skipping training.")
        return joblib.load(MODEL_PATH)

    logger.info("🔧 Training new XGBoost model for cinnamon leaf oil yield...")

    # Load dataset
    data = pd.read_csv(DATA_PATH)
    data = encode_features(data)

    X = data[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    y = data['Oil_Yield_L']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Grid search parameters
    param_grid = {
        'n_estimators': [200, 300, 400],
        'learning_rate': [0.03, 0.05, 0.07],
        'max_depth': [3, 4, 5],
        'subsample': [0.8, 1.0],
        'colsample_bytree': [0.8, 1.0]
    }

    xgb = XGBRegressor(random_state=42, verbosity=0)
    grid_search = GridSearchCV(
        estimator=xgb,
        param_grid=param_grid,
        cv=5,
        scoring='r2',
        n_jobs=-1
    )

    grid_search.fit(X_train, y_train)

    # Best model
    model = grid_search.best_estimator_
    logger.info(f"🏆 Best hyperparameters: {grid_search.best_params_}")

    # Test set evaluation
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    logger.info("📊 Test Set Performance:")
    logger.info(f"   - Mean Absolute Error: {mae:.3f} L")
    logger.info(f"   - R² Score: {r2:.3f}")
    logger.info(f"   - Training samples: {len(X_train)}")
    logger.info(f"   - Test samples: {len(X_test)}")

    # Feature importance
    fi = model.feature_importances_
    features = ['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']
    logger.info("🔑 Feature Importance:")
    for f, v in zip(features, fi):
        logger.info(f"   - {f}: {v:.4f}")

    # 5-fold cross-validation on final model
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='r2', n_jobs=-1)
    logger.info("📌 5-Fold Cross-Validation R²:")
    logger.info(f"   - Scores: {[round(s, 4) for s in cv_scores]}")
    logger.info(f"   - Mean R²: {cv_scores.mean():.4f}")
    logger.info(f"   - Std R²: {cv_scores.std():.4f}")

    # Save model
    joblib.dump(model, MODEL_PATH)
    logger.info(f"✅ Model saved at {MODEL_PATH}")

    # Print final model object
    print("\n--- FINAL MODEL OBJECT ---")
    print(model)

    return model

def load_model():
    try:
        if not MODEL_PATH.exists():
            return train_model(force_retrain=True)
        model = joblib.load(MODEL_PATH)
        logger.info("✅ XGBoost model loaded successfully")
        return model
    except Exception as e:
        logger.warning(f"⚠️ Failed to load existing model ({e}), retraining...")
        return train_model(force_retrain=True)

if __name__ == "__main__":
    train_model(force_retrain=True)