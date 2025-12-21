#!/usr/bin/env python3
"""
Complete Model Training System with Kaggle Integration
Trains all models needed for hybrid prediction using datasets from Kaggle:
1. Tree-level models (cane & weight prediction) 
2. Plot-level model (yield prediction)
3. Enhanced models with weather integration
Uses kagglehub for seamless pandas DataFrame loading
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
from typing import Dict, Any, Tuple, Optional, List
import warnings
warnings.filterwarnings('ignore')

# Kaggle integration
try:
    import kagglehub
    from kagglehub import KaggleDatasetAdapter
    KAGGLEHUB_AVAILABLE = True
    print("✅ kagglehub available - ready for dataset loading from Kaggle")
except ImportError:
    print("⚠️ kagglehub not available. Install with: pip install kagglehub[pandas-datasets]")
    KAGGLEHUB_AVAILABLE = False


class CompleteModelTrainer:
    """Complete model training system for hybrid yield prediction"""
    
    def __init__(self):
        self.models_dir = "models/yield_weather"
        self.tree_models_dir = "models/yield_weather/tree_level"
        self.plot_models_dir = "models/yield_weather/plot_level"
        
        # Create directories
        os.makedirs(self.tree_models_dir, exist_ok=True)
        os.makedirs(self.plot_models_dir, exist_ok=True)
        
        # Initialize model storage
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.feature_names = {}
    
    def load_datasets(self, use_kaggle: bool = True, dataset_handle: str = "udaridevindi/cinogrow-dataset") -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Load all datasets from Kaggle or local files
        
        Args:
            use_kaggle: If True, load from Kaggle using kagglehub
            dataset_handle: Kaggle dataset identifier (e.g., 'udaridevindi/cinogrow-dataset')
        """
        print("📊 Loading datasets...")
        
        if use_kaggle and KAGGLEHUB_AVAILABLE:
            return self._load_from_kaggle(dataset_handle)
        else:
            return self._load_from_local_files()
    
    def _load_from_kaggle(self, dataset_handle: str) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load datasets from Kaggle using kagglehub"""
        print(f"🌐 Loading from Kaggle dataset: {dataset_handle}")
        
        try:
            # Download the dataset first
            dataset_path = kagglehub.dataset_download(dataset_handle)
            print(f"✅ Dataset downloaded to: {dataset_path}")
            
            # Your dataset has a subfolder structure
            data_folder = os.path.join(dataset_path, "Cinnamon Yield Dataset")
            
            # Load tree dataset
            print("   Loading tree dataset...")
            tree_data = pd.read_csv(os.path.join(data_folder, "tree_level_dataset.csv"))
            print(f"   Tree dataset: {len(tree_data)} samples")
            
            # Load main yield dataset 
            print("   Loading yield dataset...")
            yield_data = pd.read_csv(os.path.join(data_folder, "aggregated_yield_dataset.csv"))
            print(f"   Yield dataset: {len(yield_data)} samples")
            
            # Load enhanced plot dataset
            print("   Loading enhanced plot dataset...")
            enhanced_data = pd.read_csv(os.path.join(data_folder, "enhanced_plot_dataset.csv"))
            print(f"   Enhanced plot dataset: {len(enhanced_data)} samples")
            
            return tree_data, yield_data, enhanced_data
            
        except Exception as e:
            print(f"❌ Failed to load from Kaggle: {e}")
            print("   Falling back to local files...")
            return self._load_from_local_files()
    
    def _load_from_local_files(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load datasets from local CSV files (fallback method)"""
        print("📁 Loading from local files...")
        
        local_files = {
            "tree_data": "datasets/yield_weather/tree_dataset_template.csv",
            "yield_data": "datasets/yield_weather/yield_dataset_template.csv", 
            "enhanced_data": "datasets/yield_weather/enhanced_plot_dataset_template.csv"
        }
        
        datasets = {}
        missing_files = []
        
        for dataset_name, file_path in local_files.items():
            if os.path.exists(file_path):
                datasets[dataset_name] = pd.read_csv(file_path)
                print(f"   {dataset_name}: {len(datasets[dataset_name])} samples")
            else:
                missing_files.append(file_path)
                datasets[dataset_name] = pd.DataFrame()
        
        if missing_files:
            print(f"⚠️  Local files not found: {missing_files}")
            print("   💡 Recommendation: Use Kaggle dataset (option 1) instead")
        
        return (
            datasets.get('tree_data', pd.DataFrame()),
            datasets.get('yield_data', pd.DataFrame()),
            datasets.get('enhanced_data', pd.DataFrame())
        )
    
    def load_single_kaggle_dataset(self, dataset_handle: str = "udaridevindi/cinogrow-dataset", file_path: str = "") -> pd.DataFrame:
        """
        Load a single dataset from Kaggle - useful for testing
        
        Args:
            dataset_handle: Kaggle dataset identifier
            file_path: Specific file within the dataset to load
        """
        if not KAGGLEHUB_AVAILABLE:
            raise ImportError("kagglehub not available. Install with: pip install kagglehub[pandas-datasets]")
        
        print(f"📥 Loading single dataset: {dataset_handle}/{file_path}")
        
        try:
            df = kagglehub.load_dataset(
                KaggleDatasetAdapter.PANDAS,
                dataset_handle,
                file_path
            )
            print(f"✅ Loaded dataset: {df.shape[0]} rows × {df.shape[1]} columns")
            print(f"📋 Columns: {list(df.columns)}")
            print("First 5 records:")
            print(df.head())
            
            return df
            
        except Exception as e:
            print(f"❌ Failed to load dataset: {e}")
            raise
    
    def train_tree_cane_model(self, tree_data: pd.DataFrame) -> Dict[str, Any]:
        """Train tree-level cane prediction model"""
        print("\n🌳 Training Tree Cane Prediction Model...")
        
        # Prepare features
        features = [
            'stem_diameter_mm', 'tree_age_years', 'num_existing_stems',
            'rainfall_recent_mm', 'temperature_recent_c'
        ]
        
        # Add categorical features
        categorical_features = ['fertilizer_type', 'disease_status', 'soil_type', 'location']
        encoders = {}
        
        data = tree_data.copy()
        
        # Handle missing values
        data['fertilizer_type'] = data['fertilizer_type'].fillna('none')
        data['fertilizer_used'] = data['fertilizer_used'].astype(int)
        
        # Encode categorical variables
        for col in categorical_features:
            encoder = LabelEncoder()
            data[f'{col}_encoded'] = encoder.fit_transform(data[col].fillna('unknown'))
            encoders[col] = encoder
            features.append(f'{col}_encoded')
        
        # Add engineered features
        data['fertilizer_used_int'] = data['fertilizer_used'].astype(int)
        data['diameter_per_stem'] = data['stem_diameter_mm'] / data['num_existing_stems']
        data['diameter_age_interaction'] = data['stem_diameter_mm'] * data['tree_age_years']
        
        features.extend(['fertilizer_used_int', 'diameter_per_stem', 'diameter_age_interaction'])
        
        # Prepare target and features
        X = data[features]
        y = data['actual_canes']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Try different models
        models = {
            'RandomForest': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            'GradientBoosting': GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42)
        }
        
        best_model = None
        best_score = -float('inf')
        best_metrics = {}
        
        for name, model in models.items():
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            
            # Test predictions
            y_pred = model.predict(X_test_scaled)
            test_r2 = r2_score(y_test, y_pred)
            test_mae = mean_absolute_error(y_test, y_pred)
            
            print(f"   {name}: CV R² = {cv_scores.mean():.3f} ± {cv_scores.std():.3f}, Test R² = {test_r2:.3f}")
            
            if cv_scores.mean() > best_score:
                best_score = cv_scores.mean()
                best_model = model
                best_metrics = {
                    'model_name': name,
                    'cv_r2': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'test_r2': test_r2,
                    'test_mae': test_mae
                }
        
        # Save best model
        joblib.dump(best_model, f"{self.tree_models_dir}/tree_cane_model.joblib")
        joblib.dump(scaler, f"{self.tree_models_dir}/tree_cane_scaler.joblib")
        joblib.dump({
            'encoders': encoders,
            'feature_names': features
        }, f"{self.tree_models_dir}/tree_cane_encoders.joblib")
        
        print(f"   ✅ Best model: {best_metrics['model_name']} (R² = {best_metrics['cv_r2']:.3f})")
        
        return best_metrics
    
    def train_tree_weight_model(self, tree_data: pd.DataFrame) -> Dict[str, Any]:
        """Train tree-level fresh weight prediction model"""
        print("\n🏋️ Training Tree Weight Prediction Model...")
        
        # Prepare features (including predicted canes)
        features = [
            'stem_diameter_mm', 'tree_age_years', 'num_existing_stems',
            'rainfall_recent_mm', 'temperature_recent_c', 'actual_canes'  # Using actual canes for training
        ]
        
        # Add categorical features
        categorical_features = ['fertilizer_type', 'disease_status', 'soil_type', 'location']
        encoders = {}
        
        data = tree_data.copy()
        
        # Handle missing values
        data['fertilizer_type'] = data['fertilizer_type'].fillna('none')
        data['fertilizer_used'] = data['fertilizer_used'].astype(int)
        
        # Encode categorical variables
        for col in categorical_features:
            encoder = LabelEncoder()
            data[f'{col}_encoded'] = encoder.fit_transform(data[col].fillna('unknown'))
            encoders[col] = encoder
            features.append(f'{col}_encoded')
        
        # Add engineered features
        data['fertilizer_used_int'] = data['fertilizer_used'].astype(int)
        data['canes_diameter_interaction'] = data['actual_canes'] * data['stem_diameter_mm']
        
        features.extend(['fertilizer_used_int', 'canes_diameter_interaction'])
        
        # Prepare target and features
        X = data[features]
        y = data['actual_fresh_weight_kg']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Try different models
        models = {
            'RandomForest': RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
            'GradientBoosting': GradientBoostingRegressor(n_estimators=100, max_depth=6, random_state=42)
        }
        
        best_model = None
        best_score = -float('inf')
        best_metrics = {}
        
        for name, model in models.items():
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            
            # Test predictions
            y_pred = model.predict(X_test_scaled)
            test_r2 = r2_score(y_test, y_pred)
            test_mae = mean_absolute_error(y_test, y_pred)
            
            print(f"   {name}: CV R² = {cv_scores.mean():.3f} ± {cv_scores.std():.3f}, Test R² = {test_r2:.3f}")
            
            if cv_scores.mean() > best_score:
                best_score = cv_scores.mean()
                best_model = model
                best_metrics = {
                    'model_name': name,
                    'cv_r2': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'test_r2': test_r2,
                    'test_mae': test_mae
                }
        
        # Save best model
        joblib.dump(best_model, f"{self.tree_models_dir}/tree_weight_model.joblib")
        joblib.dump(scaler, f"{self.tree_models_dir}/tree_weight_scaler.joblib")
        joblib.dump({
            'encoders': encoders,
            'feature_names': features
        }, f"{self.tree_models_dir}/tree_weight_encoders.joblib")
        
        print(f"   ✅ Best model: {best_metrics['model_name']} (R² = {best_metrics['cv_r2']:.3f})")
        
        return best_metrics
    
    def train_plot_yield_model(self, yield_data: pd.DataFrame, enhanced_data: pd.DataFrame) -> Dict[str, Any]:
        """Train plot-level yield prediction model using both datasets"""
        print("\n📊 Training Plot-Level Yield Prediction Model...")
        
        # Combine datasets
        # Map yield_data to enhanced_data format
        yield_mapped = yield_data.copy()
        yield_mapped.rename(columns={
            'area': 'area_hectares',
            'yield_amount': 'yield_kg',
            'rainfall': 'rainfall_mm',
            'temperature': 'temperature_c',
            'age_years': 'age_years'
        }, inplace=True)
        
        # Add missing columns with defaults
        yield_mapped['avg_stem_diameter_mm'] = 45.0  # Default diameter
        yield_mapped['min_stem_diameter_mm'] = 35.0
        yield_mapped['max_stem_diameter_mm'] = 55.0
        yield_mapped['fertilizer_used_plot'] = True  # Assume fertilized
        yield_mapped['disease_present_plot'] = 'mild'  # Default disease status
        
        # Combine datasets
        combined_data = pd.concat([enhanced_data, yield_mapped], ignore_index=True)
        print(f"   Combined dataset: {len(combined_data)} samples")
        
        # Prepare features
        features = [
            'area_hectares', 'rainfall_mm', 'temperature_c', 'age_years',
            'avg_stem_diameter_mm', 'min_stem_diameter_mm', 'max_stem_diameter_mm'
        ]
        
        # Categorical features
        categorical_features = ['location', 'variety', 'soil_type', 'disease_present_plot']
        encoders = {}
        
        data = combined_data.copy()
        
        # Handle missing values
        data['variety'] = data['variety'].fillna('Sri Gemunu')
        data['disease_present_plot'] = data['disease_present_plot'].fillna('mild')
        data['fertilizer_used_plot'] = data['fertilizer_used_plot'].astype(int)
        
        # Encode categorical variables
        for col in categorical_features:
            encoder = LabelEncoder()
            data[f'{col}_encoded'] = encoder.fit_transform(data[col].fillna('unknown'))
            encoders[col] = encoder
            features.append(f'{col}_encoded')
        
        # Add engineered features
        data['fertilizer_used_int'] = data['fertilizer_used_plot'].astype(int)
        data['diameter_range'] = data['max_stem_diameter_mm'] - data['min_stem_diameter_mm']
        data['climate_index'] = data['rainfall_mm'] / data['temperature_c']
        
        features.extend(['fertilizer_used_int', 'diameter_range', 'climate_index'])
        
        # Prepare target and features
        X = data[features]
        y = data['yield_kg']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Try different models with hyperparameter tuning
        models = {
            'RandomForest': RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42),
            'GradientBoosting': GradientBoostingRegressor(n_estimators=150, max_depth=8, learning_rate=0.1, random_state=42)
        }
        
        best_model = None
        best_score = -float('inf')
        best_metrics = {}
        
        for name, model in models.items():
            # Train model
            model.fit(X_train_scaled, y_train)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5, scoring='r2')
            
            # Test predictions
            y_pred = model.predict(X_test_scaled)
            test_r2 = r2_score(y_test, y_pred)
            test_mae = mean_absolute_error(y_test, y_pred)
            
            print(f"   {name}: CV R² = {cv_scores.mean():.3f} ± {cv_scores.std():.3f}, Test R² = {test_r2:.3f}")
            
            if cv_scores.mean() > best_score:
                best_score = cv_scores.mean()
                best_model = model
                best_metrics = {
                    'model_name': name,
                    'cv_r2': cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'test_r2': test_r2,
                    'test_mae': test_mae
                }
        
        # Save best model
        joblib.dump(best_model, f"{self.plot_models_dir}/plot_yield_model.joblib")
        joblib.dump(scaler, f"{self.plot_models_dir}/plot_yield_scaler.joblib")
        joblib.dump({
            'encoders': encoders,
            'feature_names': features
        }, f"{self.plot_models_dir}/plot_yield_encoders.joblib")
        
        print(f"   ✅ Best model: {best_metrics['model_name']} (R² = {best_metrics['cv_r2']:.3f})")
        
        return best_metrics
    
    def train_all_models(self) -> Dict[str, Any]:
        """Train all models and save results"""
        print("🚀 Starting Complete Model Training Pipeline...")
        
        # Load datasets
        tree_data, yield_data, enhanced_data = self.load_datasets()
        
        results = {}
        
        # Train tree-level models
        results['tree_cane_model'] = self.train_tree_cane_model(tree_data)
        results['tree_weight_model'] = self.train_tree_weight_model(tree_data)
        
        # Train plot-level model
        results['plot_yield_model'] = self.train_plot_yield_model(yield_data, enhanced_data)
        
        # Save training summary
        import json
        with open(f"{self.models_dir}/training_results.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        print("\n🎉 Model Training Complete!")
        print("\n📋 Summary:")
        for model_name, metrics in results.items():
            if 'cv_r2' in metrics:
                print(f"   {model_name}: {metrics['model_name']} (R² = {metrics['cv_r2']:.3f})")
        
        print(f"\n💾 Models saved in:")
        print(f"   Tree models: {self.tree_models_dir}/")
        print(f"   Plot models: {self.plot_models_dir}/")
        
        return results


def main():
    """Main training function with Kaggle integration options"""
    print("🌱 Complete Model Training System")
    print("=" * 50)
    
    if KAGGLEHUB_AVAILABLE:
        print("✅ Kaggle integration available")
        print("🌐 Primary data source: Kaggle dataset (udaridevindi/cinogrow-dataset)")
        choice = input("\nChoose data source:\n1. Kaggle dataset (Recommended) 🌟\n2. Local CSV files (if available)\n3. Test single Kaggle file loading\nEnter choice (1-3, default=1): ").strip()
        
        if not choice:  # Default to Kaggle
            choice = "1"
        
        trainer = CompleteModelTrainer()
        
        if choice == "1":
            print(f"\n🌐 Using Kaggle dataset (recommended)...")
            # Load datasets from Kaggle
            tree_data, yield_data, enhanced_data = trainer.load_datasets(use_kaggle=True)
            
            if tree_data.empty and yield_data.empty and enhanced_data.empty:
                print("❌ No data loaded from Kaggle, exiting...")
                return None
            
            # Train models
            results = trainer.train_all_models_with_data(tree_data, yield_data, enhanced_data)
            
        elif choice == "3":
            # Test loading a single file
            file_path = input("Enter specific file path within dataset (or press Enter for default): ").strip()
            if not file_path:
                file_path = "Cinnamon Yield Dataset/aggregated_yield_dataset.csv"  # Default file
            
            try:
                df = trainer.load_single_kaggle_dataset(file_path=file_path)
                print(f"\n✅ Successfully loaded and displayed dataset!")
                return df
            except Exception as e:
                print(f"❌ Failed to load: {e}")
                return None
                
        else:  # choice == "2" or fallback
            print(f"\n📁 Attempting to use local CSV files...")
            results = trainer.train_all_models()
    
    else:
        print("⚠️ kagglehub not available")
        print("   Install with: pip install kagglehub")
        print("   Falling back to local files...")
        trainer = CompleteModelTrainer()
        results = trainer.train_all_models()
    
    return results


def train_all_models_with_data(self, tree_data: pd.DataFrame, yield_data: pd.DataFrame, enhanced_data: pd.DataFrame):
    """Train all models with provided data (used for Kaggle integration)"""
    print("\n🚀 Starting Model Training with Loaded Data...")
    
    results = {}
    
    # Train tree-level models if data is available
    if not tree_data.empty:
        results['tree_cane_model'] = self.train_tree_cane_model(tree_data)
        results['tree_weight_model'] = self.train_tree_weight_model(tree_data)
    else:
        print("⚠️ Tree data not available, skipping tree models")
    
    # Train plot-level model if data is available
    if not yield_data.empty:
        results['plot_yield_model'] = self.train_plot_yield_model(yield_data, enhanced_data)
    else:
        print("⚠️ Yield data not available, skipping plot model")
    
    # Save training summary
    import json
    with open(f"{self.models_dir}/training_results.json", 'w') as f:
        # Convert numpy types to regular Python types for JSON serialization
        json_results = {}
        for model_name, metrics in results.items():
            json_results[model_name] = {
                k: float(v) if isinstance(v, (np.floating, np.integer)) else str(v) if hasattr(v, '__class__') else v
                for k, v in metrics.items() 
                if k not in ['model']  # Exclude model objects from JSON
            }
        json.dump(json_results, f, indent=2)
    
    print("\n🎉 Model Training Complete!")
    print("\n📋 Summary:")
    for model_name, metrics in results.items():
        if 'cv_r2' in metrics:
            print(f"   {model_name}: {metrics.get('model_name', 'Unknown')} (R² = {metrics['cv_r2']:.3f})")
    
    print(f"\n💾 Models saved in:")
    print(f"   Tree models: {self.tree_models_dir}/")
    print(f"   Plot models: {self.plot_models_dir}/")
    
    return results


# Add the method to the CompleteModelTrainer class
CompleteModelTrainer.train_all_models_with_data = train_all_models_with_data


def test_kaggle_connection():
    """Test Kaggle dataset loading functionality"""
    if not KAGGLEHUB_AVAILABLE:
        print("❌ kagglehub not available. Install with: pip install kagglehub[pandas-datasets]")
        return False
    
    try:
        print("🧪 Testing Kaggle connection...")
        trainer = CompleteModelTrainer()
        
        # Try to load a simple dataset
        df = trainer.load_single_kaggle_dataset(
            dataset_handle="udaridevindi/cinogrow-dataset",
            file_path=""  # Will list available files
        )
        
        return True
        
    except Exception as e:
        print(f"❌ Kaggle test failed: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Ensure kagglehub is installed: pip install kagglehub[pandas-datasets]")
        print("   2. Authenticate with Kaggle: import kagglehub; kagglehub.login()")
        print("   3. Check dataset visibility and permissions")
        return False


if __name__ == "__main__":
    main()