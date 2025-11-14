#!/usr/bin/env python3
"""
Real Fertilizer Training Script - Complete Training Pipeline
"""

import os
import sys
import cv2
import numpy as np
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Tuple
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    print("Real Fertilizer Deficiency Detection Training")
    print("=" * 60)

    # Dataset configuration (robust to current working directory)
    script_dir = Path(__file__).resolve().parent
    dataset_path = script_dir / "uploads" / "fertilizer_analysis" / "real_dataset"
    models_path = script_dir / "models" / "fertilizer_real"
    models_path.mkdir(parents=True, exist_ok=True)

    # Classes mapping
    classes = {
        'healthy': 0,
        'nitrogen_deficiency': 1, 
        'potasium_deficiency': 2
    }

    class_names = list(classes.keys())
    num_classes = len(classes)
    img_size = (224, 224)

    print(f"Dataset path: {dataset_path}")
    print(f"Models path: {models_path}")
    print(f"Classes: {class_names}")

    # Check if dataset exists
    if not dataset_path.exists():
        print(f"ERROR: Dataset path does not exist: {dataset_path}")
        print("Please ensure images are in the correct folder structure")
        return

    print("\nLoading Real Images")
    print("=" * 40)

    images = []
    labels = []
    file_paths = []

    for class_name, class_id in classes.items():
        class_path = dataset_path / class_name
        
        if not class_path.exists():
            logger.warning(f"Class directory not found: {class_path}")
            continue
            
        image_files = list(class_path.glob("*.jpg")) + list(class_path.glob("*.jpeg")) + list(class_path.glob("*.png"))
        
        print(f"{class_name}: {len(image_files)} images")
        
        for img_path in image_files:
            try:
                # Load image
                img = cv2.imread(str(img_path))
                if img is None:
                    print(f"Could not load image: {img_path}")
                    continue
                    
                img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                # Resize image
                img = cv2.resize(img, img_size)
                
                # Normalize pixel values
                img = img.astype(np.float32) / 255.0
                
                images.append(img)
                labels.append(class_id)
                file_paths.append(str(img_path))
                
            except Exception as e:
                logger.error(f"Error loading {img_path}: {e}")

    images = np.array(images)
    labels = np.array(labels)

    print(f"\nLoaded {len(images)} total images")
    print(f"Image shape: {images.shape}")
    print("Label distribution:")

    for class_name, class_id in classes.items():
        count = np.sum(labels == class_id)
        percentage = (count / len(labels)) * 100 if len(labels) > 0 else 0
        print(f"   {class_name}: {count} images ({percentage:.1f}%)")

    if len(images) == 0:
        print("ERROR: No images found! Please check your dataset path.")
        return

    print("SUCCESS: Image loading successful!")

    # Extract features for Random Forest
    print("\nExtracting Features for Random Forest...")
    print("=" * 40)

    features = []

    def color_proportion(img_rgb, lower, upper):
        """Calculate proportion of pixels within a color range in HSV."""
        img_hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        mask = cv2.inRange(img_hsv, lower, upper)
        return np.sum(mask > 0) / mask.size

    # Define HSV color ranges for yellow, brown/orange, green
    yellow_lower = np.array([20, 100, 100])
    yellow_upper = np.array([35, 255, 255])
    brown_lower = np.array([10, 100, 20])
    brown_upper = np.array([20, 255, 200])
    orange_lower = np.array([10, 150, 150])
    orange_upper = np.array([25, 255, 255])
    green_lower = np.array([35, 50, 50])
    green_upper = np.array([85, 255, 255])

    for i, img in enumerate(images):
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

        # Proportion of yellow, brown/orange, green pixels
        yellow_prop = color_proportion(img_uint8, yellow_lower, yellow_upper)
        brown_prop = color_proportion(img_uint8, brown_lower, brown_upper)
        orange_prop = color_proportion(img_uint8, orange_lower, orange_upper)
        green_prop = color_proportion(img_uint8, green_lower, green_upper)
        color_specific_features = [yellow_prop, brown_prop, orange_prop, green_prop]

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
        img_features = np.concatenate([
            color_features,
            color_specific_features,
            texture_features,
            hist_features
        ])

        features.append(img_features)

    features_array = np.array(features)
    print(f"Feature extraction complete")
    print(f"Feature matrix shape: {features_array.shape}")

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        features_array, labels, test_size=0.3, random_state=42, stratify=labels
    )

    print(f"Train samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Random Forest model
    print("\nTraining Random Forest...")
    print("=" * 40)
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1
    )

    start_time = datetime.now()
    model.fit(X_train_scaled, y_train)
    training_time = (datetime.now() - start_time).total_seconds()

    # Evaluate
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"Training completed in {training_time:.2f} seconds")
    print(f"Accuracy: {accuracy:.4f}")

    # Detailed classification report (handle missing classes)
    print("\nClassification Report:")
    all_label_ids = list(classes.values())
    report = classification_report(
        y_test,
        y_pred,
        labels=all_label_ids,
        target_names=class_names,
        zero_division=0
    )
    print(report)

    # Confusion matrix with full label set
    cm = confusion_matrix(y_test, y_pred, labels=all_label_ids)
    print("\nConfusion Matrix:")
    print(cm)

    # Save model and scaler
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_path = models_path / f"fertilizer_rf_real_{timestamp}.joblib"
    scaler_path = models_path / f"fertilizer_rf_scaler_real_{timestamp}.joblib"

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    print(f"\nModel saved: {model_path}")
    print(f"Scaler saved: {scaler_path}")

    # Create fertilizer recommendations
    print("\nCreating Fertilizer Recommendations...")
    print("=" * 40)
    
    recommendations = {
        'healthy': {
            'status': 'Healthy Plant',
            'recommendations': [
                {
                    'fertilizer': 'Balanced NPK (10-10-10)',
                    'application_rate': '2-3 g per plant',
                    'frequency': 'Monthly',
                    'timing': 'Early morning',
                    'cost_estimate': '$5-8 per kg',
                    'instructions': 'Apply around root zone, water thoroughly after application'
                }
            ],
            'additional_tips': [
                'Continue regular monitoring',
                'Maintain proper watering schedule',
                'Ensure good drainage'
            ]
        },
        'nitrogen_deficiency': {
            'status': 'Nitrogen Deficiency Detected',
            'symptoms': ['Yellowing of older leaves', 'Stunted growth', 'Pale green coloration'],
            'recommendations': [
                {
                    'fertilizer': 'Urea (46-0-0)',
                    'application_rate': '3-4 g per plant',
                    'frequency': 'Every 2 weeks for 6 weeks',
                    'timing': 'Early morning or late evening',
                    'cost_estimate': '$3-5 per kg',
                    'instructions': 'Dissolve in water and apply to soil around plant base'
                },
                {
                    'fertilizer': 'Ammonium Sulfate (21-0-0)',
                    'application_rate': '5-6 g per plant',
                    'frequency': 'Every 2 weeks for 6 weeks',
                    'timing': 'Early morning',
                    'cost_estimate': '$4-6 per kg',
                    'instructions': 'Apply granules around root zone and water well'
                }
            ],
            'organic_alternatives': [
                {
                    'fertilizer': 'Compost Tea',
                    'application_rate': '250ml per plant',
                    'frequency': 'Weekly',
                    'instructions': 'Pour around base of plant, avoid leaves'
                }
            ],
            'expected_recovery': '2-4 weeks with proper treatment'
        },
        'potassium_deficiency': {
            'status': 'Potassium Deficiency Detected',
            'symptoms': ['Brown edges on leaves', 'Leaf tip and margin burn', 'Weak stems and poor drought resistance'],
            'recommendations': [
                {
                    'fertilizer': 'Muriate of Potash (0-0-60)',
                    'application_rate': '3-4 g per plant',
                    'frequency': 'Every 3 weeks for 9 weeks',
                    'timing': 'Morning application',
                    'cost_estimate': '$4-7 per kg',
                    'instructions': 'Mix with soil around root zone, water thoroughly after application'
                },
                {
                    'fertilizer': 'Sulfate of Potash (0-0-50)',
                    'application_rate': '3-5 g per plant',
                    'frequency': 'Monthly for 3 months',
                    'timing': 'Any time of day',
                    'cost_estimate': '$6-10 per kg',
                    'instructions': 'Apply granules around root zone and water well'
                }
            ],
            'organic_alternatives': [
                {
                    'fertilizer': 'Wood Ash or Kelp Meal',
                    'application_rate': '5-7 g per plant',
                    'frequency': 'Every 2 months',
                    'instructions': 'Mix thoroughly with compost before applying'
                }
            ],
            'expected_recovery': '2-4 weeks with proper treatment'
        }
    }

    # Save recommendations
    recommendations_path = models_path / 'fertilizer_recommendations.json'
    with open(recommendations_path, 'w') as f:
        json.dump(recommendations, f, indent=2)
        
    print(f"Fertilizer recommendations saved: {recommendations_path}")

    # Create training summary
    training_summary = {
        'training_timestamp': datetime.now().isoformat(),
        'dataset_info': {
            'total_images': len(images),
            'classes': class_names,
            'class_distribution': {
                name: int(np.sum(labels == idx)) 
                for name, idx in classes.items()
            }
        },
        'random_forest_results': {
            'model_path': str(model_path),
            'scaler_path': str(scaler_path),
            'accuracy': float(accuracy),
            'training_time': training_time,
            'classification_report': report,
            'confusion_matrix': cm.tolist()
        },
        'recommendations_path': str(recommendations_path)
    }

    summary_path = models_path / f'training_summary_{timestamp}.json'
    with open(summary_path, 'w') as f:
        json.dump(training_summary, f, indent=2)
        
    print(f"Training summary saved: {summary_path}")

    print("\nTraining Complete!")
    print("=" * 60)
    print("SUCCESS: Random Forest model trained and saved")
    print("SUCCESS: Fertilizer recommendations created")
    print("SUCCESS: Training summary generated")
    print("\nYour model is now ready to detect deficiencies and recommend fertilizers!")

    # Test prediction on a sample
    if len(X_test_scaled) > 0:
        print("\nTesting model with a sample:")
        sample_prediction = model.predict(X_test_scaled[0:1])
        sample_proba = model.predict_proba(X_test_scaled[0:1])
        predicted_class = class_names[sample_prediction[0]]
        confidence = np.max(sample_proba[0]) * 100
        
        print(f"Sample prediction: {predicted_class} (Confidence: {confidence:.1f}%)")

if __name__ == "__main__":
    main()
