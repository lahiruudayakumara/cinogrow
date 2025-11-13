"""
Debug script to test if the yield prediction model is working correctly with different areas
"""
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import get_db
from app.services.yield_prediction_enhanced import YieldPredictionService

def test_different_areas():
    """Test prediction with different plot areas"""
    print("🔧 Testing yield prediction with different areas...")
    
    # Get database session
    db = next(get_db())
    
    # Initialize prediction service
    service = YieldPredictionService(db)
    
    # Test data - same conditions but different areas
    # Use actual plot IDs that have planting records
    test_cases = [
        {"area": 1, "name": "1 hectare", "plot_id": 7},
        {"area": 10, "name": "10 hectares", "plot_id": 8}, 
        {"area": 50, "name": "50 hectares", "plot_id": 9},
        {"area": 100, "name": "100 hectares", "plot_id": 7}  # Reuse plot 7
    ]
    
    print("\n📊 Testing predictions:")
    print("=" * 60)
    
    for case in test_cases:
        result = service.predict_yield(
            plot_id=case["plot_id"],
            location="Sri Lanka",
            variety="Cinnamon",
            area=case["area"],
            rainfall=2500,
            temperature=26,
            age_years=5
        )
        
        if "error" not in result:
            predicted_yield = result.get("predicted_yield", 0)
            yield_per_ha = result.get("yield_per_hectare", 0)
            confidence = result.get("confidence_score", 0)
            source = result.get("prediction_source", "unknown")
            
            print(f"Area: {case['name']:12} | Total: {predicted_yield:8.1f} kg | Per Ha: {yield_per_ha:8.1f} kg | Conf: {confidence:.3f} | Source: {source}")
        else:
            print(f"Area: {case['name']:12} | ERROR: {result.get('message', 'Unknown error')}")
    
    print("=" * 60)
    
    # Check model info
    print("\n🤖 Model Information:")
    model_info = service.get_model_info()
    if model_info.get("model_loaded"):
        print(f"Model Type: {model_info.get('model_type', 'Unknown')}")
        print(f"Dataset Size: {model_info.get('dataset_size', 'Unknown')}")
        print(f"Features: {model_info.get('features', [])}")
        print(f"Feature Count: {model_info.get('feature_count', 0)}")
        
        # Show feature importance if available
        importance = model_info.get('feature_importance', {})
        if importance:
            print("\n📈 Feature Importance:")
            for feature, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True):
                print(f"  {feature}: {imp:.4f}")
    else:
        print("❌ No model loaded")
    
    db.close()

if __name__ == "__main__":
    test_different_areas()