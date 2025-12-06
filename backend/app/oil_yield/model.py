# app/oil_yield/model.py
import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path

# Paths
MODEL_PATH = Path(__file__).resolve().parent / "oil_yield_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "cinnamon_oil_yield_dataset.csv"

def encode_features(df):
    """
    Encode categorical features to numeric values.
    """
    # Encode Species & Variety: Sri Gemunu = 0, Sri Vijaya = 1
    df['species_encoded'] = df['Species & Variety'].map({
        'Sri Gemunu': 0,
        'Sri Vijaya': 1
    })
    
    # Encode Plant Part: Featherings & Chips = 0, Leaves & Twigs = 1
    df['plant_part_encoded'] = df['Plant Part'].map({
        'Featherings & Chips': 0,
        'Leaves & Twigs': 1
    })
    
    # Encode Harvesting Season: May–August = 0, October–December/January = 1
    df['season_encoded'] = df['Harvesting Season'].map({
        'May–August': 0,
        'October–December/January': 1
    })
    
    return df

def train_model():
    """
    Train an XGBoost model on real cinnamon oil yield data and save it as a .pkl file.
    """
    # Load dataset
    data = pd.read_csv(DATA_PATH)
    
    # Encode categorical features
    data = encode_features(data)
    
    # Prepare features and target
    X = data[['Dried Mass (kg)', 'species_encoded', 'plant_part_encoded', 
              'Age (years)', 'season_encoded']]
    y = data['Oil Yield (L)']
    
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
    print(f"✅ Model trained and saved at {MODEL_PATH}")
    print(f"📊 Model Performance:")
    print(f"   - Mean Absolute Error: {mae:.3f} L")
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
