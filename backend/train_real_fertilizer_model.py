#!/usr/bin/env python3
"""
Real Fertilizer Training Script
Trains ML models using actual cinnamon leaf images for deficiency detection
Uses images from uploads/fertilizer_analysis/real_dataset/
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
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# Database imports
from sqlmodel import Session, create_engine, SQLModel
from app.models.fertilizer import MLTrainingRun, FertilizerRecommendationDB, generate_training_id
from app.database import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RealFertilizerTrainer:
    """
    Trains fertilizer deficiency detection models using real cinnamon leaf images
    """
    
    def __init__(self, dataset_path: str = "uploads/fertilizer_analysis/real_dataset"):
        self.dataset_path = Path(dataset_path)
        self.models_path = Path("models/fertilizer_real")
        self.models_path.mkdir(parents=True, exist_ok=True)
        
        # Database setup
        try:
            self.engine = engine
            # Create tables if they don't exist
            SQLModel.metadata.create_all(self.engine)
            self.db_enabled = True
            print("✅ Database connection established")
        except Exception as e:
            logger.warning(f"Database connection failed: {e}. Training will continue without database storage.")
            self.db_enabled = False
        
        # Classes mapping
        self.classes = {
            'healthy': 0,
            'nitrogen_deficiency': 1,
            'potasium_deficiency': 2
        }
        
        self.class_names = list(self.classes.keys())
        self.num_classes = len(self.classes)
        
        # Image preprocessing parameters
        self.img_size = (224, 224)
        self.batch_size = 4  # Small batch size due to limited data
        
        print("🌱 Real Fertilizer Deficiency Detection Training")
        print("=" * 60)
        print(f"📁 Dataset path: {self.dataset_path}")
        print(f"💾 Models path: {self.models_path}")
        print(f"🏷  Classes: {self.class_names}")
        print(f"💾 Database storage: {'Enabled' if self.db_enabled else 'Disabled'}")
        
    def load_images(self) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Load and preprocess images from the dataset
        
        Returns:
            Tuple of (images, labels, file_paths)
        """
        print("\n📸 Loading Real Images")
        print("=" * 40)
        
        images = []
        labels = []
        file_paths = []
        
        for class_name, class_id in self.classes.items():
            class_path = self.dataset_path / class_name
            
            if not class_path.exists():
                logger.warning(f"Class directory not found: {class_path}")
                continue
                
            image_files = list(class_path.glob("*.jpg")) + list(class_path.glob("*.jpeg")) + list(class_path.glob("*.png")) + list(class_path.glob("*.JPG"))
            
            print(f"📂 {class_name}: {len(image_files)} images")
            
            for img_path in image_files:
                try:
                    # Load image
                    img = cv2.imread(str(img_path))
                    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    
                    # Resize image
                    img = cv2.resize(img, self.img_size)
                    
                    # Normalize pixel values
                    img = img.astype(np.float32) / 255.0
                    
                    images.append(img)
                    labels.append(class_id)
                    file_paths.append(str(img_path))
                    
                except Exception as e:
                    logger.error(f"Error loading {img_path}: {e}")
                    
        images = np.array(images)
        labels = np.array(labels)
        
        print(f"\n✅ Loaded {len(images)} total images")
        print(f"📊 Image shape: {images.shape}")
        print(f"🏷  Label distribution:")
        
        for class_name, class_id in self.classes.items():
            count = np.sum(labels == class_id)
            percentage = (count / len(labels)) * 100
            print(f"   {class_name}: {count} images ({percentage:.1f}%)")
            
        return images, labels, file_paths
    
    def extract_features(self, images: np.ndarray) -> np.ndarray:
        """
        Extract handcrafted features from images for traditional ML models
        
        Args:
            images: Array of images
            
        Returns:
            Feature matrix
        """
        print("\n🔍 Extracting Features")
        print("=" * 40)
        
        features = []
        
        for i, img in enumerate(images):
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
            
            # Texture features using Local Binary Pattern approximation
            texture_features = []
            
            # Simple texture measures
            texture_features.extend([
                np.var(gray),  # Variance
                cv2.Laplacian(gray, cv2.CV_64F).var(),  # Edge variance
            ])
            
            # Histogram features
            hist = cv2.calcHist([gray], [0], None, [16], [0, 256])
            hist_features = hist.flatten() / np.sum(hist)  # Normalize
            
            # Combine all features
            img_features = np.concatenate([
                color_features,
                texture_features,
                hist_features
            ])
            
            features.append(img_features)
            
            if (i + 1) % 5 == 0:
                print(f"   Processed {i + 1}/{len(images)} images")
                
        features_array = np.array(features)
        
        print(f"✅ Feature extraction complete")
        print(f"📊 Feature matrix shape: {features_array.shape}")
        
        return features_array
    
    def train_random_forest(self, features: np.ndarray, labels: np.ndarray) -> Dict[str, Any]:
        """
        Train Random Forest model
        
        Args:
            features: Feature matrix
            labels: Target labels
            
        Returns:
            Training results
        """
        print("\n🌳 Training Random Forest Model")
        print("=" * 40)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            features, labels, test_size=0.3, random_state=42, stratify=labels
        )
        
        print(f"📊 Train samples: {len(X_train)}")
        print(f"📊 Test samples: {len(X_test)}")
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        print("🚀 Training Random Forest...")
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
        
        print(f"✅ Training completed in {training_time:.2f} seconds")
        print(f"🎯 Accuracy: {accuracy:.4f}")
        
        # Detailed classification report
        print("\n📊 Classification Report:")
        report = classification_report(y_test, y_pred, target_names=self.class_names)
        print(report)
        
        # Save model and scaler
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        model_path = self.models_path / f"fertilizer_rf_real_{timestamp}.joblib"
        scaler_path = self.models_path / f"fertilizer_rf_scaler_real_{timestamp}.joblib"
        
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        
        print(f"💾 Model saved: {model_path}")
        print(f"💾 Scaler saved: {scaler_path}")
        
        # Save to database
        if self.db_enabled:
            self._save_to_database(
                model_name="fertilizer_rf_real",
                model_type="RandomForest",
                model_path=str(model_path),
                scaler_path=str(scaler_path),
                training_results={
                    'accuracy': accuracy,
                    'training_time': training_time,
                    'classification_report': report,
                    'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
                },
                train_size=len(X_train),
                test_size=len(X_test),
                class_distribution={name: int(np.sum(labels == idx)) for name, idx in self.classes.items()}
            )
        
        return {
            'model_path': str(model_path),
            'scaler_path': str(scaler_path),
            'accuracy': accuracy,
            'training_time': training_time,
            'classification_report': report,
            'confusion_matrix': confusion_matrix(y_test, y_pred).tolist()
        }
    
    def train_cnn(self, images: np.ndarray, labels: np.ndarray) -> Dict[str, Any]:
        """
        Train CNN model
        
        Args:
            images: Image array
            labels: Target labels
            
        Returns:
            Training results
        """
        print("\n🧠 Training CNN Model")
        print("=" * 40)
        
        # Convert labels to categorical
        labels_categorical = keras.utils.to_categorical(labels, self.num_classes)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            images, labels_categorical, test_size=0.3, random_state=42
        )
        
        print(f"📊 Train samples: {len(X_train)}")
        print(f"📊 Test samples: {len(X_test)}")
        
        # Data augmentation
        datagen = keras.preprocessing.image.ImageDataGenerator(
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            zoom_range=0.2,
            fill_mode='nearest'
        )
        
        # Build CNN model
        model = keras.Sequential([
            layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
            layers.MaxPooling2D(2, 2),
            layers.Conv2D(64, (3, 3), activation='relu'),
            layers.MaxPooling2D(2, 2),
            layers.Conv2D(64, (3, 3), activation='relu'),
            layers.GlobalAveragePooling2D(),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.5),
            layers.Dense(self.num_classes, activation='softmax')
        ])
        
        # Compile model
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        print("🏗 Model Architecture:")
        model.summary()
        
        # Train model
        print("🚀 Training CNN...")
        start_time = datetime.now()
        
        # Callbacks
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True
        )
        
        reduce_lr = keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.2,
            patience=5,
            min_lr=0.0001
        )
        
        # Fit model with augmentation
        history = model.fit(
            datagen.flow(X_train, y_train, batch_size=self.batch_size),
            epochs=50,
            validation_data=(X_test, y_test),
            callbacks=[early_stop, reduce_lr],
            verbose=1
        )
        
        training_time = (datetime.now() - start_time).total_seconds()
        
        # Evaluate
        test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
        
        print(f"✅ Training completed in {training_time:.2f} seconds")
        print(f"🎯 Test Accuracy: {test_accuracy:.4f}")
        print(f"📉 Test Loss: {test_loss:.4f}")
        
        # Save model
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        model_path = self.models_path / f"fertilizer_cnn_real_{timestamp}.h5"
        model.save(model_path)
        
        print(f"💾 Model saved: {model_path}")
        
        # Generate predictions for detailed analysis
        y_pred = model.predict(X_test)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_test_classes = np.argmax(y_test, axis=1)
        
        # Classification report
        report = classification_report(y_test_classes, y_pred_classes, target_names=self.class_names)
        print("\n📊 Classification Report:")
        print(report)
        
        # Save to database
        if self.db_enabled:
            self._save_to_database(
                model_name="fertilizer_cnn_real",
                model_type="CNN",
                model_path=str(model_path),
                training_results={
                    'accuracy': test_accuracy,
                    'loss': test_loss,
                    'training_time': training_time,
                    'classification_report': report,
                    'confusion_matrix': confusion_matrix(y_test_classes, y_pred_classes).tolist(),
                    'history': {
                        'accuracy': history.history['accuracy'],
                        'val_accuracy': history.history['val_accuracy'],
                        'loss': history.history['loss'],
                        'val_loss': history.history['val_loss']
                    }
                },
                train_size=len(X_train),
                test_size=len(X_test),
                class_distribution={name: int(np.sum(labels == idx)) for name, idx in self.classes.items()},
                epochs_completed=len(history.history['accuracy'])
            )
        
        return {
            'model_path': str(model_path),
            'accuracy': test_accuracy,
            'loss': test_loss,
            'training_time': training_time,
            'classification_report': report,
            'confusion_matrix': confusion_matrix(y_test_classes, y_pred_classes).tolist(),
            'history': {
                'accuracy': history.history['accuracy'],
                'val_accuracy': history.history['val_accuracy'],
                'loss': history.history['loss'],
                'val_loss': history.history['val_loss']
            }
        }
    
    def create_fertilizer_recommendations(self) -> Dict[str, Dict[str, Any]]:
        """
        Create fertilizer recommendations for each deficiency type
        
        Returns:
            Fertilizer recommendation database
        """
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
        recommendations_path = self.models_path / 'fertilizer_recommendations.json'
        with open(recommendations_path, 'w') as f:
            json.dump(recommendations, f, indent=2)
            
        print(f"💾 Fertilizer recommendations saved: {recommendations_path}")
        
        # Save to database
        if self.db_enabled:
            self._save_recommendations_to_db(recommendations)
        
        return recommendations
    
    def _save_to_database(self, model_name: str, model_type: str, model_path: str, 
                         training_results: Dict[str, Any], train_size: int, test_size: int,
                         class_distribution: Dict[str, int], scaler_path: str = None, 
                         epochs_completed: int = None):
        """
        Save training results to database
        """
        try:
            with Session(self.engine) as session:
                training_id = generate_training_id()
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                
                # Extract metrics
                accuracy = training_results.get('accuracy', 0.0)
                loss = training_results.get('loss')
                training_time = training_results.get('training_time', 0.0)
                
                # Create training run record
                training_run = MLTrainingRun(
                    training_id=training_id,
                    model_name=model_name,
                    model_type=model_type,
                    model_version=timestamp,
                    total_images=train_size + test_size,
                    train_samples=train_size,
                    test_samples=test_size,
                    class_distribution=class_distribution,
                    training_params={
                        'img_size': list(self.img_size),
                        'batch_size': self.batch_size,
                        'model_type': model_type
                    },
                    accuracy=float(accuracy),
                    loss=float(loss) if loss else None,
                    classification_report=training_results.get('classification_report'),
                    confusion_matrix=training_results.get('confusion_matrix', []),
                    training_history=training_results.get('history'),
                    model_file_path=model_path,
                    scaler_file_path=scaler_path,
                    training_duration_seconds=float(training_time),
                    epochs_completed=epochs_completed,
                    status='completed',
                    is_active_model=True,
                    dataset_source='uploads/fertilizer_analysis/real_dataset'
                )
                
                # Mark other models as inactive
                session.query(MLTrainingRun).filter(
                    MLTrainingRun.model_name == model_name,
                    MLTrainingRun.is_active_model == True
                ).update({'is_active_model': False})
                
                session.add(training_run)
                session.commit()
                
                print(f"✅ Training results saved to database (ID: {training_id})")
        except Exception as e:
            logger.error(f"Failed to save to database: {e}")
            print(f"⚠️  Database save failed: {e}")
    
    def _save_recommendations_to_db(self, recommendations: Dict[str, Dict[str, Any]]):
        """
        Save fertilizer recommendations to database
        """
        try:
            with Session(self.engine) as session:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                
                for deficiency_type, rec_data in recommendations.items():
                    # Check if recommendation already exists
                    existing = session.query(FertilizerRecommendationDB).filter(
                        FertilizerRecommendationDB.deficiency_type == deficiency_type,
                        FertilizerRecommendationDB.is_active == True
                    ).first()
                    
                    if existing:
                        # Update existing
                        existing.status = rec_data.get('status', '')
                        existing.symptoms = {'symptoms': rec_data.get('symptoms', [])}
                        existing.recommended_fertilizers = {'recommendations': rec_data.get('recommendations', [])}
                        existing.organic_alternatives = {'alternatives': rec_data.get('organic_alternatives', [])}
                        existing.additional_tips = {'tips': rec_data.get('additional_tips', [])}
                        existing.expected_recovery = rec_data.get('expected_recovery')
                        existing.updated_at = datetime.utcnow()
                        existing.version = timestamp
                    else:
                        # Create new
                        recommendation = FertilizerRecommendationDB(
                            deficiency_type=deficiency_type,
                            status=rec_data.get('status', ''),
                            symptoms={'symptoms': rec_data.get('symptoms', [])},
                            recommended_fertilizers={'recommendations': rec_data.get('recommendations', [])},
                            organic_alternatives={'alternatives': rec_data.get('organic_alternatives', [])},
                            additional_tips={'tips': rec_data.get('additional_tips', [])},
                            expected_recovery=rec_data.get('expected_recovery'),
                            is_active=True,
                            version=timestamp
                        )
                        session.add(recommendation)
                
                session.commit()
                print("✅ Recommendations saved to database")
        except Exception as e:
            logger.error(f"Failed to save recommendations to database: {e}")
            print(f"⚠️  Recommendations database save failed: {e}")
    
    def run_complete_training(self):
        """
        Run the complete training pipeline
        """
        print("🚀 Starting Complete Real Data Training Pipeline")
        print("=" * 60)
        
        # Load images
        images, labels, file_paths = self.load_images()
        
        if len(images) == 0:
            print("❌ No images found! Please check your dataset path.")
            return
        
        # Extract features for Random Forest
        features = self.extract_features(images)
        
        # Train Random Forest
        rf_results = self.train_random_forest(features, labels)
        
        # Train CNN
        cnn_results = self.train_cnn(images, labels)
        
        # Create fertilizer recommendations
        recommendations = self.create_fertilizer_recommendations()
        
        # Save training summary
        training_summary = {
            'training_timestamp': datetime.now().isoformat(),
            'dataset_info': {
                'total_images': len(images),
                'classes': self.class_names,
                'class_distribution': {
                    name: int(np.sum(labels == idx)) 
                    for name, idx in self.classes.items()
                }
            },
            'random_forest_results': rf_results,
            'cnn_results': cnn_results,
            'recommendations_available': True
        }
        
        summary_path = self.models_path / f'training_summary_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(summary_path, 'w') as f:
            json.dump(training_summary, f, indent=2)
            
        print(f"\n💾 Training summary saved: {summary_path}")
        print("\n🎉 Training Complete!")
        print("=" * 60)
        print("✅ Random Forest model trained and saved")
        print("✅ CNN model trained and saved")
        print("✅ Fertilizer recommendations created")
        print("✅ Training summary generated")
        print("\nYour models are now ready to detect deficiencies and recommend fertilizers!")

if __name__ == "__main__":
    trainer = RealFertilizerTrainer()
    trainer.run_complete_training()
