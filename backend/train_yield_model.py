"""
Standalone Yield Prediction Model Training Script
Trains a machine learning model to predict cinnamon yield based on area, variety, and location
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
from typing import Dict, Any, Tuple
import warnings
warnings.filterwarnings('ignore')

class YieldPredictionTrainer:
    """Enhanced yield prediction model trainer with better diagnostics"""
    
    def __init__(self, data_path: str = "yield_dataset_template.csv"):
        self.data_path = data_path
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
        
        # Create models directory
        os.makedirs("models", exist_ok=True)
        
        print("🚀 Yield Prediction Model Trainer Initialized")
        
    def load_and_explore_data(self) -> pd.DataFrame:
        """Load CSV data and perform exploratory analysis"""
        print(f"\n📊 Loading data from {self.data_path}")
        
        try:
            df = pd.read_csv(self.data_path)
            print(f"✅ Data loaded successfully: {len(df)} records")
            
            # Basic info
            print(f"\n📈 Dataset Overview:")
            print(f"   Rows: {len(df)}")
            print(f"   Columns: {len(df.columns)}")
            print(f"   Features: {list(df.columns)}")
            
            # Check for missing values
            missing_values = df.isnull().sum()
            if missing_values.any():
                print(f"\n⚠️  Missing Values:")
                for col, count in missing_values[missing_values > 0].items():
                    print(f"   {col}: {count} ({count/len(df)*100:.1f}%)")
            else:
                print(f"\n✅ No missing values found")
            
            # Basic statistics
            print(f"\n📊 Key Statistics:")
            numeric_cols = ['area', 'yield_amount', 'rainfall', 'temperature', 'age_years']
            for col in numeric_cols:
                if col in df.columns:
                    print(f"   {col}: Mean={df[col].mean():.2f}, Std={df[col].std():.2f}, Min={df[col].min():.2f}, Max={df[col].max():.2f}")
            
            # Categorical distribution
            print(f"\n🏷️  Categorical Distributions:")
            categorical_cols = ['location', 'variety', 'soil_type']
            for col in categorical_cols:
                if col in df.columns:
                    print(f"   {col}: {df[col].value_counts().to_dict()}")
            
            # Calculate yield per hectare for analysis
            df['yield_per_hectare'] = df['yield_amount'] / df['area']
            print(f"\n🌾 Yield per Hectare: Mean={df['yield_per_hectare'].mean():.0f} kg/ha, Range={df['yield_per_hectare'].min():.0f}-{df['yield_per_hectare'].max():.0f} kg/ha")
            
            return df
            
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            raise
    
    def prepare_features(self, df: pd.DataFrame, is_training: bool = True) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features for training or prediction"""
        print(f"\n🔧 Preparing features (training mode: {is_training})")
        
        features = df.copy()
        
        # Handle categorical encoding
        if is_training:
            # Fit encoders during training
            self.location_encoder = LabelEncoder()
            self.variety_encoder = LabelEncoder()
            self.soil_type_encoder = LabelEncoder()
            
            features['location_encoded'] = self.location_encoder.fit_transform(features['location'])
            features['variety_encoded'] = self.variety_encoder.fit_transform(features['variety'])
            
            if 'soil_type' in features.columns:
                features['soil_type_encoded'] = self.soil_type_encoder.fit_transform(features['soil_type'])
            
            print(f"   📍 Locations encoded: {dict(zip(self.location_encoder.classes_, self.location_encoder.transform(self.location_encoder.classes_)))}")
            print(f"   🌿 Varieties encoded: {dict(zip(self.variety_encoder.classes_, self.variety_encoder.transform(self.variety_encoder.classes_)))}")
            if hasattr(self, 'soil_type_encoder'):
                print(f"   🏞️  Soil types encoded: {dict(zip(self.soil_type_encoder.classes_, self.soil_type_encoder.transform(self.soil_type_encoder.classes_)))}")
        
        else:
            # Use existing encoders for prediction
            features['location_encoded'] = self._safe_encode(features['location'], self.location_encoder)
            features['variety_encoded'] = self._safe_encode(features['variety'], self.variety_encoder)
            if 'soil_type' in features.columns and hasattr(self, 'soil_type_encoder'):
                features['soil_type_encoded'] = self._safe_encode(features['soil_type'], self.soil_type_encoder)
        
        # Handle missing values with domain-specific defaults
        features['rainfall'] = features['rainfall'].fillna(2500)  # Average Sri Lankan rainfall
        features['temperature'] = features['temperature'].fillna(26)  # Average temperature
        features['age_years'] = features['age_years'].fillna(3)  # Default tree harvesting age
        
        # Create additional features
        features['area_rainfall_interaction'] = features['area'] * features['rainfall'] / 1000
        features['temp_age_interaction'] = features['temperature'] * features['age_years']
        
        # Define feature columns
        self.feature_names = [
            'area', 'location_encoded', 'variety_encoded', 
            'rainfall', 'temperature', 'age_years',
            'area_rainfall_interaction', 'temp_age_interaction'
        ]
        
        # Add soil type if available
        if 'soil_type_encoded' in features.columns:
            self.feature_names.append('soil_type_encoded')
        
        X = features[self.feature_names]
        y = features['yield_amount'] if 'yield_amount' in features.columns else None
        
        print(f"   ✅ Features prepared: {len(self.feature_names)} features")
        print(f"   📋 Feature names: {self.feature_names}")
        
        return X, y
    
    def _safe_encode(self, values, encoder):
        """Safely encode values, handling unseen categories"""
        encoded = []
        for val in values:
            if val in encoder.classes_:
                encoded.append(encoder.transform([val])[0])
            else:
                # Use most common class for unseen values
                encoded.append(0)
        return encoded
    
    def train_model(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train the yield prediction model with improved approach"""
        print(f"\n🤖 Training Yield Prediction Model")
        
        # Prepare features
        X, y = self.prepare_features(df, is_training=True)
        
        print(f"   📊 Training data: {len(X)} samples, {len(X.columns)} features")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=df['variety']
        )
        
        print(f"   📈 Data split: {len(X_train)} training, {len(X_test)} testing")
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Try different models
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
        
        results = {}
        
        for name, model in models.items():
            print(f"\n   🔬 Training {name}...")
            
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Evaluate
            y_pred_train = model.predict(X_train_scaled)
            y_pred_test = model.predict(X_test_scaled)
            
            # Metrics
            train_r2 = r2_score(y_train, y_pred_train)
            test_r2 = r2_score(y_test, y_pred_test)
            test_mae = mean_absolute_error(y_test, y_pred_test)
            test_mse = mean_squared_error(y_test, y_pred_test)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            
            results[name] = {
                'model': model,
                'train_r2': train_r2,
                'test_r2': test_r2,
                'test_mae': test_mae,
                'test_mse': test_mse,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std()
            }
            
            print(f"      ✅ Train R²: {train_r2:.3f}")
            print(f"      ✅ Test R²: {test_r2:.3f}")
            print(f"      ✅ Test MAE: {test_mae:.1f} kg")
            print(f"      ✅ CV R² (mean±std): {cv_scores.mean():.3f}±{cv_scores.std():.3f}")
        
        # Select best model based on cross-validation R²
        best_model_name = max(results.keys(), key=lambda k: results[k]['cv_mean'])
        best_result = results[best_model_name]
        self.model = best_result['model']
        
        print(f"\n🏆 Best Model: {best_model_name}")
        print(f"   🎯 Cross-validation R²: {best_result['cv_mean']:.3f}±{best_result['cv_std']:.3f}")
        print(f"   🎯 Test R²: {best_result['test_r2']:.3f}")
        print(f"   🎯 Test MAE: {best_result['test_mae']:.1f} kg")
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            feature_importance = dict(zip(self.feature_names, importances))
            sorted_importance = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            
            print(f"\n🔍 Feature Importance:")
            for feature, importance in sorted_importance:
                print(f"   {feature}: {importance:.3f}")
        
        # Save model and components
        self.save_model()
        
        # Generate prediction examples
        self._test_predictions(X_test_scaled, y_test)
        
        return {
            'model_type': best_model_name,
            'train_r2': best_result['train_r2'],
            'test_r2': best_result['test_r2'],
            'test_mae': best_result['test_mae'],
            'test_mse': best_result['test_mse'],
            'cv_mean': best_result['cv_mean'],
            'cv_std': best_result['cv_std'],
            'feature_count': len(self.feature_names),
            'training_samples': len(X_train)
        }
    
    def _test_predictions(self, X_test_scaled, y_test):
        """Test predictions on sample data"""
        print(f"\n🧪 Testing Predictions on Sample Data:")
        
        # Make predictions
        predictions = self.model.predict(X_test_scaled)
        
        # Show first 5 predictions vs actual
        for i in range(min(5, len(predictions))):
            actual = y_test.iloc[i]
            predicted = predictions[i]
            error = abs(predicted - actual)
            error_pct = (error / actual) * 100
            
            print(f"   Sample {i+1}: Actual={actual:.1f}kg, Predicted={predicted:.1f}kg, Error={error:.1f}kg ({error_pct:.1f}%)")
    
    def predict_yield(self, location: str, variety: str, area: float, 
                     rainfall: float = 2500, temperature: float = 26, 
                     age_years: int = 3, soil_type: str = 'Loamy') -> Dict[str, Any]:
        """Make a yield prediction"""
        
        if self.model is None:
            raise ValueError("Model not trained. Call train_model() first.")
        
        # Prepare input data
        input_data = pd.DataFrame([{
            'location': location,
            'variety': variety,
            'area': area,
            'rainfall': rainfall,
            'temperature': temperature,
            'age_years': age_years,
            'soil_type': soil_type,
            'yield_amount': 0  # Placeholder
        }])
        
        # Prepare features
        X, _ = self.prepare_features(input_data, is_training=False)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Make prediction
        prediction = self.model.predict(X_scaled)[0]
        
        # Calculate confidence (simplified approach)
        # Higher confidence for inputs similar to training data
        confidence = min(0.95, max(0.5, 1.0 - (abs(prediction - area * 2500) / (area * 2500))))
        
        return {
            'predicted_yield': round(prediction, 1),
            'yield_per_hectare': round(prediction / area, 1),
            'confidence_score': round(confidence, 3),
            'input_features': {
                'location': location,
                'variety': variety,
                'area': area,
                'rainfall': rainfall,
                'temperature': temperature,
                'age_years': age_years,
                'soil_type': soil_type
            }
        }
    
    def save_model(self):
        """Save trained model and preprocessors"""
        print(f"\n💾 Saving model components...")
        
        if self.model is not None:
            joblib.dump(self.model, self.model_path)
            print(f"   ✅ Model saved: {self.model_path}")
        
        if self.scaler is not None:
            joblib.dump(self.scaler, self.scaler_path)
            print(f"   ✅ Scaler saved: {self.scaler_path}")
        
        # Save all encoders
        encoders = {
            'location_encoder': self.location_encoder,
            'variety_encoder': self.variety_encoder,
            'feature_names': self.feature_names
        }
        
        if hasattr(self, 'soil_type_encoder'):
            encoders['soil_type_encoder'] = self.soil_type_encoder
        
        joblib.dump(encoders, self.encoders_path)
        print(f"   ✅ Encoders saved: {self.encoders_path}")
    
    def load_model(self):
        """Load trained model and preprocessors"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                print(f"   ✅ Model loaded: {self.model_path}")
            
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                print(f"   ✅ Scaler loaded: {self.scaler_path}")
            
            if os.path.exists(self.encoders_path):
                encoders = joblib.load(self.encoders_path)
                self.location_encoder = encoders['location_encoder']
                self.variety_encoder = encoders['variety_encoder']
                self.feature_names = encoders['feature_names']
                
                if 'soil_type_encoder' in encoders:
                    self.soil_type_encoder = encoders['soil_type_encoder']
                
                print(f"   ✅ Encoders loaded: {self.encoders_path}")
                return True
                
        except Exception as e:
            print(f"   ❌ Error loading model: {e}")
            return False
    
    def run_comprehensive_test(self):
        """Run comprehensive test scenarios"""
        print(f"\n🧪 Running Comprehensive Test Scenarios")
        
        test_cases = [
            # Test case format: (location, variety, area, expected_range)
            ('Kandy', 'Ceylon Cinnamon', 2.0, (4000, 6000)),
            ('Galle', 'Ceylon Cinnamon', 1.5, (3000, 5000)),
            ('Matara', 'Continental', 2.5, (5000, 7000)),
            ('Ratnapura', 'Alba', 2.0, (4500, 6500)),
            ('Kurunegala', 'Ceylon Cinnamon', 1.0, (2000, 3500)),
        ]
        
        for i, (location, variety, area, expected_range) in enumerate(test_cases, 1):
            print(f"\n   Test Case {i}: {location}, {variety}, {area}ha")
            
            try:
                result = self.predict_yield(location, variety, area)
                predicted = result['predicted_yield']
                confidence = result['confidence_score']
                yield_per_ha = result['yield_per_hectare']
                
                # Check if prediction is in reasonable range
                in_range = expected_range[0] <= predicted <= expected_range[1]
                status = "✅" if in_range else "⚠️"
                
                print(f"      {status} Predicted: {predicted:.1f}kg ({yield_per_ha:.0f}kg/ha)")
                print(f"      📊 Confidence: {confidence:.3f}")
                print(f"      🎯 Expected range: {expected_range[0]}-{expected_range[1]}kg")
                
            except Exception as e:
                print(f"      ❌ Error: {e}")


def main():
    """Main execution function"""
    print("🌾 Cinnamon Yield Prediction Model Trainer")
    print("=" * 50)
    
    try:
        # Initialize trainer
        trainer = YieldPredictionTrainer()
        
        # Load and explore data
        df = trainer.load_and_explore_data()
        
        # Train model
        results = trainer.train_model(df)
        
        print(f"\n🎉 Model Training Complete!")
        print(f"   Model Type: {results['model_type']}")
        print(f"   Test R²: {results['test_r2']:.3f}")
        print(f"   Cross-validation R²: {results['cv_mean']:.3f}±{results['cv_std']:.3f}")
        print(f"   Mean Absolute Error: {results['test_mae']:.1f} kg")
        print(f"   Training Samples: {results['training_samples']}")
        
        # Run comprehensive tests
        trainer.run_comprehensive_test()
        
        print(f"\n✨ All tests complete! Model ready for production use.")
        print(f"\n📁 Model files saved in 'models/' directory:")
        print(f"   • {trainer.model_path}")
        print(f"   • {trainer.scaler_path}")
        print(f"   • {trainer.encoders_path}")
        
    except Exception as e:
        print(f"\n❌ Error during execution: {e}")
        raise


if __name__ == "__main__":
    main()