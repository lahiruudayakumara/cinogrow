#!/usr/bin/env python3
"""
Kaggle Dataset Training System
Trains all models using datasets from Kaggle instead of local CSV files.
Supports automatic download and preprocessing of Kaggle datasets.
"""

import pandas as pd
import numpy as np
import os
import sys
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib

# Kaggle API imports
try:
    from kaggle.api.kaggle_api_extended import KaggleApi
    KAGGLE_AVAILABLE = True
except ImportError:
    print("⚠️ Kaggle API not available. Install with: pip install kaggle")
    KAGGLE_AVAILABLE = False


class KaggleModelTrainer:
    """Model training system using Kaggle datasets"""
    
    def __init__(self, kaggle_datasets: Dict[str, str] = None):
        """
        Initialize with Kaggle dataset configurations
        
        Args:
            kaggle_datasets: Dict mapping dataset names to Kaggle dataset identifiers
                Example: {
                    'tree_data': 'username/cinnamon-tree-dataset',
                    'yield_data': 'username/cinnamon-yield-dataset',
                    'enhanced_data': 'username/enhanced-cinnamon-dataset'
                }
        """
        self.models_dir = "models/yield_weather"
        self.tree_models_dir = "models/yield_weather/tree_level"
        self.plot_models_dir = "models/yield_weather/plot_level"
        self.kaggle_download_dir = "datasets/kaggle_downloads"
        
        # Create directories
        os.makedirs(self.tree_models_dir, exist_ok=True)
        os.makedirs(self.plot_models_dir, exist_ok=True)
        os.makedirs(self.kaggle_download_dir, exist_ok=True)
        
        # Default Kaggle datasets (replace with your actual dataset identifiers)
        self.kaggle_datasets = kaggle_datasets or {
            'tree_data': 'your-username/cinnamon-tree-dataset',
            'yield_data': 'your-username/cinnamon-yield-dataset', 
            'enhanced_data': 'your-username/enhanced-cinnamon-dataset'
        }
        
        # Initialize model storage
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.feature_names = {}
        
        # Initialize Kaggle API
        if KAGGLE_AVAILABLE:
            self.kaggle_api = KaggleApi()
            try:
                self.kaggle_api.authenticate()
                print("✅ Kaggle API authenticated successfully")
            except Exception as e:
                print(f"⚠️ Kaggle authentication failed: {e}")
                print("Please ensure your kaggle.json is properly configured")
                self.kaggle_api = None
        else:
            self.kaggle_api = None
    
    def download_kaggle_dataset(self, dataset_identifier: str, dataset_name: str) -> str:
        """Download dataset from Kaggle"""
        if not self.kaggle_api:
            raise Exception("Kaggle API not available or not authenticated")
        
        print(f"📥 Downloading {dataset_name} from Kaggle...")
        download_path = os.path.join(self.kaggle_download_dir, dataset_name)
        
        try:
            # Create dataset-specific directory
            os.makedirs(download_path, exist_ok=True)
            
            # Download dataset
            self.kaggle_api.dataset_download_files(
                dataset_identifier, 
                path=download_path, 
                unzip=True
            )
            
            print(f"✅ Downloaded {dataset_name} to {download_path}")
            return download_path
            
        except Exception as e:
            print(f"❌ Failed to download {dataset_name}: {e}")
            raise
    
    def load_datasets_from_kaggle(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load all datasets from Kaggle"""
        print("📊 Loading datasets from Kaggle...")
        
        datasets = {}
        
        for dataset_name, dataset_id in self.kaggle_datasets.items():
            print(f"Processing {dataset_name}...")
            
            # Download dataset
            download_path = self.download_kaggle_dataset(dataset_id, dataset_name)
            
            # Find CSV files in the downloaded directory
            csv_files = list(Path(download_path).glob("*.csv"))
            
            if not csv_files:
                raise FileNotFoundError(f"No CSV files found in {download_path}")
            
            # Load the first CSV file (or you can specify naming conventions)
            csv_file = csv_files[0]
            datasets[dataset_name] = pd.read_csv(csv_file)
            print(f"   Loaded {len(datasets[dataset_name])} samples from {csv_file.name}")
        
        return (
            datasets.get('tree_data', pd.DataFrame()),
            datasets.get('yield_data', pd.DataFrame()),
            datasets.get('enhanced_data', pd.DataFrame())
        )
    
    def load_datasets_from_local_kaggle_files(self, file_paths: Dict[str, str]) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load datasets from locally downloaded Kaggle files"""
        print("📊 Loading datasets from local Kaggle files...")
        
        datasets = {}
        
        for dataset_name, file_path in file_paths.items():
            if os.path.exists(file_path):
                datasets[dataset_name] = pd.read_csv(file_path)
                print(f"   {dataset_name}: {len(datasets[dataset_name])} samples from {file_path}")
            else:
                print(f"⚠️ File not found: {file_path}")
        
        return (
            datasets.get('tree_data', pd.DataFrame()),
            datasets.get('yield_data', pd.DataFrame()),
            datasets.get('enhanced_data', pd.DataFrame())
        )
    
    def train_tree_cane_model(self, tree_data: pd.DataFrame) -> Dict[str, Any]:
        """Train tree-level cane prediction model"""
        if tree_data.empty:
            raise ValueError("Tree data is empty")
            
        print("\n🌳 Training Tree Cane Prediction Model...")
        
        # Prepare features (adapt these based on your Kaggle dataset columns)
        features = [
            'stem_diameter_mm', 'tree_age_years', 'num_existing_stems',
            'rainfall_recent_mm', 'temperature_recent_c'
        ]
        
        # Check which features actually exist in the dataset
        available_features = [f for f in features if f in tree_data.columns]
        missing_features = [f for f in features if f not in tree_data.columns]
        
        if missing_features:
            print(f"⚠️ Missing features: {missing_features}")
            print(f"Available columns: {list(tree_data.columns)}")
        
        # Add categorical features if they exist
        categorical_features = ['fertilizer_type', 'disease_status', 'soil_type', 'location']
        available_categorical = [f for f in categorical_features if f in tree_data.columns]
        
        encoders = {}
        data = tree_data.copy()
        
        # Handle missing values
        for col in available_categorical:
            data[col] = data[col].fillna('unknown')
            encoder = LabelEncoder()
            data[f'{col}_encoded'] = encoder.fit_transform(data[col])
            encoders[col] = encoder
            available_features.append(f'{col}_encoded')
        
        # Add engineered features if base columns exist
        if 'fertilizer_used' in data.columns:
            data['fertilizer_used_int'] = data['fertilizer_used'].astype(int)
            available_features.append('fertilizer_used_int')
        
        if 'stem_diameter_mm' in data.columns and 'num_existing_stems' in data.columns:
            data['diameter_per_stem'] = data['stem_diameter_mm'] / data['num_existing_stems']
            available_features.append('diameter_per_stem')
        
        if 'stem_diameter_mm' in data.columns and 'tree_age_years' in data.columns:
            data['diameter_age_interaction'] = data['stem_diameter_mm'] * data['tree_age_years']
            available_features.append('diameter_age_interaction')
        
        # Check if target column exists
        target_column = 'actual_canes'  # Adapt this to your Kaggle dataset
        if target_column not in data.columns:
            print(f"⚠️ Target column '{target_column}' not found. Available columns: {list(data.columns)}")
            # Try common alternatives
            alternatives = ['canes', 'cane_count', 'target', 'y']
            for alt in alternatives:
                if alt in data.columns:
                    target_column = alt
                    print(f"✅ Using '{target_column}' as target column")
                    break
            else:
                raise ValueError(f"No suitable target column found")
        
        # Prepare final dataset
        X = data[available_features].fillna(0)
        y = data[target_column]
        
        print(f"Features used: {len(available_features)} - {available_features}")
        print(f"Training samples: {len(X)}")
        
        # Split and train
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train models
        models = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boost': GradientBoostingRegressor(n_estimators=100, random_state=42)
        }
        
        results = {}
        best_model = None
        best_score = float('inf')
        
        for name, model in models.items():
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Predict
            y_pred = model.predict(X_test_scaled)
            
            # Evaluate
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)
            
            results[name] = {
                'mse': mse,
                'rmse': np.sqrt(mse),
                'r2': r2,
                'mae': mae,
                'model': model
            }
            
            if mse < best_score:
                best_score = mse
                best_model = model
            
            print(f"   {name}: RMSE={np.sqrt(mse):.2f}, R²={r2:.3f}, MAE={mae:.2f}")
        
        # Save best model and preprocessors
        model_path = os.path.join(self.tree_models_dir, "cane_predictor.pkl")
        scaler_path = os.path.join(self.tree_models_dir, "cane_scaler.pkl")
        encoders_path = os.path.join(self.tree_models_dir, "cane_encoders.pkl")
        features_path = os.path.join(self.tree_models_dir, "cane_features.pkl")
        
        joblib.dump(best_model, model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump(encoders, encoders_path)
        joblib.dump(available_features, features_path)
        
        self.models['cane_predictor'] = best_model
        self.scalers['cane_predictor'] = scaler
        self.encoders['cane_predictor'] = encoders
        self.feature_names['cane_predictor'] = available_features
        
        print(f"✅ Best tree cane model saved: {model_path}")
        
        return {
            'model_type': 'tree_cane',
            'best_model': type(best_model).__name__,
            'performance': results,
            'feature_count': len(available_features),
            'training_samples': len(X_train),
            'model_path': model_path
        }
    
    def setup_kaggle_authentication(self) -> bool:
        """Setup Kaggle authentication guide"""
        print("\n🔑 Kaggle Authentication Setup")
        print("=" * 50)
        print("To use Kaggle datasets, you need to:")
        print("1. Go to https://www.kaggle.com/account")
        print("2. Scroll to 'API' section and click 'Create New API Token'")
        print("3. Download kaggle.json file")
        print("4. Place it in one of these locations:")
        print("   Windows: C:\\Users\\{username}\\.kaggle\\kaggle.json")
        print("   Linux/Mac: ~/.kaggle/kaggle.json")
        print("5. Make sure the file permissions are set to 600 (read/write for owner only)")
        print("\nAlternatively, set environment variables:")
        print("   KAGGLE_USERNAME=your_username")
        print("   KAGGLE_KEY=your_api_key")
        
        return KAGGLE_AVAILABLE and self.kaggle_api is not None


def main():
    """Main execution with example usage"""
    print("🌱 Kaggle Dataset Training System")
    print("=" * 50)
    
    # Example Kaggle dataset configuration
    # Replace these with your actual Kaggle dataset identifiers
    kaggle_datasets = {
        'tree_data': 'your-username/cinnamon-tree-dataset',
        'yield_data': 'your-username/cinnamon-yield-dataset',
        'enhanced_data': 'your-username/enhanced-cinnamon-dataset'
    }
    
    trainer = KaggleModelTrainer(kaggle_datasets)
    
    # Check Kaggle authentication
    if not trainer.setup_kaggle_authentication():
        print("\n❌ Kaggle API not available. Please install and configure Kaggle API.")
        print("Install with: pip install kaggle")
        return 1
    
    try:
        # Option 1: Download and use datasets directly from Kaggle
        print("\n📥 Option 1: Loading datasets from Kaggle API...")
        tree_data, yield_data, enhanced_data = trainer.load_datasets_from_kaggle()
        
        # Train models with Kaggle data
        if not tree_data.empty:
            cane_results = trainer.train_tree_cane_model(tree_data)
            print(f"\n✅ Tree cane model training completed:")
            print(f"   Best model: {cane_results['best_model']}")
            print(f"   Features: {cane_results['feature_count']}")
            print(f"   Training samples: {cane_results['training_samples']}")
        
        # You can add more model training here for yield prediction, etc.
        
        print("\n🎉 Training completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        print("\n💡 Tip: You can also use manually downloaded files:")
        print("   1. Download datasets from Kaggle website")
        print("   2. Use load_datasets_from_local_kaggle_files() method")
        
        # Example of local file usage
        local_files = {
            'tree_data': 'path/to/downloaded/tree_dataset.csv',
            'yield_data': 'path/to/downloaded/yield_dataset.csv',
            'enhanced_data': 'path/to/downloaded/enhanced_dataset.csv'
        }
        print(f"   Example: trainer.load_datasets_from_local_kaggle_files({local_files})")
        
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())