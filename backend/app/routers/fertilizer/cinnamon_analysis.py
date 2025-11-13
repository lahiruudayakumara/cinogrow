from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import Dict, Any, Optional, List
import os
import uuid
import json
import logging
from datetime import datetime

from app.database import get_db
from app.models.fertilizer.deficiency_detection import (
    DeficiencyAnalysis,
    CinnamonFertilizerRecommendation,
    DeficiencyType,
    AnalysisStatus,
    DeficiencyAnalysisCreate,
    DeficiencyAnalysisRead,
    CinnamonFertilizerRecommendationRead,
    ComprehensiveAnalysisResponse,
    ImageAnalysisLog
)
from app.services.cinnamon_deficiency_detector import CinnamonLeafDeficiencyDetector
from app.services.cinnamon_dataset_trainer import CinnamonDatasetTrainer, EnhancedCinnamonDetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fertilizer/cinnamon",
    tags=["Cinnamon Leaf Analysis"],
    responses={404: {"description": "Not found"}}
)

# Global detector instance (will be enhanced if trained model is available)
_detector_instance = None
_enhanced_detector_instance = None

def get_detector():
    """Get the appropriate detector instance (enhanced if available, otherwise basic)"""
    global _detector_instance, _enhanced_detector_instance
    
    if _enhanced_detector_instance is not None:
        return _enhanced_detector_instance
    
    if _detector_instance is None:
        _detector_instance = CinnamonLeafDeficiencyDetector()
        
        # Try to load enhanced detector if trained model exists
        try:
            models_path = "backend/models"
            if os.path.exists(models_path):
                # Find latest trained model
                model_files = [f for f in os.listdir(models_path) if f.endswith('.joblib') and 'cinnamon_deficiency' in f]
                if model_files:
                    latest_model = max(model_files)
                    model_path = os.path.join(models_path, latest_model)
                    _enhanced_detector_instance = EnhancedCinnamonDetector(model_path, _detector_instance)
                    logger.info(f"Loaded enhanced detector with model: {latest_model}")
                    return _enhanced_detector_instance
        except Exception as e:
            logger.warning(f"Could not load enhanced detector: {e}")
    
    return _detector_instance


@router.post("/analyze-leaf", response_model=Dict[str, Any])
async def analyze_cinnamon_leaf(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    farm_id: Optional[int] = Form(None),
    plot_id: Optional[int] = Form(None),
    user_id: int = Form(1),
    db: Session = Depends(get_db)
):
    """
    Analyze cinnamon leaf image for nutrient deficiencies
    
    Uses advanced color and texture analysis to detect:
    - Nitrogen deficiency
    - Phosphorus deficiency 
    - Healthy leaf status
    
    Returns comprehensive analysis with fertilizer recommendations
    """
    
    # Validate file type
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Save uploaded image
        upload_dir = "backend/uploads/fertilizer_analysis"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"cinnamon_leaf_{uuid.uuid4().hex}{file_extension}"
        image_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(image_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        
        logger.info(f"Uploaded image saved to: {image_path}")
        
        # Get detector instance
        detector = get_detector()
        
        # Analyze image
        analysis_results = detector.analyze_leaf_image(image_path)
        
        if analysis_results.get("error"):
            raise HTTPException(status_code=422, detail=analysis_results["error_message"])
        
        # Create database record
        db_analysis = DeficiencyAnalysis(
            farm_id=farm_id,
            plot_id=plot_id,
            user_id=user_id,
            leaf_image_path=image_path,
            primary_deficiency=DeficiencyType(analysis_results["classification_results"]["detected_deficiency"]),
            confidence_score=analysis_results["classification_results"]["confidence_score"],
            detected_issues=json.dumps(analysis_results["classification_results"]["detected_issues"]),
            visual_signs=json.dumps(analysis_results["classification_results"]["visual_cues"]),
            model_version=analysis_results["analysis_metadata"]["model_version"],
            preprocessing_applied=json.dumps(analysis_results["preprocessing"]["steps_applied"]),
            status=AnalysisStatus.COMPLETED,
            processing_time_seconds=analysis_results["analysis_metadata"]["processing_time_seconds"],
            expert_contact_required=analysis_results["classification_results"]["expert_consultation_needed"]
        )
        
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        
        # Create fertilizer recommendation if deficiency detected
        recommendation = None
        if db_analysis.primary_deficiency != DeficiencyType.HEALTHY:
            background_tasks.add_task(create_fertilizer_recommendation, db, db_analysis.id)
        
        # Format UI integration response
        ui_response = detector.generate_ui_integration_response(analysis_results)
        ui_response.update({
            "analysis_id": db_analysis.id,
            "database_record_created": True,
            "image_path": image_path,
            "timestamp": db_analysis.created_at.isoformat()
        })
        
        logger.info(f"Analysis completed successfully for analysis ID: {db_analysis.id}")
        return ui_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/analysis/{analysis_id}", response_model=Dict[str, Any])
async def get_analysis_results(analysis_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive analysis results by ID
    Includes analysis details, recommendations, and expert contact info
    """
    
    # Get analysis record
    analysis = db.get(DeficiencyAnalysis, analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Get recommendation if exists
    recommendation_stmt = select(CinnamonFertilizerRecommendation).where(
        CinnamonFertilizerRecommendation.deficiency_analysis_id == analysis_id
    )
    recommendation = db.exec(recommendation_stmt).first()
    
    # Format comprehensive response
    response = {
        "analysis": {
            "id": analysis.id,
            "deficiency_type": analysis.primary_deficiency.value,
            "confidence_score": analysis.confidence_score,
            "detected_issues": json.loads(analysis.detected_issues),
            "visual_signs": json.loads(analysis.visual_signs or "[]"),
            "processing_time": analysis.processing_time_seconds,
            "model_version": analysis.model_version,
            "expert_contact_required": analysis.expert_contact_required,
            "analysis_date": analysis.analysis_date.isoformat(),
            "status": analysis.status.value
        },
        "recommendation": None,
        "expert_contact": {
            "organization": "Cinnamon Research Center, Matale, Sri Lanka",
            "phone": "+94 66 224 5463",
            "advisory_note": "For detailed nutrient advice, contact Cinnamon Research Center, Matale."
        },
        "ui_display": {
            "detected_issue": analysis.primary_deficiency.value.replace("_", " ").title(),
            "confidence": f"{analysis.confidence_score:.2f}",
            "highlight_regions": True
        }
    }
    
    # Add recommendation details if available
    if recommendation:
        response["recommendation"] = {
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
            "cost_estimates": {
                "per_plant": recommendation.estimated_cost_per_plant,
                "per_hectare": recommendation.estimated_cost_per_hectare
            },
            "additional_notes": recommendation.additional_notes
        }
        
        response["ui_display"]["recommendation_card"] = {
            "header": "Fertilizer Recommendation",
            "details": f"{recommendation.inorganic_fertilizer_type} – {recommendation.inorganic_dosage_per_plant}g per plant",
            "application_frequency": recommendation.inorganic_frequency,
            "organic_alternative": f"{recommendation.organic_fertilizer_type} – {recommendation.organic_application_rate}kg per plant",
            "timing": recommendation.organic_timing,
            "contact_note": "For detailed nutrient advice, contact Cinnamon Research Center, Matale."
        }
    
    return response


@router.post("/train-model")
async def train_detection_model(
    background_tasks: BackgroundTasks,
    force_redownload: bool = False
):
    """
    Train cinnamon deficiency detection model
    Downloads dataset from Google Drive and trains ML model
    This is a long-running process that runs in background
    """
    
    def run_training_pipeline():
        """Background task to run training pipeline"""
        try:
            logger.info("Starting model training pipeline...")
            trainer = CinnamonDatasetTrainer()
            results = trainer.run_full_pipeline(force_redownload=force_redownload)
            
            # Update global detector instance if training successful
            if results["pipeline_successful"]:
                global _enhanced_detector_instance
                try:
                    _enhanced_detector_instance = trainer.create_enhanced_detector(results['final_model_path'])
                    logger.info("Enhanced detector updated with new trained model")
                except Exception as e:
                    logger.error(f"Failed to update enhanced detector: {e}")
            
            # Save training results
            results_file = f"backend/uploads/ml_training_data/training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2, default=str)
            
            logger.info("Training pipeline completed")
            
        except Exception as e:
            logger.error(f"Training pipeline failed: {str(e)}")
    
    # Start training in background
    background_tasks.add_task(run_training_pipeline)
    
    return {
        "message": "Model training started in background",
        "status": "training_started",
        "force_redownload": force_redownload,
        "timestamp": datetime.now().isoformat(),
        "note": "Training may take 10-30 minutes depending on dataset size. Check logs for progress."
    }


@router.get("/model-info")
async def get_model_info():
    """
    Get information about the current detection model
    """
    detector = get_detector()
    
    model_info = {
        "model_version": detector.model_version,
        "model_type": "rule_based" if not isinstance(detector, EnhancedCinnamonDetector) else "ensemble",
        "confidence_threshold": detector.confidence_threshold,
        "capabilities": [
            "Nitrogen deficiency detection",
            "Phosphorus deficiency detection", 
            "Healthy leaf classification",
            "HSV color analysis",
            "GLCM texture analysis",
            "Rule-based classification"
        ]
    }
    
    # Add enhanced model info if available
    if isinstance(detector, EnhancedCinnamonDetector):
        model_info.update({
            "ml_model_metadata": detector.model_metadata,
            "feature_columns": detector.feature_columns,
            "ensemble_methods": ["rule_based", "random_forest"]
        })
    
    # Check for available trained models
    models_path = "backend/models"
    available_models = []
    if os.path.exists(models_path):
        model_files = [f for f in os.listdir(models_path) if f.endswith('.joblib') and 'cinnamon_deficiency' in f]
        for model_file in model_files:
            metadata_file = os.path.join(models_path, model_file.replace('.joblib', '_metadata.json'))
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                available_models.append({
                    "filename": model_file,
                    "training_timestamp": metadata.get("training_timestamp"),
                    "training_accuracy": metadata.get("training_accuracy"),
                    "training_samples": metadata.get("training_samples")
                })
    
    model_info["available_trained_models"] = available_models
    
    return model_info


@router.get("/analysis/recent", response_model=List[Dict[str, Any]])
async def get_recent_analyses(limit: int = 10, db: Session = Depends(get_db)):
    """
    Get recent cinnamon leaf analyses
    """
    
    stmt = select(DeficiencyAnalysis).order_by(DeficiencyAnalysis.created_at.desc()).limit(limit)
    analyses = db.exec(stmt).all()
    
    recent_analyses = []
    for analysis in analyses:
        recent_analyses.append({
            "id": analysis.id,
            "deficiency_type": analysis.primary_deficiency.value,
            "confidence_score": analysis.confidence_score,
            "analysis_date": analysis.analysis_date.isoformat(),
            "status": analysis.status.value,
            "expert_contact_required": analysis.expert_contact_required,
            "farm_id": analysis.farm_id,
            "plot_id": analysis.plot_id
        })
    
    return recent_analyses


@router.post("/recommendation/{recommendation_id}/feedback")
async def update_recommendation_feedback(
    recommendation_id: int,
    is_applied: bool,
    effectiveness_rating: Optional[int] = None,
    user_feedback: Optional[str] = None,
    application_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update fertilizer recommendation with user feedback
    Helps improve future recommendations
    """
    
    recommendation = db.get(CinnamonFertilizerRecommendation, recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    # Update feedback fields
    recommendation.is_applied = is_applied
    if effectiveness_rating is not None:
        if not (1 <= effectiveness_rating <= 5):
            raise HTTPException(status_code=400, detail="Effectiveness rating must be between 1 and 5")
        recommendation.effectiveness_rating = effectiveness_rating
    
    if user_feedback:
        recommendation.user_feedback = user_feedback
    
    if application_date:
        try:
            recommendation.application_date = datetime.fromisoformat(application_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD)")
    
    recommendation.updated_at = datetime.utcnow()
    
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)
    
    return {
        "message": "Feedback updated successfully",
        "recommendation_id": recommendation_id,
        "is_applied": is_applied,
        "effectiveness_rating": effectiveness_rating,
        "updated_at": recommendation.updated_at.isoformat()
    }


@router.get("/statistics", response_model=Dict[str, Any])
async def get_analysis_statistics(db: Session = Depends(get_db)):
    """
    Get statistics about cinnamon leaf analyses
    """
    
    # Get total analyses count
    total_analyses = db.exec(select(DeficiencyAnalysis)).all()
    
    # Count by deficiency type
    deficiency_counts = {}
    confidence_scores = []
    processing_times = []
    
    for analysis in total_analyses:
        deficiency_type = analysis.primary_deficiency.value
        deficiency_counts[deficiency_type] = deficiency_counts.get(deficiency_type, 0) + 1
        confidence_scores.append(analysis.confidence_score)
        if analysis.processing_time_seconds:
            processing_times.append(analysis.processing_time_seconds)
    
    # Calculate statistics
    stats = {
        "total_analyses": len(total_analyses),
        "deficiency_distribution": deficiency_counts,
        "confidence_statistics": {
            "average": sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0,
            "min": min(confidence_scores) if confidence_scores else 0,
            "max": max(confidence_scores) if confidence_scores else 0
        },
        "performance_statistics": {
            "average_processing_time": sum(processing_times) / len(processing_times) if processing_times else 0,
            "min_processing_time": min(processing_times) if processing_times else 0,
            "max_processing_time": max(processing_times) if processing_times else 0
        },
        "expert_consultation_rate": len([a for a in total_analyses if a.expert_contact_required]) / len(total_analyses) if total_analyses else 0
    }
    
    return stats


def create_fertilizer_recommendation(db: Session, analysis_id: int):
    """
    Background task to create fertilizer recommendation
    """
    try:
        analysis = db.get(DeficiencyAnalysis, analysis_id)
        if not analysis or analysis.primary_deficiency == DeficiencyType.HEALTHY:
            return
        
        # Get detector for recommendation mapping
        detector = get_detector()
        recommendations = detector.recommendation_mapping.get(analysis.primary_deficiency.value, {})
        
        if not recommendations:
            return
        
        # Create recommendation record
        inorganic = recommendations.get("inorganic", {})
        organic = recommendations.get("organic", {})
        
        db_recommendation = CinnamonFertilizerRecommendation(
            deficiency_analysis_id=analysis_id,
            deficiency_type=analysis.primary_deficiency,
            inorganic_fertilizer_type=inorganic.get("fertilizer", "N/A"),
            inorganic_dosage_per_plant=float(inorganic.get("dosage", "0").replace("g per plant", "").strip()) if inorganic.get("dosage") else 0,
            inorganic_application_method=inorganic.get("split_application", "Apply around root zone"),
            inorganic_frequency=inorganic.get("frequency", "As needed"),
            inorganic_split_schedule=inorganic.get("split_application"),
            organic_fertilizer_type=organic.get("fertilizer", "N/A"),
            organic_application_rate=float(organic.get("rate", "0").replace("kg per plant", "").strip()) if organic.get("rate") else 0,
            organic_timing=organic.get("timing", "Seasonal application"),
            application_method_details=f"Apply {inorganic.get('fertilizer', 'fertilizer')} around the root zone, 30cm from trunk.",
            best_application_season="During monsoon season (May-September and December-February)",
            priority_level=4 if analysis.primary_deficiency == DeficiencyType.PHOSPHORUS_DEFICIENCY else 3,
            action_required_within_days=14 if analysis.primary_deficiency == DeficiencyType.PHOSPHORUS_DEFICIENCY else 30,
            additional_notes=f"Monitor leaf improvement within 2-3 weeks. Ensure adequate water for nutrient uptake."
        )
        
        db.add(db_recommendation)
        db.commit()
        db.refresh(db_recommendation)
        
        logger.info(f"Fertilizer recommendation created for analysis {analysis_id}")
        
    except Exception as e:
        logger.error(f"Failed to create fertilizer recommendation for analysis {analysis_id}: {str(e)}")
        db.rollback()


# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for cinnamon analysis service"""
    detector = get_detector()
    
    return {
        "status": "healthy",
        "service": "Cinnamon Leaf Deficiency Analysis",
        "model_version": detector.model_version,
        "model_type": "ensemble" if isinstance(detector, EnhancedCinnamonDetector) else "rule_based",
        "timestamp": datetime.now().isoformat()
    }
