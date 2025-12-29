"""
Plot-level ML model for yield prediction
Uses trained model to predict plot-level yield based on environmental and management factors
"""
import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict, Any, Optional
from sqlmodel import Session
import logging

logger = logging.getLogger(__name__)


class PlotLevelYieldModel:
    """Plot-level yield prediction using trained model"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Model paths
        self.models_dir = "models/yield_weather/plot_level"
        
        self.model_path = f"{self.models_dir}/plot_yield_model.joblib"
        self.scaler_path = f"{self.models_dir}/plot_yield_scaler.joblib"
        self.encoders_path = f"{self.models_dir}/plot_yield_encoders.joblib"
        
        # Model components
        self.model = None
        self.scaler = None
        self.encoders = {}
        self.feature_names = []
        
        # Load model on initialization
        self._load_model()
    
    def _load_model(self) -> bool:
        """Load pre-trained plot yield model"""
        try:
            if all(os.path.exists(p) for p in [self.model_path, self.scaler_path, self.encoders_path]):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                
                encoders_data = joblib.load(self.encoders_path)
                self.encoders = encoders_data['encoders']
                self.feature_names = encoders_data['feature_names']
                
                logger.info("✅ Plot yield model loaded successfully")
                return True
            else:
                logger.warning("❌ Plot yield model files not found")
                return False
            
        except Exception as e:
            logger.error(f"❌ Error loading plot yield model: {e}")
            return False
    
    def model_available(self) -> bool:
        """Check if model is loaded and available"""
        return (self.model is not None and 
                self.scaler is not None and 
                len(self.encoders) > 0)
    
    def _prepare_plot_features(self, plot_data: Dict[str, Any]) -> pd.DataFrame:
        """Prepare features for prediction matching training format"""
        
        # Base input data (matching training data format)
        input_data = {
            'area_hectares': float(plot_data.get('area_hectares', 1.0)),
            'rainfall_mm': float(plot_data.get('rainfall_mm', 2500.0)),
            'temperature_c': float(plot_data.get('temperature_c', 26.0)),
            'age_years': float(plot_data.get('age_years', 5.0)),
            'avg_stem_diameter_mm': float(plot_data.get('avg_stem_diameter_mm', 45.0)),
            'min_stem_diameter_mm': float(plot_data.get('min_stem_diameter_mm', 35.0)),
            'max_stem_diameter_mm': float(plot_data.get('max_stem_diameter_mm', 55.0)),
            'fertilizer_used_plot': bool(plot_data.get('fertilizer_used_plot', True)),
            'location': str(plot_data.get('location', 'Galle')),
            'variety': str(plot_data.get('variety', 'Sri Gemunu')),
            'soil_type': str(plot_data.get('soil_type', 'Loamy')),
            'disease_present_plot': str(plot_data.get('disease_present_plot', 'mild'))
        }
        
        df = pd.DataFrame([input_data])
        
        # Handle missing values (matching training preprocessing)
        df['variety'] = df['variety'].fillna('Sri Gemunu')
        df['disease_present_plot'] = df['disease_present_plot'].fillna('mild')
        
        # Encode categorical variables using loaded encoders
        categorical_features = ['location', 'variety', 'soil_type', 'disease_present_plot']
        
        for col in categorical_features:
            if col in self.encoders:
                try:
                    # Get the value and handle unseen categories
                    value = df[col].iloc[0]
                    if value in self.encoders[col].classes_:
                        df[f'{col}_encoded'] = self.encoders[col].transform([value])[0]
                    else:
                        # Use the most common class (first class) for unseen values
                        df[f'{col}_encoded'] = 0
                        logger.debug(f"Unknown {col} value '{value}', using default encoding")
                except Exception as e:
                    logger.warning(f"Encoding error for {col}: {e}, using default")
                    df[f'{col}_encoded'] = 0
        
        # Create engineered features (matching training)
        df['fertilizer_used_int'] = df['fertilizer_used_plot'].astype(int)
        df['diameter_range'] = df['max_stem_diameter_mm'] - df['min_stem_diameter_mm']
        df['climate_index'] = df['rainfall_mm'] / df['temperature_c']
        
        return df
    
    def predict_plot_yield(self, plot_data: Dict[str, Any]) -> float:
        """Predict total yield for a plot using trained model"""
        if not self.model_available():
            logger.warning("⚠️ Plot yield model not available, using fallback")
            # Enhanced fallback calculation
            area = plot_data.get('area_hectares', 1.0)
            age = plot_data.get('age_years', 5.0)
            fertilizer = plot_data.get('fertilizer_used_plot', True)
            rainfall = plot_data.get('rainfall_mm', 2500)
            
            # Base yield per hectare calculation
            base_yield_per_ha = 2000 + (age * 200) + (rainfall * 0.5)
            if fertilizer:
                base_yield_per_ha *= 1.4
            
            total_yield = area * base_yield_per_ha
            return max(100, total_yield)
        
        try:
            # Prepare features
            df = self._prepare_plot_features(plot_data)
            
            # Select features in training order
            X = df[self.feature_names]
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Predict
            prediction = self.model.predict(X_scaled)[0]
            
            # Ensure reasonable bounds
            prediction = max(50, min(20000, prediction))
            
            area = plot_data.get('area_hectares', 1.0)
            yield_per_ha = prediction / area if area > 0 else prediction
            
            logger.debug(f"📊 Plot yield prediction: {prediction:.1f}kg total, {yield_per_ha:.1f}kg/ha")
            
            return float(prediction)
            
        except Exception as e:
            logger.error(f"❌ Plot yield prediction failed: {e}")
            # Fallback calculation
            area = plot_data.get('area_hectares', 1.0)
            return max(100, area * 2500)  # 2500 kg/ha default
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_available": self.model_available(),
            "plot_model": {
                "loaded": self.model is not None,
                "model_type": type(self.model).__name__ if self.model else None,
                "features_count": len(self.feature_names),
                "features": self.feature_names[:8] if self.feature_names else []  # Show first 8
            },
            "model_version": "v2.0_trained_real_model",
            "last_updated": "2024-01-15"
        }
    
    def validate_prediction_input(self, plot_data: Dict[str, Any]) -> tuple[bool, list[str]]:
        """Validate input data for plot yield prediction"""
        errors = []
        
        # Required fields
        required_fields = ['area_hectares']
        for field in required_fields:
            if field not in plot_data:
                errors.append(f"Missing required field: {field}")
        
        # Validate ranges
        if 'area_hectares' in plot_data:
            area = plot_data['area_hectares']
            if not isinstance(area, (int, float)) or area <= 0 or area > 100:
                errors.append("area_hectares must be between 0.1 and 100")
        
        if 'age_years' in plot_data:
            age = plot_data['age_years']
            if not isinstance(age, (int, float)) or age <= 0 or age > 50:
                errors.append("age_years must be between 1 and 50")
        
        if 'rainfall_mm' in plot_data:
            rainfall = plot_data['rainfall_mm']
            if not isinstance(rainfall, (int, float)) or rainfall < 0 or rainfall > 5000:
                errors.append("rainfall_mm must be between 0 and 5000")
        
        if 'temperature_c' in plot_data:
            temp = plot_data['temperature_c']
            if not isinstance(temp, (int, float)) or temp < 15 or temp > 40:
                errors.append("temperature_c must be between 15 and 40")
        
        return len(errors) == 0, errors