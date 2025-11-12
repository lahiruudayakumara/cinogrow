"""
Real Trained Feature-Based Fertilizer Detection Service
Uses the model trained on your actual uploaded images
"""

import joblib
import numpy as np
from typing import Dict, List, Any
import logging
from pathlib import Path

logger = logging.getLogger(_name_)

class RealTrainedFeatureService:
    """Service using the real trained model from your images"""
    
    def _init_(self, model_dir: str = "models/fertilizer"):
        self.model_dir = Path(model_dir)
        self.model = None
        self.label_encoder = None
        self.feature_names = []
        self.load_model()
    
    def load_model(self):
        """Load the latest trained model"""
        try:
            # Find the latest model files
            model_files = list(self.model_dir.glob("feature_based_model_*.joblib"))
            encoder_files = list(self.model_dir.glob("label_encoder_*.joblib"))
            metadata_files = list(self.model_dir.glob("model_metadata_*.json"))
            
            if not model_files or not encoder_files:
                raise FileNotFoundError("No trained model files found")
            
            # Get the latest files
            latest_model = max(model_files, key=lambda x: x.stat().st_mtime)
            latest_encoder = max(encoder_files, key=lambda x: x.stat().st_mtime)
            
            # Load model and encoder
            self.model = joblib.load(latest_model)
            self.label_encoder = joblib.load(latest_encoder)
            
            # Load metadata for feature names
            if metadata_files:
                latest_metadata = max(metadata_files, key=lambda x: x.stat().st_mtime)
                import json
                with open(latest_metadata, 'r') as f:
                    metadata = json.load(f)
                    self.feature_names = metadata.get('feature_names', [])
            
            logger.info(f"Successfully loaded trained model: {latest_model.name}")
            logger.info(f"Model classes: {list(self.label_encoder.classes_)}")
            
        except Exception as e:
            logger.error(f"Failed to load trained model: {e}")
            raise
    
    def extract_features_from_metadata(self, leaf_metadata: Dict[str, Any]) -> np.ndarray:
        """Convert leaf metadata to the feature vector format expected by the model"""
        
        # Extract color distribution
        color_dist = leaf_metadata.get('leafFeatures', {}).get('colorDistribution', {})
        quality = leaf_metadata.get('quality', {})
        visible_defects = leaf_metadata.get('leafFeatures', {}).get('visibleDefects', [])
        leaf_shape = leaf_metadata.get('leafFeatures', {}).get('leafShape', 'unknown')
        
        # Build feature vector in the same order as training
        features = []
        
        # Color percentages
        features.append(color_dist.get('green', 0))
        features.append(color_dist.get('yellow', 0))
        features.append(color_dist.get('brown', 0))
        features.append(color_dist.get('red', 0))
        features.append(color_dist.get('other', 0))
        
        # Quality metrics
        features.append(quality.get('sharpness', 50))
        features.append(quality.get('brightness', 50))
        features.append(quality.get('contrast', 50))
        features.append(quality.get('colorfulness', 50))
        
        # Leaf area (simplified)
        features.append(leaf_metadata.get('leafFeatures', {}).get('estimatedLeafArea', 100))
        
        # Defect indicators (binary)
        features.append(1 if 'yellowing' in visible_defects else 0)
        features.append(1 if 'brown_spots' in visible_defects else 0)
        features.append(1 if 'leaf_spots' in visible_defects else 0)
        features.append(1 if 'purple_discoloration' in visible_defects else 0)
        
        # Leaf shape encoding
        shape_encoding = {'round': 1, 'oval': 2, 'elongated': 3, 'unknown': 0}
        features.append(shape_encoding.get(leaf_shape, 0))
        
        return np.array(features).reshape(1, -1)
    
    def predict_deficiency(self, leaf_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Predict deficiency using the real trained model"""
        
        if not self.model or not self.label_encoder:
            raise RuntimeError("Model not loaded")
        
        try:
            # Convert metadata to feature vector
            features = self.extract_features_from_metadata(leaf_metadata)
            
            # Get prediction
            prediction = self.model.predict(features)[0]
            probabilities = self.model.predict_proba(features)[0]
            
            # Get class labels
            classes = self.label_encoder.classes_
            
            # Build result
            predicted_class = self.label_encoder.inverse_transform([prediction])[0]
            confidence = float(max(probabilities) * 100)
            
            # Create probability dict
            prob_dict = {}
            for i, class_name in enumerate(classes):
                prob_dict[class_name] = float(probabilities[i] * 100)
            
            # Determine severity based on confidence
            if confidence > 85:
                severity = "high"
            elif confidence > 65:
                severity = "moderate"
            else:
                severity = "low"
            
            result = {
                "predicted_class": predicted_class,
                "confidence": confidence,
                "probabilities": prob_dict,
                "severity": severity,
                "is_healthy": predicted_class == "healthy",
                "analysis_method": "real_trained_model",
                "model_features": {
                    "feature_vector": features.tolist()[0],
                    "feature_names": self.feature_names
                }
            }
            
            logger.info(f"Real model prediction: {predicted_class} ({confidence:.1f}% confidence)")
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise

def get_real_trained_service():
    """Get the real trained service instance"""
    return RealTrainedFeatureService()

# Test the service
if _name_ == "_main_":
    try:
        service = get_real_trained_service()
        
        # Test with sample metadata
        test_metadata = {
            'leafFeatures': {
                'colorDistribution': {'green': 70, 'yellow': 20, 'brown': 5, 'red': 2, 'other': 3},
                'visibleDefects': ['yellowing'],
                'leafShape': 'oval',
                'estimatedLeafArea': 150
            },
            'quality': {
                'brightness': 75,
                'sharpness': 80,
                'contrast': 70,
                'colorfulness': 85
            }
        }
        
        result = service.predict_deficiency(test_metadata)
        print("✅ Real trained model test successful!")
        print(f"Prediction: {result['predicted_class']}")
        print(f"Confidence: {result['confidence']:.1f}%")
        print(f"Probabilities: {result['probabilities']}")
        
    except Exception as e:
        print(f"❌ Service test failed: {e}")
