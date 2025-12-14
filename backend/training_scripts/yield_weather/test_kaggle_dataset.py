#!/usr/bin/env python3
"""
Test script for loading your specific Kaggle dataset
Demonstrates kagglehub usage with udaridevindi/cinogrow-dataset
"""

# Install dependencies as needed:
# pip install kagglehub[pandas-datasets]
import pandas as pd

try:
    import kagglehub
    from kagglehub import KaggleDatasetAdapter
    KAGGLEHUB_AVAILABLE = True
except ImportError:
    print("❌ kagglehub not available. Install with: pip install kagglehub[pandas-datasets]")
    KAGGLEHUB_AVAILABLE = False


def test_your_kaggle_dataset():
    """Test loading your specific Kaggle dataset"""
    if not KAGGLEHUB_AVAILABLE:
        return False
    
    print("🌱 Testing Your Cinogrow Kaggle Dataset")
    print("=" * 50)
    
    # Your specific dataset
    dataset_handle = "udaridevindi/cinogrow-dataset"
    
    try:
        # Method 1: Load with empty file_path to see available files
        print("📋 Checking available files in dataset...")
        try:
            df = kagglehub.load_dataset(
                KaggleDatasetAdapter.PANDAS,
                dataset_handle,
                ""  # Empty path to list files
            )
        except Exception as e:
            print(f"   Info: {e}")
        
        # Method 2: Try loading specific files that might exist
        possible_files = [
            "yield_dataset_template.csv",
            "tree_dataset_template.csv", 
            "enhanced_plot_dataset_template.csv",
            "cinogrow_data.csv",
            "cinnamon_yield.csv",
            "dataset.csv",
            "data.csv"
        ]
        
        loaded_datasets = {}
        
        for file_path in possible_files:
            try:
                print(f"\n📥 Trying to load: {file_path}")
                df = kagglehub.load_dataset(
                    KaggleDatasetAdapter.PANDAS,
                    dataset_handle,
                    file_path
                )
                
                print(f"✅ Successfully loaded: {file_path}")
                print(f"   Shape: {df.shape[0]} rows × {df.shape[1]} columns")
                print(f"   Columns: {list(df.columns)}")
                print(f"   Memory: {df.memory_usage(deep=True).sum() / (1024*1024):.1f} MB")
                print("   First 5 records:")
                print(df.head())
                print("   Data types:")
                print(df.dtypes)
                
                loaded_datasets[file_path] = df
                
                # Show basic statistics for numeric columns
                numeric_cols = df.select_dtypes(include=['number']).columns
                if len(numeric_cols) > 0:
                    print("   Numeric column statistics:")
                    print(df[numeric_cols].describe())
                
                print("-" * 50)
                
            except Exception as e:
                print(f"   ❌ Could not load {file_path}: {e}")
        
        if loaded_datasets:
            print(f"\n🎉 Successfully loaded {len(loaded_datasets)} dataset(s):")
            for filename, df in loaded_datasets.items():
                print(f"   • {filename}: {df.shape[0]} rows × {df.shape[1]} columns")
            
            return loaded_datasets
        else:
            print("\n❌ No datasets could be loaded")
            print("\n💡 Troubleshooting tips:")
            print("   1. Check if dataset exists: https://www.kaggle.com/datasets/udaridevindi/cinogrow-dataset")
            print("   2. Ensure dataset is public or you have access")
            print("   3. Verify file names in the dataset")
            print("   4. Try authenticating: import kagglehub; kagglehub.login()")
            
            return {}
            
    except Exception as e:
        print(f"❌ Failed to access dataset: {e}")
        return {}


def demonstrate_training_integration(datasets: dict):
    """Show how to integrate loaded datasets with training"""
    if not datasets:
        print("⚠️ No datasets loaded, skipping training demonstration")
        return
    
    print("\n🤖 Training Integration Example")
    print("=" * 40)
    
    # Take the first loaded dataset as an example
    dataset_name, df = next(iter(datasets.items()))
    print(f"Using dataset: {dataset_name}")
    
    # Basic preprocessing example
    print(f"\n🧹 Basic preprocessing example:")
    
    # Check for common agricultural columns
    agricultural_features = [
        'yield', 'yield_amount', 'production',
        'area', 'location', 'variety', 'rainfall', 'temperature',
        'age', 'age_years', 'soil_type', 'fertilizer'
    ]
    
    available_features = [col for col in df.columns if any(feat in col.lower() for feat in agricultural_features)]
    print(f"   Detected agricultural features: {available_features}")
    
    # Check data quality
    missing_data = df.isnull().sum()
    if missing_data.sum() > 0:
        print(f"   Missing data found in {missing_data[missing_data > 0].to_dict()}")
    else:
        print("   ✅ No missing data found")
    
    # Check for categorical vs numeric columns
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    
    print(f"   Categorical columns ({len(categorical_cols)}): {categorical_cols}")
    print(f"   Numeric columns ({len(numeric_cols)}): {numeric_cols}")
    
    # Suggest target variable
    potential_targets = ['yield', 'yield_amount', 'production', 'output']
    target_candidates = [col for col in df.columns if any(target in col.lower() for target in potential_targets)]
    
    if target_candidates:
        print(f"   Potential target variables: {target_candidates}")
    else:
        print("   ⚠️ No obvious target variable found")
    
    print("\n💡 To use this dataset for training:")
    print("   1. Identify your target variable (what you want to predict)")
    print("   2. Select relevant features for prediction") 
    print("   3. Handle missing data and categorical encoding")
    print("   4. Use the CompleteModelTrainer with your processed data")


def main():
    """Main execution"""
    print("🧪 Kaggle Dataset Testing Tool")
    print("Testing dataset: udaridevindi/cinogrow-dataset")
    print("=" * 60)
    
    # Test loading your dataset
    datasets = test_your_kaggle_dataset()
    
    if datasets:
        # Show how to integrate with training
        demonstrate_training_integration(datasets)
        
        print(f"\n✅ Dataset testing complete!")
        print(f"   You can now use these datasets with the CompleteModelTrainer")
        
        return datasets
    else:
        print(f"\n❌ Dataset testing failed")
        print(f"   Please check dataset access and file names")
        
        return None


if __name__ == "__main__":
    result = main()