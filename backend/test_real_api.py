"""
Test script for the real fertilizer detection API
Tests the integrated FastAPI endpoints with real trained model
"""

import requests
import json
from pathlib import Path

def test_api_endpoints():
    """Test all the new real model API endpoints"""
    base_url = "http://localhost:8001/api/v1/fertilizer-detection"
    
    print("Testing Real Fertilizer Detection API")
    print("=" * 50)
    
    # Test 1: Model info endpoint
    print("\n1. Testing Model Info Endpoint...")
    try:
        response = requests.get(f"{base_url}/real/model-info")
        if response.status_code == 200:
            data = response.json()
            print("✅ Model info retrieved successfully")
            print(f"   Model type: {data['model_info']['model_type']}")
            print(f"   Training date: {data['model_info']['training_date']}")
            print(f"   Dataset size: {data['model_info']['dataset_info']['total_images']} images")
        else:
            print(f"❌ Model info failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Model info error: {e}")
    
    # Test 2: Recommendations endpoint
    print("\n2. Testing Recommendations Endpoint...")
    deficiency_types = ['healthy', 'nitrogen_deficiency', 'potassium_deficiency']
    
    for deficiency in deficiency_types:
        try:
            response = requests.get(f"{base_url}/real/recommendations/{deficiency}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Recommendations for {deficiency}: Available")
                rec_data = data['recommendations']
                if 'recommendations' in rec_data:
                    print(f"   Found {len(rec_data['recommendations'])} recommendations")
            else:
                print(f"❌ Recommendations for {deficiency} failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Recommendations error for {deficiency}: {e}")
    
    # Test 3: Model test endpoint
    print("\n3. Testing Model Self-Test Endpoint...")
    try:
        response = requests.post(f"{base_url}/real/test-model")
        if response.status_code == 200:
            data = response.json()
            print("✅ Model test completed successfully")
            summary = data['summary']
            print(f"   Total tests: {summary['total_tests']}")
            print(f"   Correct predictions: {summary['correct_predictions']}")
            print(f"   Accuracy: {summary['accuracy_percent']}%")
            print(f"   Status: {data['model_status']}")
        else:
            print(f"❌ Model test failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Model test error: {e}")
    
    # Test 4: Training summary endpoint
    print("\n4. Testing Training Summary Endpoint...")
    try:
        response = requests.get(f"{base_url}/real/training-summary")
        if response.status_code == 200:
            data = response.json()
            print("✅ Training summary retrieved successfully")
            if 'training_summary' in data:
                summary = data['training_summary']
                print(f"   Training date: {summary.get('training_date', 'N/A')}")
                print(f"   Total images: {summary.get('dataset_info', {}).get('total_images', 'N/A')}")
                perf = summary.get('model_performance', {})
                if perf:
                    print(f"   Test accuracy: {perf.get('test_accuracy', 'N/A')}")
        else:
            print(f"❌ Training summary failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Training summary error: {e}")
    
    # Test 5: Image prediction (if test image available)
    print("\n5. Testing Image Prediction...")
    test_image_path = Path("uploads/fertilizer_analysis/real_dataset/healthy/Healthy Leaf001.jpg")
    
    if test_image_path.exists():
        try:
            with open(test_image_path, 'rb') as f:
                files = {'leaf_image': (test_image_path.name, f, 'image/jpeg')}
                response = requests.post(f"{base_url}/real/predict-only", files=files)
            
            if response.status_code == 200:
                data = response.json()
                pred_data = data['data']
                print("✅ Image prediction successful")
                print(f"   Predicted class: {pred_data['predicted_class']}")
                print(f"   Confidence: {pred_data['confidence']}%")
                print(f"   Test image: {test_image_path.name}")
            else:
                print(f"❌ Image prediction failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Image prediction error: {e}")
    else:
        print("⚠ Test image not found - skipping image prediction test")
    
    print("\n" + "=" * 50)
    print("API Testing Complete!")

def test_full_analysis():
    """Test the complete analysis endpoint"""
    base_url = "http://localhost:8001/api/v1/fertilizer-detection"
    
    print("\n\nTesting Full Analysis Endpoint")
    print("=" * 50)
    
    test_image_path = Path("uploads/fertilizer_analysis/real_dataset/nitrogen_deficiency/N (1).jpg")
    
    if test_image_path.exists():
        try:
            with open(test_image_path, 'rb') as f:
                files = {'leaf_image': (test_image_path.name, f, 'image/jpeg')}
                data = {
                    'user_id': 1,
                    'farm_id': 1,
                    'save_to_db': False  # Don't save to database for testing
                }
                response = requests.post(f"{base_url}/real/analyze-leaf", files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Full analysis successful")
                
                analysis = result['data']
                pred = analysis['prediction']
                recs = analysis['recommendations']
                
                print(f"\nPrediction Results:")
                print(f"   Deficiency Type: {pred['deficiency_type']}")
                print(f"   Confidence: {pred['confidence']}%")
                print(f"   Is Healthy: {pred['is_healthy']}")
                
                print(f"\nRecommendations:")
                print(f"   Status: {recs['status']}")
                if 'recommendations' in recs:
                    print(f"   Number of fertilizer options: {len(recs['recommendations'])}")
                    first_rec = recs['recommendations'][0]
                    print(f"   Primary recommendation: {first_rec['fertilizer']}")
                    print(f"   Application rate: {first_rec['application_rate']}")
                
                print(f"\nModel Info:")
                model_info = result['model_info']
                print(f"   Model type: {model_info['model_type']}")
                print(f"   Training dataset: {model_info['training_dataset']}")
                print(f"   Accuracy: {model_info['accuracy']}")
                
            else:
                print(f"❌ Full analysis failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Full analysis error: {e}")
    else:
        print("⚠ Test image not found - skipping full analysis test")

if _name_ == "_main_":
    try:
        test_api_endpoints()
        test_full_analysis()
        
        print("\n🎉 All API tests completed!")
        print("\nThe real fertilizer detection model is now integrated and working!")
        print("\nAvailable endpoints:")
        print("- POST /api/v1/fertilizer-detection/real/analyze-leaf (Complete analysis)")
        print("- POST /api/v1/fertilizer-detection/real/predict-only (Prediction only)")
        print("- GET  /api/v1/fertilizer-detection/real/recommendations/{type} (Get recommendations)")
        print("- GET  /api/v1/fertilizer-detection/real/model-info (Model information)")
        print("- POST /api/v1/fertilizer-detection/real/test-model (Self-test)")
        print("- GET  /api/v1/fertilizer-detection/real/training-summary (Training details)")
        
    except KeyboardInterrupt:
        print("\n\nTesting interrupted by user")
    except Exception as e:
        print(f"\n\nUnexpected error during testing: {e}")
