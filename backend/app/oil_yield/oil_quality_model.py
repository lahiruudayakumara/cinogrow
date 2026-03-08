import pandas as pd
import joblib
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path

# Paths
MODEL_PATH = Path(__file__).resolve().parent / "oil_quality_model.pkl"
DATA_PATH = Path(__file__).resolve().parent / "data_sets" / "oil_quality_dataset.csv"


def encode_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Encode categorical features in the oil quality dataset.
    """
    df['cinnamon_type_encoded'] = df['cinnamon_type'].map({
        'Sri Gamunu': 0,
        'Sri Wijaya': 1
    })

    df['plant_part_encoded'] = df['plant_part'].map({
        'Featherings & Chips': 0,
        'Leaves & Twigs': 1
    })

    # Harvest season months present in dataset
    df['harvest_season_encoded'] = df['harvest_season'].map({
        'January': 0,
        'April': 1,
        'July': 2,
        'October': 3
    })

    # Color categories
    df['color_encoded'] = df['color'].map({
        'pale_yellow': 0,
        'golden': 1,
        'amber': 2,
        'dark': 3
    })

    # Clarity categories
    df['clarity_encoded'] = df['clarity'].map({
        'clear': 0,
        'slightly_cloudy': 1,
        'cloudy': 2
    })

    # Aroma categories
    df['aroma_encoded'] = df['aroma'].map({
        'mild': 0,
        'aromatic': 1,
        'pungent': 2
    })

    return df


def train_model():
    """
    Train an XGBoost regressor to predict oil quality score.
    Saves the trained model as a .pkl file.
    """
    data = pd.read_csv(DATA_PATH)
    data = encode_features(data)

    # Features and target
    feature_cols = [
        'mass_kg',
        'plant_age_years',
        'cinnamon_type_encoded',
        'plant_part_encoded',
        'harvest_season_encoded',
        'color_encoded',
        'clarity_encoded',
        'aroma_encoded',
    ]
    X = data[feature_cols]
    y = data['score']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    joblib.dump(model, MODEL_PATH)
    print(f"✅ Oil quality model trained and saved at {MODEL_PATH}")
    print("📊 Model Performance:")
    print(f"   - Mean Absolute Error: {mae:.3f}")
    print(f"   - R² Score: {r2:.3f}")


def load_model():
    """
    Load trained model, training a new one if missing.
    """
    if not MODEL_PATH.exists():
        print(f"⚠️ Model not found at {MODEL_PATH}. Training a new model...")
        train_model()
    return joblib.load(MODEL_PATH)


if __name__ == "__main__":
    train_model()