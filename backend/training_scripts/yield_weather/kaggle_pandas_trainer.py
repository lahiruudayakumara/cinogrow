#!/usr/bin/env python3
"""
Kaggle Dataset Training with pandas DataFrame (Recommended Approach)
Uses kagglehub for seamless dataset loading as pandas DataFrames
"""

import pandas as pd
import numpy as np
import os
import sys
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import warnings
warnings.filterwarnings('ignore')

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib

# Kagglehub import
try:
    import kagglehub
    KAGGLEHUB_AVAILABLE = True
    print("✅ kagglehub available - ready for seamless dataset loading")
except ImportError:
    print("⚠️ kagglehub not available. Install with: pip install kagglehub")
    KAGGLEHUB_AVAILABLE = False


class KagglePandasTrainer:
    """
    Advanced trainer using kagglehub for direct pandas DataFrame loading
    Optimized for agricultural/yield prediction datasets
    """
    
    def __init__(self, kaggle_datasets: Dict[str, str] = None):
        """
        Initialize with Kaggle dataset configurations
        
        Args:
            kaggle_datasets: Dict mapping logical names to Kaggle dataset handles
                Example: {
                    'cinnamon_yield': 'username/cinnamon-yield-weather-data',
                    'tree_metrics': 'username/cinnamon-tree-measurements',
                    'weather_historical': 'username/sri-lanka-weather-historical'
                }
        """
        self.models_dir = Path("models/yield_weather")
        self.tree_models_dir = Path("models/yield_weather/tree_level")
        self.plot_models_dir = Path("models/yield_weather/plot_level")
        
        # Create directories
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.tree_models_dir.mkdir(parents=True, exist_ok=True)
        self.plot_models_dir.mkdir(parents=True, exist_ok=True)
        
        # Kaggle dataset configurations
        self.kaggle_datasets = kaggle_datasets or {
            # Replace these with your actual Kaggle dataset handles
            'cinnamon_yield': 'your-username/cinnamon-yield-dataset',
            'tree_metrics': 'your-username/cinnamon-tree-metrics',
            'weather_data': 'your-username/sri-lanka-weather-data',
            'soil_analysis': 'your-username/sri-lanka-soil-data'
        }
        
        # Model storage
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.feature_names = {}
        self.dataset_cache = {}
    
    def load_kaggle_dataset_as_dataframe(self, dataset_handle: str, cache_key: str = None) -> pd.DataFrame:
        """
        Load Kaggle dataset directly as pandas DataFrame using kagglehub
        
        Args:
            dataset_handle: Kaggle dataset identifier (e.g., 'username/dataset-name')
            cache_key: Optional cache key to avoid reloading same dataset
        
        Returns:
            pandas DataFrame with the dataset
        """
        if not KAGGLEHUB_AVAILABLE:
            raise ImportError("kagglehub not available. Install with: pip install kagglehub")
        
        cache_key = cache_key or dataset_handle
        
        # Check cache first
        if cache_key in self.dataset_cache:
            print(f"📊 Using cached dataset: {cache_key}")
            return self.dataset_cache[cache_key]
        
        print(f"📥 Loading dataset from Kaggle: {dataset_handle}")
        
        try:
            # Download dataset and get the path
            path = kagglehub.dataset_download(dataset_handle)
            print(f"✅ Dataset downloaded to: {path}")
            
            # Find CSV files in the dataset
            dataset_path = Path(path)
            csv_files = list(dataset_path.glob("*.csv"))
            
            if not csv_files:
                raise FileNotFoundError(f"No CSV files found in dataset: {dataset_handle}")
            
            # If multiple CSV files, you might want to implement logic to select the right one
            # For now, we'll take the largest CSV file (likely the main dataset)
            main_csv = max(csv_files, key=lambda f: f.stat().st_size)
            
            print(f"📄 Loading CSV file: {main_csv.name} ({main_csv.stat().st_size / (1024*1024):.1f} MB)")
            
            # Load as pandas DataFrame with optimizations
            df = pd.read_csv(
                main_csv,
                low_memory=False,  # Better for mixed-type columns
                parse_dates=True,  # Auto-parse date columns
                infer_datetime_format=True
            )
            
            print(f"✅ Loaded DataFrame: {df.shape[0]} rows × {df.shape[1]} columns")
            print(f"📋 Columns: {list(df.columns)}")
            print(f"💾 Memory usage: {df.memory_usage(deep=True).sum() / (1024*1024):.1f} MB")
            
            # Cache the dataset
            self.dataset_cache[cache_key] = df
            
            return df
            
        except Exception as e:
            print(f"❌ Failed to load dataset {dataset_handle}: {e}")
            raise
    
    def load_multiple_datasets(self, dataset_names: List[str] = None) -> Dict[str, pd.DataFrame]:
        """
        Load multiple datasets simultaneously
        
        Args:
            dataset_names: List of dataset keys to load (from self.kaggle_datasets)
                          If None, loads all configured datasets
        
        Returns:
            Dictionary mapping dataset names to DataFrames
        """
        dataset_names = dataset_names or list(self.kaggle_datasets.keys())
        datasets = {}
        
        print(f"📊 Loading {len(dataset_names)} datasets from Kaggle...")
        
        for name in dataset_names:
            if name not in self.kaggle_datasets:
                print(f"⚠️ Dataset '{name}' not configured")
                continue
            
            try:
                datasets[name] = self.load_kaggle_dataset_as_dataframe(
                    self.kaggle_datasets[name], 
                    cache_key=name
                )
            except Exception as e:
                print(f"❌ Failed to load {name}: {e}")
                datasets[name] = pd.DataFrame()  # Empty DataFrame as fallback
        
        return datasets
    
    def preprocess_yield_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Preprocess yield dataset with agricultural-specific cleaning
        """
        print(f"🧹 Preprocessing yield data ({len(df)} rows)")
        
        # Make a copy to avoid modifying original
        processed_df = df.copy()
        
        # Common agricultural data cleaning
        
        # 1. Handle missing values intelligently
        if 'yield_amount' in processed_df.columns:
            # Remove rows with missing yield (target variable)
            initial_rows = len(processed_df)
            processed_df = processed_df.dropna(subset=['yield_amount'])
            print(f"   Removed {initial_rows - len(processed_df)} rows with missing yield")
        
        # 2. Fill missing weather data with regional averages
        weather_cols = ['rainfall', 'temperature', 'humidity', 'sunshine_hours']
        for col in weather_cols:
            if col in processed_df.columns:
                if 'location' in processed_df.columns:
                    # Fill missing weather data with location-based mean
                    processed_df[col] = processed_df.groupby('location')[col].transform(
                        lambda x: x.fillna(x.mean())
                    )
                else:
                    # Fill with overall mean
                    processed_df[col] = processed_df[col].fillna(processed_df[col].mean())
        
        # 3. Create derived features
        if 'yield_amount' in processed_df.columns and 'area' in processed_df.columns:
            processed_df['yield_per_hectare'] = processed_df['yield_amount'] / processed_df['area']
        
        if 'rainfall' in processed_df.columns and 'temperature' in processed_df.columns:
            processed_df['growing_season_index'] = (
                processed_df['rainfall'] / 1000 * 
                np.exp(-(processed_df['temperature'] - 25)**2 / 50)
            )
        
        # 4. Handle categorical variables
        categorical_cols = processed_df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            # Fill missing categorical values
            processed_df[col] = processed_df[col].fillna('unknown')
            
            # Clean string values
            if processed_df[col].dtype == 'object':
                processed_df[col] = processed_df[col].str.strip().str.lower()
        
        # 5. Remove obvious outliers for agricultural data
        if 'yield_per_hectare' in processed_df.columns:
            # Remove yields that are impossibly high or low for cinnamon
            q1 = processed_df['yield_per_hectare'].quantile(0.01)
            q99 = processed_df['yield_per_hectare'].quantile(0.99)
            initial_rows = len(processed_df)
            processed_df = processed_df[
                (processed_df['yield_per_hectare'] >= q1) & 
                (processed_df['yield_per_hectare'] <= q99)
            ]
            print(f"   Removed {initial_rows - len(processed_df)} outlier rows")
        
        print(f"✅ Preprocessing complete: {len(processed_df)} rows remaining")
        print(f"📊 Final columns: {list(processed_df.columns)}")
        
        return processed_df
    
    def train_yield_prediction_model(self, yield_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train comprehensive yield prediction model using kaggle dataset
        """
        if yield_df.empty:
            raise ValueError("Yield dataset is empty")
        
        print("\n🌾 Training Yield Prediction Model")
        print("=" * 50)
        
        # Preprocess the data
        processed_df = self.preprocess_yield_data(yield_df)
        
        # Define features based on common agricultural datasets
        numeric_features = [
            'area', 'rainfall', 'temperature', 'age_years', 'humidity',
            'sunshine_hours', 'soil_ph', 'elevation', 'yield_per_hectare'
        ]
        
        categorical_features = [
            'location', 'variety', 'soil_type', 'fertilizer_type', 
            'irrigation_method', 'season', 'district'
        ]
        
        # Filter features that actually exist in the dataset
        available_numeric = [f for f in numeric_features if f in processed_df.columns]
        available_categorical = [f for f in categorical_features if f in processed_df.columns]
        
        print(f"📊 Available numeric features ({len(available_numeric)}): {available_numeric}")
        print(f"📊 Available categorical features ({len(available_categorical)}): {available_categorical}")
        
        # Prepare the data
        feature_df = processed_df.copy()
        
        # Encode categorical variables
        encoders = {}
        for col in available_categorical:
            encoder = LabelEncoder()
            feature_df[f'{col}_encoded'] = encoder.fit_transform(feature_df[col].astype(str))
            encoders[col] = encoder
            available_numeric.append(f'{col}_encoded')
        
        # Create interaction features for agricultural modeling
        if 'rainfall' in feature_df.columns and 'temperature' in feature_df.columns:
            feature_df['rainfall_temp_interaction'] = feature_df['rainfall'] * feature_df['temperature']
            available_numeric.append('rainfall_temp_interaction')
        
        if 'area' in feature_df.columns and 'age_years' in feature_df.columns:
            feature_df['area_age_interaction'] = feature_df['area'] * feature_df['age_years']
            available_numeric.append('area_age_interaction')
        
        # Prepare final feature matrix
        X = feature_df[available_numeric].fillna(0)
        
        # Determine target variable
        target_options = ['yield_amount', 'yield', 'production', 'output']
        target_col = None
        for option in target_options:
            if option in feature_df.columns:
                target_col = option
                break
        
        if target_col is None:
            raise ValueError(f"No suitable target variable found. Available columns: {list(feature_df.columns)}")
        
        y = feature_df[target_col]
        
        print(f"🎯 Target variable: {target_col}")
        print(f"📏 Feature matrix: {X.shape}")
        print(f"📈 Target range: {y.min():.1f} - {y.max():.1f}")
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=None
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train multiple models
        models = {
            'random_forest': RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            ),
            'gradient_boost': GradientBoostingRegressor(
                n_estimators=200,
                learning_rate=0.1,
                max_depth=6,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
        }
        
        results = {}
        best_model = None
        best_score = float('inf')
        best_model_name = None
        
        print("\n🤖 Training models...")
        
        for name, model in models.items():
            print(f"   Training {name}...")
            
            # Train
            if 'random_forest' in name:
                model.fit(X_train, y_train)  # RF doesn't need scaling
                y_pred = model.predict(X_test)
            else:
                model.fit(X_train_scaled, y_train)
                y_pred = model.predict(X_test_scaled)
            
            # Evaluate
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)
            
            # Cross-validation for more robust evaluation
            if 'random_forest' in name:
                cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='neg_mean_squared_error')
            else:
                cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='neg_mean_squared_error')
            
            cv_rmse = np.sqrt(-cv_scores.mean())
            
            results[name] = {
                'mse': mse,
                'rmse': rmse,
                'r2': r2,
                'mae': mae,
                'cv_rmse': cv_rmse,
                'model': model
            }
            
            print(f"     RMSE: {rmse:.2f} | R²: {r2:.3f} | MAE: {mae:.2f} | CV-RMSE: {cv_rmse:.2f}")
            
            if rmse < best_score:
                best_score = rmse
                best_model = model
                best_model_name = name
        
        print(f"\n🏆 Best model: {best_model_name} (RMSE: {best_score:.2f})")
        
        # Save the best model and preprocessors
        model_path = self.plot_models_dir / "yield_predictor.pkl"
        scaler_path = self.plot_models_dir / "yield_scaler.pkl"
        encoders_path = self.plot_models_dir / "yield_encoders.pkl"
        features_path = self.plot_models_dir / "yield_features.pkl"
        
        joblib.dump(best_model, model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump(encoders, encoders_path)
        joblib.dump(available_numeric, features_path)
        
        # Store in instance
        self.models['yield_predictor'] = best_model
        self.scalers['yield_predictor'] = scaler
        self.encoders['yield_predictor'] = encoders
        self.feature_names['yield_predictor'] = available_numeric
        
        print(f"💾 Model saved to: {model_path}")
        
        return {
            'model_type': 'yield_prediction',
            'best_model': best_model_name,
            'performance': results[best_model_name],
            'all_results': results,
            'feature_count': len(available_numeric),
            'training_samples': len(X_train),
            'model_path': str(model_path),
            'target_variable': target_col
        }
    
    def predict_yield(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make yield prediction using trained model
        """
        if 'yield_predictor' not in self.models:
            raise ValueError("Yield prediction model not trained or loaded")
        
        model = self.models['yield_predictor']
        scaler = self.scalers['yield_predictor']
        encoders = self.encoders['yield_predictor']
        feature_names = self.feature_names['yield_predictor']
        
        # Prepare input data
        input_df = pd.DataFrame([input_data])
        
        # Encode categorical features
        for col, encoder in encoders.items():
            if col in input_data:
                try:
                    input_df[f'{col}_encoded'] = encoder.transform([str(input_data[col])])
                except ValueError:
                    # Handle unseen categories
                    input_df[f'{col}_encoded'] = [0]  # Default encoding
        
        # Create interaction features
        if 'rainfall' in input_df.columns and 'temperature' in input_df.columns:
            input_df['rainfall_temp_interaction'] = input_df['rainfall'] * input_df['temperature']
        
        if 'area' in input_df.columns and 'age_years' in input_df.columns:
            input_df['area_age_interaction'] = input_df['area'] * input_df['age_years']
        
        # Prepare feature vector
        feature_vector = np.zeros(len(feature_names))
        for i, feature in enumerate(feature_names):
            if feature in input_df.columns:
                feature_vector[i] = input_df[feature].iloc[0]
        
        # Scale and predict
        feature_vector_scaled = scaler.transform([feature_vector])
        prediction = model.predict(feature_vector_scaled)[0]
        
        return {
            'predicted_yield': prediction,
            'features_used': feature_names,
            'input_processed': dict(zip(feature_names, feature_vector))
        }


def setup_kagglehub():
    """Setup guide for kagglehub"""
    print("\n🔧 KaggleHub Setup Guide")
    print("=" * 40)
    print("1. Install kagglehub:")
    print("   pip install kagglehub")
    print("\n2. Authenticate (first time only):")
    print("   import kagglehub")
    print("   kagglehub.login()  # Follow prompts")
    print("\n3. Or set environment variables:")
    print("   KAGGLE_USERNAME=your_username")
    print("   KAGGLE_KEY=your_api_key")
    print("\n4. Find datasets on Kaggle and note their handles:")
    print("   Example: 'johndoe/cinnamon-yield-data'")


def main():
    """Example usage and testing"""
    print("🌱 Kaggle Pandas DataFrame Training System")
    print("=" * 60)
    
    if not KAGGLEHUB_AVAILABLE:
        setup_kagglehub()
        return 1
    
    # Example dataset configuration
    # Replace with your actual Kaggle dataset handles
    example_datasets = {
        'cinnamon_yield': 'your-username/cinnamon-yield-data',
        'weather_data': 'your-username/sri-lanka-weather-data'
    }
    
    trainer = KagglePandasTrainer(example_datasets)
    
    try:
        print(f"\n📊 Example: Loading yield dataset...")
        
        # This would load your actual dataset from Kaggle
        # yield_df = trainer.load_kaggle_dataset_as_dataframe(
        #     example_datasets['cinnamon_yield']
        # )
        
        # For demonstration, create a sample dataset
        print("📝 Using sample data for demonstration...")
        yield_df = pd.DataFrame({
            'location': ['Kandy', 'Matale', 'Galle', 'Ratnapura'] * 50,
            'variety': ['Ceylon', 'Cassia'] * 100,
            'area': np.random.uniform(1, 5, 200),
            'rainfall': np.random.uniform(1500, 3000, 200),
            'temperature': np.random.uniform(20, 30, 200),
            'age_years': np.random.randint(3, 15, 200),
            'yield_amount': np.random.uniform(2000, 8000, 200)
        })
        
        # Train model
        print(f"\n🤖 Training yield prediction model...")
        results = trainer.train_yield_prediction_model(yield_df)
        
        print(f"\n✅ Training Results:")
        print(f"   Best Model: {results['best_model']}")
        print(f"   R² Score: {results['performance']['r2']:.3f}")
        print(f"   RMSE: {results['performance']['rmse']:.2f}")
        print(f"   Features: {results['feature_count']}")
        
        # Test prediction
        test_input = {
            'location': 'kandy',
            'variety': 'ceylon',
            'area': 2.5,
            'rainfall': 2200,
            'temperature': 25,
            'age_years': 7
        }
        
        prediction = trainer.predict_yield(test_input)
        print(f"\n🎯 Test Prediction:")
        print(f"   Input: {test_input}")
        print(f"   Predicted Yield: {prediction['predicted_yield']:.1f} kg")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 To use with real Kaggle data:")
        print("   1. Upload your cinnamon datasets to Kaggle")
        print("   2. Replace 'your-username/dataset-name' with actual handles")
        print("   3. Run the script")
        return 1


if __name__ == "__main__":
    exit(main())