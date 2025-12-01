"""
Tree-level ML models for hybrid cinnamon yield prediction
Uses trained models to predict:
1. Number of canes per tree
2. Fresh weight per tree
"""
import pandas as pd
import numpy as np
import joblib
import os
from typing import Dict, Any, Tuple, List, Optional
from sqlmodel import Session
import logging

logger = logging.getLogger(__name__)


class TreeLevelMLModels:
    """Tree-level ML models using pre-trained models"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Model paths
        self.models_dir = "models/yield_weather/tree_level"
        
        self.cane_model_path = f"{self.models_dir}/tree_cane_model.joblib"
        self.cane_scaler_path = f"{self.models_dir}/tree_cane_scaler.joblib"
        self.cane_encoders_path = f"{self.models_dir}/tree_cane_encoders.joblib"
        
        self.weight_model_path = f"{self.models_dir}/tree_weight_model.joblib"
        self.weight_scaler_path = f"{self.models_dir}/tree_weight_scaler.joblib"
        self.weight_encoders_path = f"{self.models_dir}/tree_weight_encoders.joblib"
        
        # Model components
        self.cane_model = None
        self.cane_scaler = None
        self.cane_encoders = {}
        self.cane_feature_names = []
        
        self.weight_model = None
        self.weight_scaler = None
        self.weight_encoders = {}
        self.weight_feature_names = []
        
        # Load models on initialization
        self._load_models()
    
    def _load_models(self) -> bool:
        """Load pre-trained models"""
        try:
            # Load cane model
            if all(os.path.exists(p) for p in [self.cane_model_path, self.cane_scaler_path, self.cane_encoders_path]):
                self.cane_model = joblib.load(self.cane_model_path)
                self.cane_scaler = joblib.load(self.cane_scaler_path)
                
                encoders_data = joblib.load(self.cane_encoders_path)
                self.cane_encoders = encoders_data['encoders']
                self.cane_feature_names = encoders_data['feature_names']
                
                logger.info("✅ Cane prediction model loaded successfully")
            else:
                logger.warning("❌ Cane model files not found")
            
            # Load weight model
            if all(os.path.exists(p) for p in [self.weight_model_path, self.weight_scaler_path, self.weight_encoders_path]):
                self.weight_model = joblib.load(self.weight_model_path)
                self.weight_scaler = joblib.load(self.weight_scaler_path)
                
                encoders_data = joblib.load(self.weight_encoders_path)
                self.weight_encoders = encoders_data['encoders']
                self.weight_feature_names = encoders_data['feature_names']
                
                logger.info("✅ Weight prediction model loaded successfully")
            else:
                logger.warning("❌ Weight model files not found")
            
            return self.models_available()
            
        except Exception as e:
            logger.error(f"❌ Error loading tree-level models: {e}")
            return False
    
    def models_available(self) -> bool:
        """Check if both models are loaded and available"""
        return (self.cane_model is not None and 
                self.weight_model is not None and 
                self.cane_scaler is not None and 
                self.weight_scaler is not None)
    
    def _prepare_tree_features(self, tree_data: Dict[str, Any], predicted_canes: Optional[float] = None) -> pd.DataFrame:
        """Prepare features for prediction matching training format"""
        
        # Base input data
        input_data = {
            'stem_diameter_mm': float(tree_data.get('stem_diameter_mm', 40.0)),
            'tree_age_years': float(tree_data.get('tree_age_years', 4.0)),
            'num_existing_stems': int(tree_data.get('num_existing_stems', 3)),
            'rainfall_recent_mm': float(tree_data.get('rainfall_recent_mm', 2500.0)),
            'temperature_recent_c': float(tree_data.get('temperature_recent_c', 26.0)),
            'fertilizer_used': bool(tree_data.get('fertilizer_used', False)),
            'fertilizer_type': str(tree_data.get('fertilizer_type', 'none')),
            'disease_status': str(tree_data.get('disease_status', 'none')),
            'soil_type': str(tree_data.get('soil_type', 'Loamy')),
            'location': str(tree_data.get('location', 'Galle'))
        }
        
        # Add predicted canes for weight model
        if predicted_canes is not None:
            input_data['actual_canes'] = float(predicted_canes)
        
        df = pd.DataFrame([input_data])
        
        # Handle missing values (matching training preprocessing)
        df['fertilizer_type'] = df['fertilizer_type'].fillna('none')
        
        # Encode categorical variables using loaded encoders
        categorical_features = ['fertilizer_type', 'disease_status', 'soil_type', 'location']
        
        for col in categorical_features:
            if col in self.cane_encoders:
                try:
                    # Get the value and handle unseen categories
                    value = df[col].iloc[0]
                    if value in self.cane_encoders[col].classes_:
                        df[f'{col}_encoded'] = self.cane_encoders[col].transform([value])[0]
                    else:
                        # Use the most common class (first class) for unseen values
                        df[f'{col}_encoded'] = 0
                except Exception as e:
                    logger.warning(f"Encoding error for {col}: {e}, using default")
                    df[f'{col}_encoded'] = 0
        
        # Create engineered features (matching training)
        df['fertilizer_used_int'] = df['fertilizer_used'].astype(int)
        df['diameter_per_stem'] = df['stem_diameter_mm'] / df['num_existing_stems']
        df['diameter_age_interaction'] = df['stem_diameter_mm'] * df['tree_age_years']
        
        # For weight model, add canes interaction
        if 'actual_canes' in df.columns:
            df['canes_diameter_interaction'] = df['actual_canes'] * df['stem_diameter_mm']
        
        return df
    
    def predict_tree_canes(self, tree_data: Dict[str, Any]) -> float:
        """Predict number of canes for a tree using trained model"""
        if not self.models_available():
            logger.warning("⚠️ Cane model not available, using fallback")
            # Enhanced fallback calculation
            diameter = tree_data.get('stem_diameter_mm', 40)
            age = tree_data.get('tree_age_years', 4)
            stems = tree_data.get('num_existing_stems', 3)
            fertilizer = tree_data.get('fertilizer_used', False)
            
            base_canes = (diameter * 0.22) + (age * 1.5) + (stems * 0.8)
            if fertilizer:
                base_canes *= 1.3
                
            return max(1, round(base_canes))
        
        try:
            # Prepare features
            df = self._prepare_tree_features(tree_data)
            
            # Select features in training order
            X = df[self.cane_feature_names]
            
            # Scale features
            X_scaled = self.cane_scaler.transform(X)
            
            # Predict
            prediction = self.cane_model.predict(X_scaled)[0]
            
            # Ensure reasonable bounds
            prediction = max(1, min(50, round(prediction)))
            
            logger.debug(f"🌳 Cane prediction: {prediction} for tree with {tree_data.get('stem_diameter_mm', 40)}mm diameter")
            
            return float(prediction)
            
        except Exception as e:
            logger.error(f"❌ Cane prediction failed: {e}")
            # Fallback calculation
            diameter = tree_data.get('stem_diameter_mm', 40)
            return max(1, round(diameter * 0.25))
    
    def predict_tree_weight(self, tree_data: Dict[str, Any], predicted_canes: float) -> float:
        """Predict fresh weight for a tree using trained model"""
        if not self.models_available():
            logger.warning("⚠️ Weight model not available, using fallback")
            # Enhanced fallback calculation
            diameter = tree_data.get('stem_diameter_mm', 40)
            age = tree_data.get('tree_age_years', 4)
            fertilizer = tree_data.get('fertilizer_used', False)
            
            weight_per_cane = 0.15 + (diameter / 1000) + (age / 50)
            if fertilizer:
                weight_per_cane *= 1.2
                
            return max(0.1, predicted_canes * weight_per_cane)
        
        try:
            # Prepare features with predicted canes
            df = self._prepare_tree_features(tree_data, predicted_canes)
            
            # Select features in training order
            X = df[self.weight_feature_names]
            
            # Scale features
            X_scaled = self.weight_scaler.transform(X)
            
            # Predict
            prediction = self.weight_model.predict(X_scaled)[0]
            
            # Ensure reasonable bounds
            prediction = max(0.1, min(20.0, prediction))
            
            logger.debug(f"🏋️ Weight prediction: {prediction:.2f}kg for {predicted_canes} canes")
            
            return float(prediction)
            
        except Exception as e:
            logger.error(f"❌ Weight prediction failed: {e}")
            # Fallback calculation
            return max(0.1, predicted_canes * 0.25)
    
    def predict_tree_dry_weight(self, fresh_weight_kg: float) -> float:
        """Convert fresh weight to dry weight using conversion ratio"""
        # Dry weight is typically 25-35% of fresh weight for cinnamon bark
        dry_ratio = 0.30  # 30% conversion rate
        return fresh_weight_kg * dry_ratio
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        return {
            "models_available": self.models_available(),
            "cane_model": {
                "loaded": self.cane_model is not None,
                "model_type": type(self.cane_model).__name__ if self.cane_model else None,
                "features_count": len(self.cane_feature_names),
                "features": self.cane_feature_names[:5] if self.cane_feature_names else []  # Show first 5
            },
            "weight_model": {
                "loaded": self.weight_model is not None,
                "model_type": type(self.weight_model).__name__ if self.weight_model else None,
                "features_count": len(self.weight_feature_names),
                "features": self.weight_feature_names[:5] if self.weight_feature_names else []  # Show first 5
            },
            "model_version": "v2.0_trained_real_models",
            "last_updated": "2024-01-15"
        }
    
    def validate_prediction_input(self, tree_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate input data for predictions"""
        errors = []
        
        # Required fields
        required_fields = ['stem_diameter_mm']
        for field in required_fields:
            if field not in tree_data:
                errors.append(f"Missing required field: {field}")
        
        # Validate ranges
        if 'stem_diameter_mm' in tree_data:
            diameter = tree_data['stem_diameter_mm']
            if not isinstance(diameter, (int, float)) or diameter <= 0 or diameter > 200:
                errors.append("stem_diameter_mm must be between 1 and 200")
        
        if 'tree_age_years' in tree_data:
            age = tree_data['tree_age_years']
            if not isinstance(age, (int, float)) or age <= 0 or age > 50:
                errors.append("tree_age_years must be between 1 and 50")
        
        if 'num_existing_stems' in tree_data:
            stems = tree_data['num_existing_stems']
            if not isinstance(stems, int) or stems <= 0 or stems > 20:
                errors.append("num_existing_stems must be between 1 and 20")
        
        return len(errors) == 0, errors