#!/usr/bin/env python3
"""
Test script to verify that yield prediction produces different results for different varieties and areas
"""
import requests
import json

API_BASE_URL = "http://localhost:8001"

def test_variety_differences():
    """Test that different varieties produce different predictions"""
    print("🧪 Testing variety differences...")
    
    base_params = {
        'location': 'Kandy',
        'area': 2.0,  # Fixed area
        'rainfall': 2500,
        'temperature': 26,
        'age_years': 5
    }
    
    varieties = ['Ceylon Cinnamon', 'Continental', 'Alba']
    results = {}
    
    for variety in varieties:
        params = {**base_params, 'variety': variety}
        
        try:
            response = requests.post(f"{API_BASE_URL}/ml/predict-single", params=params)
            
            if response.status_code == 200:
                result = response.json()
                if 'predicted_yield' in result and result['predicted_yield'] is not None:
                    results[variety] = result['predicted_yield']
                    print(f"  {variety}: {result['predicted_yield']} kg")
                else:
                    print(f"  {variety}: No prediction (error: {result.get('error', 'unknown')})")
            else:
                print(f"  {variety}: API Error {response.status_code}")
                
        except Exception as e:
            print(f"  {variety}: Exception - {e}")
    
    # Check if all predictions are different
    unique_predictions = set(results.values())
    if len(unique_predictions) == 1 and len(results) > 1:
        print("❌ PROBLEM: All varieties produce the SAME prediction!")
        return False
    elif len(unique_predictions) == len(results) and len(results) > 1:
        print("✅ SUCCESS: Different varieties produce different predictions")
        return True
    else:
        print(f"⚠️ Mixed results: {len(unique_predictions)} unique predictions from {len(results)} varieties")
        return len(unique_predictions) > 1

def test_area_differences():
    """Test that different areas produce different predictions"""
    print("\n🧪 Testing area differences...")
    
    base_params = {
        'location': 'Kandy',
        'variety': 'Ceylon Cinnamon',  # Fixed variety
        'rainfall': 2500,
        'temperature': 26,
        'age_years': 5
    }
    
    areas = [1.0, 2.0, 3.0]
    results = {}
    
    for area in areas:
        params = {**base_params, 'area': area}
        
        try:
            response = requests.post(f"{API_BASE_URL}/ml/predict-single", params=params)
            
            if response.status_code == 200:
                result = response.json()
                if 'predicted_yield' in result and result['predicted_yield'] is not None:
                    results[area] = result['predicted_yield']
                    yield_per_ha = result['predicted_yield'] / area
                    print(f"  {area} ha: {result['predicted_yield']} kg ({yield_per_ha:.1f} kg/ha)")
                else:
                    print(f"  {area} ha: No prediction (error: {result.get('error', 'unknown')})")
            else:
                print(f"  {area} ha: API Error {response.status_code}")
                
        except Exception as e:
            print(f"  {area} ha: Exception - {e}")
    
    # Check if predictions scale with area
    if len(results) >= 2:
        # Calculate yield per hectare for each area
        yields_per_ha = {area: result/area for area, result in results.items()}
        unique_yields_per_ha = set(round(y, 1) for y in yields_per_ha.values())
        
        print(f"  Yields per hectare: {yields_per_ha}")
        
        if len(unique_yields_per_ha) == 1:
            print("✅ SUCCESS: Yield scales linearly with area (consistent yield per hectare)")
            return True
        else:
            print("❌ PROBLEM: Yield per hectare is not consistent across different areas")
            return False
    else:
        print("⚠️ Not enough data to verify area scaling")
        return False

def test_feature_importance():
    """Test model info to see feature importance"""
    print("\n🧪 Testing model feature importance...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/ml/model-info")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Model info retrieved:")
            print(f"  Model type: {result.get('model_type', 'unknown')}")
            print(f"  Features: {result.get('features', [])}")
            
            feature_importance = result.get('feature_importance', {})
            if feature_importance:
                print("  Feature importance:")
                for feature, importance in sorted(feature_importance.items(), key=lambda x: x[1], reverse=True):
                    print(f"    {feature}: {importance:.4f}")
                    
                # Check if variety and area have reasonable importance
                variety_importance = feature_importance.get('variety_encoded', 0)
                area_importance = feature_importance.get('area', 0)
                
                if variety_importance > 0.01:  # More than 1% importance
                    print("✅ Variety has significant importance in the model")
                else:
                    print(f"❌ Variety importance is too low: {variety_importance:.4f}")
                    
                if area_importance > 0.1:  # More than 10% importance
                    print("✅ Area has significant importance in the model")
                else:
                    print(f"❌ Area importance is too low: {area_importance:.4f}")
                    
                return variety_importance > 0.01 and area_importance > 0.1
            else:
                print("⚠️ No feature importance data available")
                return False
        else:
            print(f"❌ API Error {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Yield Prediction Variance")
    print("=" * 50)
    
    test1_passed = test_variety_differences()
    test2_passed = test_area_differences()
    test3_passed = test_feature_importance()
    
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS:")
    print(f"   Variety differences: {'✅ PASS' if test1_passed else '❌ FAIL'}")
    print(f"   Area scaling: {'✅ PASS' if test2_passed else '❌ FAIL'}")
    print(f"   Feature importance: {'✅ PASS' if test3_passed else '❌ FAIL'}")
    
    if test1_passed and test2_passed and test3_passed:
        print("\n🎉 All tests passed! Model properly handles variety and area differences.")
    else:
        print("\n⚠️ Some tests failed. The model may not be properly using variety and area features.")
        print("\nPossible issues:")
        print("1. Model not trained with sufficient variety/area diversity")
        print("2. Feature encoding problems")
        print("3. Model overfitting to other features")
        print("4. Scaling issues with features")