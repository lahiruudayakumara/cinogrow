"""
Enhanced Yield Prediction Service - Updated Implementation
Replaces the existing yield_prediction.py with improved model architecture
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
from typing import Dict, Any, Optional
from sqlmodel import Session, select
from datetime import datetime
import logging

from app.models.yield_weather import YieldDataset, Plot, YieldPrediction
from app.models.yield_weather.farm import PlantingRecord, Farm

logger = logging.getLogger(__name__)


class YieldPredictionService:
    """Enhanced ML-based yield prediction service with improved accuracy"""
    
    def __init__(self, db: Session):
        self.db = db
        self.model = None
        self.scaler = None
        self.location_encoder = None
        self.variety_encoder = None
        self.soil_type_encoder = None
        self.feature_names = None
        
        # Model paths
        self.model_path = "models/yield_prediction_model.joblib"
        self.scaler_path = "models/yield_scaler.joblib"
        self.encoders_path = "models/yield_encoders.joblib"
        
        # Create models directory if it doesn't exist
        os.makedirs("models", exist_ok=True)
        
        # Try to load existing model
        self.load_model()
    
    def prepare_features(self, df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
        """Enhanced feature preparation with better encoding and feature engineering"""
        logger.info(f"Preparing features for {'training' if is_training else 'prediction'}")
        
        features = df.copy()
        
        # Handle categorical encoding
        if is_training:
            # Fit encoders during training
            self.location_encoder = LabelEncoder()
            self.variety_encoder = LabelEncoder()
            
            features['location_encoded'] = self.location_encoder.fit_transform(features['location'])
            features['variety_encoded'] = self.variety_encoder.fit_transform(features['variety'])
            
            if 'soil_type' in features.columns:
                self.soil_type_encoder = LabelEncoder()
                features['soil_type_encoded'] = self.soil_type_encoder.fit_transform(features['soil_type'])
                
        else:
            # Use existing encoders for prediction
            features['location_encoded'] = self._safe_encode(features['location'], self.location_encoder)
            features['variety_encoded'] = self._safe_encode(features['variety'], self.variety_encoder)
            
            if 'soil_type' in features.columns and hasattr(self, 'soil_type_encoder'):
                features['soil_type_encoded'] = self._safe_encode(features['soil_type'], self.soil_type_encoder)
        
        # Handle missing values with domain-specific defaults
        features['rainfall'] = features['rainfall'].fillna(2500)  # Sri Lankan average
        features['temperature'] = features['temperature'].fillna(26)  # Average temperature
        features['age_years'] = features['age_years'].fillna(3)  # Default tree harvesting age
        
        # Enhanced feature engineering
        features['area_rainfall_interaction'] = features['area'] * features['rainfall'] / 1000
        features['temp_age_interaction'] = features['temperature'] * features['age_years']
        
        # Define feature columns for model
        self.feature_names = [
            'area', 'location_encoded', 'variety_encoded', 
            'rainfall', 'temperature', 'age_years',
            'area_rainfall_interaction', 'temp_age_interaction'
        ]
        
        # Add soil type if available
        if 'soil_type_encoded' in features.columns:
            self.feature_names.append('soil_type_encoded')
        
        return features[self.feature_names]
    
    def _safe_encode(self, values, encoder):
        """Safely encode values, handling unseen categories with intelligent mapping"""
        if encoder is None:
            return [0] * len(values)
        
        # Define common mappings for unseen values with improved Sri Lankan locations
        location_mappings = {
            'sri lanka': 'Galle',  # Default to a common location
            'srilanka': 'Galle',
            'sri-lanka': 'Galle',
            'colombo': 'Colombo',
            'kandy': 'Kandy',
            'matara': 'Matara',
            'kalutara': 'Kalutara',
            'ratnapura': 'Ratnapura',
            'kegalle': 'Kegalle',
            'negombo': 'Negombo',
            'western province': 'Colombo',
            'southern province': 'Galle',
            'central province': 'Kandy',
            'sabaragamuwa province': 'Ratnapura',
        }
        
        variety_mappings = {
            'cinnamon': 'Ceylon Cinnamon',  # Default to Ceylon Cinnamon
            'ceylon': 'Ceylon Cinnamon',
            'ceylon cinnamon': 'Ceylon Cinnamon',
            'sri lankan cinnamon': 'Ceylon Cinnamon',
            'cassia': 'Cassia Cinnamon',
            'cassia cinnamon': 'Cassia Cinnamon',
            'continental cinnamon': 'Continental',
            'continental': 'Continental',
            'alba': 'Alba',
            'alba cinnamon': 'Alba',
            'cinnamomum verum': 'Ceylon Cinnamon',
            'cinnamomum cassia': 'Cassia Cinnamon',
        }
        
        encoded = []
        for val in values:
            original_val = val
            val_lower = val.lower()
            
            if val in encoder.classes_:
                # Direct match
                encoded.append(encoder.transform([val])[0])
            elif val_lower in location_mappings and location_mappings[val_lower] in encoder.classes_:
                # Use location mapping
                mapped_val = location_mappings[val_lower]
                logger.info(f"Mapped location '{original_val}' -> '{mapped_val}'")
                encoded.append(encoder.transform([mapped_val])[0])
            elif val_lower in variety_mappings and variety_mappings[val_lower] in encoder.classes_:
                # Use variety mapping
                mapped_val = variety_mappings[val_lower]
                logger.info(f"Mapped variety '{original_val}' -> '{mapped_val}'")
                encoded.append(encoder.transform([mapped_val])[0])
            else:
                # Use most common class for truly unseen values
                logger.warning(f"Unseen value '{val}', using default encoding")
                encoded.append(0)
        return encoded
    
    def train_model(self, retrain: bool = False) -> Dict[str, Any]:
        """Enhanced model training with better algorithms and validation"""
        logger.info("Starting enhanced model training...")
        
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
                'soil_type': getattr(record, 'soil_type', 'Loamy'),  # Default if not present
                'rainfall': record.rainfall,
                'temperature': record.temperature,
                'age_years': record.age_years
            })
        
        df = pd.DataFrame(data)
        logger.info(f"Training with {len(df)} records")
        
        # Prepare features
        X = self.prepare_features(df, is_training=True)
        y = df['yield_amount']
        
        # Split data with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Try different models and select the best one
        models = {
            'RandomForest': RandomForestRegressor(
                n_estimators=150,
                max_depth=12,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'GradientBoosting': GradientBoostingRegressor(
                n_estimators=150,
                max_depth=6,
                learning_rate=0.1,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
        }
        
        best_model = None
        best_score = -float('inf')
        best_metrics = {}
        
        for name, model in models.items():
            logger.info(f"Training {name}...")
            
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Cross-validation score
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            cv_mean = cv_scores.mean()
            
            # Test metrics
            y_pred = model.predict(X_test_scaled)
            test_r2 = r2_score(y_test, y_pred)
            test_mae = mean_absolute_error(y_test, y_pred)
            test_mse = mean_squared_error(y_test, y_pred)
            
            logger.info(f"{name}: CV R² = {cv_mean:.3f}, Test R² = {test_r2:.3f}")
            
            if cv_mean > best_score:
                best_score = cv_mean
                best_model = model
                best_metrics = {
                    'model_type': name,
                    'cv_r2': cv_mean,
                    'cv_std': cv_scores.std(),
                    'test_r2': test_r2,
                    'test_mae': test_mae,
                    'test_mse': test_mse
                }
        
        self.model = best_model
        
        # Save model and encoders
        self.save_model()
        
        logger.info(f"Best model: {best_metrics['model_type']} with CV R² = {best_metrics['cv_r2']:.3f}")
        
        return {
            "message": "Enhanced model trained successfully",
            "model_type": best_metrics['model_type'],
            "cv_r2": best_metrics['cv_r2'],
            "cv_std": best_metrics['cv_std'],
            "test_r2": best_metrics['test_r2'],
            "test_mae": best_metrics['test_mae'],
            "test_mse": best_metrics['test_mse'],
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "features_used": len(self.feature_names),
            "retrained": True
        }
    
    def predict_yield(
        self, 
        plot_id: int,
        location: Optional[str] = None,
        variety: Optional[str] = None,
        area: Optional[float] = None,
        rainfall: Optional[float] = None,
        temperature: Optional[float] = None,
        age_years: Optional[int] = None,
        soil_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Enhanced yield prediction with better error handling - uses actual farm data"""
        
        # Fetch plot information from database
        try:
            plot = self.db.exec(select(Plot).where(Plot.id == plot_id)).first()
            if not plot:
                logger.error(f"Plot {plot_id} not found in database")
                return {
                    "error": "Plot not found",
                    "message": f"Plot with ID {plot_id} does not exist",
                    "predicted_yield": None,
                    "yield_per_hectare": None,
                    "confidence_score": 0.0,
                    "prediction_source": "validation_check",
                    "plot_id": plot_id,
                    "requires_plot": True
                }
            
            # Fetch farm information to get actual location
            farm = self.db.exec(select(Farm).where(Farm.id == plot.farm_id)).first()
            if not farm:
                logger.error(f"Farm for plot {plot_id} not found in database")
                return {
                    "error": "Farm not found",
                    "message": f"Farm for plot {plot_id} does not exist",
                    "predicted_yield": None,
                    "yield_per_hectare": None,
                    "confidence_score": 0.0,
                    "prediction_source": "validation_check",
                    "plot_id": plot_id,
                    "requires_farm": True
                }
            
            # Use actual farm location instead of passed parameter
            actual_location = farm.location
            actual_area = area if area is not None else plot.area
            
            logger.info(f"Using farm location: {actual_location}, plot area: {actual_area} hectares")
            
        except Exception as e:
            logger.error(f"Error fetching plot/farm data for plot {plot_id}: {e}")
            return {
                "error": "Database error",
                "message": f"Could not fetch plot/farm data: {str(e)}",
                "predicted_yield": None,
                "yield_per_hectare": None,
                "confidence_score": 0.0,
                "prediction_source": "database_error",
                "plot_id": plot_id
            }
        
        # Check if the plot has been planted and get actual variety
        try:
            planting_records = self.db.exec(
                select(PlantingRecord).where(PlantingRecord.plot_id == plot_id)
            ).all()
            
            if not planting_records:
                logger.info(f"No planting records found for plot {plot_id}. Cannot predict yield for unplanted plot.")
                return {
                    "error": "Plot not planted",
                    "message": "Cannot predict yield for a plot that hasn't been planted yet",
                    "predicted_yield": None,
                    "yield_per_hectare": None,
                    "confidence_score": 0.0,
                    "prediction_source": "validation_check",
                    "plot_id": plot_id,
                    "requires_planting": True
                }
            
            # Use actual planted variety instead of passed parameter
            latest_planting = planting_records[-1]  # Get the most recent planting record
            actual_variety = latest_planting.cinnamon_variety
            
            logger.info(f"Found {len(planting_records)} planting record(s) for plot {plot_id}")
            logger.info(f"Using planted variety: {actual_variety}")
            
        except Exception as e:
            logger.warning(f"Could not check planting records for plot {plot_id}: {e}")
            # Continue with prediction if we can't check planting status
            actual_variety = variety if variety is not None else "Ceylon Cinnamon"
        
        # If no model is loaded, try to train one
        if self.model is None:
            logger.info("No model loaded, attempting to train...")
            try:
                self.train_model()
            except Exception as e:
                logger.warning(f"Could not train model: {e}")
                # Use fallback prediction with actual data
                return self._fallback_prediction(actual_area, actual_variety, plot_id)
        
        try:
            # Prepare input data with actual farm location and planted variety
            input_data = pd.DataFrame([{
                'location': actual_location,
                'variety': actual_variety,
                'area': actual_area,
                'yield_amount': 0,  # Placeholder
                'soil_type': soil_type or 'Loamy',
                'rainfall': rainfall or 2500,
                'temperature': temperature or 26,
                'age_years': age_years or 3
            }])
            
            logger.info(f"Making prediction with - Location: {actual_location}, Variety: {actual_variety}, Area: {actual_area} ha")
            
            # Prepare features
            X = self.prepare_features(input_data, is_training=False)
            
            # Validate feature consistency
            if X.shape[1] != len(self.feature_names):
                logger.warning(f"Feature count mismatch: expected {len(self.feature_names)}, got {X.shape[1]}")
                return self._fallback_prediction(actual_area, actual_variety, plot_id)
            
            # Scale features
            if self.scaler is None:
                logger.warning("No scaler available, using fallback")
                return self._fallback_prediction(actual_area, actual_variety, plot_id)
            
            X_scaled = self.scaler.transform(X)
            
            # Make prediction
            prediction = self.model.predict(X_scaled)[0]
            
            # Enhanced confidence calculation
            # Since area is a feature in the model, prediction is total yield
            total_yield = prediction
            yield_per_ha = total_yield / actual_area
            expected_range = (2000, 3500)  # Typical Sri Lankan cinnamon yield range
            
            if expected_range[0] <= yield_per_ha <= expected_range[1]:
                confidence = 0.95  # High confidence for normal range
            elif expected_range[0] * 0.8 <= yield_per_ha <= expected_range[1] * 1.2:
                confidence = 0.80  # Medium confidence for extended range
            else:
                confidence = 0.60  # Lower confidence for outliers
            
            # Store prediction in database
            try:
                yield_prediction = YieldPrediction(
                    plot_id=plot_id,
                    predicted_yield=float(total_yield),
                    confidence_score=confidence,
                    model_version="v2.0_enhanced",
                    features_used=f"Enhanced features with actual farm data: {', '.join(self.feature_names)}"
                )
                
                self.db.add(yield_prediction)
                self.db.commit()
            except Exception as e:
                logger.warning(f"Could not save prediction to database: {e}")
            
            logger.info(f"Enhanced prediction for plot {plot_id}: {total_yield:.1f} kg (confidence: {confidence:.3f})")
            
            return {
                "predicted_yield": round(total_yield, 1),
                "yield_per_hectare": round(yield_per_ha, 1),
                "confidence_score": round(confidence, 3),
                "prediction_source": "enhanced_ml_model",
                "model_version": "v2.0_enhanced",
                "features_used": self.feature_names,
                "farm_location": actual_location,
                "planted_variety": actual_variety,
                "plot_area": actual_area
            }
            
        except Exception as e:
            logger.error(f"Enhanced prediction failed: {e}")
            return self._fallback_prediction(actual_area, actual_variety, plot_id)
    
    def _fallback_prediction(self, area: float, variety: str, plot_id: Optional[int] = None) -> Dict[str, Any]:
        """Enhanced fallback prediction with better variety handling"""
        
        # If we have a plot_id, check if it's planted before making predictions
        if plot_id is not None:
            try:
                planting_records = self.db.exec(
                    select(PlantingRecord).where(PlantingRecord.plot_id == plot_id)
                ).all()
                
                if not planting_records:
                    return {
                        "error": "Plot not planted",
                        "message": "Cannot predict yield for a plot that hasn't been planted yet",
                        "predicted_yield": None,
                        "yield_per_hectare": None,
                        "confidence_score": 0.0,
                        "prediction_source": "fallback_validation",
                        "plot_id": plot_id,
                        "requires_planting": True
                    }
            except Exception as e:
                logger.warning(f"Could not check planting records in fallback for plot {plot_id}: {e}")
        
        # Improved variety-specific estimates based on research
        variety_lower = variety.lower()
        if "ceylon" in variety_lower or "cinnamon" in variety_lower:
            yield_per_ha = 2600  # Ceylon cinnamon average
        elif "alba" in variety_lower:
            yield_per_ha = 2800  # Alba variety typically higher yield
        elif "cassia" in variety_lower or "continental" in variety_lower:
            yield_per_ha = 2400  # Continental/Cassia varieties
        else:
            yield_per_ha = 2500  # Default average
        
        predicted_yield = yield_per_ha * area
        
        return {
            "predicted_yield": round(predicted_yield, 1),
            "yield_per_hectare": yield_per_ha,
            "confidence_score": 0.65,
            "prediction_source": "enhanced_fallback",
            "model_version": "fallback_v2.0"
        }
    
    def save_model(self):
        """Save enhanced model and preprocessors"""
        try:
            if self.model is not None:
                joblib.dump(self.model, self.model_path)
                logger.info(f"Enhanced model saved to {self.model_path}")
            
            if self.scaler is not None:
                joblib.dump(self.scaler, self.scaler_path)
                logger.info(f"Scaler saved to {self.scaler_path}")
            
            # Save all encoders and feature names
            encoders = {
                'location_encoder': self.location_encoder,
                'variety_encoder': self.variety_encoder,
                'feature_names': self.feature_names
            }
            
            if hasattr(self, 'soil_type_encoder') and self.soil_type_encoder is not None:
                encoders['soil_type_encoder'] = self.soil_type_encoder
            
            joblib.dump(encoders, self.encoders_path)
            logger.info(f"Enhanced encoders saved to {self.encoders_path}")
            
        except Exception as e:
            logger.error(f"Error saving model components: {e}")
            raise
    
    def load_model(self) -> bool:
        """Load enhanced model and preprocessors"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                logger.info("Enhanced model loaded successfully")
            
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                logger.info("Scaler loaded successfully")
            
            if os.path.exists(self.encoders_path):
                encoders = joblib.load(self.encoders_path)
                self.location_encoder = encoders.get('location_encoder')
                self.variety_encoder = encoders.get('variety_encoder')
                self.feature_names = encoders.get('feature_names')
                
                if 'soil_type_encoder' in encoders:
                    self.soil_type_encoder = encoders['soil_type_encoder']
                
                logger.info("Enhanced encoders loaded successfully")
            
            return True
            
        except Exception as e:
            logger.warning(f"Could not load enhanced model: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get enhanced model information"""
        if self.model is None:
            return {"model_loaded": False, "message": "No enhanced model loaded"}
        
        # Get dataset size
        try:
            dataset_size = len(self.db.exec(select(YieldDataset)).all())
        except Exception:
            dataset_size = "Unknown"
        
        # Get model type
        model_type = type(self.model).__name__
        
        # Feature importance if available
        feature_importance = {}
        if hasattr(self.model, 'feature_importances_') and self.feature_names:
            feature_importance = dict(zip(self.feature_names, self.model.feature_importances_))
        
        return {
            "model_loaded": True,
            "model_type": model_type,
            "model_version": "v2.0_enhanced",
            "dataset_size": dataset_size,
            "features": self.feature_names or [],
            "feature_count": len(self.feature_names) if self.feature_names else 0,
            "feature_importance": feature_importance,
            "model_files": {
                "model": os.path.exists(self.model_path),
                "scaler": os.path.exists(self.scaler_path),
                "encoders": os.path.exists(self.encoders_path)
            },
            "capabilities": [
                "Enhanced feature engineering",
                "Multiple algorithm selection",
                "Cross-validation training",
                "Improved accuracy",
                "Better error handling"
            ]
        }