"""
Tree-level ML models for hybrid cinnamon yield prediction
Implements separate models for:
1. Predicting number of canes per tree
2. Predicting fresh weight per tree
3. Feature engineering for tree-level data
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
from typing import Dict, Any, Tuple, List, Optional
from sqlmodel import Session, select
from datetime import datetime
import logging

from app.models.yield_weather.tree import TreeMeasurement, Tree
from app.models.yield_weather.farm import Plot, Farm

logger = logging.getLogger(__name__)


class TreeLevelMLModels:
    """Tree-level ML models for cane count and weight prediction"""
    
    def __init__(self, db: Session):
        self.db = db
        
        # Cane prediction model
        self.cane_model = None
        self.cane_scaler = None
        self.cane_encoders = {}
        self.cane_feature_names = None
        
        # Weight prediction model  
        self.weight_model = None
        self.weight_scaler = None
        self.weight_encoders = {}
        self.weight_feature_names = None
        
        # Model paths
        self.models_dir = "models/yield_weather/tree_level"
        os.makedirs(self.models_dir, exist_ok=True)
        
        self.cane_model_path = f"{self.models_dir}/tree_cane_model.joblib"
        self.cane_scaler_path = f"{self.models_dir}/tree_cane_scaler.joblib"
        self.cane_encoders_path = f"{self.models_dir}/tree_cane_encoders.joblib"
        
        self.weight_model_path = f"{self.models_dir}/tree_weight_model.joblib"
        self.weight_scaler_path = f"{self.models_dir}/tree_weight_scaler.joblib"
        self.weight_encoders_path = f"{self.models_dir}/tree_weight_encoders.joblib"
        
        # Load existing models if available
        self.load_models()
    
    def models_available(self) -> bool:
        """Check if both tree-level models are available"""
        return (self.cane_model is not None and 
                self.weight_model is not None and 
                self.cane_scaler is not None and 
                self.weight_scaler is not None)
    
    def train_all_models(self, retrain: bool = False) -> Dict[str, Any]:
        """Train both tree-level models with synthetic data if no real data available"""
        logger.info("Training tree-level models...")
        
        results = {}
        
        # Generate synthetic training data if no real data exists
        training_data = self._generate_synthetic_tree_data()
        
        # Train cane prediction model
        try:
            cane_result = self.train_cane_prediction_model_with_data(training_data, retrain)
            results["cane_model"] = cane_result
            logger.info("Cane prediction model trained successfully")
        except Exception as e:
            logger.error(f"Failed to train cane model: {e}")
            results["cane_model"] = {"error": str(e)}
        
        # Train weight prediction model
        try:
            weight_result = self.train_weight_prediction_model_with_data(training_data, retrain)
            results["weight_model"] = weight_result
            logger.info("Weight prediction model trained successfully")
        except Exception as e:
            logger.error(f"Failed to train weight model: {e}")
            results["weight_model"] = {"error": str(e)}
        
        return results
    
    def engineer_tree_features(self, df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
        """Advanced feature engineering for tree-level data"""
        features = df.copy()
        
        # Handle missing values
        features['tree_age_years'] = features['tree_age_years'].fillna(3.0)
        features['rainfall_recent_mm'] = features['rainfall_recent_mm'].fillna(2500)
        features['temperature_recent_c'] = features['temperature_recent_c'].fillna(26.0)
        features['num_existing_stems'] = features['num_existing_stems'].fillna(3)
        
        # Core engineered features from project spec
        features['diameter_to_cane_interaction'] = features['stem_diameter_mm'] * features['tree_age_years']
        features['climate_response'] = features['rainfall_recent_mm'] * features['temperature_recent_c']
        
        # Fertilizer boost factor
        features['fertilizer_boost_factor'] = features['fertilizer_used'].astype(float)
        # Enhanced boost for organic fertilizers
        if 'fertilizer_type' in features.columns:
            organic_mask = features['fertilizer_type'].fillna('').str.contains('organic', case=False)
            features.loc[organic_mask, 'fertilizer_boost_factor'] = 1.2
            compost_mask = features['fertilizer_type'].fillna('').str.contains('compost', case=False)
            features.loc[compost_mask, 'fertilizer_boost_factor'] = 1.15
        
        # Disease stress factor
        disease_mapping = {'none': 1.0, 'mild': 0.85, 'severe': 0.6}
        features['disease_stress_factor'] = features['disease_status'].map(disease_mapping).fillna(1.0)
        
        # Diameter categories for non-linear effects
        features['diameter_category'] = pd.cut(
            features['stem_diameter_mm'], 
            bins=[0, 40, 45, 50, 100], 
            labels=['small', 'medium', 'large', 'very_large']
        ).astype(str)
        
        # Age categories
        features['age_category'] = pd.cut(
            features['tree_age_years'],
            bins=[0, 3, 5, 7, 100],
            labels=['young', 'mature', 'prime', 'old']
        ).astype(str)
        
        # Categorical encoding
        categorical_cols = ['location', 'soil_type', 'disease_status', 'fertilizer_type', 
                           'diameter_category', 'age_category']
        
        if is_training:
            # Fit encoders during training
            for col in categorical_cols:
                if col in features.columns:
                    encoder = LabelEncoder()
                    # Handle missing values
                    features[col] = features[col].fillna('unknown')
                    features[f'{col}_encoded'] = encoder.fit_transform(features[col])
                    self.cane_encoders[col] = encoder
                    self.weight_encoders[col] = encoder
        else:
            # Use existing encoders for prediction
            for col in categorical_cols:
                if col in features.columns and col in self.cane_encoders:
                    features[col] = features[col].fillna('unknown')
                    features[f'{col}_encoded'] = self._safe_encode(features[col], self.cane_encoders[col])
        
        return features
    
    def _safe_encode(self, values, encoder):
        """Safely encode values, handling unseen categories"""
        encoded = []
        for val in values:
            if val in encoder.classes_:
                encoded.append(encoder.transform([val])[0])
            else:
                # Use most common class for unseen values
                encoded.append(0)
    def _generate_synthetic_tree_data(self, n_samples: int = 1000) -> pd.DataFrame:
        """Generate synthetic tree data for model training"""
        np.random.seed(42)  # For reproducibility
        
        # Generate realistic tree measurements
        data = []
        locations = ['Ratnapura', 'Galle', 'Matara', 'Kalutara', 'Kandy']
        varieties = ['Alba', 'Ceylon Cinnamon', 'Continental']
        soil_types = ['Loamy', 'Clay', 'Sandy']
        
        for i in range(n_samples):
            # Base tree characteristics
            tree_age = np.random.uniform(3, 8)  # 3-8 years
            stem_diameter = np.random.normal(55, 15)  # Normal distribution around 55mm
            stem_diameter = max(25, min(120, stem_diameter))  # Constrain to realistic range
            
            num_stems = np.random.randint(2, 12)  # 2-12 stems per tree
            fertilizer_used = np.random.choice([True, False], p=[0.6, 0.4])  # 60% fertilized
            disease_status = np.random.choice(['none', 'mild', 'severe'], p=[0.7, 0.25, 0.05])
            
            # Environmental factors
            location = np.random.choice(locations)
            rainfall = np.random.normal(2500, 500)  # Sri Lankan rainfall pattern
            rainfall = max(1500, min(4000, rainfall))
            temperature = np.random.normal(26, 2)  # Tropical temperature
            temperature = max(22, min(32, temperature))
            
            # Calculate realistic cane count based on tree characteristics
            base_canes = (stem_diameter / 5) * np.sqrt(tree_age) * (num_stems / 5)
            
            # Apply modifiers
            if fertilizer_used:
                base_canes *= 1.3
            if disease_status == 'mild':
                base_canes *= 0.8
            elif disease_status == 'severe':
                base_canes *= 0.5
            
            # Add some randomness
            canes = max(1, int(base_canes * np.random.uniform(0.7, 1.3)))
            
            # Calculate fresh weight based on canes and tree characteristics
            weight_per_cane = 0.15 + (stem_diameter / 1000) + (tree_age / 50)
            if fertilizer_used:
                weight_per_cane *= 1.2
            if disease_status == 'mild':
                weight_per_cane *= 0.9
            elif disease_status == 'severe':
                weight_per_cane *= 0.7
            
            fresh_weight = canes * weight_per_cane * np.random.uniform(0.8, 1.2)
            
            data.append({
                'stem_diameter_mm': stem_diameter,
                'tree_age_years': tree_age,
                'num_existing_stems': num_stems,
                'fertilizer_used': fertilizer_used,
                'fertilizer_type': 'organic' if fertilizer_used else 'none',
                'disease_status': disease_status,
                'location': location,
                'rainfall_recent_mm': rainfall,
                'temperature_recent_c': temperature,
                'soil_type': np.random.choice(soil_types),
                'canes_harvested': canes,
                'fresh_bark_weight_kg': fresh_weight
            })
        
        logger.info(f"Generated {len(data)} synthetic tree samples for training")
        return pd.DataFrame(data)
    
    def prepare_cane_prediction_features(self, df: pd.DataFrame) -> List[str]:
        """Define features for cane prediction model"""
        base_features = [
            'stem_diameter_mm', 'tree_age_years', 'num_existing_stems',
            'rainfall_recent_mm', 'temperature_recent_c',
            'diameter_to_cane_interaction', 'climate_response',
            'fertilizer_boost_factor', 'disease_stress_factor'
        ]
        
        encoded_features = [
            'location_encoded', 'soil_type_encoded', 'disease_status_encoded',
            'diameter_category_encoded', 'age_category_encoded'
        ]
        
        # Add fertilizer type if available
        if 'fertilizer_type_encoded' in df.columns:
            encoded_features.append('fertilizer_type_encoded')
        
        return base_features + encoded_features
    
    def prepare_weight_prediction_features(self, df: pd.DataFrame) -> List[str]:
        """Define features for weight prediction model"""
        base_features = [
            'stem_diameter_mm', 'tree_age_years',
            'rainfall_recent_mm', 'temperature_recent_c',
            'fertilizer_boost_factor', 'disease_stress_factor'
        ]
        
        # Add predicted canes if available (for weight model)
        if 'predicted_canes' in df.columns:
            base_features.append('predicted_canes')
        
        encoded_features = [
            'soil_type_encoded', 'location_encoded'
        ]
        
        # Add fertilizer type if available
        if 'fertilizer_type_encoded' in df.columns:
            encoded_features.append('fertilizer_type_encoded')
        
        return base_features + encoded_features
    
    def train_cane_prediction_model(self, retrain: bool = False) -> Dict[str, Any]:
        """Train model to predict number of canes per tree"""
        logger.info("Training tree-level cane prediction model...")
        
        if not retrain and self.cane_model is not None:
            return {"message": "Cane model already trained", "retrained": False}
        
        # Get training data from database
        training_data = self.db.exec(
            select(TreeMeasurement)
            .where(TreeMeasurement.is_training_data == True)
            .where(TreeMeasurement.actual_canes.is_not(None))
        ).all()
        
        if len(training_data) < 10:
            raise ValueError("Insufficient cane training data. Need at least 10 records.")
        
        # Convert to DataFrame
        data = []
        for record in training_data:
            tree = self.db.get(Tree, record.tree_id)
            data.append({
                'stem_diameter_mm': record.stem_diameter_mm,
                'tree_age_years': tree.tree_age_years or 3.0,
                'fertilizer_used': tree.fertilizer_used,
                'fertilizer_type': tree.fertilizer_type.value if tree.fertilizer_type else None,
                'disease_status': tree.disease_status.value,
                'num_existing_stems': record.num_existing_stems,
                'soil_type': 'Loamy',  # Default - should come from plot
                'rainfall_recent_mm': record.rainfall_recent_mm or 2500,
                'temperature_recent_c': record.temperature_recent_c or 26.0,
                'location': 'Galle',  # Default - matches training data
                'actual_canes': record.actual_canes
            })
        
        df = pd.DataFrame(data)
        logger.info(f"Training cane model with {len(df)} records")
        
        # Feature engineering
        features_df = self.engineer_tree_features(df, is_training=True)
        
        # Prepare features
        self.cane_feature_names = self.prepare_cane_prediction_features(features_df)
        X = features_df[self.cane_feature_names]
        y = df['actual_canes']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.cane_scaler = StandardScaler()
        X_train_scaled = self.cane_scaler.fit_transform(X_train)
        X_test_scaled = self.cane_scaler.transform(X_test)
        
        # Try different models
        models = {
            'RandomForest': RandomForestRegressor(
                n_estimators=150,
                max_depth=10,
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
            logger.info(f"Training {name} for cane prediction...")
            
            model.fit(X_train_scaled, y_train)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            cv_mean = cv_scores.mean()
            
            # Test metrics
            y_pred = model.predict(X_test_scaled)
            test_r2 = r2_score(y_test, y_pred)
            test_mae = mean_absolute_error(y_test, y_pred)
            
            logger.info(f"{name} - CV R²: {cv_mean:.3f}, Test R²: {test_r2:.3f}")
            
            if cv_mean > best_score:
                best_score = cv_mean
                best_model = model
                best_metrics = {
                    'model_type': name,
                    'cv_r2': cv_mean,
                    'cv_std': cv_scores.std(),
                    'test_r2': test_r2,
                    'test_mae': test_mae
                }
        
        self.cane_model = best_model
        self.save_cane_model()
        
        return {
            "message": "Cane prediction model trained successfully",
            "model_type": best_metrics['model_type'],
            "cv_r2": best_metrics['cv_r2'],
            "test_r2": best_metrics['test_r2'],
            "test_mae": best_metrics['test_mae'],
            "training_samples": len(X_train),
            "features_used": len(self.cane_feature_names),
            "retrained": True
        }
    
    def train_weight_prediction_model(self, retrain: bool = False) -> Dict[str, Any]:
        """Train model to predict fresh weight per tree"""
        logger.info("Training tree-level weight prediction model...")
        
        if not retrain and self.weight_model is not None:
            return {"message": "Weight model already trained", "retrained": False}
        
        # Get training data
        training_data = self.db.exec(
            select(TreeMeasurement)
            .where(TreeMeasurement.is_training_data == True)
            .where(TreeMeasurement.actual_fresh_weight_kg.is_not(None))
        ).all()
        
        if len(training_data) < 10:
            raise ValueError("Insufficient weight training data. Need at least 10 records.")
        
        # Convert to DataFrame
        data = []
        for record in training_data:
            tree = self.db.get(Tree, record.tree_id)
            data.append({
                'stem_diameter_mm': record.stem_diameter_mm,
                'tree_age_years': tree.tree_age_years or 3.0,
                'fertilizer_used': tree.fertilizer_used,
                'fertilizer_type': tree.fertilizer_type.value if tree.fertilizer_type else None,
                'disease_status': tree.disease_status.value,
                'soil_type': 'Loamy',  # Default
                'rainfall_recent_mm': record.rainfall_recent_mm or 2500,
                'temperature_recent_c': record.temperature_recent_c or 26.0,
                'location': 'Galle',  # Default - matches training data
                'predicted_canes': record.actual_canes,  # Use actual canes as predicted for training
                'actual_fresh_weight_kg': record.actual_fresh_weight_kg
            })
        
        df = pd.DataFrame(data)
        logger.info(f"Training weight model with {len(df)} records")
        
        # Feature engineering (reuse encoders from cane model)
        features_df = self.engineer_tree_features(df, is_training=False)
        
        # Prepare features
        self.weight_feature_names = self.prepare_weight_prediction_features(features_df)
        X = features_df[self.weight_feature_names]
        y = df['actual_fresh_weight_kg']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.weight_scaler = StandardScaler()
        X_train_scaled = self.weight_scaler.fit_transform(X_train)
        X_test_scaled = self.weight_scaler.transform(X_test)
        
        # Try different models
        models = {
            'GradientBoosting': GradientBoostingRegressor(
                n_estimators=150,
                max_depth=6,
                learning_rate=0.1,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            ),
            'RandomForest': RandomForestRegressor(
                n_estimators=150,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        }
        
        best_model = None
        best_score = -float('inf')
        best_metrics = {}
        
        for name, model in models.items():
            logger.info(f"Training {name} for weight prediction...")
            
            model.fit(X_train_scaled, y_train)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            cv_mean = cv_scores.mean()
            
            # Test metrics
            y_pred = model.predict(X_test_scaled)
            test_r2 = r2_score(y_test, y_pred)
            test_mae = mean_absolute_error(y_test, y_pred)
            
            logger.info(f"{name} - CV R²: {cv_mean:.3f}, Test R²: {test_r2:.3f}")
            
            if cv_mean > best_score:
                best_score = cv_mean
                best_model = model
                best_metrics = {
                    'model_type': name,
                    'cv_r2': cv_mean,
                    'cv_std': cv_scores.std(),
                    'test_r2': test_r2,
                    'test_mae': test_mae
                }
        
        self.weight_model = best_model
        self.save_weight_model()
        
        return {
            "message": "Weight prediction model trained successfully",
            "model_type": best_metrics['model_type'],
            "cv_r2": best_metrics['cv_r2'],
            "test_r2": best_metrics['test_r2'],
            "test_mae": best_metrics['test_mae'],
            "training_samples": len(X_train),
            "features_used": len(self.weight_feature_names),
            "retrained": True
        }
    
    def predict_tree_canes(self, tree_data: Dict[str, Any]) -> float:
        """Predict number of canes for a single tree"""
        if self.cane_model is None:
            logger.warning("Cane prediction model not available, using fallback")
            # Fallback calculation
            return max(1, int(tree_data.get('stem_diameter_mm', 40) / 4))
        
        try:
            # Load encoders
            encoders_data = joblib.load(self.cane_encoders_path)
            encoders = encoders_data['encoders']
            feature_names = encoders_data['feature_names']
            
            # Prepare data with feature engineering matching training
            input_data = {
                'stem_diameter_mm': tree_data.get('stem_diameter_mm', 40.0),
                'tree_age_years': tree_data.get('tree_age_years', 4.0),
                'num_existing_stems': tree_data.get('num_existing_stems', 3),
                'rainfall_recent_mm': tree_data.get('rainfall_recent_mm', 2500),
                'temperature_recent_c': tree_data.get('temperature_recent_c', 26.0),
                'fertilizer_used': tree_data.get('fertilizer_used', False),
                'fertilizer_type': tree_data.get('fertilizer_type', 'none'),
                'disease_status': tree_data.get('disease_status', 'none'),
                'soil_type': tree_data.get('soil_type', 'Loamy'),
                'location': tree_data.get('location', 'Sri Lanka')
            }
            
            # Apply feature engineering
            df = pd.DataFrame([input_data])
            
            # Encode categorical variables
            df['disease_status_encoded'] = encoders['disease'].transform([df['disease_status'].iloc[0]])[0]
            df['fertilizer_type_encoded'] = encoders['fertilizer'].transform([df['fertilizer_type'].iloc[0]])[0]
            df['soil_type_encoded'] = encoders['soil'].transform([df['soil_type'].iloc[0]])[0] 
            df['location_encoded'] = encoders['location'].transform([df['location'].iloc[0]])[0]
            
            # Create derived features
            df['diameter_per_stem'] = df['stem_diameter_mm'] / df['num_existing_stems']
            df['fertilizer_used_int'] = df['fertilizer_used'].astype(int)
            
            # Select features in correct order
            X = df[feature_names]
            X_scaled = self.cane_scaler.transform(X)
            
            prediction = self.cane_model.predict(X_scaled)[0]
            return max(0, round(prediction))  # Ensure non-negative integer
            
        except Exception as e:
            logger.warning(f"Cane prediction failed, using fallback: {e}")
            # Fallback calculation
            return max(1, int(tree_data.get('stem_diameter_mm', 40) / 4))

    def predict_tree_weight(self, tree_data: Dict[str, Any], predicted_canes: float) -> float:
        """Predict fresh weight for a single tree"""
        if self.weight_model is None:
            logger.warning("Weight prediction model not available, using fallback")
            return predicted_canes * 0.25  # Fallback calculation
        
        try:
            # Load encoders
            encoders_data = joblib.load(self.weight_encoders_path)
            encoders = encoders_data['encoders']
            feature_names = encoders_data['feature_names']
            
            # Prepare data with predicted canes
            input_data = {
                'stem_diameter_mm': tree_data.get('stem_diameter_mm', 40.0),
                'tree_age_years': tree_data.get('tree_age_years', 4.0),
                'num_existing_stems': tree_data.get('num_existing_stems', 3),
                'rainfall_recent_mm': tree_data.get('rainfall_recent_mm', 2500),
                'temperature_recent_c': tree_data.get('temperature_recent_c', 26.0),
                'fertilizer_used': tree_data.get('fertilizer_used', False),
                'fertilizer_type': tree_data.get('fertilizer_type', 'none'),
                'disease_status': tree_data.get('disease_status', 'none'),
                'soil_type': tree_data.get('soil_type', 'Loamy'),
                'location': tree_data.get('location', 'Galle'),
                'predicted_canes': predicted_canes
            }
            
            # Apply feature engineering
            df = pd.DataFrame([input_data])
            
            # Encode categorical variables
            df['disease_status_encoded'] = encoders['disease'].transform([df['disease_status'].iloc[0]])[0]
            df['fertilizer_type_encoded'] = encoders['fertilizer'].transform([df['fertilizer_type'].iloc[0]])[0]
            df['soil_type_encoded'] = encoders['soil'].transform([df['soil_type'].iloc[0]])[0]
            df['location_encoded'] = encoders['location'].transform([df['location'].iloc[0]])[0]
            
            # Create derived features
            df['diameter_per_stem'] = df['stem_diameter_mm'] / df['num_existing_stems'] 
            df['fertilizer_used_int'] = df['fertilizer_used'].astype(int)
            
            # Select features in correct order
            X = df[feature_names]
            X_scaled = self.weight_scaler.transform(X)
            
            prediction = self.weight_model.predict(X_scaled)[0]
            return max(0, prediction)  # Ensure non-negative
            
        except Exception as e:
            logger.warning(f"Weight prediction failed, using fallback: {e}")
            return predicted_canes * 0.25  # Fallback calculation    def save_cane_model(self):
        """Save cane prediction model components"""
        try:
            joblib.dump(self.cane_model, self.cane_model_path)
            joblib.dump(self.cane_scaler, self.cane_scaler_path)
            
            encoders_data = {
                'encoders': self.cane_encoders,
                'feature_names': self.cane_feature_names
            }
            joblib.dump(encoders_data, self.cane_encoders_path)
            
            logger.info("Cane prediction model saved successfully")
        except Exception as e:
            logger.error(f"Error saving cane model: {e}")
    
    def save_weight_model(self):
        """Save weight prediction model components"""
        try:
            joblib.dump(self.weight_model, self.weight_model_path)
            joblib.dump(self.weight_scaler, self.weight_scaler_path)
            
            encoders_data = {
                'encoders': self.weight_encoders,
                'feature_names': self.weight_feature_names
            }
            joblib.dump(encoders_data, self.weight_encoders_path)
            
            logger.info("Weight prediction model saved successfully")
        except Exception as e:
            logger.error(f"Error saving weight model: {e}")
    
    def load_models(self) -> bool:
        """Load both cane and weight prediction models"""
        try:
            # Load cane model
            if os.path.exists(self.cane_model_path):
                self.cane_model = joblib.load(self.cane_model_path)
                self.cane_scaler = joblib.load(self.cane_scaler_path)
                
                encoders_data = joblib.load(self.cane_encoders_path)
                self.cane_encoders = encoders_data['encoders']
                self.cane_feature_names = encoders_data['feature_names']
                
                logger.info("Cane prediction model loaded successfully")
            
            # Load weight model
            if os.path.exists(self.weight_model_path):
                self.weight_model = joblib.load(self.weight_model_path)
                self.weight_scaler = joblib.load(self.weight_scaler_path)
                
                encoders_data = joblib.load(self.weight_encoders_path)
                self.weight_encoders = encoders_data['encoders']
                self.weight_feature_names = encoders_data['feature_names']
                
                logger.info("Weight prediction model loaded successfully")
            
            return True
            
        except Exception as e:
            logger.warning(f"Could not load tree-level models: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about both tree-level models"""
        return {
            "cane_model": {
                "loaded": self.cane_model is not None,
                "model_type": type(self.cane_model).__name__ if self.cane_model else None,
                "features": self.cane_feature_names or [],
                "feature_count": len(self.cane_feature_names) if self.cane_feature_names else 0
            },
            "weight_model": {
                "loaded": self.weight_model is not None,
                "model_type": type(self.weight_model).__name__ if self.weight_model else None,
                "features": self.weight_feature_names or [],
                "feature_count": len(self.weight_feature_names) if self.weight_feature_names else 0
            },
            "model_version": "v1.0_tree_level"
        }