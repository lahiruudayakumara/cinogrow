"""
Test the ML model with proper variety mapping
"""
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db
from app.services.yield_prediction_enhanced import YieldPredictionService

def test_ml_with_mapping():
    """Test ML model with the improved variety mapping"""
    print("🧠 Testing ML model with variety mapping...")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Initialize service
        service = YieldPredictionService(db)
        
        if service.model is None:
            print("❌ No ML model loaded")
            return
        
        print(f"✅ Model loaded: {type(service.model).__name__}")
        
        # Test with mobile app values that will be mapped
        test_cases = [
            {"area": 50, "location": "Sri Lanka", "variety": "Cinnamon"},
            {"area": 100, "location": "Sri Lanka", "variety": "Cinnamon"},
            {"area": 22, "location": "Sri Lanka", "variety": "Cinnamon"},
        ]
        
        print("\n📊 ML Predictions with Mapping:")
        print("=" * 70)
        
        for case in test_cases:
            # Prepare input data
            import pandas as pd
            
            input_data = pd.DataFrame([{
                'location': case['location'],
                'variety': case['variety'],
                'area': case['area'],
                'yield_amount': 0,  # Placeholder
                'soil_type': 'Loamy',
                'rainfall': 2500,
                'temperature': 26,
                'age_years': 5
            }])
            
            # Test the feature preparation and encoding
            try:
                X = service.prepare_features(input_data, is_training=False)
                X_scaled = service.scaler.transform(X)
                prediction = service.model.predict(X_scaled)[0]
                
                total_yield = prediction
                yield_per_ha = total_yield / case['area']
                
                print(f"Area: {case['area']:6.1f}ha | Location: {case['location']:10} | Variety: {case['variety']:10} | Total: {total_yield:8.1f}kg | Per Ha: {yield_per_ha:8.1f}kg")
                
            except Exception as e:
                print(f"Area: {case['area']:6.1f}ha | ❌ Error: {e}")
        
        print("=" * 70)
        
        # Also test the full prediction function
        print("\n🔄 Full Prediction Function Test:")
        print("=" * 50)
        
        for case in test_cases:
            # Use a non-existent plot ID to force fallback but still test the mapping
            result = service.predict_yield(
                plot_id=9999,
                location=case['location'],
                variety=case['variety'],
                area=case['area'],
                rainfall=2500,
                temperature=26,
                age_years=5
            )
            
            predicted_yield = result.get('predicted_yield', 0)
            yield_per_ha = result.get('yield_per_hectare', 0)
            source = result.get('prediction_source', 'unknown')
            
            print(f"Area: {case['area']:6.1f}ha | Total: {predicted_yield:8.1f}kg | Per Ha: {yield_per_ha:8.1f}kg | Source: {source}")
        
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_ml_with_mapping()