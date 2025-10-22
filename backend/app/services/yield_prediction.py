import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os
from typing import Dict, Any, Optional
from sqlmodel import Session, select
from datetime import datetime
import logging

from app.models.yield_weather import YieldDataset, Plot, YieldPrediction

logger = logging.getLogger(__name__)


class YieldPredictionService:
    """ML-based yield prediction service using scikit-learn"""
    
    def __init__(self, db: Session):
        self.db = db
        self.model = None
        self.scaler = None
        self.location_encoder = None
        self.variety_encoder = None
        self.model_path = "models/yield_prediction_model.joblib"
        self.scaler_path = "models/yield_scaler.joblib"
        self.encoders_path = "models/yield_encoders.joblib"
        
        # Create models directory if it doesn't exist
        os.makedirs("models", exist_ok=True)
        
        # Try to load existing model
        self.load_model()
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for training or prediction"""
        # Create feature columns
        features = df.copy()
        
        # Encode categorical variables
        if self.location_encoder is None:
            self.location_encoder = LabelEncoder()
            features['location_encoded'] = self.location_encoder.fit_transform(features['location'])
        else:
            # Handle unseen locations
            locations = features['location'].values
            encoded_locations = []
            for loc in locations:
                if loc in self.location_encoder.classes_:
                    encoded_locations.append(self.location_encoder.transform([loc])[0])
                else:
                    # Use most common location for unseen values
                    encoded_locations.append(0)  # First class
            features['location_encoded'] = encoded_locations
        
        if self.variety_encoder is None:
            self.variety_encoder = LabelEncoder()
            features['variety_encoded'] = self.variety_encoder.fit_transform(features['variety'])
        else:
            # Handle unseen varieties
            varieties = features['variety'].values
            encoded_varieties = []
            for var in varieties:
                if var in self.variety_encoder.classes_:
                    encoded_varieties.append(self.variety_encoder.transform([var])[0])
                else:
                    # Use most common variety for unseen values
                    encoded_varieties.append(0)  # First class
            features['variety_encoded'] = encoded_varieties
        
        # Fill missing values with defaults
        features['rainfall'] = features['rainfall'].fillna(2500)  # Default rainfall for Sri Lanka
        features['temperature'] = features['temperature'].fillna(26)  # Default temperature
        features['age_years'] = features['age_years'].fillna(5)  # Default tree age
        
        # Create yield per hectare feature
        features['yield_per_hectare'] = features['yield_amount'] / features['area']
        
        # Select features for model
        feature_columns = [
            'area', 'location_encoded', 'variety_encoded', 
            'rainfall', 'temperature', 'age_years'
        ]
        
        return features[feature_columns]
    
    def train_model(self, retrain: bool = False) -> Dict[str, Any]:
        """Train the yield prediction model"""
        logger.info("Starting model training...")
        
        # Check if model exists and retrain flag is False
        if not retrain and self.model is not None:
            logger.info("Model already exists and retrain=False")
            return {"message": "Model already trained", "retrained": False}
        
        # Get training data from database
        dataset_records = self.db.exec(select(YieldDataset)).all()
        
        if len(dataset_records) < 10:
            raise ValueError("Insufficient training data. Need at least 10 records.")
        
        # Convert to DataFrame
        data = []
        for record in dataset_records:
            data.append({
                'location': record.location,
                'variety': record.variety,
                'area': record.area,
                'yield_amount': record.yield_amount,
                'rainfall': record.rainfall,
                'temperature': record.temperature,
                'age_years': record.age_years
            })
        
        df = pd.DataFrame(data)
        logger.info(f"Training with {len(df)} records")
        
        # Prepare features
        X = self.prepare_features(df)
        y = df['yield_amount']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train Random Forest model
        self.model = RandomForestRegressor(
            n_estimators=100,
            random_state=42,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        # Save model and encoders
        self.save_model()
        
        logger.info(f"Model trained successfully. MSE: {mse:.2f}, R2: {r2:.3f}")
        
        return {
            "message": "Model trained successfully",
            "mse": mse,
            "r2_score": r2,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "retrained": True
        }
    
    def predict_yield(
        self, 
        plot_id: int,
        location: str,
        variety: str,
        area: float,
        rainfall: Optional[float] = None,
        temperature: Optional[float] = None,
        age_years: Optional[int] = None
    ) -> Dict[str, Any]:
        """Predict yield for a plot"""
        
        # If no model is loaded, try to train one
        if self.model is None:
            logger.info("No model loaded, attempting to train...")
            try:
                self.train_model()
            except Exception as e:
                logger.warning(f"Could not train model: {e}")
                # Use fallback prediction
                return self._fallback_prediction(area, variety)
        
        try:
            # Prepare input data
            input_data = pd.DataFrame([{
                'location': location,
                'variety': variety,
                'area': area,
                'yield_amount': 0,  # Placeholder, will be removed
                'rainfall': rainfall or 2500,
                'temperature': temperature or 26,
                'age_years': age_years or 5
            }])
            
            # Prepare features (without yield_amount)
            X = self.prepare_features(input_data)
            
            # Scale features
            if self.scaler is None:
                logger.warning("No scaler available, using fallback")
                return self._fallback_prediction(area, variety)
            
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.model.predict(X_scaled)[0]
            
            # Calculate confidence (simplified)
            confidence = min(0.95, max(0.5, 1.0 - (abs(prediction - (area * 2500)) / (area * 2500))))
            
            # Store prediction in database
            yield_prediction = YieldPrediction(
                plot_id=plot_id,
                predicted_yield=float(prediction),
                confidence_score=confidence,
                model_version="v1.0",
                features_used=f"location={location}, variety={variety}, area={area}"
            )
            
            self.db.add(yield_prediction)
            self.db.commit()
            
            logger.info(f"Predicted yield for plot {plot_id}: {prediction:.1f} kg")
            
            return {
                "predicted_yield": round(prediction, 1),
                "confidence_score": round(confidence, 3),
                "prediction_source": "ml_model",
                "model_version": "v1.0"
            }
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return self._fallback_prediction(area, variety)
    
    def _fallback_prediction(self, area: float, variety: str) -> Dict[str, Any]:
        """Fallback prediction when ML model is not available"""
        # Use variety-specific averages
        if "ceylon" in variety.lower():
            yield_per_ha = 2800  # Ceylon cinnamon typically yields less but higher quality
        elif "cassia" in variety.lower():
            yield_per_ha = 3200  # Cassia typically yields more
        else:
            yield_per_ha = 2500  # Default average
        
        predicted_yield = yield_per_ha * area
        
        return {
            "predicted_yield": round(predicted_yield, 1),
            "confidence_score": 0.6,
            "prediction_source": "fallback",
            "model_version": "fallback"
        }
    
    def save_model(self):
        """Save trained model and preprocessors"""
        if self.model is not None:
            joblib.dump(self.model, self.model_path)
            logger.info(f"Model saved to {self.model_path}")
        
        if self.scaler is not None:
            joblib.dump(self.scaler, self.scaler_path)
            logger.info(f"Scaler saved to {self.scaler_path}")
        
        if self.location_encoder is not None and self.variety_encoder is not None:
            encoders = {
                'location_encoder': self.location_encoder,
                'variety_encoder': self.variety_encoder
            }
            joblib.dump(encoders, self.encoders_path)
            logger.info(f"Encoders saved to {self.encoders_path}")
    
    def load_model(self) -> bool:
        """Load trained model and preprocessors"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                logger.info("Model loaded successfully")
            
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                logger.info("Scaler loaded successfully")
            
            if os.path.exists(self.encoders_path):
                encoders = joblib.load(self.encoders_path)
                self.location_encoder = encoders['location_encoder']
                self.variety_encoder = encoders['variety_encoder']
                logger.info("Encoders loaded successfully")
            
            return True
            
        except Exception as e:
            logger.warning(f"Could not load model: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        if self.model is None:
            return {"model_loaded": False, "message": "No model loaded"}
        
        # Get dataset size
        dataset_size = len(self.db.exec(select(YieldDataset)).all())
        
        return {
            "model_loaded": True,
            "model_type": "RandomForestRegressor",
            "model_version": "v1.0",
            "dataset_size": dataset_size,
            "features": [
                "area", "location_encoded", "variety_encoded", 
                "rainfall", "temperature", "age_years"
            ],
            "model_files": {
                "model": os.path.exists(self.model_path),
                "scaler": os.path.exists(self.scaler_path),
                "encoders": os.path.exists(self.encoders_path)
            }
        }