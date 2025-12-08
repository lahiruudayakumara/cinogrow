# app/oil_yield/distillation_time_model.py
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path

# Paths
MODEL_PATH = Path(__file__).resolve().parent / "distillation_time_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "cinnamon_distillation_dataset.csv"

def encode_features(df):
    """
    Encode categorical features to numeric values.
    """
    # Encode cinnamon_type: Sri Gamunu = 0, Sri Wijaya = 1
    df['cinnamon_type_encoded'] = df['cinnamon_type'].map({
        'Sri Gamunu': 0,
        'Sri Wijaya': 1
    })
    
    # Encode plant_part: Featherings & Chips = 0, Leaves & Twigs = 1
    df['plant_part_encoded'] = df['plant_part'].map({
        'Featherings & Chips': 0,
        'Leaves & Twigs': 1
    })
    
    return df

def train_model():
    """
    Train an XGBoost model to predict distillation time and save it as a .pkl file.
    """
    # Load dataset
    data = pd.read_csv(DATA_PATH)
    
    # Encode categorical features
    data = encode_features(data)
    
    # Prepare features and target
    X = data[['plant_part_encoded', 'cinnamon_type_encoded', 'distillation_capacity_liters']]
    y = data['distillation_time_hours']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Save model
    joblib.dump(model, MODEL_PATH)
    print(f"✅ Distillation time model trained and saved at {MODEL_PATH}")
    print(f"📊 Model Performance:")
    print(f"   - Mean Absolute Error: {mae:.3f} hours")
    print(f"   - R² Score: {r2:.3f}")
    print(f"   - Training samples: {len(X_train)}")
    print(f"   - Test samples: {len(X_test)}")

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
