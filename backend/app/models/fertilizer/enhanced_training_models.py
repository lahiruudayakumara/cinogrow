"""
Enhanced training models for fertilizer deficiency detection system
Support for continuous learning, annotation, and model improvement
"""

import uuid
from datetime import datetime, date
from typing import List, Dict, Optional, Any
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from sqlalchemy.types import DateTime


def generate_unique_id(prefix: str = "id") -> str:
    """Generate a unique ID with prefix"""
    return f"{prefix}{uuid.uuid4().hex[:8]}{int(datetime.now().timestamp())}"


class DeficiencyType(str, Enum):
    """Deficiency types for cinnamon plants"""
    NITROGEN_DEFICIENCY = "nitrogen_deficiency"
    PHOSPHORUS_DEFICIENCY = "phosphorus_deficiency" 
    POTASSIUM_DEFICIENCY = "potassium_deficiency"
    MAGNESIUM_DEFICIENCY = "magnesium_deficiency"
    HEALTHY = "healthy"
    UNKNOWN = "unknown"


class AnnotationStatus(str, Enum):
    """Status of image annotations"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"
    REJECTED = "rejected"


class TrainingStatus(str, Enum):
    """Status of model training runs"""
    QUEUED = "queued"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class FeedbackRating(int, Enum):
    """User feedback ratings"""
    VERY_POOR = 1
    POOR = 2
    FAIR = 3
    GOOD = 4
    EXCELLENT = 5


class SeverityLevel(str, Enum):
    """Severity levels for deficiencies"""
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


class LabelSource(str, Enum):
    """Source of training data labels"""
    AUTO_GENERATED = "auto_generated"
    FARMER_FEEDBACK = "farmer_feedback"
    FIELD_VALIDATION = "field_validation"
    EXPERT_ANNOTATION = "expert_annotation"
    MODEL_PREDICTION = "model_prediction"


class FeedbackType(str, Enum):
    """Types of user feedback"""
    ACCURACY_RATING = "accuracy_rating"
    RECOMMENDATION_EFFECTIVENESS = "recommendation_effectiveness"
    OUTCOME_REPORT = "outcome_report"
    GENERAL_FEEDBACK = "general_feedback"


class ImageAnnotation(SQLModel, table=True):
    """Image annotations for training data"""
    _tablename_ = "image_annotations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Image information
    image_path: str = Field(index=True)
    image_filename: str
    image_size_bytes: Optional[int] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    
    # Annotation details
    deficiency_type: DeficiencyType
    confidence_level: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    bounding_boxes: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    visual_markers: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    severity_score: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    label_source: LabelSource = LabelSource.EXPERT_ANNOTATION
    
    # Annotation metadata
    annotator_id: int  # Remove foreign key constraint until users table is implemented
    annotation_date: datetime = Field(default_factory=datetime.utcnow)
    review_date: Optional[datetime] = None
    status: AnnotationStatus = AnnotationStatus.PENDING
    
    # Quality control
    is_verified: bool = Field(default=False)
    verifier_id: Optional[int] = None  # Remove foreign key constraint until users table is implemented
    annotation_notes: Optional[str] = None
    
    # Dataset assignment
    dataset_id: Optional[int] = Field(default=None, foreign_key="training_datasets.id")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TrainingDataset(SQLModel, table=True):
    """Training datasets for model development"""
    _tablename_ = "training_datasets"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Dataset information
    name: str = Field(index=True, unique=True)
    description: Optional[str] = None
    version: str = Field(default="1.0")
    
    # Dataset composition
    total_images: int = Field(default=0)
    train_images: int = Field(default=0)
    validation_images: int = Field(default=0)
    test_images: int = Field(default=0)
    
    # Class distribution
    class_distribution: Optional[Dict[str, int]] = Field(default=None, sa_column=Column(JSON))
    
    # Dataset splits
    train_split_ratio: float = Field(default=0.7, ge=0.0, le=1.0)
    validation_split_ratio: float = Field(default=0.2, ge=0.0, le=1.0) 
    test_split_ratio: float = Field(default=0.1, ge=0.0, le=1.0)
    
    # Dataset status
    is_active: bool = Field(default=True)
    is_public: bool = Field(default=False)
    
    # Quality metrics
    average_annotation_quality: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    inter_annotator_agreement: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # Creator information
    created_by: int  # Remove foreign key constraint until users table is implemented
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ModelTrainingRun(SQLModel, table=True):
    """Model training run tracking"""
    _tablename_ = "model_training_runs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Training configuration
    model_name: str = Field(index=True)
    model_architecture: str  # e.g., "ResNet50", "MobileNetV2", "RandomForest"
    training_type: str  # e.g., "initial", "fine_tuning", "transfer_learning"
    
    # Dataset reference
    dataset_id: int = Field(foreign_key="training_datasets.id")
    
    # Hyperparameters
    hyperparameters: Dict[str, Any] = Field(sa_column=Column(JSON))
    
    # Training progress
    status: TrainingStatus = TrainingStatus.QUEUED
    current_epoch: Optional[int] = Field(default=0)
    total_epochs: int = Field(default=50)
    
    # Performance metrics
    training_accuracy: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    validation_accuracy: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    test_accuracy: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    training_loss: Optional[float] = Field(default=None, ge=0.0)
    validation_loss: Optional[float] = Field(default=None, ge=0.0)
    
    # Model artifacts
    model_path: Optional[str] = None
    model_size_mb: Optional[float] = None
    inference_time_ms: Optional[float] = None
    
    # Training details
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_training_time: Optional[float] = None  # in seconds
    gpu_used: bool = Field(default=False)
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = Field(default=0)
    
    # Version control
    git_commit_hash: Optional[str] = None
    environment_info: Optional[Dict[str, str]] = Field(default=None, sa_column=Column(JSON))
    
    # Creator
    started_by: int  # Remove foreign key constraint until users table is implemented
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserFeedback(SQLModel, table=True):
    """User feedback on model predictions and recommendations"""
    _tablename_ = "user_feedback"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Reference to original analysis
    analysis_id: int = Field(foreign_key="deficiency_analyses.id")
    user_id: int  # Remove foreign key constraint until users table is implemented
    feedback_type: FeedbackType = FeedbackType.GENERAL_FEEDBACK
    
    # Feedback details
    prediction_accuracy: FeedbackRating
    recommendation_usefulness: FeedbackRating
    overall_satisfaction: FeedbackRating
    
    # Specific feedback
    was_prediction_correct: Optional[bool] = None
    actual_deficiency_type: Optional[DeficiencyType] = None
    was_recommendation_followed: Optional[bool] = None
    recommendation_effectiveness: Optional[FeedbackRating] = None
    
    # Additional comments
    user_comments: Optional[str] = None
    improvement_suggestions: Optional[str] = None
    
    # Follow-up data
    follow_up_image_path: Optional[str] = None  # Image after treatment
    treatment_outcome: Optional[str] = None
    time_to_improvement: Optional[int] = None  # days
    
    # Feedback metadata
    feedback_date: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = Field(default=False)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContinuousLearningConfig(SQLModel, table=True):
    """Configuration for continuous learning system"""
    _tablename_ = "continuous_learning_config"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Learning configuration
    config_name: str = Field(index=True, unique=True)
    is_active: bool = Field(default=True)
    
    # Retraining triggers
    min_feedback_samples: int = Field(default=100)
    feedback_accuracy_threshold: float = Field(default=0.8, ge=0.0, le=1.0)
    time_based_retraining_days: int = Field(default=30)
    
    # Model selection criteria
    min_accuracy_improvement: float = Field(default=0.02, ge=0.0, le=1.0)
    max_training_time_hours: int = Field(default=24)
    
    # Deployment criteria
    validation_accuracy_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    test_accuracy_threshold: float = Field(default=0.80, ge=0.0, le=1.0)
    user_acceptance_threshold: float = Field(default=0.75, ge=0.0, le=1.0)
    
    # Monitoring settings
    performance_monitoring_enabled: bool = Field(default=True)
    alert_on_performance_drop: bool = Field(default=True)
    performance_drop_threshold: float = Field(default=0.1, ge=0.0, le=1.0)
    
    # Backup and rollback
    keep_model_versions: int = Field(default=5)
    auto_rollback_enabled: bool = Field(default=True)
    rollback_accuracy_threshold: float = Field(default=0.7, ge=0.0, le=1.0)
    
    # Creator and maintenance
    created_by: int  # Remove foreign key constraint until users table is implemented
    last_modified_by: int  # Remove foreign key constraint until users table is implemented
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ModelPerformanceMetrics(SQLModel, table=True):
    """Track model performance over time"""
    _tablename_ = "model_performance_metrics"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Model reference
    model_training_run_id: int = Field(foreign_key="model_training_runs.id")
    model_version: str
    
    # Performance metrics by class
    per_class_metrics: Dict[str, Dict[str, float]] = Field(sa_column=Column(JSON))
    # Example: {"nitrogen_deficiency": {"precision": 0.85, "recall": 0.82, "f1": 0.83}}
    
    # Overall metrics
    overall_accuracy: float = Field(ge=0.0, le=1.0)
    macro_precision: float = Field(ge=0.0, le=1.0)
    macro_recall: float = Field(ge=0.0, le=1.0)
    macro_f1: float = Field(ge=0.0, le=1.0)
    weighted_f1: float = Field(ge=0.0, le=1.0)
    
    # Confusion matrix
    confusion_matrix: List[List[int]] = Field(sa_column=Column(JSON))
    
    # User satisfaction metrics
    average_user_rating: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    recommendation_follow_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    treatment_success_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # Performance context
    evaluation_dataset_size: int
    evaluation_date: datetime = Field(default_factory=datetime.utcnow)
    evaluation_environment: Optional[str] = None
    
    # Comparative metrics
    improvement_over_previous: Optional[float] = None
    benchmark_comparison: Optional[Dict[str, float]] = Field(default=None, sa_column=Column(JSON))
    
    # Production metrics
    prediction_count_24h: Optional[int] = Field(default=0)
    average_confidence_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    low_confidence_predictions_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # Quality indicators
    data_quality_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    model_stability_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ModelDeployment(SQLModel, table=True):
    """Model deployment tracking and management"""
    _tablename_ = "model_deployments"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Model reference
    model_training_run_id: int = Field(foreign_key="model_training_runs.id")
    model_name: str = Field(index=True)
    model_version: str
    model_path: str
    
    # Deployment details
    environment: str = Field(index=True)  # e.g., "development", "staging", "production"
    deployment_type: str  # e.g., "blue_green", "rolling", "canary"
    is_active: bool = Field(default=True, index=True)
    
    # Performance requirements
    max_inference_time_ms: int = Field(default=1000)
    min_accuracy_threshold: float = Field(default=0.8, ge=0.0, le=1.0)
    memory_limit_mb: Optional[int] = None
    cpu_limit_cores: Optional[float] = None
    
    # Deployment configuration
    deployment_config: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    health_check_url: Optional[str] = None
    monitoring_enabled: bool = Field(default=True)
    
    # Rollback information
    previous_deployment_id: Optional[int] = None
    rollback_available: bool = Field(default=True)
    
    # Deployment timing
    deployed_at: datetime = Field(default_factory=datetime.utcnow)
    activated_at: Optional[datetime] = None
    deactivated_at: Optional[datetime] = None
    
    # Deployment status
    deployment_status: str = Field(default="pending")  # pending, deploying, active, failed, rolled_back
    deployment_notes: Optional[str] = None
    
    # Performance monitoring
    current_accuracy: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    average_inference_time_ms: Optional[float] = None
    requests_served: int = Field(default=0)
    errors_count: int = Field(default=0)
    
    # Deployed by
    deployed_by: int  # Remove foreign key constraint until users table is implemented
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


def should_trigger_retraining(
    config: ContinuousLearningConfig,
    current_accuracy: float,
    feedback_count: int,
    drift_score: float,
    last_retrain_date: datetime
) -> Dict[str, Any]:
    """
    Determine if model retraining should be triggered based on various criteria
    
    Args:
        config: Continuous learning configuration
        current_accuracy: Current model accuracy
        feedback_count: Number of recent feedback samples
        drift_score: Data/concept drift score
        last_retrain_date: Date of last retraining
        
    Returns:
        Dictionary with retraining decision and reasons
    """
    triggers = []
    should_retrain = False
    
    # Check time-based trigger
    days_since_retrain = (datetime.utcnow() - last_retrain_date).days
    if days_since_retrain >= config.time_based_retraining_days:
        triggers.append("time_based")
        should_retrain = True
    
    # Check accuracy drop trigger
    if current_accuracy < config.validation_accuracy_threshold:
        triggers.append("accuracy_drop")
        should_retrain = True
    
    # Check feedback volume trigger
    if feedback_count >= config.min_feedback_samples:
        triggers.append("feedback_volume")
        should_retrain = True
    
    # Check drift trigger (if drift score is high)
    if drift_score > 0.2:  # threshold for significant drift
        triggers.append("concept_drift")
        should_retrain = True
    
    return {
        "should_retrain": should_retrain,
        "triggers": triggers,
        "days_since_retrain": days_since_retrain,
        "current_accuracy": current_accuracy,
        "feedback_count": feedback_count,
        "drift_score": drift_score
    }
