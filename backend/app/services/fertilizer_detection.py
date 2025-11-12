import os
import json
import time
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from PIL import Image
import numpy as np
from sqlmodel import Session, select

from app.models.fertilizer.deficiency_detection import (
    DeficiencyAnalysis,
    CinnamonFertilizerRecommendation,
    DeficiencyType,
    AnalysisStatus,
    ImageAnalysisLog
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(_name_)


class FertilizerDetectionService:
    """
    Service for detecting fertilizer deficiencies in cinnamon leaf images
    Based on the specifications provided for cinnamon-specific nutrient deficiencies
    """
    
    def _init_(self, db: Session):
        self.db = db
        self.model = None
        self.confidence_threshold = 0.75
        self.model_version = "v1.0"
        
        # Cinnamon-specific deficiency thresholds
        self.nutrient_thresholds = {
            "nitrogen": 2.0,  # < 2.0% indicates deficiency
            "phosphorus": 0.15  # < 0.15% indicates deficiency
        }
        
        # Visual signs mapping based on specifications
        self.visual_signs_mapping = {
            DeficiencyType.NITROGEN_DEFICIENCY: [
                "Uniform yellowing of older leaves",
                "Reduced shoot growth",
                "Thin, pale shoots"
            ],
            DeficiencyType.PHOSPHORUS_DEFICIENCY: [
                "Stunted growth",
                "Purplish or darkening of older leaves", 
                "Poor root development"
            ]
        }
        
        # Fertilizer recommendations based on Cinnamon Research Center data
        self.fertilizer_recommendations = {
            DeficiencyType.NITROGEN_DEFICIENCY: {
                "inorganic": {
                    "type": "Urea (46% N)",
                    "dosage_per_plant": 100,  # grams
                    "application_method": "Apply evenly around the root zone",
                    "frequency": "Every 3 months",
                    "split_schedule": "2 splits during rainy season"
                },
                "organic": {
                    "type": "Composted poultry manure or Gliricidia green leaves",
                    "application_rate": 2,  # kg per plant
                    "timing": "At start and end of monsoon"
                }
            },
            DeficiencyType.PHOSPHORUS_DEFICIENCY: {
                "inorganic": {
                    "type": "Triple Super Phosphate (TSP)",
                    "dosage_per_plant": 75,  # grams
                    "application_method": "Incorporate into soil during land preparation or early rains",
                    "frequency": "Once per year"
                },
                "organic": {
                    "type": "Bone meal or rock phosphate",
                    "application_rate": 1.5,  # kg per plant
                    "timing": "Before heavy rains"
                }
            }
        }
    
    def preprocess_image(self, image_path: str) -> np.ndarray:
        """
        Preprocess leaf image according to specifications:
        - Resize to 224x224
        - Normalize pixel values
        - Apply augmentation (flip, rotate, zoom) if needed
        """
        try:
            # Load image
            image = Image.open(image_path)
            
            # Resize to 224x224 as specified
            image = image.resize((224, 224), Image.Resampling.LANCZOS)
            
            # Convert to RGB if not already
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(image)
            
            # Normalize pixel values (0-255 to 0-1)
            normalized_array = image_array.astype(np.float32) / 255.0
            
            # Log preprocessing steps
            preprocessing_steps = [
                "resize to 224x224",
                "normalize pixel values",
                "convert to RGB"
            ]
            
            return normalized_array, preprocessing_steps
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            raise ValueError(f"Failed to preprocess image: {str(e)}")
    
    def detect_deficiency_mock(self, image_array: np.ndarray) -> Tuple[DeficiencyType, float, List[str]]:
        """
        Mock deficiency detection function
        In production, this would use a trained CNN model (MobileNetV2 or ResNet50)
        For now, returns simulated results based on specifications
        """
        # Simulate CNN model prediction
        # In reality, this would be: model.predict(image_array)
        
        # Mock analysis based on image characteristics
        # This is a placeholder - real implementation would use trained model
        
        # Simulate different scenarios
        mock_scenarios = [
            (DeficiencyType.NITROGEN_DEFICIENCY, 0.85, ["Yellowing of older leaves detected", "Reduced vigor observed"]),
            (DeficiencyType.PHOSPHORUS_DEFICIENCY, 0.78, ["Purplish coloration detected", "Stunted growth patterns"]),
            (DeficiencyType.HEALTHY, 0.92, ["No deficiency signs detected", "Normal leaf coloration"])
        ]
        
        # For demonstration, cycle through scenarios
        # In production, this would be actual model inference
        import random
        scenario = random.choice(mock_scenarios)
        
        return scenario[0], scenario[1], scenario[2]
    
    def analyze_leaf_image(
        self,
        image_path: str,
        farm_id: Optional[int] = None,
        plot_id: Optional[int] = None,
        user_id: int = 1
    ) -> Dict[str, Any]:
        """
        Complete analysis flow for leaf image:
        1. Preprocess image
        2. Run model inference
        3. Detect deficiency type
        4. Map to fertilizer recommendations
        5. Save results to database
        """
        start_time = time.time()
        
        try:
            # Step 1: Preprocess image
            logger.info(f"Starting image analysis for: {image_path}")
            image_array, preprocessing_steps = self.preprocess_image(image_path)
            
            # Step 2: Run deficiency detection
            deficiency_type, confidence_score, detected_issues = self.detect_deficiency_mock(image_array)
            
            # Step 3: Check confidence threshold
            meets_threshold = confidence_score >= self.confidence_threshold
            expert_contact_required = not meets_threshold or deficiency_type in [
                DeficiencyType.PHOSPHORUS_DEFICIENCY  # Critical deficiency
            ]
            
            # Step 4: Get visual signs
            visual_signs = self.visual_signs_mapping.get(deficiency_type, [])
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Step 5: Create database record
            analysis = DeficiencyAnalysis(
                farm_id=farm_id,
                plot_id=plot_id,
                user_id=user_id,
                leaf_image_path=image_path,
                primary_deficiency=deficiency_type,
                confidence_score=confidence_score,
                detected_issues=json.dumps(detected_issues),
                visual_signs=json.dumps(visual_signs),
                model_version=self.model_version,
                preprocessing_applied=json.dumps(preprocessing_steps),
                status=AnalysisStatus.COMPLETED,
                processing_time_seconds=processing_time,
                expert_contact_required=expert_contact_required
            )
            
            self.db.add(analysis)
            self.db.commit()
            self.db.refresh(analysis)
            
            # Step 6: Create fertilizer recommendation if deficiency detected
            recommendation = None
            if deficiency_type != DeficiencyType.HEALTHY:
                recommendation = self.create_fertilizer_recommendation(analysis.id, deficiency_type)
            
            # Log analysis attempt
            self.log_analysis_attempt(
                user_id=user_id,
                image_path=image_path,
                success=True,
                confidence_met=meets_threshold,
                processing_duration_ms=int(processing_time * 1000)
            )
            
            return {
                "analysis_id": analysis.id,
                "deficiency_type": deficiency_type.value,
                "confidence_score": confidence_score,
                "detected_issues": detected_issues,
                "visual_signs": visual_signs,
                "expert_contact_required": expert_contact_required,
                "processing_time_seconds": processing_time,
                "model_version": self.model_version,
                "recommendation_id": recommendation.id if recommendation else None
            }
            
        except Exception as e:
            # Log failed analysis
            self.log_analysis_attempt(
                user_id=user_id,
                image_path=image_path,
                success=False,
                error_message=str(e),
                processing_duration_ms=int((time.time() - start_time) * 1000)
            )
            
            logger.error(f"Analysis failed for {image_path}: {str(e)}")
            raise ValueError(f"Analysis failed: {str(e)}")
    
    def create_fertilizer_recommendation(
        self,
        analysis_id: int,
        deficiency_type: DeficiencyType
    ) -> CinnamonFertilizerRecommendation:
        """
        Create fertilizer recommendation based on detected deficiency
        Uses Cinnamon Research Center recommendations
        """
        if deficiency_type not in self.fertilizer_recommendations:
            raise ValueError(f"No recommendations available for {deficiency_type}")
        
        rec_data = self.fertilizer_recommendations[deficiency_type]
        
        # Create recommendation record
        recommendation = CinnamonFertilizerRecommendation(
            deficiency_analysis_id=analysis_id,
            deficiency_type=deficiency_type,
            
            # Inorganic fertilizer
            inorganic_fertilizer_type=rec_data["inorganic"]["type"],
            inorganic_dosage_per_plant=rec_data["inorganic"]["dosage_per_plant"],
            inorganic_application_method=rec_data["inorganic"]["application_method"],
            inorganic_frequency=rec_data["inorganic"]["frequency"],
            inorganic_split_schedule=rec_data["inorganic"].get("split_schedule"),
            
            # Organic fertilizer
            organic_fertilizer_type=rec_data["organic"]["type"],
            organic_application_rate=rec_data["organic"]["application_rate"],
            organic_timing=rec_data["organic"]["timing"],
            
            # Application details
            application_method_details=self.get_application_details(deficiency_type),
            best_application_season="During monsoon season (May-September and December-February)",
            
            # Priority
            priority_level=4 if deficiency_type == DeficiencyType.PHOSPHORUS_DEFICIENCY else 3,
            action_required_within_days=14 if deficiency_type == DeficiencyType.PHOSPHORUS_DEFICIENCY else 30,
            
            additional_notes=self.get_additional_notes(deficiency_type)
        )
        
        self.db.add(recommendation)
        self.db.commit()
        self.db.refresh(recommendation)
        
        return recommendation
    
    def get_application_details(self, deficiency_type: DeficiencyType) -> str:
        """Get detailed application instructions"""
        if deficiency_type == DeficiencyType.NITROGEN_DEFICIENCY:
            return ("Apply fertilizer in a ring around the plant, 30cm from the trunk. "
                   "Water thoroughly after application. Avoid applying during dry periods.")
        elif deficiency_type == DeficiencyType.PHOSPHORUS_DEFICIENCY:
            return ("Incorporate fertilizer into soil to 15cm depth around root zone. "
                   "Apply during land preparation or at the beginning of rainy season for best results.")
        return "Follow standard application guidelines for cinnamon cultivation."
    
    def get_additional_notes(self, deficiency_type: DeficiencyType) -> str:
        """Get additional notes for specific deficiencies"""
        if deficiency_type == DeficiencyType.NITROGEN_DEFICIENCY:
            return ("Monitor leaf color improvement within 2-3 weeks. "
                   "Ensure adequate water availability for nutrient uptake.")
        elif deficiency_type == DeficiencyType.PHOSPHORUS_DEFICIENCY:
            return ("Phosphorus deficiency is critical for root development. "
                   "Consider soil pH testing as phosphorus availability depends on soil pH.")
        return "Continue regular monitoring of plant health."
    
    def log_analysis_attempt(
        self,
        user_id: int,
        image_path: str,
        success: bool,
        confidence_met: bool = False,
        error_message: Optional[str] = None,
        processing_duration_ms: int = 0
    ):
        """Log image analysis attempt for monitoring and debugging"""
        try:
            # Get image metadata
            image_size = os.path.getsize(image_path) if os.path.exists(image_path) else None
            
            log_entry = ImageAnalysisLog(
                user_id=user_id,
                original_filename=os.path.basename(image_path),
                image_size_bytes=image_size,
                model_used=self.model_version,
                processing_duration_ms=processing_duration_ms,
                analysis_success=success,
                error_message=error_message,
                confidence_threshold_met=confidence_met
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to log analysis attempt: {str(e)}")
    
    def get_analysis_by_id(self, analysis_id: int) -> Optional[DeficiencyAnalysis]:
        """Retrieve analysis by ID"""
        return self.db.get(DeficiencyAnalysis, analysis_id)
    
    def get_recommendation_by_analysis_id(self, analysis_id: int) -> Optional[CinnamonFertilizerRecommendation]:
        """Get recommendation for specific analysis"""
        statement = select(CinnamonFertilizerRecommendation).where(
            CinnamonFertilizerRecommendation.deficiency_analysis_id == analysis_id
        )
        return self.db.exec(statement).first()
    
    def get_comprehensive_results(self, analysis_id: int) -> Dict[str, Any]:
        """Get complete analysis and recommendation results"""
        analysis = self.get_analysis_by_id(analysis_id)
        if not analysis:
            raise ValueError(f"Analysis with ID {analysis_id} not found")
        
        recommendation = self.get_recommendation_by_analysis_id(analysis_id)
        
        result = {
            "analysis": {
                "id": analysis.id,
                "deficiency_type": analysis.primary_deficiency.value,
                "confidence_score": analysis.confidence_score,
                "detected_issues": json.loads(analysis.detected_issues),
                "visual_signs": json.loads(analysis.visual_signs or "[]"),
                "processing_time": analysis.processing_time_seconds,
                "expert_contact_required": analysis.expert_contact_required,
                "analysis_date": analysis.analysis_date.isoformat()
            },
            "recommendation": None,
            "expert_contact": {
                "organization": "Cinnamon Research Center, Matale, Sri Lanka",
                "phone": "+94 66 224 5463",
                "note": "For updated recommendations and site-specific nutrient management, contact the Cinnamon Research Center."
            }
        }
        
        if recommendation:
            result["recommendation"] = {
                "id": recommendation.id,
                "deficiency_type": recommendation.deficiency_type.value,
                "inorganic_fertilizer": {
                    "type": recommendation.inorganic_fertilizer_type,
                    "dosage_per_plant": recommendation.inorganic_dosage_per_plant,
                    "application_method": recommendation.inorganic_application_method,
                    "frequency": recommendation.inorganic_frequency,
                    "split_schedule": recommendation.inorganic_split_schedule
                },
                "organic_fertilizer": {
                    "type": recommendation.organic_fertilizer_type,
                    "application_rate": recommendation.organic_application_rate,
                    "timing": recommendation.organic_timing
                },
                "application_details": {
                    "method": recommendation.application_method_details,
                    "best_season": recommendation.best_application_season
                },
                "priority": {
                    "level": recommendation.priority_level,
                    "action_required_within_days": recommendation.action_required_within_days
                },
                "additional_notes": recommendation.additional_notes
            }
        
        return result
    
    def update_recommendation_feedback(
        self,
        recommendation_id: int,
        is_applied: bool,
        application_date: Optional[datetime] = None,
        effectiveness_rating: Optional[int] = None,
        user_feedback: Optional[str] = None
    ) -> CinnamonFertilizerRecommendation:
        """Update recommendation with user feedback"""
        recommendation = self.db.get(CinnamonFertilizerRecommendation, recommendation_id)
        if not recommendation:
            raise ValueError(f"Recommendation with ID {recommendation_id} not found")
        
        recommendation.is_applied = is_applied
        if application_date:
            recommendation.application_date = application_date
        if effectiveness_rating:
            recommendation.effectiveness_rating = effectiveness_rating
        if user_feedback:
            recommendation.user_feedback = user_feedback
        
        recommendation.updated_at = datetime.utcnow()
        
        self.db.add(recommendation)
        self.db.commit()
        self.db.refresh(recommendation)
        
        return recommendation
