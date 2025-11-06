import requests
import json

# Upload CSV and train model
def upload_and_train():
    # 1. Upload CSV
    print("📤 Uploading dataset...")
    
    csv_path = r'C:\Users\Udari\Desktop\cinnamon research\cinogrow\backend\yield_dataset_template.csv'
    with open(csv_path, 'rb') as f:
        response = requests.post(
            'http://192.168.53.65:8001/api/v1/yield-dataset/bulk-upload',
            files={'file': f}
        )
    
    # 2. Train model
    print("\n🤖 Training model...")
    response = requests.post('http://192.168.53.65:8001/api/v1/ml/train-model')
    print(f"Training: {response.json()}")
    
    # 3. Test prediction
    print("\n🎯 Testing prediction...")
    prediction_url = 'http://192.168.53.65:8001/api/v1/ml/predict-single'
    test_params = {
        "location": "Matara",
        "variety": "Ceylon Cinnamon", 
        "area": 2.0,
        "rainfall": 2500,
        "temperature": 26,
        "age_years": 5
    }
    
    try:
        response = requests.post(prediction_url, params=test_params)
        response.raise_for_status()  # Raise an exception for bad status codes
        result = response.json()
        print(f"✅ Prediction successful:")
        print(f"   Predicted Yield: {result.get('predicted_yield', 'N/A')} kg")
        print(f"   Confidence Score: {result.get('confidence_score', 'N/A')}")
        print(f"   Model Version: {result.get('model_version', 'N/A')}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {e}")
    except Exception as e:
        print(f"❌ Prediction error: {e}")

if __name__ == "__main__":
    upload_and_train()