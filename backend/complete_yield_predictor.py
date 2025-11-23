"""
Complete Standalone Yield Prediction Solution
This script trains and tests the model without requiring the API server to be running
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
import sys
from typing import Dict, Any, Optional
import warnings
warnings.filterwarnings('ignore')

class CompleteYieldPredictor:
    """Complete standalone yield prediction system"""
    
    def __init__(self, csv_path: str = "yield_dataset_template.csv"):
        self.csv_path = csv_path
        self.model = None
        self.scaler = None
        self.location_encoder = None
        self.variety_encoder = None
        self.soil_type_encoder = None
        self.feature_names = None
        
        # Model paths
        self.model_dir = "models"
        self.model_path = os.path.join(self.model_dir, "yield_prediction_model.joblib")
        self.scaler_path = os.path.join(self.model_dir, "yield_scaler.joblib")
        self.encoders_path = os.path.join(self.model_dir, "yield_encoders.joblib")
        
        # Ensure models directory exists
        os.makedirs(self.model_dir, exist_ok=True)
        
        print("🌾 Complete Yield Prediction System Initialized")
    
    def load_data(self) -> pd.DataFrame:
        """Load and validate the CSV data"""
        print(f"\n📊 Loading data from {self.csv_path}")
        
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        
        df = pd.read_csv(self.csv_path)
        print(f"✅ Loaded {len(df)} records with {len(df.columns)} features")
        
        # Validate required columns
        required_cols = ['location', 'variety', 'area', 'yield_amount', 'rainfall', 'temperature', 'age_years']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Display basic statistics
        print(f"\n📈 Data Overview:")
        print(f"   Area range: {df['area'].min():.2f} - {df['area'].max():.2f} ha")
        print(f"   Yield range: {df['yield_amount'].min():.0f} - {df['yield_amount'].max():.0f} kg")
        print(f"   Locations: {df['location'].nunique()} unique ({list(df['location'].unique())})")
        print(f"   Varieties: {df['variety'].nunique()} unique ({list(df['variety'].unique())})")
        
        return df
    
    def prepare_features(self, df: pd.DataFrame, is_training: bool = True) -> pd.DataFrame:
        """Prepare features with enhanced engineering"""
        print(f"🔧 Preparing features ({'training' if is_training else 'prediction'} mode)")
        
        features = df.copy()
        
        # Handle categorical encoding
        if is_training:
            # Fit encoders during training
            self.location_encoder = LabelEncoder()
            self.variety_encoder = LabelEncoder()
            
            features['location_encoded'] = self.location_encoder.fit_transform(features['location'])
            features['variety_encoded'] = self.variety_encoder.fit_transform(features['variety'])
            
            print(f"   📍 Encoded {len(self.location_encoder.classes_)} locations")
            print(f"   🌿 Encoded {len(self.variety_encoder.classes_)} varieties")
            
            if 'soil_type' in features.columns:
                self.soil_type_encoder = LabelEncoder()
                features['soil_type_encoded'] = self.soil_type_encoder.fit_transform(features['soil_type'])
                print(f"   🏞️  Encoded {len(self.soil_type_encoder.classes_)} soil types")
        else:
            # Use existing encoders for prediction
            features['location_encoded'] = self._safe_encode(features['location'], self.location_encoder)
            features['variety_encoded'] = self._safe_encode(features['variety'], self.variety_encoder)
            
            if 'soil_type' in features.columns and self.soil_type_encoder:
                features['soil_type_encoded'] = self._safe_encode(features['soil_type'], self.soil_type_encoder)
        
        # Handle missing values
        features['rainfall'] = features['rainfall'].fillna(2500)
        features['temperature'] = features['temperature'].fillna(26)
        features['age_years'] = features['age_years'].fillna(3)
        
        # Enhanced feature engineering
        features['area_rainfall_interaction'] = features['area'] * features['rainfall'] / 1000
        features['temp_age_interaction'] = features['temperature'] * features['age_years']
        features['yield_density'] = features['area'] * 1000  # Area impact factor
        
        # Define feature columns
        self.feature_names = [
            'area', 'location_encoded', 'variety_encoded', 
            'rainfall', 'temperature', 'age_years',
            'area_rainfall_interaction', 'temp_age_interaction', 'yield_density'
        ]
        
        # Add soil type if available
        if 'soil_type_encoded' in features.columns:
            self.feature_names.append('soil_type_encoded')
        
        return features[self.feature_names]
    
    def _safe_encode(self, values, encoder):
        """Safely encode values, handling unseen categories"""
        if encoder is None:
            return [0] * len(values)
        
        encoded = []
        for val in values:
            if val in encoder.classes_:
                encoded.append(encoder.transform([val])[0])
            else:
                encoded.append(0)  # Default to first class
        return encoded
    
    def train_complete_model(self) -> Dict[str, Any]:
        """Train the complete model from scratch"""
        print(f"\n🤖 Training Complete Yield Prediction Model")
        print("=" * 50)
        
        # Load data
        df = self.load_data()
        
        # Prepare features
        X = self.prepare_features(df, is_training=True)
        y = df['yield_amount']
        
        print(f"\n📊 Training Configuration:")
        print(f"   Features: {len(self.feature_names)}")
        print(f"   Samples: {len(X)}")
        print(f"   Target range: {y.min():.0f} - {y.max():.0f} kg")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Test multiple algorithms
        algorithms = {
            'GradientBoosting': GradientBoostingRegressor(
                n_estimators=200,
                max_depth=8,
                learning_rate=0.1,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            ),
            'RandomForest': RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        }
        
        best_model = None
        best_score = -float('inf')
        best_metrics = {}
        
        print(f"\n🔬 Testing Algorithms:")
        
        for name, model in algorithms.items():
            print(f"   Training {name}...")
            
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            
            # Test predictions
            y_pred_test = model.predict(X_test_scaled)
            test_r2 = r2_score(y_test, y_pred_test)
            test_mae = mean_absolute_error(y_test, y_pred_test)
            
            print(f"      CV R²: {cv_scores.mean():.3f} (±{cv_scores.std():.3f})")
            print(f"      Test R²: {test_r2:.3f}")
            print(f"      Test MAE: {test_mae:.1f} kg")
            
            if cv_scores.mean() > best_score:
                best_score = cv_scores.mean()
                best_model = model
                best_metrics = {
                    'algorithm': name,
                    'cv_r2': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'test_r2': test_r2,
                    'test_mae': test_mae,
                    'train_samples': len(X_train),
                    'test_samples': len(X_test)
                }
        
        self.model = best_model
        
        # Feature importance
        if hasattr(self.model, 'feature_importances_'):
            importance = dict(zip(self.feature_names, self.model.feature_importances_))
            sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)
            
            print(f"\n🔍 Feature Importance ({best_metrics['algorithm']}):")
            for feature, imp in sorted_importance[:5]:  # Top 5
                print(f"   {feature}: {imp:.3f}")
        
        # Save model
        self.save_model()
        
        print(f"\n🏆 Best Model: {best_metrics['algorithm']}")
        print(f"   Cross-validation R²: {best_metrics['cv_r2']:.3f} ± {best_metrics['cv_std']:.3f}")
        print(f"   Test R²: {best_metrics['test_r2']:.3f}")
        print(f"   Mean Absolute Error: {best_metrics['test_mae']:.1f} kg")
        
        # Test some predictions
        self._test_sample_predictions(X_test_scaled, y_test)
        
        return best_metrics
    
    def _test_sample_predictions(self, X_test, y_test):
        """Test predictions on sample data"""
        print(f"\n🧪 Sample Predictions:")
        
        predictions = self.model.predict(X_test)
        
        for i in range(min(5, len(predictions))):
            actual = y_test.iloc[i]
            predicted = predictions[i]
            error = abs(predicted - actual)
            error_pct = (error / actual) * 100
            
            status = "✅" if error_pct <= 10 else "⚠️" if error_pct <= 20 else "❌"
            print(f"   {status} Actual: {actual:.0f}kg, Predicted: {predicted:.0f}kg, Error: {error_pct:.1f}%")
    
    def predict_yield(self, location: str, variety: str, area: float, 
                     rainfall: float = 2500, temperature: float = 26, 
                     age_years: int = 3, soil_type: str = 'Loamy') -> Dict[str, Any]:
        """Make yield prediction"""
        
        if self.model is None:
            raise ValueError("Model not trained. Run train_complete_model() first.")
        
        # Prepare input
        input_data = pd.DataFrame([{
            'location': location,
            'variety': variety,
            'area': area,
            'yield_amount': 0,  # Placeholder
            'soil_type': soil_type,
            'rainfall': rainfall,
            'temperature': temperature,
            'age_years': age_years
        }])
        
        # Prepare features
        X = self.prepare_features(input_data, is_training=False)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        yield_per_ha = prediction / area
        
        # Confidence based on yield per hectare range
        if 2200 <= yield_per_ha <= 3200:
            confidence = 0.95
        elif 1800 <= yield_per_ha <= 3800:
            confidence = 0.80
        else:
            confidence = 0.65
        
        return {
            'predicted_yield': round(prediction, 1),
            'yield_per_hectare': round(yield_per_ha, 1),
            'confidence_score': round(confidence, 3),
            'input_parameters': {
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
        """Save model components"""
        print(f"\n💾 Saving model components...")
        
        # Save model
        joblib.dump(self.model, self.model_path)
        print(f"   ✅ Model saved: {self.model_path}")
        
        # Save scaler
        joblib.dump(self.scaler, self.scaler_path)
        print(f"   ✅ Scaler saved: {self.scaler_path}")
        
        # Save encoders
        encoders = {
            'location_encoder': self.location_encoder,
            'variety_encoder': self.variety_encoder,
            'feature_names': self.feature_names
        }
        
        if self.soil_type_encoder:
            encoders['soil_type_encoder'] = self.soil_type_encoder
        
        joblib.dump(encoders, self.encoders_path)
        print(f"   ✅ Encoders saved: {self.encoders_path}")
    
    def load_model(self):
        """Load saved model components"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                print("✅ Model loaded")
            
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                print("✅ Scaler loaded")
            
            if os.path.exists(self.encoders_path):
                encoders = joblib.load(self.encoders_path)
                self.location_encoder = encoders.get('location_encoder')
                self.variety_encoder = encoders.get('variety_encoder')
                self.soil_type_encoder = encoders.get('soil_type_encoder')
                self.feature_names = encoders.get('feature_names')
                print("✅ Encoders loaded")
                return True
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            return False
        
        return False
    
    def run_comprehensive_tests(self):
        """Run comprehensive test scenarios"""
        print(f"\n🧪 Comprehensive Prediction Tests")
        print("=" * 40)
        
        test_scenarios = [
            {
                'name': 'High-yield Ceylon Cinnamon',
                'params': {
                    'location': 'Kandy',
                    'variety': 'Ceylon Cinnamon', 
                    'area': 2.5,
                    'rainfall': 2700,
                    'temperature': 25,
                    'age_years': 7
                },
                'expected_range': (6000, 8000)
            },
            {
                'name': 'Standard Alba plot',
                'params': {
                    'location': 'Galle',
                    'variety': 'Alba',
                    'area': 2.0,
                    'rainfall': 2500,
                    'temperature': 26,
                    'age_years': 5
                },
                'expected_range': (5000, 7000)
            },
            {
                'name': 'Small Continental plot',
                'params': {
                    'location': 'Matara',
                    'variety': 'Continental',
                    'area': 1.0,
                    'rainfall': 2200,
                    'temperature': 27,
                    'age_years': 4
                },
                'expected_range': (2200, 3000)
            },
            {
                'name': 'Large Ratnapura plot',
                'params': {
                    'location': 'Ratnapura',
                    'variety': 'Ceylon Cinnamon',
                    'area': 3.0,
                    'rainfall': 2800,
                    'temperature': 24,
                    'age_years': 6
                },
                'expected_range': (7000, 9000)
            }
        ]
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\nTest {i}: {scenario['name']}")
            print(f"   Input: {scenario['params']}")
            
            try:
                result = self.predict_yield(**scenario['params'])
                predicted = result['predicted_yield']
                confidence = result['confidence_score']
                yield_per_ha = result['yield_per_hectare']
                
                # Check if in expected range
                min_exp, max_exp = scenario['expected_range']
                in_range = min_exp <= predicted <= max_exp
                status = "✅" if in_range else "⚠️"
                
                print(f"   {status} Predicted: {predicted:.0f}kg ({yield_per_ha:.0f}kg/ha)")
                print(f"   📊 Confidence: {confidence:.3f}")
                print(f"   🎯 Expected: {min_exp}-{max_exp}kg")
                
            except Exception as e:
                print(f"   ❌ Error: {e}")


def main():
    """Main execution function"""
    print("🌾 Complete Standalone Yield Prediction System")
    print("=" * 55)
    print("This solution works without requiring the API server to be running")
    
    try:
        # Initialize predictor
        predictor = CompleteYieldPredictor()
        
        # Check if model already exists
        if predictor.load_model():
            print("\n🔄 Found existing model. Choose an option:")
            print("   1. Use existing model")
            print("   2. Retrain model")
            choice = input("Enter choice (1 or 2): ").strip()
            
            if choice == "2":
                print("\n🔄 Retraining model...")
                metrics = predictor.train_complete_model()
            else:
                print("\n✅ Using existing model")
        else:
            print("\n🆕 No existing model found. Training new model...")
            metrics = predictor.train_complete_model()
        
        # Run comprehensive tests
        predictor.run_comprehensive_tests()
        
        # Interactive prediction
        print(f"\n🎯 Interactive Prediction Mode")
        print("Enter 'q' to quit, or provide prediction parameters:")
        
        while True:
            print(f"\n" + "="*30)
            location = input("Location (e.g., Kandy): ").strip()
            if location.lower() == 'q':
                break
            
            variety = input("Variety (e.g., Ceylon Cinnamon): ").strip()
            if variety.lower() == 'q':
                break
            
            try:
                area = float(input("Area (hectares): "))
                rainfall = float(input("Rainfall (mm, default 2500): ") or "2500")
                temperature = float(input("Temperature (°C, default 26): ") or "26")
                age_years = int(input("Tree age (years, default 3): ") or "3")
                
                result = predictor.predict_yield(
                    location=location,
                    variety=variety,
                    area=area,
                    rainfall=rainfall,
                    temperature=temperature,
                    age_years=age_years
                )
                
                print(f"\n🎯 Prediction Results:")
                print(f"   Predicted Yield: {result['predicted_yield']:.1f} kg")
                print(f"   Yield per Hectare: {result['yield_per_hectare']:.1f} kg/ha")
                print(f"   Confidence Score: {result['confidence_score']:.3f}")
                
            except ValueError as e:
                print(f"❌ Invalid input: {e}")
            except Exception as e:
                print(f"❌ Prediction error: {e}")
        
        print(f"\n✨ Session complete! Model files saved in 'models/' directory")
        
    except Exception as e:
        print(f"\n❌ System error: {e}")
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)