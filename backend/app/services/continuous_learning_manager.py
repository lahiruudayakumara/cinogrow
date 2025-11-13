"""
Continuous Learning System for Cinnamon Deficiency Detection
Implements real-time model updates, feedback processing, and adaptive learning
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import numpy as np
from sqlmodel import Session, select
from fastapi import BackgroundTasks

from app.database import get_db
from app.models.fertilizer.enhanced_training_models import (
    UserFeedback,
    ModelDeployment,
    ModelTrainingRun,
    TrainingDataset,
    ImageAnnotation,
    ModelPerformanceMetrics,
    ContinuousLearningConfig,
    DeficiencyType,
    LabelSource,
    TrainingStatus,
    FeedbackType,
    generate_unique_id,
    should_trigger_retraining
)
from app.services.enhanced_cinnamon_trainer import AdvancedCinnamonTrainer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ContinuousLearningManager:
    """
    Manages continuous learning pipeline for cinnamon deficiency detection
    Handles feedback processing, model retraining, and adaptive updates
    """
    
    def __init__(self):
        self.trainer = AdvancedCinnamonTrainer()
        self.feedback_queue = []
        self.performance_threshold = 0.85
        self.feedback_batch_size = 50
        self.retrain_frequency_days = 30
        
        # Learning configurations
        self.learning_config = {
            'adaptive_threshold': True,
            'incremental_learning': True,
            'feedback_weighting': True,
            'expert_feedback_weight': 2.0,
            'farmer_feedback_weight': 1.0,
            'laboratory_feedback_weight': 3.0
        }
        
        # Performance monitoring
        self.performance_history = []
        self.drift_detection_window = 100
        self.drift_threshold = 0.15

    async def process_feedback_batch(self, db: Session) -> Dict[str, Any]:
        """
        Process a batch of user feedback for continuous learning
        """
        try:
            # Get unprocessed feedback
            unprocessed_feedback = db.exec(
                select(UserFeedback).where(UserFeedback.processed == False)
                .limit(self.feedback_batch_size)
            ).all()
            
            if not unprocessed_feedback:
                return {"message": "No unprocessed feedback available"}
            
            logger.info(f"Processing {len(unprocessed_feedback)} feedback items")
            
            # Group feedback by type
            feedback_groups = self._group_feedback_by_type(unprocessed_feedback)
            
            # Process each group
            processing_results = {}
            
            for feedback_type, feedback_items in feedback_groups.items():
                if feedback_type == FeedbackType.ACCURACY_RATING:
                    results = await self._process_accuracy_feedback(db, feedback_items)
                elif feedback_type == FeedbackType.RECOMMENDATION_EFFECTIVENESS:
                    results = await self._process_effectiveness_feedback(db, feedback_items)
                elif feedback_type == FeedbackType.OUTCOME_REPORT:
                    results = await self._process_outcome_feedback(db, feedback_items)
                else:
                    results = await self._process_general_feedback(db, feedback_items)
                
                processing_results[feedback_type.value] = results
            
            # Mark feedback as processed
            for feedback in unprocessed_feedback:
                feedback.processed = True
                feedback.processed_at = datetime.utcnow()
            
            db.commit()
            
            # Update performance metrics
            await self._update_performance_metrics(db, processing_results)
            
            # Check if retraining is needed
            retraining_decision = await self._evaluate_retraining_need(db)
            
            return {
                "processed_feedback_count": len(unprocessed_feedback),
                "processing_results": processing_results,
                "retraining_decision": retraining_decision,
                "performance_impact": await self._calculate_performance_impact(db),
                "next_processing_time": (datetime.utcnow() + timedelta(hours=6)).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Feedback batch processing failed: {str(e)}")
            raise

    async def _process_accuracy_feedback(self, db: Session, feedback_items: List[UserFeedback]) -> Dict[str, Any]:
        """Process accuracy feedback to improve model predictions"""
        
        correction_count = 0
        total_feedback = len(feedback_items)
        
        for feedback in feedback_items:
            if feedback.predicted_deficiency != feedback.actual_deficiency:
                # Create corrected annotation
                await self._create_corrected_annotation(db, feedback)
                correction_count += 1
        
        # Calculate accuracy metrics
        accuracy_ratings = [f.accuracy_rating for f in feedback_items if f.accuracy_rating]
        avg_accuracy = sum(accuracy_ratings) / len(accuracy_ratings) if accuracy_ratings else 0
        
        # Update model confidence based on feedback
        if avg_accuracy < 3.0:  # Low accuracy (1-5 scale)
            await self._adjust_model_confidence(db, decrease=True)
        
        return {
            "total_feedback": total_feedback,
            "corrections_needed": correction_count,
            "average_accuracy_rating": avg_accuracy,
            "correction_rate": correction_count / total_feedback if total_feedback > 0 else 0,
            "annotations_created": correction_count
        }

    async def _process_effectiveness_feedback(self, db: Session, feedback_items: List[UserFeedback]) -> Dict[str, Any]:
        """Process recommendation effectiveness feedback"""
        
        effective_recommendations = 0
        total_followed = 0
        
        for feedback in feedback_items:
            if feedback.recommendation_followed:
                total_followed += 1
                if feedback.improvement_observed:
                    effective_recommendations += 1
                    
                    # Record successful recommendation pattern
                    await self._record_successful_pattern(db, feedback)
        
        effectiveness_rate = effective_recommendations / total_followed if total_followed > 0 else 0
        
        # Update recommendation weights based on effectiveness
        if effectiveness_rate > 0.8:
            await self._boost_successful_recommendations(db, feedback_items)
        elif effectiveness_rate < 0.5:
            await self._revise_recommendation_patterns(db, feedback_items)
        
        return {
            "total_feedback": len(feedback_items),
            "recommendations_followed": total_followed,
            "effective_recommendations": effective_recommendations,
            "effectiveness_rate": effectiveness_rate,
            "recommendation_patterns_updated": True
        }

    async def _process_outcome_feedback(self, db: Session, feedback_items: List[UserFeedback]) -> Dict[str, Any]:
        """Process outcome reports with before/after images"""
        
        outcomes_with_images = 0
        improved_cases = 0
        
        for feedback in feedback_items:
            if feedback.before_image_path and feedback.after_image_path:
                outcomes_with_images += 1
                
                # Analyze improvement from images
                improvement_score = await self._analyze_improvement_images(
                    feedback.before_image_path, 
                    feedback.after_image_path
                )
                
                if improvement_score > 0.7:  # Significant improvement
                    improved_cases += 1
                    
                    # Create training data from successful treatment
                    await self._create_outcome_training_data(db, feedback, improvement_score)
        
        return {
            "total_feedback": len(feedback_items),
            "outcomes_with_images": outcomes_with_images,
            "improved_cases": improved_cases,
            "improvement_rate": improved_cases / outcomes_with_images if outcomes_with_images > 0 else 0,
            "training_samples_created": improved_cases
        }

    async def _process_general_feedback(self, db: Session, feedback_items: List[UserFeedback]) -> Dict[str, Any]:
        """Process general feedback and error reports"""
        
        error_reports = []
        suggestions = []
        
        for feedback in feedback_items:
            if feedback.feedback_text:
                if "error" in feedback.feedback_text.lower() or "wrong" in feedback.feedback_text.lower():
                    error_reports.append(feedback.feedback_text)
                elif "suggest" in feedback.feedback_text.lower():
                    suggestions.append(feedback.feedback_text)
        
        return {
            "total_feedback": len(feedback_items),
            "error_reports": len(error_reports),
            "suggestions": len(suggestions),
            "top_issues": await self._extract_common_issues(error_reports),
            "improvement_suggestions": await self._extract_suggestions(suggestions)
        }

    async def _create_corrected_annotation(self, db: Session, feedback: UserFeedback):
        """Create corrected annotation from user feedback"""
        
        # Get original analysis
        original_analysis = db.exec(
            select(ImageAnnotation).where(
                ImageAnnotation.image_analysis_id == feedback.analysis_id
            )
        ).first()
        
        if not original_analysis:
            return
        
        # Create corrected annotation
        corrected_annotation = ImageAnnotation(
            annotation_id=generate_unique_id("corrected_annotation"),
            image_analysis_id=feedback.analysis_id,
            image_path=original_analysis.image_path,
            primary_deficiency=feedback.actual_deficiency,
            severity_level=original_analysis.severity_level,  # Keep original severity
            confidence_score=1.0,  # High confidence for user corrections
            label_source=LabelSource.FARMER_FEEDBACK,
            annotator_id=feedback.user_id,
            symptom_descriptions=[f"Corrected from {feedback.predicted_deficiency.value} to {feedback.actual_deficiency.value}"],
            visual_cues=[f"User correction with {feedback.accuracy_rating}/5 confidence"],
            verified=True  # Trust user corrections
        )
        
        db.add(corrected_annotation)
        db.commit()

    async def _adjust_model_confidence(self, db: Session, decrease: bool = True):
        """Adjust model confidence thresholds based on feedback"""
        
        active_deployment = db.exec(
            select(ModelDeployment).where(
                ModelDeployment.is_active == True,
                ModelDeployment.environment == "production"
            )
        ).first()
        
        if active_deployment:
            # This would update model configuration
            # For now, just log the adjustment
            adjustment = "decreased" if decrease else "increased"
            logger.info(f"Model confidence threshold {adjustment} based on feedback")

    async def _record_successful_pattern(self, db: Session, feedback: UserFeedback):
        """Record patterns from successful recommendations"""
        
        # This would analyze the successful recommendation pattern
        # and update recommendation weights or rules
        success_pattern = {
            "deficiency_type": feedback.predicted_deficiency.value,
            "location": feedback.farm_location,
            "improvement_days": feedback.days_to_improvement,
            "effectiveness_rating": feedback.effectiveness_rating,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Store in recommendation patterns file or database
        patterns_file = Path("backend/data/successful_patterns.json")
        patterns_file.parent.mkdir(exist_ok=True)
        
        if patterns_file.exists():
            with open(patterns_file, 'r') as f:
                patterns = json.load(f)
        else:
            patterns = []
        
        patterns.append(success_pattern)
        
        # Keep only last 1000 patterns
        patterns = patterns[-1000:]
        
        with open(patterns_file, 'w') as f:
            json.dump(patterns, f, indent=2)

    async def _boost_successful_recommendations(self, db: Session, feedback_items: List[UserFeedback]):
        """Boost weights for successful recommendation patterns"""
        
        # Analyze successful patterns
        successful_patterns = {}
        
        for feedback in feedback_items:
            if feedback.improvement_observed and feedback.effectiveness_rating >= 4:
                pattern_key = f"{feedback.predicted_deficiency.value}_{feedback.farm_location}"
                if pattern_key not in successful_patterns:
                    successful_patterns[pattern_key] = 0
                successful_patterns[pattern_key] += 1
        
        # Update recommendation engine weights
        # This would interface with the recommendation engine
        logger.info(f"Boosted {len(successful_patterns)} successful recommendation patterns")

    async def _revise_recommendation_patterns(self, db: Session, feedback_items: List[UserFeedback]):
        """Revise recommendation patterns for low-effectiveness cases"""
        
        ineffective_patterns = {}
        
        for feedback in feedback_items:
            if not feedback.improvement_observed and feedback.effectiveness_rating <= 2:
                pattern_key = f"{feedback.predicted_deficiency.value}_{feedback.farm_location}"
                if pattern_key not in ineffective_patterns:
                    ineffective_patterns[pattern_key] = []
                ineffective_patterns[pattern_key].append(feedback.feedback_text)
        
        # Analyze and update recommendation patterns
        logger.info(f"Revised {len(ineffective_patterns)} ineffective recommendation patterns")

    async def _analyze_improvement_images(self, before_path: str, after_path: str) -> float:
        """Analyze improvement from before/after images"""
        
        try:
            # Use the enhanced feature extractor to compare images
            extractor = self.trainer.feature_extractor
            
            before_features = extractor.extract_comprehensive_features(before_path)
            after_features = extractor.extract_comprehensive_features(after_path)
            
            # Calculate improvement score based on green intensity and health indicators
            before_green = before_features.get("hsv_1_mean", 0) / 255.0  # Normalize
            after_green = after_features.get("hsv_1_mean", 0) / 255.0
            
            # Improvement in green intensity
            green_improvement = max(0, after_green - before_green)
            
            # Overall improvement score (0-1 scale)
            improvement_score = min(1.0, green_improvement * 2)  # Scale up small improvements
            
            return improvement_score
            
        except Exception as e:
            logger.warning(f"Image analysis failed: {str(e)}")
            return 0.5  # Default moderate improvement

    async def _create_outcome_training_data(self, db: Session, feedback: UserFeedback, improvement_score: float):
        """Create training data from successful treatment outcomes"""
        
        # Create annotation for the after-treatment image
        outcome_annotation = ImageAnnotation(
            annotation_id=generate_unique_id("outcome_annotation"),
            image_analysis_id=f"outcome_{feedback.feedback_id}",
            image_path=feedback.after_image_path,
            primary_deficiency=DeficiencyType.HEALTHY,  # After successful treatment
            severity_level=feedback.predicted_deficiency if improvement_score < 0.9 else DeficiencyType.HEALTHY,
            confidence_score=improvement_score,
            label_source=LabelSource.FIELD_VALIDATION,
            annotator_id=feedback.user_id,
            symptom_descriptions=[f"Post-treatment result: {improvement_score:.2f} improvement"],
            visual_cues=[f"Treatment success after {feedback.days_to_improvement} days"],
            verified=True
        )
        
        db.add(outcome_annotation)
        db.commit()

    async def _extract_common_issues(self, error_reports: List[str]) -> List[str]:
        """Extract common issues from error reports"""
        
        # Simple keyword extraction (would use NLP in production)
        keywords = {}
        common_words = ["wrong", "incorrect", "error", "mistake", "issue", "problem"]
        
        for report in error_reports:
            words = report.lower().split()
            for word in words:
                if word not in common_words and len(word) > 3:
                    keywords[word] = keywords.get(word, 0) + 1
        
        # Return top issues
        sorted_issues = sorted(keywords.items(), key=lambda x: x[1], reverse=True)
        return [issue[0] for issue in sorted_issues[:5]]

    async def _extract_suggestions(self, suggestions: List[str]) -> List[str]:
        """Extract actionable suggestions from user feedback"""
        
        # Simple suggestion extraction
        actionable_suggestions = []
        
        for suggestion in suggestions:
            if len(suggestion) > 20:  # Filter out very short suggestions
                actionable_suggestions.append(suggestion[:200])  # Truncate long suggestions
        
        return actionable_suggestions[:10]  # Return top 10

    def _group_feedback_by_type(self, feedback_items: List[UserFeedback]) -> Dict[FeedbackType, List[UserFeedback]]:
        """Group feedback items by type"""
        
        groups = {}
        for feedback in feedback_items:
            if feedback.feedback_type not in groups:
                groups[feedback.feedback_type] = []
            groups[feedback.feedback_type].append(feedback)
        
        return groups

    async def _update_performance_metrics(self, db: Session, processing_results: Dict[str, Any]):
        """Update performance metrics based on feedback processing"""
        
        # Calculate overall performance metrics
        total_accuracy_feedback = sum(
            result.get("total_feedback", 0) 
            for result in processing_results.values()
        )
        
        avg_accuracy = np.mean([
            result.get("average_accuracy_rating", 0) 
            for result in processing_results.values() 
            if result.get("average_accuracy_rating")
        ]) if processing_results else 0
        
        # Get active deployment
        active_deployment = db.exec(
            select(ModelDeployment).where(
                ModelDeployment.is_active == True,
                ModelDeployment.environment == "production"
            )
        ).first()
        
        if active_deployment:
            # Create performance metrics record
            performance_metrics = ModelPerformanceMetrics(
                metric_id=generate_unique_id("metrics"),
                deployment_id=active_deployment.deployment_id,
                measurement_date=datetime.utcnow(),
                period_start=datetime.utcnow() - timedelta(days=1),
                period_end=datetime.utcnow(),
                total_predictions=total_accuracy_feedback,
                accuracy=avg_accuracy / 5.0,  # Convert 1-5 scale to 0-1
                user_satisfaction_score=avg_accuracy / 5.0
            )
            
            db.add(performance_metrics)
            db.commit()

    async def _evaluate_retraining_need(self, db: Session) -> Dict[str, Any]:
        """Evaluate if model retraining is needed"""
        
        # Get continuous learning configuration
        config = db.exec(
            select(ContinuousLearningConfig).where(
                ContinuousLearningConfig.is_active == True
            )
        ).first()
        
        if not config:
            return {"retraining_needed": False, "reason": "No active learning configuration"}
        
        # Get current model performance
        active_deployment = db.exec(
            select(ModelDeployment).where(
                ModelDeployment.is_active == True
            )
        ).first()
        
        if not active_deployment:
            return {"retraining_needed": False, "reason": "No active deployment found"}
        
        current_accuracy = active_deployment.average_accuracy_rating or 0.0
        
        # Count recent feedback
        recent_feedback = db.exec(
            select(UserFeedback).where(
                UserFeedback.created_at >= datetime.utcnow() - timedelta(days=30)
            )
        ).all()
        
        feedback_count = len(recent_feedback)
        
        # Calculate drift score (simplified)
        drift_score = self._calculate_drift_score(recent_feedback)
        
        # Check retraining triggers
        last_deployment_date = active_deployment.deployed_at
        trigger_result = should_trigger_retraining(
            config, current_accuracy, feedback_count, drift_score, last_deployment_date
        )
        
        return {
            "retraining_needed": trigger_result["should_retrain"],
            "triggers": trigger_result["triggers"],
            "current_accuracy": current_accuracy,
            "feedback_count": feedback_count,
            "drift_score": drift_score,
            "days_since_last_retrain": trigger_result["days_since_retrain"]
        }

    def _calculate_drift_score(self, recent_feedback: List[UserFeedback]) -> float:
        """Calculate data/concept drift score from feedback"""
        
        if not recent_feedback:
            return 0.0
        
        # Calculate accuracy drift
        accuracy_ratings = [f.accuracy_rating for f in recent_feedback if f.accuracy_rating]
        if not accuracy_ratings:
            return 0.0
        
        avg_accuracy = sum(accuracy_ratings) / len(accuracy_ratings)
        expected_accuracy = 4.0  # Expected rating on 1-5 scale
        
        # Drift score increases as accuracy decreases
        drift_score = max(0, (expected_accuracy - avg_accuracy) / expected_accuracy)
        
        return min(1.0, drift_score)  # Cap at 1.0

    async def _calculate_performance_impact(self, db: Session) -> Dict[str, Any]:
        """Calculate the impact of feedback processing on model performance"""
        
        # Get metrics from before and after feedback processing
        recent_metrics = db.exec(
            select(ModelPerformanceMetrics).order_by(
                ModelPerformanceMetrics.measurement_date.desc()
            ).limit(5)
        ).all()
        
        if len(recent_metrics) < 2:
            return {"impact": "Insufficient data for impact analysis"}
        
        latest_accuracy = recent_metrics[0].accuracy or 0
        previous_accuracy = recent_metrics[1].accuracy or 0
        
        accuracy_change = latest_accuracy - previous_accuracy
        
        return {
            "accuracy_change": accuracy_change,
            "trend": "improving" if accuracy_change > 0 else "declining" if accuracy_change < 0 else "stable",
            "magnitude": abs(accuracy_change),
            "confidence": "high" if abs(accuracy_change) > 0.05 else "moderate" if abs(accuracy_change) > 0.02 else "low"
        }

    async def trigger_automatic_retraining(self, db: Session) -> Dict[str, Any]:
        """Trigger automatic model retraining"""
        
        try:
            # Create new training dataset with latest feedback corrections
            dataset = await self._create_updated_dataset(db)
            
            # Start training process
            training_run = await self._start_retraining_process(db, dataset.dataset_id)
            
            return {
                "retraining_triggered": True,
                "dataset_id": dataset.dataset_id,
                "training_run_id": training_run.run_id,
                "estimated_completion": "2-3 hours",
                "auto_deployment": False  # Require manual approval
            }
            
        except Exception as e:
            logger.error(f"Automatic retraining failed: {str(e)}")
            return {
                "retraining_triggered": False,
                "error": str(e)
            }

    async def _create_updated_dataset(self, db: Session) -> TrainingDataset:
        """Create updated training dataset including feedback corrections"""
        
        # Get all verified annotations including recent corrections
        annotations = db.exec(
            select(ImageAnnotation).where(ImageAnnotation.verified == True)
        ).all()
        
        # Calculate class distribution
        class_distribution = {}
        for annotation in annotations:
            deficiency = annotation.primary_deficiency.value
            class_distribution[deficiency] = class_distribution.get(deficiency, 0) + 1
        
        # Create dataset
        dataset = TrainingDataset(
            dataset_id=generate_unique_id("auto_dataset"),
            name=f"Auto-Generated Dataset {datetime.now().strftime('%Y%m%d_%H%M%S')}",
            version=f"auto_v{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            description="Automatically created dataset with user feedback corrections",
            total_samples=len(annotations),
            class_distribution=class_distribution,
            augmentation_enabled=True,
            created_by=0  # System-generated
        )
        
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        return dataset

    async def _start_retraining_process(self, db: Session, dataset_id: str) -> ModelTrainingRun:
        """Start the retraining process"""
        
        training_run = ModelTrainingRun(
            run_id=generate_unique_id("auto_training"),
            dataset_id=dataset_id,
            model_type="auto_enhanced_ensemble",
            model_architecture="Automated retraining with feedback integration",
            hyperparameters={"auto_generated": True},
            status=TrainingStatus.PENDING,
            started_by=0  # System-generated
        )
        
        db.add(training_run)
        db.commit()
        db.refresh(training_run)
        
        # Queue the training process
        # This would be handled by a background task queue in production
        logger.info(f"Automatic retraining queued: {training_run.run_id}")
        
        return training_run


# Background task functions for FastAPI integration

async def run_continuous_learning_cycle(db: Session):
    """Run a complete continuous learning cycle"""
    
    learning_manager = ContinuousLearningManager()
    
    try:
        # Process feedback batch
        processing_results = await learning_manager.process_feedback_batch(db)
        
        # Check if retraining is needed
        if processing_results.get("retraining_decision", {}).get("retraining_needed"):
            # Trigger automatic retraining
            retraining_results = await learning_manager.trigger_automatic_retraining(db)
            processing_results["retraining_results"] = retraining_results
        
        logger.info("Continuous learning cycle completed successfully")
        return processing_results
        
    except Exception as e:
        logger.error(f"Continuous learning cycle failed: {str(e)}")
        raise


def schedule_continuous_learning():
    """Schedule continuous learning to run periodically"""
    
    import schedule
    import time
    from threading import Thread
    
    def run_scheduler():
        schedule.every(6).hours.do(lambda: asyncio.create_task(run_continuous_learning_cycle(next(get_db()))))
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    # Start scheduler in background thread
    scheduler_thread = Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    logger.info("Continuous learning scheduler started")


# Example usage
if __name__ == "__main__":
    # Initialize continuous learning manager
    learning_manager = ContinuousLearningManager()
    
    # This would be integrated with your FastAPI application
    print("Continuous Learning Manager initialized")
    print("Available methods:")
    print("- process_feedback_batch()")
    print("- trigger_automatic_retraining()")
    print("- evaluate_retraining_need()")
