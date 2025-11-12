#!/usr/bin/env python3
"""
Quick backend test to verify the fertilizer detection API is working correctly
"""

import requests
import json
import os
from pathlib import Path

# Backend URL
BASE_URL = "http://192.168.1.2:8000/api/v1/fertilizer-detection"

def test_health():
    """Test the health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/real/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health test failed: {e}")
        return False

def test_recommendations():
    """Test the recommendations endpoint"""
    print("\n💡 Testing recommendations endpoint...")
    try:
        data = {
            'deficiency_type': 'nitrogen_deficiency',
            'severity': 'moderate'
        }
        response = requests.post(f"{BASE_URL}/real/recommendations", data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Recommendations test failed: {e}")
        return False

def test_full_analysis():
    """Test the full analysis with a sample image"""
    print("\n🔬 Testing full analysis...")
    
    # Look for any image file in uploads folder
    uploads_dir = Path("c:\\Users\\Udari\\Desktop\\cinnamon research\\cinogrow\\uploads")
    image_files = []
    
    if uploads_dir.exists():
        for pattern in ['.jpg', '.jpeg', '*.png']:
            image_files.extend(uploads_dir.rglob(pattern))
    
    if not image_files:
        print("⚠ No image files found for testing")
        return False
    
    test_image = image_files[0]
    print(f"📸 Using test image: {test_image}")
    
    try:
        with open(test_image, 'rb') as f:
            files = {'leaf_image': f}
            data = {
                'user_id': 1,
                'save_to_db': False
            }
            response = requests.post(f"{BASE_URL}/real/analyze-leaf", files=files, data=data)
            
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Success: {result.get('success', False)}")
        
        if result.get('success'):
            data = result.get('data', {})
            prediction = data.get('prediction', {})
            print(f"Predicted deficiency: {prediction.get('deficiency_type', 'unknown')}")
            print(f"Confidence: {prediction.get('confidence', 0)}%")
            print(f"Recommendations available: {bool(data.get('recommendations'))}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Analysis test failed: {e}")
        return False

if _name_ == "_main_":
    print("🧪 Backend API Test Suite")
    print("=" * 40)
    
    health_ok = test_health()
    rec_ok = test_recommendations()
    analysis_ok = test_full_analysis()
    
    print("\n📊 Test Results:")
    print(f"Health endpoint: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Recommendations: {'✅ PASS' if rec_ok else '❌ FAIL'}")
    print(f"Full analysis: {'✅ PASS' if analysis_ok else '❌ FAIL'}")
    
    if all([health_ok, rec_ok, analysis_ok]):
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print("\n⚠ Some tests failed. Check backend status.")
