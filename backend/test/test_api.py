#!/usr/bin/env python3
"""Test the farm assistance API endpoints"""

import requests
import json
from datetime import datetime

def test_farm_assistance_api():
    """Test farm assistance API endpoints"""
    
    # Test different API URLs
    api_urls = [
        "http://192.168.53.65:8000/api/v1",
        "http://127.0.0.1:8000/api/v1",  
        "http://localhost:8000/api/v1"
    ]
    
    working_url = None
    
    print("🔍 Testing API connectivity...")
    
    for url in api_urls:
        try:
            print(f"\n🌐 Testing: {url}")
            response = requests.get(f"{url}/farm-assistance/health", timeout=5)
            
            if response.status_code == 200:
                print(f"✅ SUCCESS: {url} is working")
                print(f"   Response: {response.json()}")
                working_url = url
                break
            else:
                print(f"❌ FAILED: {response.status_code}")
                
        except requests.exceptions.ConnectError:
            print(f"❌ FAILED: Connection error")
        except requests.exceptions.Timeout:
            print(f"❌ FAILED: Timeout")
        except Exception as e:
            print(f"❌ FAILED: {e}")
    
    if not working_url:
        print("\n❌ No working API URL found!")
        return False
    
    print(f"\n🎯 Using working URL: {working_url}")
    
    # Test creating an activity record
    print("\n🧪 Testing activity record creation...")
    
    test_activity = {
        "user_id": 1,
        "plot_id": 1,
        "activity_name": "Test Activity",
        "activity_date": datetime.utcnow().isoformat(),
        "trigger_condition": "API Test",
        "weather_snapshot": {
            "temperature": 25.0,
            "humidity": 70.0,
            "rainfall": 0.0,
            "wind_speed": 2.0,
            "weather_description": "Clear sky"
        }
    }
    
    try:
        response = requests.post(
            f"{working_url}/farm-assistance/activity-records",
            json=test_activity,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📡 Response status: {response.status_code}")
        print(f"📋 Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print("✅ Activity record created successfully!")
                return True
            else:
                print(f"❌ API returned success=false: {result.get('message', 'Unknown error')}")
        else:
            print(f"❌ HTTP error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    return False

if __name__ == "__main__":
    test_farm_assistance_api()