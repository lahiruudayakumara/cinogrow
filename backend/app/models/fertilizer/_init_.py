# Fertilizer module models
from .fertilizer import (
    FertilizerType,
    FertilizerApplication, 
    FertilizerSchedule,
    FertilizerRecommendation,
    FertilizerTypeCreate,
    FertilizerTypeRead,
    FertilizerApplicationCreate,
    FertilizerApplicationRead,
    FertilizerScheduleCreate,
    FertilizerScheduleRead,
    FertilizerRecommendationCreate,
    FertilizerRecommendationRead
)

from .deficiency_detection import (
    DeficiencyAnalysis,
    CinnamonFertilizerRecommendation,
    ImageAnalysisLog,
    DeficiencyType,
    AnalysisStatus,
    DeficiencyAnalysisCreate,
    DeficiencyAnalysisRead,
    CinnamonFertilizerRecommendationCreate,
    CinnamonFertilizerRecommendationRead,
    ComprehensiveAnalysisResponse,
    AnalysisResponse,
    CinnamonRecommendationResponse
)

_all_ = [
    "FertilizerType",
    "FertilizerApplication", 
    "FertilizerSchedule",
    "FertilizerRecommendation",
    "FertilizerTypeCreate",
    "FertilizerTypeRead",
    "FertilizerApplicationCreate",
    "FertilizerApplicationRead",
    "FertilizerScheduleCreate",
    "FertilizerScheduleRead",
    "FertilizerRecommendationCreate",
    "FertilizerRecommendationRead",
    "DeficiencyAnalysis",
    "CinnamonFertilizerRecommendation",
    "ImageAnalysisLog",
    "DeficiencyType",
    "AnalysisStatus",
    "DeficiencyAnalysisCreate",
    "DeficiencyAnalysisRead",
    "CinnamonFertilizerRecommendationCreate",
    "CinnamonFertilizerRecommendationRead",
    "ComprehensiveAnalysisResponse",
    "AnalysisResponse",
    "CinnamonRecommendationResponse"
]
