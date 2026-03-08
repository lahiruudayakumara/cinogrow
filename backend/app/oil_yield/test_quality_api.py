import requests
import json

url = "http://localhost:8000/api/v1/oil_yield/quality"

test_data = {
    "cinnamon_type": "Sri Wijaya",
    "plant_part": "Featherings & Chips",
    "mass_kg": 172.7,
    "plant_age_years": 9,
    "harvest_season": "April",
    "color": "amber",
    "clarity": "slightly_cloudy",
    "aroma": "aromatic"
}

print("🧪 Testing Oil Quality Prediction API")
print(f"📤 Request URL: {url}")
print(f"📤 Request Body: {json.dumps(test_data, indent=2)}")
print()

try:
    response = requests.post(url, json=test_data)
    print(f"📥 Response Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print("✅ SUCCESS!")
        print(f"📊 Predicted Quality Score: {result['predicted_quality_score']}")
        print(f"📋 Input Summary: {json.dumps(result['input_summary'], indent=2)}")
    else:
        print(f"❌ ERROR: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {str(e)}")
