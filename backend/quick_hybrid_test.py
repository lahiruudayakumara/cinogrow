#!/usr/bin/env python3
"""Quick test to see if Hybrid Yield APIs work"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_api(endpoint, method="GET", data=None):
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            response = requests.get(url, timeout=10)
        
        print(f"\n{method} {endpoint}")
        print(f"Status: {response.status_code}")
        
        if response.status_code < 400:
            print(f"✅ Success")
            if hasattr(response, 'json') and response.content:
                try:
                    result = response.json()
                    if isinstance(result, list) and len(result) > 3:
                        print(f"Response: {len(result)} items returned")
                    else:
                        print(f"Response: {json.dumps(result, indent=2)[:200]}...")
                except:
                    print(f"Response: {response.text[:100]}...")
        else:
            print(f"❌ Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("🤖 Testing Hybrid Yield API Endpoints")
    print("=" * 50)
    
    # Test basic health check
    test_api("/health")
    
    # Test farms API (check different paths)
    test_api("/api/v1/yield-weather/farms")
    
    # Test all hybrid yield endpoints with correct paths
    test_api("/api/v1/hybrid-yield/plot/1/latest")
    test_api("/api/v1/hybrid-yield/plot/1/history")  
    test_api("/api/v1/hybrid-yield/plot/1/summary")
    test_api("/api/v1/hybrid-yield/statistics/farm/1")
    
    # Test prediction endpoint (with all required fields)
    prediction_data = {
        "farm_id": 1,
        "plot_id": 1,
        "cinnamon_variety": "Ceylon",
        "tree_age_years": 5,
        "stem_count": 8,
        "avg_stem_diameter_mm": 15.5,
        "plot_area_ha": 2.5,
        "total_trees": 50,  # Add missing field
        "rainfall_mm": 1200,
        "temperature_celsius": 28.5,
        "humidity_percent": 75.0
    }
    
    test_api("/api/v1/hybrid-yield/predict", "POST", prediction_data)
    
    print("\n✅ Test Complete!")

if __name__ == "__main__":
    main()