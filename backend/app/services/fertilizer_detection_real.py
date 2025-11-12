"""
Production-Ready Fertilizer Detection API Integration
Connects the trained real-data model to FastAPI endpoints
"""

import os
import cv2
import numpy as np
import json
import joblib
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from fastapi import HTTPException
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(_name_)

class FertilizerDetectionService:
    """Production service for fertilizer deficiency detection"""
    
    def _init_(self):
        self.model = None
        self.scaler = None
        self.recommendations = None
        self.classes = ['healthy', 'nitrogen_deficiency', 'phosphorus_deficiency']
        self.load_model()
    
    def load_model(self):
        """Load the trained model, scaler, and recommendations"""
        try:
            models_path = Path("models/fertilizer_real")
            
            # Find latest model files
            model_files = list(models_path.glob("fertilizer_rf_real_*.joblib"))
            scaler_files = list(models_path.glob("fertilizer_rf_scaler_real_*.joblib"))
            
            if not model_files or not scaler_files:
                raise FileNotFoundError("No trained model found. Please run training first.")
            
            # Get latest files (by timestamp in filename)
            latest_model_file = max(model_files, key=lambda x: x.stem.split('_')[-1])
            latest_scaler_file = max(scaler_files, key=lambda x: x.stem.split('_')[-1])
            
            # Load model and scaler
            self.model = joblib.load(latest_model_file)
            self.scaler = joblib.load(latest_scaler_file)
            
            # Load recommendations
            recommendations_path = models_path / "fertilizer_recommendations.json"
            with open(recommendations_path, 'r') as f:
                self.recommendations = json.load(f)
            
            logger.info(f"Successfully loaded model: {latest_model_file}")
            logger.info(f"Successfully loaded scaler: {latest_scaler_file}")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise HTTPException(status_code=500, detail=f"Model loading failed: {e}")
    
    def is_model_available(self) -> bool:
        """Check if model and scaler are loaded and available"""
        return (self.model is not None and 
                self.scaler is not None and 
                self.recommendations is not None)
    
    def extract_features_from_image(self, image_data):
        """Extract features from image data"""
        try:
            # Decode image
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("Unable to decode image")
            
            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = cv2.resize(img, (224, 224))
            img = img.astype(np.float32) / 255.0
            
            # Convert to uint8 for feature extraction
            img_uint8 = (img * 255).astype(np.uint8)
            
            # Color statistics
            color_features = []
            for channel in range(3):  # RGB channels
                channel_data = img_uint8[:, :, channel]
                color_features.extend([
                    np.mean(channel_data),
                    np.std(channel_data),
                    np.min(channel_data),
                    np.max(channel_data),
                    np.median(channel_data)
                ])
            
            # Convert to grayscale for texture features
            gray = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2GRAY)
            
            # Simple texture measures
            texture_features = [
                np.var(gray),  # Variance
                cv2.Laplacian(gray, cv2.CV_64F).var(),  # Edge variance
            ]
            
            # Histogram features
            hist = cv2.calcHist([gray], [0], None, [16], [0, 256])
            hist_features = hist.flatten() / np.sum(hist)  # Normalize
            
            # Combine all features
            features = np.concatenate([
                color_features,
                texture_features,
                hist_features
            ])
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            raise HTTPException(status_code=400, detail=f"Feature extraction failed: {e}")
    
    def predict_deficiency(self, image_data):
        """Predict deficiency type from image data"""
        try:
            # Extract features
            features = self.extract_features_from_image(image_data)
            features = features.reshape(1, -1)  # Reshape for single prediction
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Make prediction
            prediction = self.model.predict(features_scaled)[0]
            probabilities = self.model.predict_proba(features_scaled)[0]
            
            predicted_class = self.classes[prediction]
            confidence = probabilities[prediction] * 100
            
            # Get all probabilities
            all_probs = {}
            for i, cls in enumerate(self.classes):
                all_probs[cls] = round(probabilities[i] * 100, 2)
            
            return {
                'predicted_class': predicted_class,
                'confidence': round(confidence, 2),
                'probabilities': all_probs
            }
            
        except Exception as e:
            logger.error(f"Error during prediction: {e}")
            raise HTTPException(status_code=500, detail=f"Prediction failed: {e}")
    
    def get_recommendations(self, deficiency_type):
        """Get fertilizer recommendations for detected deficiency"""
        try:
            if deficiency_type not in self.recommendations:
                raise ValueError(f"No recommendations found for: {deficiency_type}")
            
            # Return just the recommendations array, not the full object
            deficiency_data = self.recommendations[deficiency_type]
            return deficiency_data.get('recommendations', [])
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            raise HTTPException(status_code=404, detail=f"Recommendations not found: {e}")
    
    def analyze_image_complete(self, image_data):
        """Complete analysis: prediction + recommendations"""
        try:
            # Get prediction
            prediction_result = self.predict_deficiency(image_data)
            
            # Get recommendations
            recommendations = self.get_recommendations(prediction_result['predicted_class'])
            
            # Combine results
            result = {
                'analysis': prediction_result,
                'recommendations': recommendations,
                'model_info': {
                    'model_type': 'Random Forest',
                    'training_date': '2024-11-08',
                    'dataset_size': '30 real cinnamon leaf images'
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in complete analysis: {e}")
            raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

# Global service instance
fertilizer_service = FertilizerDetectionService()

def get_fertilizer_service():
    """Get the global fertilizer service instance"""
    return fertilizer_service

# Helper functions for FastAPI integration
async def detect_fertilizer_deficiency(image_data: bytes):
    """
    Main API function for fertilizer deficiency detection
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Complete analysis with predictions and recommendations
    """
    service = get_fertilizer_service()
    return service.analyze_image_complete(image_data)

async def predict_only(image_data: bytes):
    """
    API function for prediction only (no recommendations)
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Prediction results only
    """
    service = get_fertilizer_service()
    return service.predict_deficiency(image_data)

async def get_recommendations_only(deficiency_type: str):
    """
    API function to get recommendations for a specific deficiency
    
    Args:
        deficiency_type: Type of deficiency ('healthy', 'nitrogen_deficiency', 'phosphorus_deficiency')
        
    Returns:
        Fertilizer recommendations
    """
    service = get_fertilizer_service()
    return service.get_recommendations(deficiency_type)

if _name_ == "_main_":
    # Test the service
    print("Testing Fertilizer Detection Service...")
    
    try:
        service = FertilizerDetectionService()
        print("✅ Service initialized successfully")
        
        # Test with a sample image
        test_image_path = Path("uploads/fertilizer_analysis/real_dataset/healthy/Healthy Leaf001.jpg")
        
        if test_image_path.exists():
            with open(test_image_path, 'rb') as f:
                image_data = f.read()
            
            result = service.analyze_image_complete(image_data)
            print("✅ Sample prediction successful")
            print(f"Predicted: {result['analysis']['predicted_class']}")
            print(f"Confidence: {result['analysis']['confidence']}%")
        else:
            print("⚠ Test image not found, but service is ready")
            
    except Exception as e:
        print(f"❌ Service test failed: {e}")

