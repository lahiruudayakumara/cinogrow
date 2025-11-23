"""
Simple test script that bypasses planting checks to test area sensitivity
"""
import sys
import os
import pandas as pd

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db
from app.services.yield_prediction_enhanced import YieldPredictionService

def test_area_sensitivity():
    """Test if the model responds correctly to different areas"""
    print("🔧 Testing area sensitivity of yield prediction model...")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Initialize service
        service = YieldPredictionService(db)
        
        # Test data
        test_cases = [
            {"area": 1, "name": "1 hectare"},
            {"area": 10, "name": "10 hectares"},
            {"area": 50, "name": "50 hectares"},
            {"area": 100, "name": "100 hectares"}
        ]
        
        print("\n📊 Direct model predictions:")
        print("=" * 70)
        
        for case in test_cases:
            # Create test input data
            input_data = pd.DataFrame([{
                'location': 'Galle',  # Use actual location from training data
                'variety': 'Ceylon Cinnamon',  # Use actual variety from training data
                'area': case['area'],
                'yield_amount': 0,  # Placeholder
                'soil_type': 'Loamy',
                'rainfall': 2500,
                'temperature': 26,
                'age_years': 5
            }])
            
            # Prepare features
            X = service.prepare_features(input_data, is_training=False)
            
            # Scale features
            X_scaled = service.scaler.transform(X)
            
            # Make prediction
            prediction = service.model.predict(X_scaled)[0]
            
            # Calculate metrics
            total_yield = prediction  # Model predicts total yield
            yield_per_ha = total_yield / case['area']
            
            print(f"Area: {case['name']:12} | Total: {total_yield:8.1f} kg | Per Ha: {yield_per_ha:8.1f} kg/ha")
        
        print("=" * 70)
        
        # Test if model is scaling correctly
        print(f"\n🧮 Testing proportionality:")
        input_1ha = pd.DataFrame([{
            'location': 'Galle', 'variety': 'Ceylon Cinnamon', 'area': 1, 'yield_amount': 0,
            'soil_type': 'Loamy', 'rainfall': 2500, 'temperature': 26, 'age_years': 5
        }])
        
        input_2ha = pd.DataFrame([{
            'location': 'Galle', 'variety': 'Ceylon Cinnamon', 'area': 2, 'yield_amount': 0,
            'soil_type': 'Loamy', 'rainfall': 2500, 'temperature': 26, 'age_years': 5
        }])
        
        X1 = service.prepare_features(input_1ha, is_training=False)
        X2 = service.prepare_features(input_2ha, is_training=False)
        
        X1_scaled = service.scaler.transform(X1)
        X2_scaled = service.scaler.transform(X2)
        
        pred1 = service.model.predict(X1_scaled)[0]
        pred2 = service.model.predict(X2_scaled)[0]
        
        print(f"1 hectare prediction: {pred1:.1f} kg")
        print(f"2 hectare prediction: {pred2:.1f} kg")
        print(f"Ratio (should be ~2.0): {pred2/pred1:.2f}")
        
        if abs(pred2/pred1 - 2.0) < 0.3:
            print("✅ Model is scaling correctly with area")
        else:
            print("⚠️  Model scaling may not be optimal")
            
    except Exception as e:
        print(f"❌ Error during test: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_area_sensitivity()