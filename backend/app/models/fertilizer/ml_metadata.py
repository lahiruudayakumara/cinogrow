"""
ML Metadata Models for Image Analysis and Training Data Collection
Supports the mobile app's machine learning data pipeline
"""

from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import uuid


class SampleType(str, Enum):
    """Type of sample being analyzed"""
    LEAF = "leaf"
    SOIL = "soil"


class CaptureMethod(str, Enum):
    """Method used to capture the image"""
    CAMERA = "camera"
    LIBRARY = "library"


class SessionStatus(str, Enum):
    """Status of analysis session"""
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class ImageQualityMetrics(SQLModel):
    """Image quality assessment metrics"""
    sharpness: float = Field(description="Sharpness score (0-100)")
    brightness: float = Field(description="Brightness level (0-100)")
    contrast: float = Field(description="Contrast ratio (0-100)")
    colorfulness: float = Field(description="Color saturation score (0-100)")
    noise_level: Optional[float] = Field(default=None, description="Image noise assessment")
    exposure_quality: Optional[str] = Field(default=None, description="Exposure assessment (underexposed/proper/overexposed)")


class FileMetadata(SQLModel):
    """File-related metadata"""
    filename: str = Field(description="Original filename")
    file_size_kb: float = Field(description="File size in KB")
    format: str = Field(description="Image format (jpeg, png, etc)")
    width: int = Field(description="Image width in pixels")
    height: int = Field(description="Image height in pixels")
    created_date: datetime = Field(description="File creation timestamp")


class ColorAnalysis(SQLModel):
    """Color analysis results"""
    dominant_colors: List[str] = Field(default_factory=list, description="List of dominant colors")
    color_distribution: Dict[str, float] = Field(default_factory=dict, description="Color percentage distribution")
    green_intensity: Optional[float] = Field(default=None, description="Green color intensity (0-100)")
    yellowing_areas: Optional[float] = Field(default=None, description="Percentage of yellowing areas")
    browning_areas: Optional[float] = Field(default=None, description="Percentage of browning areas")


class LeafFeatures(SQLModel):
    """Leaf-specific analysis features"""
    estimated_leaf_area: float = Field(description="Estimated leaf area coverage in image (%)")
    leaf_shape: str = Field(description="Detected leaf shape (oval, elongated, irregular, etc)")
    visible_defects: List[str] = Field(default_factory=list, description="Visible defects/symptoms")
    health_score: Optional[float] = Field(default=None, description="Overall health score (0-100)")
    disease_indicators: Optional[List[str]] = Field(default_factory=list, description="Potential disease indicators")
    nutritional_status: Optional[str] = Field(default=None, description="Nutritional status assessment")


class SoilFeatures(SQLModel):
    """Soil-specific analysis features"""
    texture: str = Field(description="Soil texture classification")
    moisture: str = Field(description="Moisture level assessment")
    organic_matter: str = Field(description="Organic matter content assessment")
    color_profile: List[str] = Field(default_factory=list, description="Soil color characteristics")
    visible_particles: Optional[List[str]] = Field(default_factory=list, description="Visible particles/debris")
    compaction_level: Optional[str] = Field(default=None, description="Soil compaction assessment")


class EnvironmentalContext(SQLModel):
    """Environmental context during capture"""
    capture_timestamp: datetime = Field(description="When the image was captured")
    capture_method: CaptureMethod = Field(description="Method of capture (camera/library)")
    lighting_conditions: Optional[str] = Field(default=None, description="Lighting assessment")
    estimated_weather: Optional[str] = Field(default=None, description="Estimated weather conditions")
    location_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Location data if available")


# Database Tables

class MLAnalysisSession(SQLModel, table=True):
    """
    Analysis session tracking for ML data collection
    Each session represents a complete fertilizer analysis workflow
    """
    _tablename_ = "ml_analysis_sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(unique=True, index=True, description="Unique session identifier")
    user_id: int = Field(description="ID of the user who created this session")
    status: SessionStatus = Field(default=SessionStatus.ACTIVE, description="Session status")
    
    # Session metadata
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    completed_at: Optional[datetime] = Field(default=None, description="Session completion time")
    
    # Analysis results (if available)
    analysis_summary: Optional[str] = Field(default=None, description="Summary of analysis results")
    recommendation_data: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_column=Column(JSON), description="Generated recommendations")
    
    # Relationships
    image_analyses: List["MLImageAnalysis"] = Relationship(back_populates="session")


class MLImageAnalysis(SQLModel, table=True):
    """
    Individual image analysis record for ML training data
    Stores comprehensive metadata for each analyzed image
    """
    _tablename_ = "ml_image_analyses"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    analysis_id: str = Field(unique=True, index=True, description="Unique analysis identifier")
    
    # Session relationship
    session_id: str = Field(foreign_key="ml_analysis_sessions.session_id", description="Associated session")
    session: MLAnalysisSession = Relationship(back_populates="image_analyses")
    
    # Image basic info
    sample_type: SampleType = Field(description="Type of sample (leaf/soil)")
    image_uri: str = Field(description="Local image URI/path")
    stored_image_path: Optional[str] = Field(default=None, description="Server-side stored image path")
    
    # Core metadata (stored as JSON for flexibility)
    file_metadata: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON), description="File metadata")
    quality_metrics: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON), description="Image quality metrics")
    color_analysis: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON), description="Color analysis results")
    environmental_context: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON), description="Environmental context")
    
    # Sample-specific features
    leaf_features: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON), description="Leaf-specific analysis")
    soil_features: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON), description="Soil-specific analysis")
    
    # ML training metadata
    is_labeled: bool = Field(default=False, description="Whether this sample has been labeled for training")
    manual_labels: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_column=Column(JSON), description="Manual labels for training")
    quality_approved: bool = Field(default=False, description="Whether this sample is approved for training")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Analysis creation time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")


class MLTrainingDataset(SQLModel, table=True):
    """
    Training dataset management for ML models
    Groups approved analyses into training sets
    """
    _tablename_ = "ml_training_datasets"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    dataset_id: str = Field(unique=True, index=True, description="Unique dataset identifier")
    name: str = Field(description="Dataset name/version")
    description: Optional[str] = Field(default=None, description="Dataset description")
    
    # Dataset metadata
    total_samples: int = Field(default=0, description="Total number of samples")
    leaf_samples: int = Field(default=0, description="Number of leaf samples")
    soil_samples: int = Field(default=0, description="Number of soil samples")
    quality_threshold: float = Field(default=0.7, description="Minimum quality score for inclusion")
    
    # Version control
    version: str = Field(description="Dataset version")
    created_by: int = Field(description="User who created this dataset")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Dataset creation time")
    
    # Export info
    export_format: Optional[str] = Field(default=None, description="Export format (json, csv, etc)")
    export_path: Optional[str] = Field(default=None, description="Path to exported dataset")
    last_exported: Optional[datetime] = Field(default=None, description="Last export timestamp")


class MLModelVersion(SQLModel, table=True):
    """
    Track ML model versions and their performance
    """
    _tablename_ = "ml_model_versions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    model_id: str = Field(unique=True, index=True, description="Unique model identifier")
    version: str = Field(description="Model version")
    model_type: str = Field(description="Type of model (leaf_classifier, soil_analyzer, etc)")
    
    # Training info
    training_dataset_id: Optional[str] = Field(foreign_key="ml_training_datasets.dataset_id", description="Training dataset used")
    training_samples: int = Field(description="Number of samples used for training")
    validation_samples: int = Field(description="Number of samples used for validation")
    
    # Performance metrics
    accuracy: Optional[float] = Field(default=None, description="Model accuracy")
    precision: Optional[float] = Field(default=None, description="Model precision")
    recall: Optional[float] = Field(default=None, description="Model recall")
    f1_score: Optional[float] = Field(default=None, description="F1 score")
    
    # Model files
    model_path: Optional[str] = Field(default=None, description="Path to model file")
    config_path: Optional[str] = Field(default=None, description="Path to model config")
    
    # Metadata
    is_active: bool = Field(default=False, description="Whether this is the active model")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Model creation time")
    created_by: int = Field(description="User who created this model")
    notes: Optional[str] = Field(default=None, description="Additional notes about the model")


# Utility functions for data conversion

def convert_mobile_metadata_to_db(mobile_metadata: Dict[str, Any], sample_type: SampleType) -> Dict[str, Any]:
    """
    Convert mobile app metadata format to database format
    """
    db_format = {
        "file_metadata": mobile_metadata.get("imageMetadata", {}).get("fileMetadata", {}),
        "quality_metrics": mobile_metadata.get("imageMetadata", {}).get("qualityMetrics", {}),
        "color_analysis": mobile_metadata.get("imageMetadata", {}).get("colorAnalysis", {}),
        "environmental_context": mobile_metadata.get("imageMetadata", {}).get("environmentalContext", {}),
    }
    
    if sample_type == SampleType.LEAF and "leafFeatures" in mobile_metadata:
        db_format["leaf_features"] = mobile_metadata["leafFeatures"]
    elif sample_type == SampleType.SOIL and "soilFeatures" in mobile_metadata:
        db_format["soil_features"] = mobile_metadata["soilFeatures"]
    
    return db_format


def generate_session_id() -> str:
    """Generate unique session ID"""
    timestamp = int(datetime.utcnow().timestamp() * 1000)
    random_part = str(uuid.uuid4())[:8]
    return f"session_{timestamp}_{random_part}"


def generate_analysis_id() -> str:
    """Generate unique analysis ID"""
    timestamp = int(datetime.utcnow().timestamp() * 1000)
    random_part = str(uuid.uuid4())[:8]
    return f"analysis_{timestamp}_{random_part}"
