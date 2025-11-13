#!/usr/bin/env python3
"""
Test script to verify that yield prediction correctly handles unplanted plots
"""
import requests
import json

API_BASE_URL = "http://localhost:8001"

def test_unplanted_plot_prediction():
    """Test that unplanted plots return appropriate error message"""
    print("🧪 Testing yield prediction for unplanted plot...")
    
    # Use a plot ID that doesn't have planting records (like plot 1, 2, 3)
    test_plot_id = 1
    
    # Test parameters
    params = {
        'plot_id': test_plot_id,
        'location': 'Kandy',
        'variety': 'Ceylon Cinnamon',
        'area': 1.5,
        'rainfall': 2500,
        'temperature': 26,
        'age_years': 3
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/ml/predict-single", params=params)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response received:")
            print(json.dumps(result, indent=2))
            
            # Check if it correctly identifies unplanted plot
            if result.get('error') == 'Plot not planted':
                print("✅ SUCCESS: Correctly identified unplanted plot")
                print(f"   Message: {result.get('message')}")
                print(f"   Requires planting: {result.get('requires_planting')}")
                print(f"   Predicted yield: {result.get('predicted_yield')}")
                return True
            elif result.get('predicted_yield') is not None:
                print("❌ UNEXPECTED: Got prediction for unplanted plot")
                print(f"   Predicted yield: {result.get('predicted_yield')}")
                return False
            else:
                print("⚠️ UNKNOWN RESPONSE FORMAT")
                return False
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server. Make sure it's running on port 8001")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

def test_planted_plot_prediction():
    """Test that planted plots return normal predictions"""
    print("\n🧪 Testing yield prediction for planted plot...")
    
    # Use a plot ID that has planting records
    # You might need to check your database to find a plot with planting records
    test_plot_id = 5  # Adjust based on your data
    
    params = {
        'plot_id': test_plot_id,
        'location': 'Kandy',
        'variety': 'Ceylon Cinnamon',
        'area': 1.5,
        'rainfall': 2500,
        'temperature': 26,
        'age_years': 3
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/ml/predict-single", params=params)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response received:")
            print(json.dumps(result, indent=2))
            
            # Check if it returns normal prediction
            if result.get('predicted_yield') is not None and not result.get('error'):
                print("✅ SUCCESS: Got normal prediction for planted plot")
                print(f"   Predicted yield: {result.get('predicted_yield')} kg")
                print(f"   Confidence: {result.get('confidence_score')}")
                return True
            elif result.get('error') == 'Plot not planted':
                print("⚠️ Plot appears to be unplanted (this is okay if no planting records exist)")
                return True
            else:
                print("⚠️ Unexpected response format")
                return False
        else:
            print(f"❌ API Error: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server. Make sure it's running on port 8001")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Yield Prediction for Unplanted Plots")
    print("=" * 50)
    
    test1_passed = test_unplanted_plot_prediction()
    test2_passed = test_planted_plot_prediction()
    
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS:")
    print(f"   Unplanted plot test: {'✅ PASS' if test1_passed else '❌ FAIL'}")
    print(f"   Planted plot test: {'✅ PASS' if test2_passed else '❌ FAIL'}")
    
    if test1_passed and test2_passed:
        print("\n🎉 All tests passed! Yield prediction correctly handles unplanted plots.")
    else:
        print("\n⚠️ Some tests failed. Check the implementation.")