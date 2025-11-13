from sqlmodel import SQLModel, Field, Relationship

from pydantic import BaseModel

from typing import Optional, List, Dict, Any

from datetime import datetime

from enum import Enum





class DeficiencyType(str, Enum):

    """Enum for nutrient deficiency types"""

    NITROGEN_DEFICIENCY = "nitrogen_deficiency"

    PHOSPHORUS_DEFICIENCY = "phosphorus_deficiency"

    POTASSIUM_DEFICIENCY = "potassium_deficiency"

    HEALTHY = "healthy"





class AnalysisStatus(str, Enum):

    """Enum for analysis status"""

    PENDING = "PENDING"

    PROCESSING = "PROCESSING"

    COMPLETED = "COMPLETED"

    FAILED = "FAILED"





class DeficiencyAnalysis(SQLModel, table=True):

    """Database model for leaf deficiency analysis results"""

    __tablename__ = "deficiency_analyses"

    

    id: Optional[int] = Field(default=None, primary_key=True)

    farm_id: Optional[int] = Field(default=None, foreign_key="farms.id")

    plot_id: Optional[int] = Field(default=None, foreign_key="plots.id")

    user_id: int  # Remove foreign key constraint until users table is implemented

    

    # Image data

    leaf_image_path: str = Field(max_length=1000)

    soil_image_path: Optional[str] = Field(default=None, max_length=1000)

    

    # Analysis results

    primary_deficiency: DeficiencyType

    confidence_score: float = Field(ge=0, le=1)  # 0-1 confidence score

    detected_issues: str = Field(max_length=1000)  # JSON string of detected issues

    

    # Visual signs detected

    visual_signs: Optional[str] = Field(default=None, max_length=1000)  # JSON array

    

    # Threshold values

    leaf_nitrogen_percentage: Optional[float] = Field(default=None)

    leaf_phosphorus_percentage: Optional[float] = Field(default=None)

    

    # Model information

    model_version: str = Field(default="v1.0", max_length=50)

    preprocessing_applied: Optional[str] = Field(default=None, max_length=500)

    

    # Analysis metadata

    analysis_date: datetime = Field(default_factory=datetime.utcnow)

    status: AnalysisStatus = Field(default=AnalysisStatus.PENDING)

    processing_time_seconds: Optional[float] = Field(default=None)

    

    # Contact reference

    expert_contact_required: bool = Field(default=False)

    expert_notes: Optional[str] = Field(default=None, max_length=1000)

    

    # Timestamps

    created_at: datetime = Field(default_factory=datetime.utcnow)

    updated_at: datetime = Field(default_factory=datetime.utcnow)

    

    # Relationships

    recommendations: List["CinnamonFertilizerRecommendation"] = Relationship(back_populates="deficiency_analysis")





class CinnamonFertilizerRecommendation(SQLModel, table=True):

    """Database model for cinnamon-specific fertilizer recommendations"""

    __tablename__ = "cinnamon_fertilizer_recommendations"

    

    id: Optional[int] = Field(default=None, primary_key=True)

    deficiency_analysis_id: int = Field(foreign_key="deficiency_analyses.id")

    

    # Deficiency information

    deficiency_type: DeficiencyType

    

    # Inorganic fertilizer recommendations

    inorganic_fertilizer_type: str = Field(max_length=255)

    inorganic_dosage_per_plant: float  # grams per plant

    inorganic_application_method: str = Field(max_length=500)

    inorganic_frequency: str = Field(max_length=200)

    inorganic_split_schedule: Optional[str] = Field(default=None, max_length=500)

    

    # Organic fertilizer recommendations

    organic_fertilizer_type: str = Field(max_length=255)

    organic_application_rate: float  # kg per plant

    organic_timing: str = Field(max_length=200)

    

    # Application details

    application_method_details: str = Field(max_length=1000)

    best_application_season: str = Field(max_length=200)

    

    # Cost estimation

    estimated_cost_per_plant: Optional[float] = Field(default=None)

    estimated_cost_per_hectare: Optional[float] = Field(default=None)

    

    # Research reference

    research_source: str = Field(default="Cinnamon Research Center, Matale, Sri Lanka", max_length=500)

    expert_contact: str = Field(default="‪+94 66 224 5463‬", max_length=100)

    additional_notes: Optional[str] = Field(default=None, max_length=1000)

    

    # Priority and urgency

    priority_level: int = Field(default=3, ge=1, le=5)  # 1=Low, 5=Critical

    action_required_within_days: Optional[int] = Field(default=None)

    

    # Effectiveness tracking

    is_applied: bool = Field(default=False)

    application_date: Optional[datetime] = Field(default=None)

    effectiveness_rating: Optional[int] = Field(default=None, ge=1, le=5)

    user_feedback: Optional[str] = Field(default=None, max_length=1000)

    

    # Timestamps

    created_at: datetime = Field(default_factory=datetime.utcnow)

    updated_at: datetime = Field(default_factory=datetime.utcnow)

    

    # Relationships

    deficiency_analysis: DeficiencyAnalysis = Relationship(back_populates="recommendations")





class ImageAnalysisLog(SQLModel, table=True):

    """Database model for tracking image analysis attempts"""

    _tablename_ = "image_analysis_logs"

    

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int

    

    # Image metadata

    original_filename: Optional[str] = Field(default=None, max_length=255)

    image_size_bytes: Optional[int] = Field(default=None)

    image_dimensions: Optional[str] = Field(default=None, max_length=100)  # "width x height"

    image_format: Optional[str] = Field(default=None, max_length=20)

    

    # Processing details

    preprocessing_steps: Optional[str] = Field(default=None, max_length=500)

    model_used: str = Field(max_length=100)

    processing_duration_ms: Optional[int] = Field(default=None)

    

    # Results

    analysis_success: bool = Field(default=True)

    error_message: Optional[str] = Field(default=None, max_length=1000)

    confidence_threshold_met: bool = Field(default=False)

    

    # Timestamps

    created_at: datetime = Field(default_factory=datetime.utcnow)





# Pydantic models for API



class DeficiencyAnalysisCreate(BaseModel):

    farm_id: Optional[int] = None

    plot_id: Optional[int] = None

    user_id: int

    leaf_image_path: str

    soil_image_path: Optional[str] = None





class DeficiencyAnalysisUpdate(BaseModel):

    primary_deficiency: Optional[DeficiencyType] = None

    confidence_score: Optional[float] = None

    detected_issues: Optional[str] = None

    visual_signs: Optional[str] = None

    leaf_nitrogen_percentage: Optional[float] = None

    leaf_phosphorus_percentage: Optional[float] = None

    status: Optional[AnalysisStatus] = None

    processing_time_seconds: Optional[float] = None

    expert_contact_required: Optional[bool] = None

    expert_notes: Optional[str] = None





class DeficiencyAnalysisRead(BaseModel):

    model_config = {"from_attributes": True}

    

    id: int

    farm_id: Optional[int]

    plot_id: Optional[int]

    user_id: int

    leaf_image_path: str

    soil_image_path: Optional[str]

    primary_deficiency: DeficiencyType

    confidence_score: float

    detected_issues: str

    visual_signs: Optional[str]

    leaf_nitrogen_percentage: Optional[float]

    leaf_phosphorus_percentage: Optional[float]

    model_version: str

    preprocessing_applied: Optional[str]

    analysis_date: datetime

    status: AnalysisStatus

    processing_time_seconds: Optional[float]

    expert_contact_required: bool

    expert_notes: Optional[str]

    created_at: datetime

    updated_at: datetime





class LeafImageUpload(BaseModel):

    """Model for leaf image upload request"""

    farm_id: Optional[int] = None

    plot_id: Optional[int] = None

    user_id: int = 1  # Default user ID for now





class SoilImageUpload(BaseModel):

    """Model for soil image upload request"""

    analysis_id: int  # Link to existing deficiency analysis

    



class AnalysisResponse(BaseModel):

    """Response model for analysis results"""

    analysis_id: int

    deficiency_type: DeficiencyType

    confidence_score: float

    detected_issues: List[str]

    visual_signs: List[str]

    nitrogen_percentage: Optional[float]

    phosphorus_percentage: Optional[float]

    expert_contact_required: bool

    processing_time_seconds: float

    model_version: str





class CinnamonRecommendationResponse(BaseModel):

    """Response model for cinnamon fertilizer recommendations"""

    recommendation_id: int

    deficiency_type: DeficiencyType

    

    # Inorganic recommendations

    inorganic_fertilizer: Dict[str, Any]

    

    # Organic recommendations  

    organic_fertilizer: Dict[str, Any]

    

    # Application details

    application_details: Dict[str, Any]

    

    # Cost estimates

    cost_estimates: Dict[str, Any]

    

    # Research reference

    research_reference: Dict[str, Any]

    

    # Priority and timing

    priority_level: int

    action_required_within_days: Optional[int]





class ComprehensiveAnalysisResponse(BaseModel):

    """Complete response combining analysis and recommendations"""

    analysis: AnalysisResponse

    recommendations: CinnamonRecommendationResponse

    additional_notes: Optional[str]

    expert_contact_info: Dict[str, str]





class CinnamonFertilizerRecommendationCreate(BaseModel):

    deficiency_analysis_id: int

    deficiency_type: DeficiencyType

    inorganic_fertilizer_type: str

    inorganic_dosage_per_plant: float

    inorganic_application_method: str

    inorganic_frequency: str

    inorganic_split_schedule: Optional[str] = None

    organic_fertilizer_type: str

    organic_application_rate: float

    organic_timing: str

    application_method_details: str

    best_application_season: str

    estimated_cost_per_plant: Optional[float] = None

    estimated_cost_per_hectare: Optional[float] = None

    priority_level: int = 3

    action_required_within_days: Optional[int] = None

    additional_notes: Optional[str] = None





class CinnamonFertilizerRecommendationRead(BaseModel):

    model_config = {"from_attributes": True}

    

    id: int

    deficiency_analysis_id: int

    deficiency_type: DeficiencyType

    inorganic_fertilizer_type: str

    inorganic_dosage_per_plant: float

    inorganic_application_method: str

    inorganic_frequency: str

    inorganic_split_schedule: Optional[str]

    organic_fertilizer_type: str

    organic_application_rate: float

    organic_timing: str

    application_method_details: str

    best_application_season: str

    estimated_cost_per_plant: Optional[float]

    estimated_cost_per_hectare: Optional[float]

    research_source: str

    expert_contact: str

    additional_notes: Optional[str]

    priority_level: int

    action_required_within_days: Optional[int]

    is_applied: bool

    application_date: Optional[datetime]

    effectiveness_rating: Optional[int]

    user_feedback: Optional[str]

    created_at: datetime

    updated_at: datetime





class CinnamonFertilizerRecommendationUpdate(BaseModel):

    is_applied: Optional[bool] = None

    application_date: Optional[datetime] = None

    effectiveness_rating: Optional[int] = None

    user_feedback: Optional[str] = None

