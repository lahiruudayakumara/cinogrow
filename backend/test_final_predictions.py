"""
Final test to simulate the exact API calls from the mobile app
"""
import sys
import os
import requests

def test_api_predictions():
    """Test the actual API endpoints with different areas like the mobile app does"""
    print("📱 Testing API predictions like the mobile app...")
    
    base_url = "http://localhost:8000/api/v1"
    
    # Test cases matching the mobile app logs
    test_cases = [
        {"area": 50, "name": "Plot A", "plot_id": 7},
        {"area": 100, "name": "Plot B", "plot_id": 8}, 
        {"area": 22, "name": "Plot C", "plot_id": 9},
        {"area": 15.5, "name": "Plot D (unplanted)", "plot_id": 10}
    ]
    
    print("\n📊 API Test Results:")
    print("=" * 80)
    
    for case in test_cases:
        try:
            # Make the exact same API call as the mobile app
            url = f"{base_url}/ml/predict-single"
            params = {
                "location": "Sri Lanka",
                "variety": "Cinnamon", 
                "area": case["area"],
                "plot_id": case["plot_id"],
                "rainfall": 2500,
                "temperature": 26,
                "age_years": 5
            }
            
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                if "error" in data:
                    print(f"{case['name']:15} | ❌ {data['error']}: {data.get('message', 'Unknown error')}")
                else:
                    predicted_yield = data.get('predicted_yield', 0)
                    yield_per_ha = data.get('yield_per_hectare', 0)
                    confidence = data.get('confidence_score', 0)
                    source = data.get('prediction_source', 'unknown')
                    
                    print(f"{case['name']:15} | Area: {case['area']:6.1f}ha | Total: {predicted_yield:8.1f}kg | Per Ha: {yield_per_ha:8.1f}kg | Conf: {confidence:.3f} | {source}")
            else:
                print(f"{case['name']:15} | HTTP {response.status_code}: {response.text[:50]}...")
                
        except requests.exceptions.ConnectionError:
            print(f"{case['name']:15} | ❌ Server not running at {base_url}")
            break
        except Exception as e:
            print(f"{case['name']:15} | ❌ Error: {e}")
    
    print("=" * 80)

def test_local_predictions():
    """Test predictions locally without API"""
    print("\n🔧 Testing local predictions...")
    
    # Add the app directory to the path
    sys.path.insert(0, os.path.dirname(__file__))
    
    from app.database import get_db
    from app.services.yield_prediction_enhanced import YieldPredictionService
    
    # Get database session
    db = next(get_db())
    
    try:
        # Initialize service
        service = YieldPredictionService(db)
        
        # Test cases
        test_cases = [
            {"area": 50, "name": "Plot A"},
            {"area": 100, "name": "Plot B"},
            {"area": 22, "name": "Plot C"},
            {"area": 15.5, "name": "Plot D"}
        ]
        
        print("\n📊 Local Test Results:")
        print("=" * 80)
        
        for case in test_cases:
            result = service.predict_yield(
                plot_id=999,  # Dummy ID to bypass planting check for this test
                location="Sri Lanka",
                variety="Cinnamon",
                area=case["area"],
                rainfall=2500,
                temperature=26,
                age_years=5
            )
            
            if "error" in result:
                # Test with fallback directly
                result = service._fallback_prediction(case["area"], "Cinnamon", None)
            
            if "error" not in result:
                predicted_yield = result.get('predicted_yield', 0)
                yield_per_ha = result.get('yield_per_hectare', 0)
                confidence = result.get('confidence_score', 0)
                source = result.get('prediction_source', 'unknown')
                
                print(f"{case['name']:15} | Area: {case['area']:6.1f}ha | Total: {predicted_yield:8.1f}kg | Per Ha: {yield_per_ha:8.1f}kg | Conf: {confidence:.3f} | {source}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()
    
    print("=" * 80)

if __name__ == "__main__":
    print("🌿 Final Yield Prediction Test")
    print("=" * 50)
    
    # Test API first
    test_api_predictions()
    
    # Test local as backup
    test_local_predictions()
    
    print("\n✨ Test complete!")