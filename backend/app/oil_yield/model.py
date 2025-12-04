# app/oil_yield/model.py
import pandas as pd
import joblib
from xgboost import XGBRegressor
from pathlib import Path

# Path to save/load the model
MODEL_PATH = Path(__file__).resolve().parent / "oil_yield_model.pkl"

def train_model():
    """
    Train an XGBoost model on example data and save it as a .pkl file.
    Replace the dummy data with real cinnamon oil yield data later.
    """
    data = pd.DataFrame({
        "cinnamon_type": [1, 2, 1, 3],
        "plant_part": [1, 2, 1, 1],
        "mass": [10, 20, 15, 18],
        "still_capacity": [50, 70, 60, 55],
        "yield": [1.5, 3.2, 2.3, 2.8]
    })

    X = data[["cinnamon_type", "plant_part", "mass", "still_capacity"]]
    y = data["yield"]

    model = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    model.fit(X, y)

    # Save model
    joblib.dump(model, MODEL_PATH)
    print(f"✅ Model trained and saved at {MODEL_PATH}")

def load_model():
    """
    Load the trained XGBoost model from disk.
    If the model doesn't exist, train it first.
    """
    if not MODEL_PATH.exists():
        print(f"⚠️ Model not found at {MODEL_PATH}. Training a new model...")
        train_model()
    
    return joblib.load(MODEL_PATH)

# --- Run training if executed directly ---
if __name__ == "__main__":
    train_model()
