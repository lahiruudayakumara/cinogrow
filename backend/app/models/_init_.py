# Import all models to ensure they are registered with SQLModel

# Yield & Weather models
from .yield_weather.farm import Farm, Plot, FarmActivity, PlantingRecord
from .yield_weather.weather import WeatherRecord, WeatherResponse, LocationRequest, WeatherData
from .yield_weather.farm_assistance import ActivityHistory

# Fertilizer models
from .fertilizer.fertilizer import (
    FertilizerType,
    FertilizerApplication,
    FertilizerSchedule,
    FertilizerRecommendation
)

# Cinnamon deficiency analysis models  
from .fertilizer.deficiency_detection import (
    DeficiencyAnalysis,
    CinnamonFertilizerRecommendation,
    ImageAnalysisLog
)

# ML metadata models
from .fertilizer.ml_metadata import (
    MLAnalysisSession,
    MLImageAnalysis,
    MLTrainingDataset,
    MLModelVersion
)

# Enhanced training models
from .fertilizer.enhanced_training_models import (
    ImageAnnotation,
    TrainingDataset,
    ModelTrainingRun,
    UserFeedback,
    ContinuousLearningConfig,
    ModelPerformanceMetrics,
    ModelDeployment,
    SeverityLevel,
    LabelSource,
    FeedbackType,
    generate_unique_id,
    should_trigger_retraining
)

_all_ = [
    # Yield & Weather
    "Farm", 
    "Plot", 
    "FarmActivity", 
    "PlantingRecord",
    "WeatherRecord", 
    "WeatherResponse", 
    "LocationRequest",
    "WeatherData",
    "ActivityHistory",
    
    # Fertilizer  
    "FertilizerType",
    "FertilizerApplication",
    "FertilizerSchedule",
    "FertilizerRecommendation",
    
    # Cinnamon Analysis
    "DeficiencyAnalysis",
    "CinnamonFertilizerRecommendation", 
    "ImageAnalysisLog",
    
    # ML Metadata
    "MLAnalysisSession",
    "MLImageAnalysis",
    "MLTrainingDataset",
    "MLModelVersion",
    
    # Enhanced Training
    "ImageAnnotation",
    "TrainingDataset", 
    "ModelTrainingRun",
    "UserFeedback",
    "ContinuousLearningConfig",
    "ModelPerformanceMetrics",
    "ModelDeployment",
    "SeverityLevel",
    "LabelSource",
    "FeedbackType",
    "generate_unique_id",
    "should_trigger_retraining"
]
