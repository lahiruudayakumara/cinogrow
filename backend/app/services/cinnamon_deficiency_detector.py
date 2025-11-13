import cv2
import numpy as np
from typing import Dict, List, Tuple, Any, Optional
import json
import logging
from PIL import Image
from datetime import datetime
import os

# We'll implement GLCM texture analysis using simple numpy operations
# to avoid heavy scikit-image dependency for now

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CinnamonLeafDeficiencyDetector:
    """
    Advanced cinnamon leaf deficiency detector using color and texture analysis
    Based on HSV color signatures and texture parameters (GLCM)
    Implements rule-based classification as specified
    """
    
    def __init__(self):
        self.model_version = "v2.0_rule_based"
        self.confidence_threshold = 0.75
        
        # Color signatures from specifications
        self.color_signatures = {
            "healthy": {
                "mean_H_range": [40, 90],
                "mean_S_range": [45, 95],
                "mean_V_range": [65, 100]
            },
            "nitrogen_deficiency": {
                "mean_H_range": [25, 55],
                "mean_S_max": 40,
                "mean_V_max": 70,
                "pattern_signature": {
                    "contrast_level": "medium",
                    "homogeneity": "medium",
                    "edge_density": "moderate"
                },
                "visual_cues": [
                    "Yellowing starts from lower leaves",
                    "Uniform pale appearance", 
                    "Reduced leaf thickness"
                ]
            },
            "phosphorus_deficiency": {
                "mean_H_ranges": [[0, 20], [260, 320]],
                "mean_S_range": [30, 70],
                "mean_V_max": 60,
                "pattern_signature": {
                    "contrast_level": "high",
                    "homogeneity": "low",
                    "edge_density": "high"
                },
                "visual_cues": [
                    "Dark green turning to purplish tint",
                    "Reddish or brownish edges",
                    "Slower leaf growth"
                ]
            }
        }
        
        # Rule-based classification rules
        self.classification_rules = [
            {
                "condition": "mean_S < 40 and mean_V < 70 and 25 <= mean_H <= 55",
                "result": "nitrogen_deficiency",
                "confidence": 0.85
            },
            {
                "condition": "((0 <= mean_H <= 20) or (260 <= mean_H <= 320)) and contrast > 0.5",
                "result": "phosphorus_deficiency", 
                "confidence": 0.8
            },
            {
                "condition": "40 <= mean_H <= 90 and 45 <= mean_S <= 95 and 65 <= mean_V <= 100",
                "result": "healthy",
                "confidence": 0.9
            }
        ]
        
        # Recommendation mapping from specifications
        self.recommendation_mapping = {
            "nitrogen_deficiency": {
                "inorganic": {
                    "fertilizer": "Urea (46% N)",
                    "dosage": "100 g per plant",
                    "frequency": "Every 3 months",
                    "split_application": "2 splits during rainy season"
                },
                "organic": {
                    "fertilizer": "Poultry manure / Gliricidia green leaves",
                    "rate": "2 kg per plant",
                    "timing": "Start and end of monsoon"
                }
            },
            "phosphorus_deficiency": {
                "inorganic": {
                    "fertilizer": "Triple Super Phosphate (TSP)",
                    "dosage": "75 g per plant",
                    "frequency": "Annually",
                    "timing": "Early monsoon"
                },
                "organic": {
                    "fertilizer": "Bone meal / Rock phosphate",
                    "rate": "1.5 kg per plant", 
                    "timing": "Before heavy rains"
                }
            },
            "healthy": {
                "advice": "No corrective fertilizer needed. Maintain balanced N:P:K 2:1:1 schedule every 3 months."
            }
        }

    def preprocess_image(self, image_path: str) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Preprocess image according to pipeline specifications:
        1. Resize to 224x224
        2. Denoise with GaussianBlur(3x3) 
        3. Convert to HSV
        4. Apply green mask segmentation
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image from {image_path}")
            
            # Resize to 224x224 as specified
            image_resized = cv2.resize(image, (224, 224), interpolation=cv2.INTER_LANCZOS4)
            
            # Denoise with GaussianBlur(3x3)
            denoised = cv2.GaussianBlur(image_resized, (3, 3), 0)
            
            # Convert BGR to HSV for color analysis
            hsv_image = cv2.cvtColor(denoised, cv2.COLOR_BGR2HSV)
            
            # Apply green mask threshold (H:25–100, S:40–255, V:40–255)
            lower_green = np.array([25, 40, 40])
            upper_green = np.array([100, 255, 255])
            green_mask = cv2.inRange(hsv_image, lower_green, upper_green)
            
            # Apply mask to isolate leaf regions
            masked_hsv = cv2.bitwise_and(hsv_image, hsv_image, mask=green_mask)
            
            preprocessing_metadata = {
                "steps_applied": [
                    "resize_224x224",
                    "gaussian_blur_3x3",
                    "convert_to_hsv", 
                    "green_mask_segmentation"
                ],
                "green_mask_threshold": {
                    "H_range": [25, 100],
                    "S_range": [40, 255],
                    "V_range": [40, 255]
                },
                "leaf_pixels_detected": int(np.count_nonzero(green_mask))
            }
            
            return masked_hsv, green_mask, preprocessing_metadata
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise ValueError(f"Failed to preprocess image: {str(e)}")

    def extract_color_features(self, hsv_image: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
        """
        Extract HSV color features from masked leaf regions
        Compute mean H, S, V values as specified
        """
        # Extract leaf pixels only (where mask is non-zero)
        leaf_pixels = hsv_image[mask > 0]
        
        if len(leaf_pixels) == 0:
            raise ValueError("No leaf pixels detected in image")
        
        # Calculate mean HSV values
        mean_H = np.mean(leaf_pixels[:, 0])
        mean_S = np.mean(leaf_pixels[:, 1]) 
        mean_V = np.mean(leaf_pixels[:, 2])
        
        # Calculate standard deviations for variability assessment
        std_H = np.std(leaf_pixels[:, 0])
        std_S = np.std(leaf_pixels[:, 1])
        std_V = np.std(leaf_pixels[:, 2])
        
        return {
            "mean_H": float(mean_H),
            "mean_S": float(mean_S),
            "mean_V": float(mean_V),
            "std_H": float(std_H),
            "std_S": float(std_S), 
            "std_V": float(std_V),
            "leaf_pixel_count": len(leaf_pixels)
        }

    def extract_texture_features(self, hsv_image: np.ndarray, mask: np.ndarray) -> Dict[str, float]:
        """
        Extract texture features using simplified methods
        Compute contrast, homogeneity, and energy as specified
        """
        # Convert to grayscale for texture analysis
        gray = cv2.cvtColor(hsv_image, cv2.COLOR_HSV2BGR)
        gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
        
        # Apply mask to focus on leaf regions
        masked_gray = cv2.bitwise_and(gray, gray, mask=mask)
        
        # Get bounding box of mask to reduce computation
        coords = np.where(mask > 0)
        if len(coords[0]) == 0:
            raise ValueError("No leaf regions found for texture analysis")
        
        min_row, max_row = coords[0].min(), coords[0].max()
        min_col, max_col = coords[1].min(), coords[1].max()
        
        # Extract region of interest
        roi = masked_gray[min_row:max_row+1, min_col:max_col+1]
        
        # Simple texture analysis using Laplacian operator for contrast
        laplacian = cv2.Laplacian(roi, cv2.CV_64F)
        contrast = np.var(laplacian)
        
        # Compute local standard deviation for homogeneity (inverse relationship)
        # Higher std = lower homogeneity
        local_std = np.std(roi[roi > 0])  # Only consider non-zero pixels
        homogeneity = 1.0 / (1.0 + local_std) if local_std > 0 else 1.0
        
        # Energy computed as squared sum of intensities (normalized)
        energy = np.sum(roi*2) / (roi.size * 255*2) if roi.size > 0 else 0
        
        # Simple correlation using gradient analysis
        grad_x = cv2.Sobel(roi, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(roi, cv2.CV_64F, 0, 1, ksize=3)
        correlation = np.corrcoef(grad_x.flatten(), grad_y.flatten())[0, 1]
        correlation = correlation if not np.isnan(correlation) else 0
        
        return {
            "contrast": float(contrast),
            "homogeneity": float(homogeneity),
            "energy": float(energy),
            "correlation": float(correlation)
        }

    def apply_classification_rules(
        self, 
        color_features: Dict[str, float], 
        texture_features: Dict[str, float]
    ) -> Tuple[str, float, List[str]]:
        """
        Apply rule-based classification based on specifications
        Uses HSV thresholds and texture parameters to classify deficiency
        """
        mean_H = color_features["mean_H"]
        mean_S = color_features["mean_S"] 
        mean_V = color_features["mean_V"]
        contrast = texture_features["contrast"]
        
        # Normalize values to percentages for rule evaluation
        mean_S_pct = (mean_S / 255.0) * 100
        mean_V_pct = (mean_V / 255.0) * 100
        
        detected_issues = []
        
        # Rule 1: Nitrogen Deficiency
        if (mean_S_pct < 40 and mean_V_pct < 70 and 25 <= mean_H <= 55):
            detected_issues = [
                "Uniform yellowing detected",
                "Low saturation indicates pale appearance",
                "Color signature matches nitrogen deficiency pattern"
            ]
            return "nitrogen_deficiency", 0.85, detected_issues
        
        # Rule 2: Phosphorus Deficiency  
        if ((0 <= mean_H <= 20) or (260 <= mean_H <= 320)) and contrast > 0.5:
            detected_issues = [
                "Purplish or reddish tint detected",
                "High contrast indicates irregular coloration",
                "Color signature matches phosphorus deficiency pattern"
            ]
            return "phosphorus_deficiency", 0.8, detected_issues
        
        # Rule 3: Healthy (default if no deficiency detected)
        if (40 <= mean_H <= 90 and 45 <= mean_S_pct <= 95 and 65 <= mean_V_pct <= 100):
            detected_issues = [
                "Normal green coloration detected",
                "Color values within healthy range",
                "No deficiency symptoms identified"
            ]
            return "healthy", 0.9, detected_issues
        
        # Fallback: Check for borderline cases
        if mean_S_pct < 50 or mean_V_pct < 75:
            detected_issues = [
                "Mild discoloration detected",
                "Color values suggest possible early-stage deficiency",
                "Recommend monitoring and expert consultation"
            ]
            return "nitrogen_deficiency", 0.65, detected_issues
        
        # Default: Healthy with lower confidence
        detected_issues = [
            "No clear deficiency pattern detected",
            "Leaf appears relatively healthy",
            "Continue regular monitoring"
        ]
        return "healthy", 0.75, detected_issues

    def analyze_leaf_image(self, image_path: str) -> Dict[str, Any]:
        """
        Complete analysis pipeline:
        1. Preprocess image
        2. Extract color and texture features
        3. Apply classification rules
        4. Generate recommendations
        """
        start_time = datetime.now()
        
        try:
            # Step 1: Preprocess image
            logger.info(f"Starting cinnamon leaf analysis for: {image_path}")
            hsv_image, green_mask, preprocessing_metadata = self.preprocess_image(image_path)
            
            # Step 2: Extract features
            color_features = self.extract_color_features(hsv_image, green_mask)
            texture_features = self.extract_texture_features(hsv_image, green_mask)
            
            # Step 3: Apply classification rules
            deficiency_type, confidence_score, detected_issues = self.apply_classification_rules(
                color_features, texture_features
            )
            
            # Step 4: Get visual cues and recommendations
            visual_cues = self.color_signatures.get(deficiency_type, {}).get("visual_cues", [])
            recommendations = self.recommendation_mapping.get(deficiency_type, {})
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Step 5: Compile results
            analysis_results = {
                "analysis_metadata": {
                    "model_version": self.model_version,
                    "processing_time_seconds": processing_time,
                    "analysis_timestamp": start_time.isoformat(),
                    "image_path": image_path
                },
                "preprocessing": preprocessing_metadata,
                "extracted_features": {
                    "color_features": color_features,
                    "texture_features": texture_features
                },
                "classification_results": {
                    "detected_deficiency": deficiency_type,
                    "confidence_score": confidence_score,
                    "detected_issues": detected_issues,
                    "visual_cues": visual_cues,
                    "expert_consultation_needed": confidence_score < self.confidence_threshold
                },
                "recommendations": recommendations,
                "expert_contact": {
                    "organization": "Cinnamon Research Center, Matale, Sri Lanka",
                    "phone": "+94 66 224 5463",
                    "advisory_note": "For detailed nutrient advice, contact Cinnamon Research Center, Matale."
                }
            }
            
            logger.info(f"Analysis completed: {deficiency_type} (confidence: {confidence_score:.2f})")
            return analysis_results
            
        except Exception as e:
            logger.error(f"Analysis failed for {image_path}: {str(e)}")
            return {
                "error": True,
                "error_message": str(e),
                "analysis_metadata": {
                    "model_version": self.model_version,
                    "processing_time_seconds": (datetime.now() - start_time).total_seconds(),
                    "analysis_timestamp": start_time.isoformat(),
                    "image_path": image_path
                }
            }

    def generate_ui_integration_response(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate response formatted for UI integration as specified
        Maps to PhotoPreview -> FertilizerResultScreen flow
        """
        if analysis_results.get("error"):
            return {
                "success": False,
                "error_message": analysis_results["error_message"]
            }
        
        classification = analysis_results["classification_results"]
        recommendations = analysis_results.get("recommendations", {})
        
        # Format for UI display
        ui_response = {
            "success": True,
            "detected_issue": classification["detected_deficiency"].replace("_", " ").title(),
            "confidence": f"{classification['confidence_score']:.2f}",
            "highlight_regions": True,
            "leaf_image_overlay": self._generate_overlay_description(classification["detected_deficiency"]),
            "recommendation_card": self._format_recommendation_card(
                classification["detected_deficiency"], 
                recommendations
            ),
            "detailed_analysis": {
                "detected_issues": classification["detected_issues"],
                "visual_cues": classification["visual_cues"],
                "color_analysis": analysis_results["extracted_features"]["color_features"],
                "texture_analysis": analysis_results["extracted_features"]["texture_features"]
            },
            "expert_contact_needed": classification["expert_consultation_needed"],
            "processing_info": analysis_results["analysis_metadata"]
        }
        
        return ui_response

    def _generate_overlay_description(self, deficiency_type: str) -> str:
        """Generate description for image overlay highlighting"""
        overlay_descriptions = {
            "nitrogen_deficiency": "Color areas showing yellowing and pale regions",
            "phosphorus_deficiency": "Color areas showing purplish tints and dark edges", 
            "healthy": "Normal green coloration throughout leaf"
        }
        return overlay_descriptions.get(deficiency_type, "Analyzed leaf regions")

    def _format_recommendation_card(self, deficiency_type: str, recommendations: Dict[str, Any]) -> Dict[str, Any]:
        """Format recommendation for UI card display"""
        if deficiency_type == "healthy":
            return {
                "header": "Leaf Health Status",
                "details": recommendations.get("advice", "No specific fertilizer needed"),
                "contact_note": "Maintain regular fertilization schedule"
            }
        
        # For deficiencies, prioritize inorganic recommendation for quick action
        inorganic = recommendations.get("inorganic", {})
        organic = recommendations.get("organic", {})
        
        return {
            "header": "Fertilizer Recommendation",
            "details": f"{inorganic.get('fertilizer', 'N/A')} – {inorganic.get('dosage', 'N/A')}",
            "application_frequency": inorganic.get("frequency", "As needed"),
            "organic_alternative": f"{organic.get('fertilizer', 'N/A')} – {organic.get('rate', 'N/A')}",
            "timing": organic.get("timing", "Seasonal application"),
            "contact_note": "For detailed nutrient advice, contact Cinnamon Research Center, Matale."
        }

    def batch_analyze_images(self, image_paths: List[str]) -> List[Dict[str, Any]]:
        """
        Analyze multiple images in batch
        Useful for dataset training and validation
        """
        results = []
        total_images = len(image_paths)
        
        logger.info(f"Starting batch analysis of {total_images} images")
        
        for i, image_path in enumerate(image_paths, 1):
            try:
                logger.info(f"Processing image {i}/{total_images}: {os.path.basename(image_path)}")
                result = self.analyze_leaf_image(image_path)
                result["batch_info"] = {
                    "image_number": i,
                    "total_images": total_images,
                    "filename": os.path.basename(image_path)
                }
                results.append(result)
                
            except Exception as e:
                logger.error(f"Failed to process {image_path}: {str(e)}")
                results.append({
                    "error": True,
                    "error_message": str(e),
                    "image_path": image_path,
                    "batch_info": {
                        "image_number": i,
                        "total_images": total_images,
                        "filename": os.path.basename(image_path)
                    }
                })
        
        logger.info(f"Batch analysis completed. Processed {len(results)} images")
        return results

    def validate_training_data(self, dataset_path: str) -> Dict[str, Any]:
        """
        Validate training dataset structure according to specifications
        Check folder structure and image formats
        """
        expected_classes = ["healthy", "nitrogen_deficiency", "phosphorus_deficiency"]
        validation_results = {
            "dataset_path": dataset_path,
            "validation_timestamp": datetime.now().isoformat(),
            "classes_found": {},
            "total_images": 0,
            "validation_passed": True,
            "issues": []
        }
        
        if not os.path.exists(dataset_path):
            validation_results["validation_passed"] = False
            validation_results["issues"].append(f"Dataset path does not exist: {dataset_path}")
            return validation_results
        
        for class_name in expected_classes:
            class_path = os.path.join(dataset_path, class_name)
            
            if not os.path.exists(class_path):
                validation_results["issues"].append(f"Missing class folder: {class_name}")
                validation_results["validation_passed"] = False
                continue
            
            # Count images in class folder
            image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
            image_files = [
                f for f in os.listdir(class_path) 
                if os.path.splitext(f.lower())[1] in image_extensions
            ]
            
            validation_results["classes_found"][class_name] = {
                "image_count": len(image_files),
                "sample_files": image_files[:5],  # First 5 files as samples
                "folder_path": class_path
            }
            
            validation_results["total_images"] += len(image_files)
            
            # Check minimum images per class
            if len(image_files) < 10:
                validation_results["issues"].append(
                    f"Insufficient images in {class_name}: {len(image_files)} (minimum: 10)"
                )
        
        return validation_results


# Example usage for testing
if __name__ == "__main__":
    # Initialize detector
    detector = CinnamonLeafDeficiencyDetector()
    
    # Example single image analysis
    # result = detector.analyze_leaf_image("path/to/leaf_image.jpg")
    # ui_response = detector.generate_ui_integration_response(result)
    # print(json.dumps(ui_response, indent=2))
    
    print("CinnamonLeafDeficiencyDetector initialized successfully")
    print("Available methods:")
    print("- analyze_leaf_image(image_path)")
    print("- batch_analyze_images(image_paths)")
    print("- validate_training_data(dataset_path)")
    print("- generate_ui_integration_response(analysis_results)")
