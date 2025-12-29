# app/oil_yield/model.py
import pandas as pd
import joblib
import logging
import warnings
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path

# Suppress XGBoost warnings for model loading
warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

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

logger = logging.getLogger(__name__)

def train_model():
    """
    Train an XGBoost model on real cinnamon oil yield data and save it as a .pkl file.
    """
    logger.info("🔧 Training new XGBoost model for oil yield prediction...")
    
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
        random_state=42,
        verbosity=0  # Suppress XGBoost warnings during training
    )
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Save model using the current XGBoost version
    joblib.dump(model, MODEL_PATH)
    logger.info(f"✅ Model trained and saved at {MODEL_PATH}")
    logger.info(f"📊 Model Performance:")
    logger.info(f"   - Mean Absolute Error: {mae:.3f} L")
    logger.info(f"   - R² Score: {r2:.3f}")
    logger.info(f"   - Training samples: {len(X_train)}")
    logger.info(f"   - Test samples: {len(X_test)}")

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
