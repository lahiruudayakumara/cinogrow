"""Fertilizer models package - Basic models only (Roboflow handles detection)"""

from .fertilizer import (
    FertilizerType,
    FertilizerApplication,
    FertilizerSchedule,
    FertilizerRecommendation,
    ApplicationStatus,
    ApplicationMethod,
    FertilizerCategory,
    ScheduleFrequency
)

__all__ = [
    "FertilizerType",
    "FertilizerApplication",
    "FertilizerSchedule",
    "FertilizerRecommendation",
    "ApplicationStatus",
    "ApplicationMethod",
    "FertilizerCategory",
    "ScheduleFrequency",
]
