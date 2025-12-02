# app/oil_yield/model.py
import pandas as pd
import joblib
import logging
import warnings
from xgboost import XGBRegressor
from pathlib import Path

# Suppress XGBoost warnings for model loading
warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

# Path to save/load the model
MODEL_PATH = Path(__file__).resolve().parent / "oil_yield_model.pkl"

logger = logging.getLogger(__name__)

def train_model():
    """
    Train an XGBoost model on example data and save it as a .pkl file.
    Replace the dummy data with real cinnamon oil yield data later.
    """
    logger.info("🔧 Training new XGBoost model for oil yield prediction...")
    
    data = pd.DataFrame({
        "cinnamon_type": [1, 2, 1, 3],
        "plant_part": [1, 2, 1, 1],
        "mass": [10, 20, 15, 18],
        "still_capacity": [50, 70, 60, 55],
        "yield": [1.5, 3.2, 2.3, 2.8]
    })

    X = data[["cinnamon_type", "plant_part", "mass", "still_capacity"]]
    y = data["yield"]

    model = XGBRegressor(
        n_estimators=100, 
        learning_rate=0.1, 
        random_state=42,
        verbosity=0  # Suppress XGBoost warnings during training
    )
    model.fit(X, y)

    # Save model using the current XGBoost version
    joblib.dump(model, MODEL_PATH)
    logger.info(f"✅ Model trained and saved at {MODEL_PATH}")

def load_model():
    """
    Load the trained XGBoost model from disk.
    If the model doesn't exist or fails to load due to version issues, train a new one.
    """
    try:
        if not MODEL_PATH.exists():
            logger.warning(f"⚠️ Model not found at {MODEL_PATH}. Training a new model...")
            train_model()
        
        # Try to load the model
        model = joblib.load(MODEL_PATH)
        logger.info("✅ XGBoost model loaded successfully")
        return model
        
    except Exception as e:
        logger.warning(f"⚠️ Failed to load existing model ({str(e)}). Training a new model...")
        # If loading fails (e.g., due to version compatibility), retrain the model
        train_model()
        return joblib.load(MODEL_PATH)

# --- Run training if executed directly ---
if __name__ == "__main__":
    train_model()
