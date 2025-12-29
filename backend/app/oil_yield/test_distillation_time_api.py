# Test script for distillation time prediction API
import requests
import json

# API endpoint
url = "http://localhost:8000/api/v1/oil_yield/predict_distillation_time"

# Test data
test_data = {
    "plant_part": "Leaves & Twigs",
    "cinnamon_type": "Sri Gamunu",
    "distillation_capacity_liters": 300.0
}

print("🧪 Testing Distillation Time Prediction API")
print(f"📤 Request URL: {url}")
print(f"📤 Request Body: {json.dumps(test_data, indent=2)}")
print()

try:
    response = requests.post(url, json=test_data)
    print(f"📥 Response Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ SUCCESS!")
        print(f"📊 Predicted Distillation Time: {result['predicted_time_hours']} hours")
        print(f"📋 Input Summary: {json.dumps(result['input_summary'], indent=2)}")
    else:
        print(f"❌ ERROR: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

# Test with different parameters
print("\n" + "="*60)
print("Testing with Featherings & Chips, Sri Wijaya, 450L")

test_data2 = {
    "plant_part": "Featherings & Chips",
    "cinnamon_type": "Sri Wijaya",
    "distillation_capacity_liters": 450.0
}

try:
    response = requests.post(url, json=test_data2)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Predicted Time: {result['predicted_time_hours']} hours")
    else:
        print(f"❌ ERROR: {response.status_code}")
except Exception as e:
    print(f"❌ Error: {str(e)}")
