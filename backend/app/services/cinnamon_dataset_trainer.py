import os
import cv2
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
import json
import logging
from datetime import datetime
from pathlib import Path

# Import only essential ML components for now
try:
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
    from sklearn.ensemble import RandomForestClassifier
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    print("Warning: scikit-learn not available. Training functionality will be limited.")
    SKLEARN_AVAILABLE = False

try:
    import gdown
    GDOWN_AVAILABLE = True
except ImportError:
    print("Warning: gdown not available. Google Drive download functionality will be limited.")
    GDOWN_AVAILABLE = False

from zipfile import ZipFile
import shutil

from app.services.cinnamon_deficiency_detector import CinnamonLeafDeficiencyDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(_name_)


class CinnamonDatasetTrainer:
    """
    Service for training cinnamon leaf deficiency detection models
    Handles dataset download from Google Drive, preprocessing, and model training
    """
    
    def _init_(self, base_path: str = "backend/uploads/ml_training_data"):
        self.base_path = Path(base_path)
        self.detector = CinnamonLeafDeficiencyDetector()
        self.models_path = Path("backend/models")
        
        # Ensure directories exist
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.models_path.mkdir(parents=True, exist_ok=True)
        
        # Dataset URLs from specifications
        self.dataset_urls = {
            "healthy": "https://drive.google.com/drive/folders/1ROkN_JDl9LcUwrd6_IPuq5sV0NW-Ngis",
            "nitrogen_deficiency": "https://drive.google.com/drive/folders/1fL6-yfFyvmqgFzDHIQ9-g27vCNGbsxAv", 
            "phosphorus_deficiency": "https://drive.google.com/drive/folders/1k5q6GPYwBKDs9AvhZIgD52hj_TeqG6IS"
        }
        
        # Image format patterns from specifications
        self.image_formats = {
            "healthy": "Healthy Leaf###",
            "nitrogen_deficiency": "N (###)",
            "phosphorus_deficiency": "P (###)"
        }
        
        # Training configuration
        self.training_config = {
            "train_split": 0.8,
            "test_split": 0.2,
            "random_state": 42,
            "shuffle": True,
            "target_size": (224, 224),
            "augmentation_enabled": True
        }

    def download_dataset(self, force_redownload: bool = False) -> Dict[str, Any]:
        """
        Download dataset from Google Drive URLs
        Extract and organize images by class
        """
        download_results = {
            "download_timestamp": datetime.now().isoformat(),
            "classes_downloaded": {},
            "total_images": 0,
            "download_successful": True,
            "errors": []
        }
        
        if not GDOWN_AVAILABLE:
            download_results["download_successful"] = False
            download_results["errors"].append(
                "gdown not available. Please install: pip install gdown\n"
                "Then manually download datasets from Google Drive URLs and organize them in:\n"
                f"{self.base_path}/cinnamon_dataset/{{class_name}}/\n\n"
                "Dataset URLs:\n" + 
                "\n".join([f"- {name}: {url}" for name, url in self.dataset_urls.items()])
            )
            return download_results
        
        dataset_path = self.base_path / "cinnamon_dataset"
        
        # Check if dataset already exists
        if dataset_path.exists() and not force_redownload:
            logger.info("Dataset already exists. Use force_redownload=True to re-download")
            return self._validate_existing_dataset(dataset_path)
        
        # Create dataset directory
        dataset_path.mkdir(parents=True, exist_ok=True)
        
        for class_name, drive_url in self.dataset_urls.items():
            try:
                logger.info(f"Downloading {class_name} dataset from Google Drive...")
                
                # Create class directory
                class_path = dataset_path / class_name
                class_path.mkdir(exist_ok=True)
                
                # Extract file ID from Google Drive URL
                file_id = self._extract_drive_file_id(drive_url)
                if not file_id:
                    raise ValueError(f"Could not extract file ID from URL: {drive_url}")
                
                # Download zip file
                zip_path = self.base_path / f"{class_name}_images.zip"
                download_url = f"https://drive.google.com/uc?id={file_id}"
                
                try:
                    gdown.download(download_url, str(zip_path), quiet=False)
                    
                    # Extract images
                    with ZipFile(zip_path, 'r') as zip_ref:
                        zip_ref.extractall(class_path)
                    
                    # Count extracted images
                    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
                    image_files = [
                        f for f in class_path.rglob("*")
                        if f.is_file() and f.suffix.lower() in image_extensions
                    ]
                    
                    download_results["classes_downloaded"][class_name] = {
                        "image_count": len(image_files),
                        "download_path": str(class_path),
                        "sample_files": [f.name for f in image_files[:5]]
                    }
                    
                    download_results["total_images"] += len(image_files)
                    
                    # Clean up zip file
                    zip_path.unlink()
                    
                    logger.info(f"Downloaded {len(image_files)} {class_name} images")
                    
                except Exception as e:
                    logger.warning(f"gdown failed for {class_name}, trying alternative method: {e}")
                    # Alternative: Manual download instruction
                    download_results["errors"].append(
                        f"Failed to auto-download {class_name}. "
                        f"Please manually download from {drive_url} and extract to {class_path}"
                    )
                
            except Exception as e:
                error_msg = f"Failed to download {class_name}: {str(e)}"
                logger.error(error_msg)
                download_results["errors"].append(error_msg)
                download_results["download_successful"] = False
        
        return download_results

    def _extract_drive_file_id(self, url: str) -> Optional[str]:
        """Extract file ID from Google Drive URL"""
        # Handle different Google Drive URL formats
        if "drive.google.com/drive/folders/" in url:
            return url.split("/folders/")[1].split("?")[0]
        elif "drive.google.com/file/d/" in url:
            return url.split("/d/")[1].split("/")[0]
        return None

    def _validate_existing_dataset(self, dataset_path: Path) -> Dict[str, Any]:
        """Validate existing dataset structure"""
        validation_results = {
            "validation_timestamp": datetime.now().isoformat(),
            "dataset_path": str(dataset_path),
            "classes_found": {},
            "total_images": 0,
            "validation_passed": True
        }
        
        for class_name in self.dataset_urls.keys():
            class_path = dataset_path / class_name
            
            if class_path.exists():
                image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
                image_files = [
                    f for f in class_path.rglob("*")
                    if f.is_file() and f.suffix.lower() in image_extensions
                ]
                
                validation_results["classes_found"][class_name] = {
                    "image_count": len(image_files),
                    "path": str(class_path),
                    "sample_files": [f.name for f in image_files[:5]]
                }
                validation_results["total_images"] += len(image_files)
            else:
                validation_results["validation_passed"] = False
        
        return validation_results

    def extract_features_from_dataset(self, dataset_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract color and texture features from all images in dataset
        Use the CinnamonLeafDeficiencyDetector for feature extraction
        """
        if dataset_path is None:
            dataset_path = self.base_path / "cinnamon_dataset"
        else:
            dataset_path = Path(dataset_path)
        
        if not dataset_path.exists():
            raise ValueError(f"Dataset path does not exist: {dataset_path}")
        
        feature_extraction_results = {
            "extraction_timestamp": datetime.now().isoformat(),
            "dataset_path": str(dataset_path),
            "classes_processed": {},
            "feature_data": [],
            "extraction_successful": True,
            "errors": []
        }
        
        logger.info("Starting feature extraction from dataset...")
        
        for class_name in self.dataset_urls.keys():
            class_path = dataset_path / class_name
            
            if not class_path.exists():
                feature_extraction_results["errors"].append(f"Class folder not found: {class_name}")
                continue
            
            # Get all image files
            image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
            image_files = [
                f for f in class_path.rglob("*")
                if f.is_file() and f.suffix.lower() in image_extensions
            ]
            
            class_features = []
            successful_extractions = 0
            
            logger.info(f"Extracting features from {len(image_files)} {class_name} images...")
            
            for image_file in image_files:
                try:
                    # Use detector to preprocess and extract features
                    hsv_image, green_mask, preprocessing_metadata = self.detector.preprocess_image(str(image_file))
                    color_features = self.detector.extract_color_features(hsv_image, green_mask)
                    texture_features = self.detector.extract_texture_features(hsv_image, green_mask)
                    
                    # Combine features
                    feature_vector = {
                        "image_path": str(image_file),
                        "image_filename": image_file.name,
                        "class_label": class_name,
                        **color_features,
                        **texture_features,
                        "leaf_pixel_ratio": color_features["leaf_pixel_count"] / (224 * 224)  # Normalized
                    }
                    
                    feature_extraction_results["feature_data"].append(feature_vector)
                    class_features.append(feature_vector)
                    successful_extractions += 1
                    
                except Exception as e:
                    logger.warning(f"Failed to extract features from {image_file}: {str(e)}")
                    feature_extraction_results["errors"].append(f"Feature extraction failed: {image_file.name}")
            
            feature_extraction_results["classes_processed"][class_name] = {
                "total_images": len(image_files),
                "successful_extractions": successful_extractions,
                "success_rate": successful_extractions / len(image_files) if image_files else 0
            }
            
            logger.info(f"Extracted features from {successful_extractions}/{len(image_files)} {class_name} images")
        
        # Save feature data
        features_df = pd.DataFrame(feature_extraction_results["feature_data"])
        features_file = self.base_path / "extracted_features.csv"
        features_df.to_csv(features_file, index=False)
        feature_extraction_results["features_file"] = str(features_file)
        
        logger.info(f"Feature extraction completed. Saved to {features_file}")
        return feature_extraction_results

    def train_classification_model(self, features_file: Optional[str] = None) -> Dict[str, Any]:
        """
        Train a machine learning model using extracted features
        Uses Random Forest as baseline classifier
        """
        if not SKLEARN_AVAILABLE:
            return {
                "training_successful": False,
                "errors": ["scikit-learn not available. Please install: pip install scikit-learn"],
                "training_timestamp": datetime.now().isoformat()
            }
        
        if features_file is None:
            features_file = self.base_path / "extracted_features.csv"
        
        if not os.path.exists(features_file):
            raise ValueError(f"Features file not found: {features_file}")
        
        training_results = {
            "training_timestamp": datetime.now().isoformat(),
            "features_file": str(features_file),
            "model_type": "RandomForestClassifier",
            "training_config": self.training_config.copy(),
            "training_successful": True,
            "model_metrics": {},
            "model_file": "",
            "errors": []
        }
        
        try:
            logger.info("Loading feature data for training...")
            
            # Load features
            df = pd.read_csv(features_file)
            
            # Prepare feature matrix and labels
            feature_columns = [
                "mean_H", "mean_S", "mean_V", "std_H", "std_S", "std_V",
                "contrast", "homogeneity", "energy", "correlation", "leaf_pixel_ratio"
            ]
            
            X = df[feature_columns].values
            y = df["class_label"].values
            
            # Split data according to configuration
            X_train, X_test, y_train, y_test = train_test_split(
                X, y,
                test_size=self.training_config["test_split"],
                random_state=self.training_config["random_state"],
                shuffle=self.training_config["shuffle"],
                stratify=y
            )
            
            logger.info(f"Training set: {X_train.shape[0]} samples")
            logger.info(f"Test set: {X_test.shape[0]} samples")
            
            # Train Random Forest model
            logger.info("Training Random Forest classifier...")
            
            rf_model = RandomForestClassifier(
                n_estimators=100,
                random_state=self.training_config["random_state"],
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2
            )
            
            rf_model.fit(X_train, y_train)
            
            # Evaluate model
            y_pred = rf_model.predict(X_test)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            class_report = classification_report(y_test, y_pred, output_dict=True)
            conf_matrix = confusion_matrix(y_test, y_pred)
            
            training_results["model_metrics"] = {
                "accuracy": float(accuracy),
                "classification_report": class_report,
                "confusion_matrix": conf_matrix.tolist(),
                "feature_importance": dict(zip(feature_columns, rf_model.feature_importances_))
            }
            
            # Save model
            model_filename = f"cinnamon_deficiency_rf_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.joblib"
            model_path = self.models_path / model_filename
            joblib.dump(rf_model, model_path)
            
            training_results["model_file"] = str(model_path)
            
            # Save feature columns for later use
            metadata = {
                "model_type": "RandomForestClassifier",
                "feature_columns": feature_columns,
                "class_labels": list(set(y)),
                "training_timestamp": training_results["training_timestamp"],
                "training_accuracy": accuracy,
                "training_samples": len(X_train),
                "test_samples": len(X_test)
            }
            
            metadata_path = self.models_path / f"{model_filename.replace('.joblib', '_metadata.json')}"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Model trained successfully with accuracy: {accuracy:.4f}")
            logger.info(f"Model saved to: {model_path}")
            
        except Exception as e:
            error_msg = f"Training failed: {str(e)}"
            logger.error(error_msg)
            training_results["errors"].append(error_msg)
            training_results["training_successful"] = False
        
        return training_results

    def create_enhanced_detector(self, model_file: str) -> 'EnhancedCinnamonDetector':
        """
        Create enhanced detector that uses trained ML model
        Combines rule-based classifier with ML predictions
        """
        return EnhancedCinnamonDetector(model_file, self.detector)

    def run_full_pipeline(self, force_redownload: bool = False) -> Dict[str, Any]:
        """
        Run complete training pipeline:
        1. Download dataset
        2. Extract features
        3. Train model
        4. Evaluate performance
        """
        pipeline_results = {
            "pipeline_start": datetime.now().isoformat(),
            "steps_completed": [],
            "pipeline_successful": True,
            "final_model_path": "",
            "errors": []
        }
        
        try:
            # Step 1: Download dataset
            logger.info("=== Step 1: Downloading Dataset ===")
            download_results = self.download_dataset(force_redownload)
            pipeline_results["download_results"] = download_results
            pipeline_results["steps_completed"].append("dataset_download")
            
            if not download_results["download_successful"]:
                raise Exception("Dataset download failed")
            
            # Step 2: Extract features
            logger.info("=== Step 2: Extracting Features ===")
            feature_results = self.extract_features_from_dataset()
            pipeline_results["feature_extraction_results"] = feature_results
            pipeline_results["steps_completed"].append("feature_extraction")
            
            if not feature_results["extraction_successful"]:
                raise Exception("Feature extraction failed")
            
            # Step 3: Train model
            logger.info("=== Step 3: Training Model ===")
            training_results = self.train_classification_model()
            pipeline_results["training_results"] = training_results
            pipeline_results["steps_completed"].append("model_training")
            
            if not training_results["training_successful"]:
                raise Exception("Model training failed")
            
            pipeline_results["final_model_path"] = training_results["model_file"]
            
            logger.info("=== Pipeline Completed Successfully ===")
            logger.info(f"Final model: {pipeline_results['final_model_path']}")
            logger.info(f"Model accuracy: {training_results['model_metrics']['accuracy']:.4f}")
            
        except Exception as e:
            error_msg = f"Pipeline failed at step {len(pipeline_results['steps_completed']) + 1}: {str(e)}"
            logger.error(error_msg)
            pipeline_results["errors"].append(error_msg)
            pipeline_results["pipeline_successful"] = False
        
        pipeline_results["pipeline_end"] = datetime.now().isoformat()
        
        # Save pipeline results
        results_file = self.base_path / f"training_pipeline_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(pipeline_results, f, indent=2, default=str)
        
        logger.info(f"Pipeline results saved to: {results_file}")
        return pipeline_results


class EnhancedCinnamonDetector(CinnamonLeafDeficiencyDetector):
    """
    Enhanced detector that combines rule-based classification with ML model predictions
    Provides ensemble prediction for improved accuracy
    """
    
    def _init_(self, model_file: str, base_detector: CinnamonLeafDeficiencyDetector):
        super()._init_()
        self.base_detector = base_detector
        self.ml_model = joblib.load(model_file)
        
        # Load model metadata
        metadata_file = model_file.replace('.joblib', '_metadata.json')
        with open(metadata_file, 'r') as f:
            self.model_metadata = json.load(f)
        
        self.feature_columns = self.model_metadata["feature_columns"]
        self.model_version = "v2.1_ensemble"
    
    def predict_with_ml_model(self, color_features: Dict, texture_features: Dict) -> Tuple[str, float]:
        """Use trained ML model for prediction"""
        # Prepare feature vector
        feature_vector = [
            color_features["mean_H"],
            color_features["mean_S"], 
            color_features["mean_V"],
            color_features["std_H"],
            color_features["std_S"],
            color_features["std_V"],
            texture_features["contrast"],
            texture_features["homogeneity"],
            texture_features["energy"],
            texture_features["correlation"],
            color_features["leaf_pixel_count"] / (224 * 224)  # leaf_pixel_ratio
        ]
        
        # Get prediction and confidence
        prediction = self.ml_model.predict([feature_vector])[0]
        probabilities = self.ml_model.predict_proba([feature_vector])[0]
        confidence = max(probabilities)
        
        return prediction, confidence
    
    def analyze_leaf_image(self, image_path: str) -> Dict[str, Any]:
        """
        Enhanced analysis using ensemble of rule-based and ML approaches
        """
        start_time = datetime.now()
        
        try:
            # Step 1: Get base analysis from rule-based detector
            rule_based_result = super().analyze_leaf_image(image_path)
            
            if rule_based_result.get("error"):
                return rule_based_result
            
            # Step 2: Extract features for ML model
            hsv_image, green_mask, _ = self.preprocess_image(image_path)
            color_features = self.extract_color_features(hsv_image, green_mask)
            texture_features = self.extract_texture_features(hsv_image, green_mask)
            
            # Step 3: Get ML prediction
            ml_prediction, ml_confidence = self.predict_with_ml_model(color_features, texture_features)
            
            # Step 4: Ensemble prediction
            rule_prediction = rule_based_result["classification_results"]["detected_deficiency"]
            rule_confidence = rule_based_result["classification_results"]["confidence_score"]
            
            # Weighted ensemble (ML gets higher weight if confidence is high)
            if ml_confidence > 0.8:
                final_prediction = ml_prediction
                final_confidence = (ml_confidence * 0.7 + rule_confidence * 0.3)
                prediction_method = "ml_weighted"
            elif rule_prediction == ml_prediction:
                final_prediction = rule_prediction
                final_confidence = (ml_confidence + rule_confidence) / 2
                prediction_method = "consensus"
            else:
                # Use rule-based as fallback
                final_prediction = rule_prediction
                final_confidence = rule_confidence * 0.8  # Reduce confidence due to disagreement
                prediction_method = "rule_based_fallback"
            
            # Step 5: Update results with ensemble prediction
            enhanced_result = rule_based_result.copy()
            enhanced_result["analysis_metadata"]["model_version"] = self.model_version
            enhanced_result["classification_results"].update({
                "detected_deficiency": final_prediction,
                "confidence_score": final_confidence,
                "prediction_method": prediction_method,
                "ensemble_details": {
                    "rule_based_prediction": rule_prediction,
                    "rule_based_confidence": rule_confidence,
                    "ml_prediction": ml_prediction,
                    "ml_confidence": ml_confidence
                }
            })
            
            # Update recommendations based on final prediction
            enhanced_result["recommendations"] = self.recommendation_mapping.get(final_prediction, {})
            
            logger.info(f"Enhanced analysis completed: {final_prediction} (confidence: {final_confidence:.2f}, method: {prediction_method})")
            return enhanced_result
            
        except Exception as e:
            logger.error(f"Enhanced analysis failed: {str(e)}")
            # Fallback to base detector
            return super().analyze_leaf_image(image_path)


# Example usage
if _name_ == "_main_":
    # Initialize trainer
    trainer = CinnamonDatasetTrainer()
    
    # Run full training pipeline
    results = trainer.run_full_pipeline(force_redownload=False)
    
    if results["pipeline_successful"]:
        print("Training pipeline completed successfully!")
        print(f"Model saved to: {results['final_model_path']}")
        
        # Create enhanced detector
        enhanced_detector = trainer.create_enhanced_detector(results['final_model_path'])
        print("Enhanced detector created successfully")
    else:
        print("Training pipeline failed:")
        for error in results["errors"]:
            print(f"- {error}")
