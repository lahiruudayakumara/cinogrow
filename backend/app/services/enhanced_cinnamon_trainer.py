"""
Enhanced Cinnamon Leaf Deficiency Training System
Implements advanced ML training with CNN features, ensemble models, and comprehensive evaluation
"""

import os
import cv2
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Union
import json
import logging
from datetime import datetime
from pathlib import Path
import pickle
import base64
from io import BytesIO

# Core ML imports
try:
    from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
    from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
    from sklearn.svm import SVC
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.decomposition import PCA
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# Advanced feature extraction
try:
    from skimage.feature import greycomatrix, greycoprops, local_binary_pattern
    from skimage.measure import shannon_entropy
    from skimage.filters import gabor
    from skimage.segmentation import slic
    from skimage.color import rgb2lab, lab2rgb
    SKIMAGE_AVAILABLE = True
except ImportError:
    SKIMAGE_AVAILABLE = False

# Deep learning capabilities (optional)
try:
    import tensorflow as tf
    from tensorflow.keras.applications import VGG16, ResNet50
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras.models import Model, Sequential
    from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
    from tensorflow.keras.optimizers import Adam
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False

from app.services.cinnamon_deficiency_detector import CinnamonLeafDeficiencyDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(_name_)


class EnhancedFeatureExtractor:
    """Advanced feature extraction for cinnamon leaf analysis"""
    
    def _init_(self):
        self.target_size = (224, 224)
        
        # Color space transformations for analysis
        self.color_spaces = ['HSV', 'LAB', 'YUV', 'RGB']
        
        # Texture analysis parameters
        self.glcm_distances = [1, 2, 3]
        self.glcm_angles = [0, 45, 90, 135]
        self.lbp_radius = 3
        self.lbp_n_points = 24

    def extract_comprehensive_features(self, image_path: str, mask: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Extract comprehensive features for ML training
        
        Features include:
        - Multi-channel color statistics
        - Advanced texture analysis (GLCM, LBP, Gabor)
        - Shape and morphological features  
        - CNN-based deep features (if available)
        """
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Cannot load image: {image_path}")
        
        # Resize image
        image = cv2.resize(image, self.target_size)
        
        # Generate mask if not provided
        if mask is None:
            mask = self._generate_leaf_mask(image)
        
        features = {}
        
        # Extract color features
        features.update(self._extract_color_features(image, mask))
        
        # Extract texture features
        if SKIMAGE_AVAILABLE:
            features.update(self._extract_advanced_texture_features(image, mask))
        else:
            features.update(self._extract_basic_texture_features(image, mask))
        
        # Extract shape features
        features.update(self._extract_shape_features(mask))
        
        # Extract morphological features
        features.update(self._extract_morphological_features(image, mask))
        
        # Extract CNN features if available
        if TENSORFLOW_AVAILABLE:
            features.update(self._extract_cnn_features(image, mask))
        
        return features

    def _generate_leaf_mask(self, image: np.ndarray) -> np.ndarray:
        """Generate leaf mask using multiple segmentation methods"""
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Multiple green thresholds for better segmentation
        mask1 = cv2.inRange(hsv, (25, 40, 40), (100, 255, 255))  # Primary green
        mask2 = cv2.inRange(hsv, (35, 20, 20), (85, 255, 255))   # Extended green range
        
        # Combine masks
        combined_mask = cv2.bitwise_or(mask1, mask2)
        
        # Morphological operations to clean up mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
        
        return combined_mask

    def _extract_color_features(self, image: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
        """Extract comprehensive color features from multiple color spaces"""
        features = {}
        
        # Convert to different color spaces
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        if SKIMAGE_AVAILABLE:
            lab = rgb2lab(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
        
        # Extract features from each color space
        color_spaces = {
            'hsv': hsv,
            'bgr': image
        }
        
        if SKIMAGE_AVAILABLE:
            color_spaces.update({
                'lab': lab,
                'yuv': yuv
            })
        
        for space_name, color_image in color_spaces.items():
            masked_pixels = color_image[mask > 0]
            
            if len(masked_pixels) == 0:
                continue
            
            for channel in range(color_image.shape[2]):
                channel_data = masked_pixels[:, channel]
                prefix = f"{space_name}_{channel}"
                
                features.update({
                    f"{prefix}_mean": float(np.mean(channel_data)),
                    f"{prefix}_std": float(np.std(channel_data)),
                    f"{prefix}_median": float(np.median(channel_data)),
                    f"{prefix}_min": float(np.min(channel_data)),
                    f"{prefix}_max": float(np.max(channel_data)),
                    f"{prefix}_range": float(np.ptp(channel_data)),
                    f"{prefix}_q25": float(np.percentile(channel_data, 25)),
                    f"{prefix}_q75": float(np.percentile(channel_data, 75)),
                })
        
        # Color distribution features
        hsv_masked = hsv[mask > 0]
        if len(hsv_masked) > 0:
            # Hue distribution analysis
            hue_hist, _ = np.histogram(hsv_masked[:, 0], bins=36, range=(0, 180))
            dominant_hue_bin = np.argmax(hue_hist)
            hue_entropy = shannon_entropy(hue_hist + 1e-10) if SKIMAGE_AVAILABLE else 0
            
            features.update({
                'dominant_hue': float(dominant_hue_bin * 5),  # Convert to degrees
                'hue_entropy': float(hue_entropy),
                'hue_uniformity': float(np.max(hue_hist) / np.sum(hue_hist)),
            })
        
        return features

    def _extract_advanced_texture_features(self, image: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
        """Extract advanced texture features using scikit-image"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)
        
        features = {}
        
        # GLCM features with multiple distances and angles
        for distance in self.glcm_distances:
            for angle_idx, angle in enumerate(self.glcm_angles):
                glcm = greycomatrix(
                    masked_gray, 
                    distances=[distance], 
                    angles=[np.radians(angle)], 
                    levels=256, 
                    symmetric=True, 
                    normed=True
                )
                
                # Calculate GLCM properties
                props = ['contrast', 'dissimilarity', 'homogeneity', 'energy', 'correlation', 'ASM']
                for prop in props:
                    value = greycoprops(glcm, prop)[0, 0]
                    features[f"glcm_{prop}_d{distance}_a{angle}"] = float(value)
        
        # Local Binary Pattern features
        lbp = local_binary_pattern(
            masked_gray, 
            self.lbp_n_points, 
            self.lbp_radius, 
            method='uniform'
        )
        lbp_hist, _ = np.histogram(
            lbp[mask > 0], 
            bins=self.lbp_n_points + 2, 
            range=(0, self.lbp_n_points + 2)
        )
        lbp_hist = lbp_hist.astype(float) / np.sum(lbp_hist)
        
        for i, hist_val in enumerate(lbp_hist):
            features[f"lbp_bin_{i}"] = float(hist_val)
        
        # Gabor filter responses
        gabor_frequencies = [0.1, 0.3, 0.5]
        gabor_angles = [0, 45, 90, 135]
        
        for freq in gabor_frequencies:
            for angle in gabor_angles:
                real, _ = gabor(masked_gray, frequency=freq, theta=np.radians(angle))
                features[f"gabor_f{freq}_a{angle}_mean"] = float(np.mean(real[mask > 0]))
                features[f"gabor_f{freq}_a{angle}_std"] = float(np.std(real[mask > 0]))
        
        return features

    def _extract_basic_texture_features(self, image: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
        """Extract basic texture features when scikit-image is not available"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)
        
        features = {}
        
        # Basic texture measures
        laplacian = cv2.Laplacian(masked_gray, cv2.CV_64F)
        features['laplacian_var'] = float(np.var(laplacian[mask > 0]))
        
        # Sobel gradients
        sobelx = cv2.Sobel(masked_gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(masked_gray, cv2.CV_64F, 0, 1, ksize=3)
        
        features.update({
            'sobel_x_mean': float(np.mean(sobelx[mask > 0])),
            'sobel_x_std': float(np.std(sobelx[mask > 0])),
            'sobel_y_mean': float(np.mean(sobely[mask > 0])),
            'sobel_y_std': float(np.std(sobely[mask > 0])),
        })
        
        return features

    def _extract_shape_features(self, mask: np.ndarray) -> Dict[str, float]:
        """Extract shape features from leaf mask"""
        features = {}
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Use largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Basic shape features
            area = cv2.contourArea(largest_contour)
            perimeter = cv2.arcLength(largest_contour, True)
            
            features.update({
                'contour_area': float(area),
                'contour_perimeter': float(perimeter),
                'circularity': float(4 * np.pi * area / (perimeter ** 2)) if perimeter > 0 else 0,
                'aspect_ratio': self._get_aspect_ratio(largest_contour),
                'extent': self._get_extent(largest_contour),
                'solidity': self._get_solidity(largest_contour),
            })
        
        return features

    def _get_aspect_ratio(self, contour: np.ndarray) -> float:
        """Calculate aspect ratio of contour"""
        _, (w, h), _ = cv2.fitEllipse(contour)
        return float(max(w, h) / min(w, h)) if min(w, h) > 0 else 0

    def _get_extent(self, contour: np.ndarray) -> float:
        """Calculate extent (ratio of contour area to bounding rectangle area)"""
        area = cv2.contourArea(contour)
        x, y, w, h = cv2.boundingRect(contour)
        rect_area = w * h
        return float(area / rect_area) if rect_area > 0 else 0

    def _get_solidity(self, contour: np.ndarray) -> float:
        """Calculate solidity (ratio of contour area to convex hull area)"""
        area = cv2.contourArea(contour)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        return float(area / hull_area) if hull_area > 0 else 0

    def _extract_morphological_features(self, image: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
        """Extract morphological features"""
        features = {}
        
        # Morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        
        opened = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        features.update({
            'opening_ratio': float(np.sum(opened > 0) / np.sum(mask > 0)) if np.sum(mask > 0) > 0 else 0,
            'closing_ratio': float(np.sum(closed > 0) / np.sum(mask > 0)) if np.sum(mask > 0) > 0 else 0,
        })
        
        return features

    def _extract_cnn_features(self, image: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
        """Extract CNN-based deep features"""
        if not TENSORFLOW_AVAILABLE:
            return {}
        
        features = {}
        
        try:
            # Preprocess image for CNN
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image_normalized = image_rgb.astype(np.float32) / 255.0
            image_batch = np.expand_dims(image_normalized, axis=0)
            
            # Use pre-trained VGG16 features
            if not hasattr(self, '_vgg16_model'):
                base_model = VGG16(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
                self._vgg16_model = Model(
                    inputs=base_model.input,
                    outputs=base_model.get_layer('block5_pool').output
                )
            
            # Extract features
            vgg_features = self._vgg16_model.predict(image_batch, verbose=0)
            vgg_features_flat = vgg_features.flatten()
            
            # Apply PCA to reduce dimensionality
            if not hasattr(self, '_pca_cnn'):
                from sklearn.decomposition import PCA
                self._pca_cnn = PCA(n_components=50)
                # Initialize with dummy data
                dummy_features = np.random.random((100, len(vgg_features_flat)))
                self._pca_cnn.fit(dummy_features)
            
            # Reduce features
            reduced_features = self._pca_cnn.transform([vgg_features_flat])[0]
            
            for i, feature_val in enumerate(reduced_features):
                features[f"cnn_feature_{i}"] = float(feature_val)
        
        except Exception as e:
            logger.warning(f"CNN feature extraction failed: {e}")
        
        return features


class AdvancedCinnamonTrainer:
    """Advanced ML training system for cinnamon leaf deficiency detection"""
    
    def _init_(self, base_path: str = "backend/uploads/ml_training_data"):
        self.base_path = Path(base_path)
        self.models_path = Path("backend/models")
        
        # Create directories
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.models_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize feature extractor
        self.feature_extractor = EnhancedFeatureExtractor()
        
        # Training configuration
        self.config = {
            'test_size': 0.2,
            'validation_size': 0.2,
            'random_state': 42,
            'cross_validation_folds': 5,
            'hyperparameter_tuning': True,
            'ensemble_voting': 'soft'
        }
        
        # Model configurations
        self.model_configs = {
            'random_forest': {
                'n_estimators': [100, 200, 300],
                'max_depth': [10, 20, None],
                'min_samples_split': [2, 5, 10],
                'min_samples_leaf': [1, 2, 4]
            },
            'gradient_boosting': {
                'n_estimators': [100, 200],
                'learning_rate': [0.05, 0.1, 0.15],
                'max_depth': [3, 5, 7]
            },
            'svm': {
                'C': [0.1, 1, 10, 100],
                'kernel': ['rbf', 'poly'],
                'gamma': ['scale', 'auto']
            }
        }

    def prepare_training_dataset(self, dataset_path: str = None) -> Dict[str, Any]:
        """
        Prepare comprehensive training dataset with advanced feature extraction
        """
        if dataset_path is None:
            dataset_path = self.base_path / "cinnamon_dataset"
        
        preparation_results = {
            'timestamp': datetime.now().isoformat(),
            'dataset_path': str(dataset_path),
            'classes': [],
            'total_samples': 0,
            'feature_extraction_successful': True,
            'feature_statistics': {},
            'errors': []
        }
        
        all_features = []
        all_labels = []
        
        # Expected classes
        classes = ['healthy', 'nitrogen_deficiency', 'phosphorus_deficiency']
        
        for class_name in classes:
            class_path = Path(dataset_path) / class_name
            
            if not class_path.exists():
                preparation_results['errors'].append(f"Class folder not found: {class_name}")
                continue
            
            # Get all image files
            image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
            image_files = [
                f for f in class_path.rglob("*")
                if f.is_file() and f.suffix.lower() in image_extensions
            ]
            
            logger.info(f"Extracting features from {len(image_files)} {class_name} images...")
            
            class_features = []
            successful_extractions = 0
            
            for image_file in image_files:
                try:
                    # Extract comprehensive features
                    features = self.feature_extractor.extract_comprehensive_features(str(image_file))
                    
                    # Add metadata
                    features.update({
                        'image_path': str(image_file),
                        'image_filename': image_file.name,
                        'class_label': class_name
                    })
                    
                    all_features.append(features)
                    all_labels.append(class_name)
                    class_features.append(features)
                    successful_extractions += 1
                    
                except Exception as e:
                    logger.warning(f"Feature extraction failed for {image_file}: {e}")
                    preparation_results['errors'].append(f"Failed: {image_file.name}")
            
            preparation_results['classes'].append({
                'name': class_name,
                'total_images': len(image_files),
                'successful_extractions': successful_extractions,
                'success_rate': successful_extractions / len(image_files) if image_files else 0
            })
            
            preparation_results['total_samples'] += successful_extractions
        
        # Convert to DataFrame
        if all_features:
            features_df = pd.DataFrame(all_features)
            
            # Save features
            features_file = self.base_path / f"enhanced_features_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            features_df.to_csv(features_file, index=False)
            preparation_results['features_file'] = str(features_file)
            
            # Calculate feature statistics
            numeric_columns = features_df.select_dtypes(include=[np.number]).columns
            preparation_results['feature_statistics'] = {
                'total_features': len(numeric_columns),
                'feature_names': list(numeric_columns),
                'class_distribution': features_df['class_label'].value_counts().to_dict()
            }
            
            logger.info(f"Feature extraction completed. {len(all_features)} samples with {len(numeric_columns)} features")
        
        return preparation_results

    def train_ensemble_model(self, features_file: str = None) -> Dict[str, Any]:
        """
        Train ensemble model with hyperparameter tuning and cross-validation
        """
        if not SKLEARN_AVAILABLE:
            return {
                'training_successful': False,
                'errors': ['scikit-learn not available'],
                'timestamp': datetime.now().isoformat()
            }
        
        training_results = {
            'timestamp': datetime.now().isoformat(),
            'training_successful': True,
            'model_performances': {},
            'best_model_info': {},
            'ensemble_performance': {},
            'feature_importance': {},
            'errors': []
        }
        
        try:
            # Load features
            if features_file is None:
                features_files = list(self.base_path.glob("enhanced_features_*.csv"))
                if not features_files:
                    raise ValueError("No enhanced features file found")
                features_file = str(max(features_files))
            
            df = pd.read_csv(features_file)
            logger.info(f"Loaded {len(df)} samples from {features_file}")
            
            # Prepare features and labels
            feature_columns = [col for col in df.columns if col not in 
                              ['image_path', 'image_filename', 'class_label']]
            
            X = df[feature_columns].values
            y = df['class_label'].values
            
            # Handle missing values
            X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
            
            # Encode labels
            label_encoder = LabelEncoder()
            y_encoded = label_encoder.fit_transform(y)
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y_encoded,
                test_size=self.config['test_size'],
                random_state=self.config['random_state'],
                stratify=y_encoded
            )
            
            logger.info(f"Training set: {X_train.shape[0]}, Test set: {X_test.shape[0]}")
            
            # Train multiple models
            trained_models = {}
            
            # Random Forest
            rf_model = self._train_random_forest(X_train, y_train, X_test, y_test)
            trained_models['random_forest'] = rf_model
            training_results['model_performances']['random_forest'] = rf_model['performance']
            
            # Gradient Boosting
            gb_model = self._train_gradient_boosting(X_train, y_train, X_test, y_test)
            trained_models['gradient_boosting'] = gb_model
            training_results['model_performances']['gradient_boosting'] = gb_model['performance']
            
            # SVM
            svm_model = self._train_svm(X_train, y_train, X_test, y_test)
            trained_models['svm'] = svm_model
            training_results['model_performances']['svm'] = svm_model['performance']
            
            # Create ensemble
            ensemble_model = self._create_ensemble(trained_models, X_train, y_train, X_test, y_test)
            
            # Select best model
            best_model_name = max(
                training_results['model_performances'],
                key=lambda x: training_results['model_performances'][x]['accuracy']
            )
            
            training_results['best_model_info'] = {
                'model_name': best_model_name,
                'accuracy': training_results['model_performances'][best_model_name]['accuracy'],
                'f1_score': training_results['model_performances'][best_model_name]['f1_score']
            }
            
            # Save models and metadata
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # Save ensemble model
            ensemble_path = self.models_path / f"cinnamon_ensemble_{timestamp}.joblib"
            joblib.dump(ensemble_model['model'], ensemble_path)
            
            # Save preprocessing objects
            preprocessing_path = self.models_path / f"cinnamon_preprocessing_{timestamp}.joblib"
            joblib.dump({
                'scaler': scaler,
                'label_encoder': label_encoder,
                'feature_columns': feature_columns
            }, preprocessing_path)
            
            # Save metadata
            metadata = {
                'training_timestamp': training_results['timestamp'],
                'model_type': 'ensemble',
                'feature_columns': feature_columns,
                'class_labels': label_encoder.classes_.tolist(),
                'training_samples': X_train.shape[0],
                'test_samples': X_test.shape[0],
                'model_performances': training_results['model_performances'],
                'best_model': best_model_name,
                'ensemble_performance': ensemble_model['performance'],
                'preprocessing_file': str(preprocessing_path)
            }
            
            metadata_path = self.models_path / f"cinnamon_ensemble_{timestamp}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            training_results.update({
                'model_file': str(ensemble_path),
                'preprocessing_file': str(preprocessing_path),
                'metadata_file': str(metadata_path),
                'ensemble_performance': ensemble_model['performance']
            })
            
            logger.info(f"Training completed successfully. Best model: {best_model_name}")
            logger.info(f"Ensemble accuracy: {ensemble_model['performance']['accuracy']:.4f}")
            
        except Exception as e:
            error_msg = f"Training failed: {str(e)}"
            logger.error(error_msg)
            training_results['errors'].append(error_msg)
            training_results['training_successful'] = False
        
        return training_results

    def _train_random_forest(self, X_train, y_train, X_test, y_test) -> Dict:
        """Train Random Forest with hyperparameter tuning"""
        rf = RandomForestClassifier(random_state=self.config['random_state'])
        
        if self.config['hyperparameter_tuning']:
            grid_search = GridSearchCV(
                rf, self.model_configs['random_forest'],
                cv=self.config['cross_validation_folds'],
                scoring='f1_macro',
                n_jobs=-1
            )
            grid_search.fit(X_train, y_train)
            best_rf = grid_search.best_estimator_
        else:
            best_rf = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=self.config['random_state']
            )
            best_rf.fit(X_train, y_train)
        
        # Evaluate
        y_pred = best_rf.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average='macro')
        
        return {
            'model': best_rf,
            'performance': {
                'accuracy': float(accuracy),
                'f1_score': float(f1),
                'classification_report': classification_report(y_test, y_pred, output_dict=True)
            }
        }

    def _train_gradient_boosting(self, X_train, y_train, X_test, y_test) -> Dict:
        """Train Gradient Boosting with hyperparameter tuning"""
        gb = GradientBoostingClassifier(random_state=self.config['random_state'])
        
        if self.config['hyperparameter_tuning']:
            grid_search = GridSearchCV(
                gb, self.model_configs['gradient_boosting'],
                cv=self.config['cross_validation_folds'],
                scoring='f1_macro',
                n_jobs=-1
            )
            grid_search.fit(X_train, y_train)
            best_gb = grid_search.best_estimator_
        else:
            best_gb = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                random_state=self.config['random_state']
            )
            best_gb.fit(X_train, y_train)
        
        # Evaluate
        y_pred = best_gb.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average='macro')
        
        return {
            'model': best_gb,
            'performance': {
                'accuracy': float(accuracy),
                'f1_score': float(f1),
                'classification_report': classification_report(y_test, y_pred, output_dict=True)
            }
        }

    def _train_svm(self, X_train, y_train, X_test, y_test) -> Dict:
        """Train SVM with hyperparameter tuning"""
        svm = SVC(probability=True, random_state=self.config['random_state'])
        
        if self.config['hyperparameter_tuning']:
            grid_search = GridSearchCV(
                svm, self.model_configs['svm'],
                cv=self.config['cross_validation_folds'],
                scoring='f1_macro',
                n_jobs=-1
            )
            grid_search.fit(X_train, y_train)
            best_svm = grid_search.best_estimator_
        else:
            best_svm = SVC(
                C=1.0,
                kernel='rbf',
                probability=True,
                random_state=self.config['random_state']
            )
            best_svm.fit(X_train, y_train)
        
        # Evaluate
        y_pred = best_svm.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average='macro')
        
        return {
            'model': best_svm,
            'performance': {
                'accuracy': float(accuracy),
                'f1_score': float(f1),
                'classification_report': classification_report(y_test, y_pred, output_dict=True)
            }
        }

    def _create_ensemble(self, trained_models: Dict, X_train, y_train, X_test, y_test) -> Dict:
        """Create ensemble model from trained models"""
        estimators = [(name, model_data['model']) for name, model_data in trained_models.items()]
        
        ensemble = VotingClassifier(
            estimators=estimators,
            voting=self.config['ensemble_voting']
        )
        
        ensemble.fit(X_train, y_train)
        
        # Evaluate ensemble
        y_pred = ensemble.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average='macro')
        
        return {
            'model': ensemble,
            'performance': {
                'accuracy': float(accuracy),
                'f1_score': float(f1),
                'classification_report': classification_report(y_test, y_pred, output_dict=True)
            }
        }

    def run_complete_training_pipeline(self, dataset_path: str = None, force_redownload: bool = False) -> Dict[str, Any]:
        """Run complete enhanced training pipeline"""
        pipeline_results = {
            'pipeline_start': datetime.now().isoformat(),
            'steps_completed': [],
            'pipeline_successful': True,
            'final_model_path': '',
            'errors': []
        }
        
        try:
            # Step 1: Prepare dataset with enhanced features
            logger.info("=== Step 1: Preparing Enhanced Training Dataset ===")
            dataset_results = self.prepare_training_dataset(dataset_path)
            pipeline_results['dataset_preparation'] = dataset_results
            pipeline_results['steps_completed'].append('dataset_preparation')
            
            if not dataset_results['feature_extraction_successful']:
                raise Exception("Dataset preparation failed")
            
            # Step 2: Train ensemble model
            logger.info("=== Step 2: Training Ensemble Model ===")
            training_results = self.train_ensemble_model(dataset_results['features_file'])
            pipeline_results['training_results'] = training_results
            pipeline_results['steps_completed'].append('ensemble_training')
            
            if not training_results['training_successful']:
                raise Exception("Model training failed")
            
            pipeline_results['final_model_path'] = training_results['model_file']
            
            logger.info("=== Enhanced Training Pipeline Completed Successfully ===")
            logger.info(f"Final ensemble model: {pipeline_results['final_model_path']}")
            logger.info(f"Ensemble accuracy: {training_results['ensemble_performance']['accuracy']:.4f}")
            
        except Exception as e:
            error_msg = f"Pipeline failed: {str(e)}"
            logger.error(error_msg)
            pipeline_results['errors'].append(error_msg)
            pipeline_results['pipeline_successful'] = False
        
        pipeline_results['pipeline_end'] = datetime.now().isoformat()
        
        # Save pipeline results
        results_file = self.base_path / f"enhanced_training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(pipeline_results, f, indent=2, default=str)
        
        return pipeline_results


# Example usage
if _name_ == "_main_":
    trainer = AdvancedCinnamonTrainer()
    results = trainer.run_complete_training_pipeline()
    
    if results['pipeline_successful']:
        print(f"Enhanced training completed successfully!")
        print(f"Model saved to: {results['final_model_path']}")
    else:
        print("Training failed:")
        for error in results['errors']:
            print(f"- {error}")
