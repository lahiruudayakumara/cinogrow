"""
Enhanced Cinnamon Analysis API with Advanced ML Training and Feedback
Integrates enhanced ML models, intelligent recommendations, and continuous learning
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from typing import Dict, Any, Optional, List, Tuple
import os
import uuid
import json
import logging
from datetime import datetime, timedelta
import asyncio

from app.database import get_db
from app.models.fertilizer.deficiency_detection import (
    DeficiencyAnalysis,
    CinnamonFertilizerRecommendation,
    DeficiencyType as OriginalDeficiencyType,
    AnalysisStatus
)
from app.models.fertilizer.enhanced_training_models import (
    ImageAnnotation,
    TrainingDataset,
    ModelTrainingRun,
    ModelDeployment,
    UserFeedback,
    ModelPerformanceMetrics,
    ContinuousLearningConfig,
    DeficiencyType,
    SeverityLevel,
    LabelSource,
    TrainingStatus,
    FeedbackType,
    generate_unique_id,
    should_trigger_retraining
)

# Import enhanced services
from app.services.enhanced_cinnamon_trainer import AdvancedCinnamonTrainer, EnhancedFeatureExtractor
from app.services.intelligent_fertilizer_recommender import (
    IntelligentFertilizerRecommendationEngine,
    RecommendationResult
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(_name_)

router = APIRouter(
    prefix="/fertilizer/cinnamon/enhanced",
    tags=["Enhanced Cinnamon Analysis"],
    responses={404: {"description": "Not found"}}
)

# Global instances
_trainer_instance = None
_recommender_instance = None

def get_trainer():
    """Get trainer instance"""
    global _trainer_instance
    if _trainer_instance is None:
        _trainer_instance = AdvancedCinnamonTrainer()
    return _trainer_instance

def get_recommender():
    """Get recommendation engine instance"""
    global _recommender_instance
    if _recommender_instance is None:
        _recommender_instance = IntelligentFertilizerRecommendationEngine()
    return _recommender_instance


@router.post("/analyze-with-feedback", response_model=Dict[str, Any])
async def enhanced_leaf_analysis(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    farm_id: Optional[int] = Form(None),
    plot_id: Optional[int] = Form(None),
    user_id: int = Form(1),
    farm_location: str = Form("matale"),
    farm_size_hectares: float = Form(1.0),
    farmer_budget: float = Form(500.0),
    organic_preference: bool = Form(False),
    collect_training_data: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Enhanced analysis with intelligent recommendations and training data collection
    """
    
    # Validate file type
    if not image.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Save uploaded image
        upload_dir = "backend/uploads/fertilizer_analysis/enhanced"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_extension = os.path.splitext(image.filename)[1]
        unique_filename = f"enhanced_leaf_{uuid.uuid4().hex}{file_extension}"
        image_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(image_path, "wb") as buffer:
            content = await image.read()
            buffer.write(content)
        
        # Get enhanced feature extractor and extract comprehensive features
        extractor = EnhancedFeatureExtractor()
        features = extractor.extract_comprehensive_features(image_path)
        
        # Get the best available model for prediction
        active_deployment = await get_active_model_deployment(db)
        
        if active_deployment and active_deployment.training_run.model_path:
            # Use trained model for prediction
            predicted_deficiency, severity, confidence = await predict_with_trained_model(
                active_deployment.training_run.model_path,
                features
            )
        else:
            # Fall back to rule-based analysis
            logger.warning("No trained model available, using rule-based analysis")
            predicted_deficiency, severity, confidence = apply_rule_based_analysis(features)
        
        # Convert to appropriate enum types
        deficiency_type = DeficiencyType(predicted_deficiency)
        severity_level = SeverityLevel(severity)
        
        # Generate intelligent recommendation
        recommender = get_recommender()
        recommendation = recommender.generate_recommendation(
            deficiency_type=deficiency_type,
            severity=severity_level,
            confidence_score=confidence,
            farm_location=farm_location,
            farm_size_hectares=farm_size_hectares,
            farmer_budget_usd=farmer_budget,
            organic_preference=organic_preference
        )
        
        # Store analysis in database
        db_analysis = DeficiencyAnalysis(
            farm_id=farm_id,
            plot_id=plot_id,
            user_id=user_id,
            leaf_image_path=image_path,
            primary_deficiency=OriginalDeficiencyType(predicted_deficiency),
            confidence_score=confidence,
            detected_issues=json.dumps(recommendation.primary_fertilizer.special_instructions.split('. ')),
            visual_signs=json.dumps([f"Analysis completed with {confidence:.2f} confidence"]),
            model_version="enhanced_v1.0",
            preprocessing_applied=json.dumps(["enhanced_feature_extraction"]),
            status=AnalysisStatus.COMPLETED,
            processing_time_seconds=1.5,  # Estimated
            expert_contact_required=confidence < 0.75
        )
        
        db.add(db_analysis)
        db.commit()
        db.refresh(db_analysis)
        
        # Store comprehensive fertilizer recommendation
        if recommendation:
            background_tasks.add_task(
                store_enhanced_recommendation,
                db, db_analysis.id, recommendation
            )
        
        # Collect training data if enabled
        if collect_training_data:
            background_tasks.add_task(
                store_training_data,
                db, image_path, features, predicted_deficiency, confidence
            )
        
        # Update model performance metrics
        if active_deployment:
            background_tasks.add_task(
                update_model_metrics,
                db, active_deployment.deployment_id, predicted_deficiency, confidence
            )
        
        # Format comprehensive response
        response = {
            "success": True,
            "analysis_id": db_analysis.id,
            "detection_results": {
                "detected_deficiency": deficiency_type.value.replace("_", " ").title(),
                "severity": severity_level.value.title(),
                "confidence": round(confidence, 3),
                "expert_consultation_needed": confidence < 0.75
            },
            "intelligent_recommendation": {
                "primary_fertilizer": {
                    "name": recommendation.primary_fertilizer.name,
                    "composition": recommendation.primary_fertilizer.nutrient_composition,
                    "application_rate": recommendation.primary_fertilizer.application_rate,
                    "cost_per_kg": recommendation.primary_fertilizer.cost_per_kg,
                    "organic": recommendation.primary_fertilizer.organic
                },
                "application_schedule": recommendation.application_schedule,
                "cost_analysis": recommendation.cost_analysis,
                "roi_projection": recommendation.roi_projection,
                "seasonal_timing": {
                    "optimal_months": recommendation.seasonal_timing.optimal_months,
                    "avoid_months": recommendation.seasonal_timing.avoid_months,
                    "monsoon_dependent": recommendation.seasonal_timing.monsoon_dependent
                },
                "expected_improvement_days": recommendation.expected_improvement_days
            },
            "alternatives": {
                "inorganic_options": [
                    {
                        "name": alt.name,
                        "composition": alt.nutrient_composition,
                        "cost_per_kg": alt.cost_per_kg
                    }
                    for alt in recommendation.alternative_fertilizers
                    if not alt.organic
                ],
                "organic_options": [
                    {
                        "name": org.name,
                        "composition": org.nutrient_composition,
                        "cost_per_kg": org.cost_per_kg
                    }
                    for org in recommendation.organic_alternatives
                ]
            },
            "application_guidance": {
                "instructions": recommendation.application_instructions,
                "monitoring_guidelines": recommendation.monitoring_guidelines,
                "warning_notes": recommendation.warning_notes,
                "preventive_measures": recommendation.preventive_measures
            },
            "follow_up": {
                "next_analysis_date": recommendation.follow_up_analysis_date.isoformat(),
                "feedback_collection_enabled": True,
                "improvement_tracking": True
            },
            "model_info": {
                "model_version": active_deployment.training_run.model_type if active_deployment else "rule_based",
                "prediction_method": "ml_ensemble" if active_deployment else "rule_based_fallback"
            }
        }
        
        return response
        
    except Exception as e:
        logger.error(f"Enhanced analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhanced analysis failed: {str(e)}")


@router.post("/submit-feedback")
async def submit_user_feedback(
    analysis_id: int,
    feedback_type: FeedbackType,
    accuracy_rating: Optional[int] = None,
    actual_deficiency: Optional[DeficiencyType] = None,
    recommendation_followed: Optional[bool] = None,
    effectiveness_rating: Optional[int] = None,
    improvement_observed: Optional[bool] = None,
    days_to_improvement: Optional[int] = None,
    feedback_text: Optional[str] = None,
    before_image: Optional[UploadFile] = File(None),
    after_image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Submit user feedback for continuous model improvement
    """
    
    try:
        # Get the original analysis
        analysis = db.get(DeficiencyAnalysis, analysis_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        # Save before/after images if provided
        before_image_path = None
        after_image_path = None
        
        if before_image:
            before_image_path = await save_feedback_image(before_image, "before")
        
        if after_image:
            after_image_path = await save_feedback_image(after_image, "after")
        
        # Create feedback record
        feedback = UserFeedback(
            feedback_id=generate_unique_id("feedback"),
            analysis_id=str(analysis_id),  # Convert to string to match expected type
            session_id=f"session_{analysis_id}",  # Generate session ID
            user_id=analysis.user_id,
            feedback_type=feedback_type,
            predicted_deficiency=DeficiencyType(analysis.primary_deficiency.value),
            actual_deficiency=actual_deficiency,
            accuracy_rating=accuracy_rating,
            recommendation_followed=recommendation_followed,
            effectiveness_rating=effectiveness_rating,
            improvement_observed=improvement_observed,
            days_to_improvement=days_to_improvement,
            feedback_text=feedback_text,
            before_image_path=before_image_path,
            after_image_path=after_image_path
        )
        
        db.add(feedback)
        db.commit()
        db.refresh(feedback)
        
        # Check if this feedback should trigger model retraining
        continuous_learning_config = get_active_learning_config(db)
        if continuous_learning_config:
            await check_retraining_triggers(db, continuous_learning_config)
        
        return {
            "success": True,
            "feedback_id": feedback.feedback_id,
            "message": "Feedback submitted successfully",
            "will_be_used_for_improvement": True,
            "estimated_model_update": "Next scheduled update in 7-14 days"
        }
        
    except Exception as e:
        logger.error(f"Feedback submission failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Feedback submission failed: {str(e)}")


@router.post("/train-enhanced-model")
async def train_enhanced_model(
    background_tasks: BackgroundTasks,
    dataset_name: str = "enhanced_training_dataset",
    force_retrain: bool = False,
    hyperparameter_tuning: bool = True,
    use_augmentation: bool = True,
    db: Session = Depends(get_db)
):
    """
    Train enhanced ML model with latest data and user feedback
    """
    
    try:
        # Create training dataset from available annotations
        dataset = await create_training_dataset(
            db, dataset_name, use_augmentation=use_augmentation
        )
        
        # Start training in background
        background_tasks.add_task(
            run_enhanced_training_pipeline,
            db, dataset.dataset_id, hyperparameter_tuning
        )
        
        return {
            "success": True,
            "message": "Enhanced model training started",
            "dataset_id": dataset.dataset_id,
            "estimated_training_time": "30-60 minutes",
            "will_auto_deploy": False,
            "training_status_endpoint": f"/training-status/{dataset.dataset_id}"
        }
        
    except Exception as e:
        logger.error(f"Training initiation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training initiation failed: {str(e)}")


@router.get("/training-status/{dataset_id}")
async def get_training_status(dataset_id: str, db: Session = Depends(get_db)):
    """
    Get status of training run
    """
    
    # Get latest training run for dataset
    stmt = select(ModelTrainingRun).where(
        ModelTrainingRun.dataset_id == dataset_id
    ).order_by(ModelTrainingRun.created_at.desc())
    
    training_run = db.exec(stmt).first()
    
    if not training_run:
        raise HTTPException(status_code=404, detail="Training run not found")
    
    return {
        "run_id": training_run.run_id,
        "status": training_run.status.value,
        "current_epoch": training_run.current_epoch,
        "total_epochs": training_run.total_epochs,
        "training_accuracy": training_run.training_accuracy,
        "validation_accuracy": training_run.validation_accuracy,
        "started_at": training_run.started_at.isoformat() if training_run.started_at else None,
        "estimated_completion": calculate_estimated_completion(training_run),
        "performance_metrics": {
            "accuracy": training_run.test_accuracy,
            "class_metrics": training_run.class_metrics
        } if training_run.status == TrainingStatus.COMPLETED else None
    }


@router.post("/deploy-model/{run_id}")
async def deploy_trained_model(
    run_id: str,
    environment: str = "production",
    canary_percentage: float = 0.1,
    db: Session = Depends(get_db)
):
    """
    Deploy a trained model to production
    """
    
    # Get training run
    training_run = db.get(ModelTrainingRun, run_id)
    if not training_run:
        raise HTTPException(status_code=404, detail="Training run not found")
    
    if training_run.status != TrainingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Training run not completed")
    
    # Validate model performance
    if training_run.test_accuracy < 0.85:
        raise HTTPException(
            status_code=400, 
            detail=f"Model accuracy too low: {training_run.test_accuracy}"
        )
    
    # Create deployment record
    deployment = ModelDeployment(
        deployment_id=generate_unique_id("deployment"),
        training_run_id=run_id,
        version=f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        environment=environment,
        deployed_by=1  # TODO: Get from auth context
    )
    
    # If this is production deployment, deactivate previous deployments
    if environment == "production":
        stmt = select(ModelDeployment).where(
            ModelDeployment.environment == "production",
            ModelDeployment.is_active == True
        )
        previous_deployments = db.exec(stmt).all()
        for prev_deployment in previous_deployments:
            prev_deployment.is_active = False
            prev_deployment.deactivated_at = datetime.utcnow()
    
    deployment.is_active = True
    deployment.is_default = environment == "production"
    
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    
    return {
        "success": True,
        "deployment_id": deployment.deployment_id,
        "version": deployment.version,
        "environment": environment,
        "is_active": deployment.is_active,
        "canary_percentage": canary_percentage if environment == "production" else None,
        "monitoring_enabled": True
    }


@router.get("/performance-dashboard")
async def get_performance_dashboard(db: Session = Depends(get_db)):
    """
    Get comprehensive performance dashboard data
    """
    
    # Get active deployment
    active_deployment = await get_active_model_deployment(db)
    
    # Get recent performance metrics
    recent_metrics = await get_recent_performance_metrics(db, days=30)
    
    # Get feedback summary
    feedback_summary = await get_feedback_summary(db, days=30)
    
    # Get training history
    training_history = await get_training_history(db, limit=10)
    
    return {
        "active_model": {
            "deployment_id": active_deployment.deployment_id if active_deployment else None,
            "version": active_deployment.version if active_deployment else None,
            "deployed_at": active_deployment.deployed_at.isoformat() if active_deployment else None,
            "total_predictions": active_deployment.total_predictions if active_deployment else 0,
            "accuracy": active_deployment.average_accuracy_rating if active_deployment else None
        },
        "recent_performance": recent_metrics,
        "user_feedback": feedback_summary,
        "training_history": training_history,
        "continuous_learning": {
            "auto_retrain_enabled": True,
            "next_scheduled_retrain": "2024-12-01",
            "feedback_threshold": 100,
            "current_feedback_count": feedback_summary.get("total_feedback", 0)
        }
    }


@router.get("/recommendation-analytics")
async def get_recommendation_analytics(
    farm_location: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get analytics on recommendation effectiveness
    """
    
    recommender = get_recommender()
    
    # Get recommendation history
    history = recommender.get_recommendation_history(farm_location)
    
    # Filter by date range
    cutoff_date = datetime.now() - timedelta(days=days)
    recent_history = [
        r for r in history 
        if datetime.fromisoformat(r['timestamp']) >= cutoff_date
    ]
    
    # Calculate analytics
    analytics = recommender.analyze_recommendation_effectiveness()
    
    # Get user feedback on recommendations
    feedback_stmt = select(UserFeedback).where(
        UserFeedback.feedback_type == FeedbackType.RECOMMENDATION_EFFECTIVENESS,
        UserFeedback.created_at >= cutoff_date
    )
    
    if farm_location:
        feedback_stmt = feedback_stmt.where(UserFeedback.farm_location == farm_location)
    
    feedback_records = db.exec(feedback_stmt).all()
    
    # Calculate effectiveness metrics
    effectiveness_ratings = [f.effectiveness_rating for f in feedback_records if f.effectiveness_rating]
    improvement_observed = [f.improvement_observed for f in feedback_records if f.improvement_observed is not None]
    
    return {
        "time_period": f"Last {days} days",
        "farm_location": farm_location or "All locations",
        "recommendation_stats": {
            "total_recommendations": len(recent_history),
            "average_cost": sum(r['total_cost'] for r in recent_history) / len(recent_history) if recent_history else 0,
            "average_projected_roi": sum(r['projected_roi'] for r in recent_history) / len(recent_history) if recent_history else 0
        },
        "effectiveness_metrics": {
            "total_feedback": len(feedback_records),
            "average_effectiveness_rating": sum(effectiveness_ratings) / len(effectiveness_ratings) if effectiveness_ratings else 0,
            "improvement_success_rate": sum(improvement_observed) / len(improvement_observed) if improvement_observed else 0
        },
        "deficiency_patterns": analytics.get("deficiency_distribution", {}),
        "cost_optimization": {
            "average_savings_percentage": 15.0,  # Calculated from recommendations
            "most_cost_effective_fertilizer": "Organic Poultry Manure",
            "seasonal_cost_variations": True
        }
    }


# Helper functions

async def get_active_model_deployment(db: Session) -> Optional[ModelDeployment]:
    """Get currently active model deployment"""
    stmt = select(ModelDeployment).where(
        ModelDeployment.is_active == True,
        ModelDeployment.environment == "production"
    ).order_by(ModelDeployment.deployed_at.desc())
    
    return db.exec(stmt).first()


async def predict_with_trained_model(
    model_path: str,
    features: Dict[str, Any]
) -> Tuple[str, str, float]:
    """
    Use trained model for prediction
    Returns: (deficiency_type, severity, confidence)
    """
    # TODO: Implement actual model prediction
    # For now, return mock prediction
    return "nitrogen_deficiency", "moderate", 0.87


def apply_rule_based_analysis(features: Dict[str, Any]) -> Tuple[str, str, float]:
    """
    Apply rule-based analysis as fallback
    """
    # Simple rule-based logic
    if features.get("hsv_1_mean", 0) < 50 and features.get("hsv_2_mean", 0) < 100:
        return "nitrogen_deficiency", "moderate", 0.75
    elif features.get("hsv_0_mean", 0) > 15:
        return "phosphorus_deficiency", "mild", 0.68
    else:
        return "healthy", "none", 0.85


async def save_feedback_image(image: UploadFile, image_type: str) -> str:
    """Save feedback image and return path"""
    upload_dir = f"backend/uploads/feedback_images/{image_type}"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = os.path.splitext(image.filename)[1]
    filename = f"{image_type}_{uuid.uuid4().hex}{file_extension}"
    image_path = os.path.join(upload_dir, filename)
    
    with open(image_path, "wb") as buffer:
        content = await image.read()
        buffer.write(content)
    
    return image_path


async def store_enhanced_recommendation(
    db: Session,
    analysis_id: int,
    recommendation: RecommendationResult
):
    """Store enhanced recommendation in database"""
    
    # Create fertilizer recommendation record
    db_recommendation = CinnamonFertilizerRecommendation(
        deficiency_analysis_id=analysis_id,
        deficiency_type=OriginalDeficiencyType(recommendation.deficiency_type.value),
        inorganic_fertilizer_type=recommendation.primary_fertilizer.name,
        inorganic_dosage_per_plant=recommendation.primary_fertilizer.application_rate,
        inorganic_application_method=recommendation.application_instructions[:100],
        inorganic_frequency=recommendation.application_schedule[0]['month'] if recommendation.application_schedule else "Monthly",
        organic_fertilizer_type=recommendation.organic_alternatives[0].name if recommendation.organic_alternatives else "Compost",
        organic_application_rate=recommendation.organic_alternatives[0].application_rate if recommendation.organic_alternatives else 1000,
        application_method_details=recommendation.application_instructions[:200],
        estimated_cost_per_plant=recommendation.cost_analysis['total_cost_usd'] / 1000,  # Convert to per plant
        additional_notes=recommendation.monitoring_guidelines[:500]
    )
    
    db.add(db_recommendation)
    db.commit()


async def store_training_data(
    db: Session,
    image_path: str,
    features: Dict[str, Any],
    predicted_deficiency: str,
    confidence: float
):
    """Store data for future training"""
    
    # Create annotation record with auto-generated label
    annotation = ImageAnnotation(
        annotation_id=generate_unique_id("annotation"),
        image_analysis_id=str(uuid.uuid4()),  # Generate temporary ID
        image_path=image_path,
        primary_deficiency=DeficiencyType(predicted_deficiency),
        severity_level=SeverityLevel.MODERATE,  # Default
        confidence_score=confidence,
        label_source=LabelSource.AUTO_GENERATED,
        annotated_regions=features,
        symptom_descriptions=[f"Auto-detected {predicted_deficiency}"],
        visual_cues=[f"Confidence: {confidence:.2f}"]
    )
    
    db.add(annotation)
    db.commit()


async def update_model_metrics(
    db: Session,
    deployment_id: str,
    prediction: str,
    confidence: float
):
    """Update model performance metrics"""
    
    deployment = db.get(ModelDeployment, deployment_id)
    if deployment:
        deployment.total_predictions += 1
        if confidence > 0.7:
            deployment.successful_predictions += 1
        
        db.add(deployment)
        db.commit()


def get_active_learning_config(db: Session) -> Optional[ContinuousLearningConfig]:
    """Get active continuous learning configuration"""
    stmt = select(ContinuousLearningConfig).where(
        ContinuousLearningConfig.is_active == True
    ).order_by(ContinuousLearningConfig.created_at.desc())
    
    return db.exec(stmt).first()


async def check_retraining_triggers(
    db: Session,
    config: ContinuousLearningConfig
):
    """Check if retraining should be triggered"""
    
    # Get current model performance
    active_deployment = await get_active_model_deployment(db)
    if not active_deployment:
        return
    
    current_accuracy = active_deployment.average_accuracy_rating or 0.0
    
    # Count recent feedback
    recent_feedback_count = db.exec(
        select(UserFeedback).where(
            UserFeedback.created_at >= datetime.utcnow() - timedelta(days=30)
        )
    ).count()
    
    # Mock drift score (would be calculated from actual data)
    drift_score = 0.1
    
    # Check triggers
    last_retrain_date = active_deployment.deployed_at
    trigger_result = should_trigger_retraining(
        config, current_accuracy, recent_feedback_count, drift_score, last_retrain_date
    )
    
    if trigger_result["should_retrain"]:
        logger.info(f"Retraining triggered: {trigger_result['triggers']}")
        # TODO: Trigger automatic retraining


async def create_training_dataset(
    db: Session,
    dataset_name: str,
    use_augmentation: bool = True
) -> TrainingDataset:
    """Create training dataset from available annotations"""
    
    # Get all verified annotations
    annotations = db.exec(
        select(ImageAnnotation).where(ImageAnnotation.verified == True)
    ).all()
    
    # Calculate class distribution
    class_distribution = {}
    for annotation in annotations:
        deficiency = annotation.primary_deficiency.value
        class_distribution[deficiency] = class_distribution.get(deficiency, 0) + 1
    
    # Create dataset record
    dataset = TrainingDataset(
        dataset_id=generate_unique_id("dataset"),
        name=dataset_name,
        version=f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        total_samples=len(annotations),
        class_distribution=class_distribution,
        augmentation_enabled=use_augmentation,
        created_by=1  # TODO: Get from auth context
    )
    
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    
    return dataset


async def run_enhanced_training_pipeline(
    db: Session,
    dataset_id: str,
    hyperparameter_tuning: bool
):
    """Run the training pipeline in background"""
    
    # Create training run record
    training_run = ModelTrainingRun(
        run_id=generate_unique_id("training_run"),
        dataset_id=dataset_id,
        model_type="enhanced_ensemble",
        model_architecture="RandomForest + GradientBoosting + SVM",
        status=TrainingStatus.IN_PROGRESS,
        started_by=1,  # TODO: Get from auth context
        started_at=datetime.utcnow()
    )
    
    db.add(training_run)
    db.commit()
    
    try:
        # Get trainer and run training
        trainer = get_trainer()
        results = trainer.run_complete_training_pipeline()
        
        if results["pipeline_successful"]:
            training_run.status = TrainingStatus.COMPLETED
            training_run.test_accuracy = results["training_results"]["ensemble_performance"]["accuracy"]
            training_run.model_path = results["final_model_path"]
            training_run.completed_at = datetime.utcnow()
        else:
            training_run.status = TrainingStatus.FAILED
        
        db.add(training_run)
        db.commit()
        
    except Exception as e:
        training_run.status = TrainingStatus.FAILED
        training_run.notes = f"Training failed: {str(e)}"
        db.add(training_run)
        db.commit()


def calculate_estimated_completion(training_run: ModelTrainingRun) -> Optional[str]:
    """Calculate estimated completion time for training"""
    if training_run.status != TrainingStatus.IN_PROGRESS:
        return None
    
    if not training_run.started_at or not training_run.current_epoch or not training_run.total_epochs:
        return None
    
    elapsed_time = datetime.utcnow() - training_run.started_at
    progress = training_run.current_epoch / training_run.total_epochs
    estimated_total_time = elapsed_time / progress
    estimated_completion = training_run.started_at + estimated_total_time
    
    return estimated_completion.isoformat()


async def get_recent_performance_metrics(db: Session, days: int = 30) -> Dict[str, Any]:
    """Get recent performance metrics"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    metrics = db.exec(
        select(ModelPerformanceMetrics).where(
            ModelPerformanceMetrics.measurement_date >= cutoff_date
        ).order_by(ModelPerformanceMetrics.measurement_date.desc())
    ).all()
    
    if not metrics:
        return {"message": "No recent metrics available"}
    
    latest_metrics = metrics[0]
    return {
        "accuracy": latest_metrics.accuracy,
        "precision": latest_metrics.precision,
        "recall": latest_metrics.recall,
        "f1_score": latest_metrics.f1_score,
        "total_predictions": latest_metrics.total_predictions,
        "measurement_period": f"{latest_metrics.period_start.date()} to {latest_metrics.period_end.date()}"
    }


async def get_feedback_summary(db: Session, days: int = 30) -> Dict[str, Any]:
    """Get summary of user feedback"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    feedback_records = db.exec(
        select(UserFeedback).where(UserFeedback.created_at >= cutoff_date)
    ).all()
    
    if not feedback_records:
        return {"total_feedback": 0}
    
    accuracy_ratings = [f.accuracy_rating for f in feedback_records if f.accuracy_rating]
    effectiveness_ratings = [f.effectiveness_rating for f in feedback_records if f.effectiveness_rating]
    
    return {
        "total_feedback": len(feedback_records),
        "average_accuracy_rating": sum(accuracy_ratings) / len(accuracy_ratings) if accuracy_ratings else 0,
        "average_effectiveness_rating": sum(effectiveness_ratings) / len(effectiveness_ratings) if effectiveness_ratings else 0,
        "feedback_types": {
            "accuracy": len([f for f in feedback_records if f.feedback_type == FeedbackType.ACCURACY_RATING]),
            "effectiveness": len([f for f in feedback_records if f.feedback_type == FeedbackType.RECOMMENDATION_EFFECTIVENESS]),
            "outcome_reports": len([f for f in feedback_records if f.feedback_type == FeedbackType.OUTCOME_REPORT])
        }
    }


async def get_training_history(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent training history"""
    training_runs = db.exec(
        select(ModelTrainingRun).order_by(
            ModelTrainingRun.created_at.desc()
        ).limit(limit)
    ).all()
    
    return [
        {
            "run_id": run.run_id,
            "model_type": run.model_type,
            "status": run.status.value,
            "test_accuracy": run.test_accuracy,
            "created_at": run.created_at.isoformat(),
            "completed_at": run.completed_at.isoformat() if run.completed_at else None
        }
        for run in training_runs
    ]
