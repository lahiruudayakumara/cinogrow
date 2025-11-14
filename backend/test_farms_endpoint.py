import requests
import json

# Test the farms endpoint
url = "http://192.168.1.2:8000/api/v1/farms"

print(f"Testing: {url}")
try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {response.headers}")
    print(f"Response Text: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ Success!")
        data = response.json()
        print(f"Number of farms: {len(data)}")
        if data:
            print(f"First farm: {json.dumps(data[0], indent=2)}")
    else:
        print(f"\n❌ Error {response.status_code}")
        try:
            error_detail = response.json()
            print(f"Error details: {json.dumps(error_detail, indent=2)}")
        except:
            print(f"Error text: {response.text}")
            
except Exception as e:
    print(f"❌ Request failed: {e}")
