from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class ApplicationStatus(str, Enum):
    """Enum for fertilizer application status"""
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    POSTPONED = "POSTPONED"
    CANCELLED = "CANCELLED"


class ApplicationMethod(str, Enum):
    """Enum for fertilizer application methods"""
    BROADCAST = "BROADCAST"
    BAND_PLACEMENT = "BAND_PLACEMENT" 
    SIDE_DRESSING = "SIDE_DRESSING"
    FOLIAR_SPRAY = "FOLIAR_SPRAY"
    DRIP_IRRIGATION = "DRIP_IRRIGATION"
    GRANULAR = "GRANULAR"
    LIQUID = "LIQUID"


class FertilizerCategory(str, Enum):
    """Enum for fertilizer categories"""
    ORGANIC = "ORGANIC"
    INORGANIC = "INORGANIC"
    COMPOST = "COMPOST"
    MANURE = "MANURE"
    BIO_FERTILIZER = "BIO_FERTILIZER"
    SLOW_RELEASE = "SLOW_RELEASE"


class ScheduleFrequency(str, Enum):
    """Enum for schedule frequency"""
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    BI_WEEKLY = "BI_WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    SEASONAL = "SEASONAL"
    ANNUAL = "ANNUAL"
    ONE_TIME = "ONE_TIME"


class FertilizerType(SQLModel, table=True):
    """Database model for fertilizer types"""
    _tablename_ = "fertilizer_types"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, index=True)
    brand: Optional[str] = Field(default=None, max_length=255)
    category: FertilizerCategory
    nitrogen_percentage: Optional[float] = Field(default=None, ge=0, le=100)  # N%
    phosphorus_percentage: Optional[float] = Field(default=None, ge=0, le=100)  # P%
    potassium_percentage: Optional[float] = Field(default=None, ge=0, le=100)  # K%
    npk_ratio: Optional[str] = Field(default=None, max_length=50)  # e.g., "10-10-10"
    description: Optional[str] = Field(default=None, max_length=1000)
    recommended_dosage_per_tree: Optional[float] = Field(default=None)  # grams per tree
    recommended_dosage_per_hectare: Optional[float] = Field(default=None)  # kg per hectare
    cost_per_kg: Optional[float] = Field(default=None)  # cost per kg in local currency
    supplier: Optional[str] = Field(default=None, max_length=255)
    suitable_for_cinnamon: bool = Field(default=True)
    application_seasons: Optional[str] = Field(default=None, max_length=500)  # JSON or comma-separated
    storage_instructions: Optional[str] = Field(default=None, max_length=500)
    expiry_period_months: Optional[int] = Field(default=None)  # months
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    applications: List["FertilizerApplication"] = Relationship(back_populates="fertilizer_type")
    recommendations: List["FertilizerRecommendation"] = Relationship(back_populates="fertilizer_type")


class FertilizerApplication(SQLModel, table=True):
    """Database model for fertilizer applications"""
    _tablename_ = "fertilizer_applications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    farm_id: int = Field(foreign_key="farms.id")
    plot_id: Optional[int] = Field(default=None, foreign_key="plots.id")
    fertilizer_type_id: int = Field(foreign_key="fertilizer_types.id")
    user_id: int  # Remove foreign key constraint until users table is implemented
    
    # Application details
    application_date: datetime
    planned_date: Optional[datetime] = Field(default=None)
    quantity_applied: float  # in kg or grams
    quantity_unit: str = Field(default="kg", max_length=20)  # kg, g, L, ml
    application_method: ApplicationMethod
    status: ApplicationStatus = Field(default=ApplicationStatus.PLANNED)
    
    # Coverage area
    area_covered: Optional[float] = Field(default=None)  # in hectares
    trees_covered: Optional[int] = Field(default=None)  # number of trees
    
    # Weather conditions during application
    weather_conditions: Optional[str] = Field(default=None, max_length=200)
    temperature_celsius: Optional[float] = Field(default=None)
    humidity_percentage: Optional[float] = Field(default=None)
    
    # Cost tracking
    cost_per_unit: Optional[float] = Field(default=None)
    total_cost: Optional[float] = Field(default=None)
    
    # Notes and observations
    notes: Optional[str] = Field(default=None, max_length=1000)
    effectiveness_rating: Optional[int] = Field(default=None, ge=1, le=5)  # 1-5 rating
    side_effects_observed: Optional[str] = Field(default=None, max_length=500)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)
    
    # Relationships
    fertilizer_type: FertilizerType = Relationship(back_populates="applications")


class FertilizerSchedule(SQLModel, table=True):
    """Database model for fertilizer application schedules"""
    _tablename_ = "fertilizer_schedules"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    farm_id: int = Field(foreign_key="farms.id")
    plot_id: Optional[int] = Field(default=None, foreign_key="plots.id")
    fertilizer_type_id: int = Field(foreign_key="fertilizer_types.id")
    user_id: int  # Remove foreign key constraint until users table is implemented
    
    # Schedule details
    schedule_name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    start_date: date
    end_date: Optional[date] = Field(default=None)
    frequency: ScheduleFrequency
    application_method: ApplicationMethod
    
    # Dosage information
    quantity_per_application: float  # in kg or grams
    quantity_unit: str = Field(default="kg", max_length=20)
    
    # Schedule configuration
    days_of_week: Optional[str] = Field(default=None, max_length=20)  # "1,3,5" for Mon,Wed,Fri
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)  # for monthly schedules
    reminder_days_before: int = Field(default=1)  # days before to send reminder
    
    # Status and tracking
    is_active: bool = Field(default=True)
    last_application_date: Optional[datetime] = Field(default=None)
    next_application_date: Optional[datetime] = Field(default=None)
    applications_completed: int = Field(default=0)
    
    # Automation
    auto_create_applications: bool = Field(default=False)
    
    # Notes
    notes: Optional[str] = Field(default=None, max_length=1000)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    fertilizer_type: FertilizerType = Relationship()


class FertilizerRecommendation(SQLModel, table=True):
    """Database model for AI/ML fertilizer recommendations"""
    _tablename_ = "fertilizer_recommendations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    farm_id: int = Field(foreign_key="farms.id")
    plot_id: Optional[int] = Field(default=None, foreign_key="plots.id")
    fertilizer_type_id: int = Field(foreign_key="fertilizer_types.id")
    user_id: int  # Remove foreign key constraint until users table is implemented
    
    # Recommendation details
    recommended_quantity: float  # in kg or grams
    quantity_unit: str = Field(default="kg", max_length=20)
    recommended_application_date: datetime
    recommended_method: ApplicationMethod
    
    # Reasoning and context
    recommendation_reason: str = Field(max_length=1000)
    soil_condition_factors: Optional[str] = Field(default=None, max_length=500)
    weather_factors: Optional[str] = Field(default=None, max_length=500)
    crop_stage_factors: Optional[str] = Field(default=None, max_length=500)
    
    # AI/ML model info
    model_version: str = Field(max_length=100, default="v1.0")
    confidence_score: Optional[float] = Field(default=None, ge=0, le=1)
    
    # Priority and urgency
    priority: int = Field(default=3, ge=1, le=5)  # 1=Low, 5=Critical
    urgency_days: Optional[int] = Field(default=None)  # days within which action should be taken
    
    # Status tracking
    is_accepted: Optional[bool] = Field(default=None)  # user acceptance
    is_applied: bool = Field(default=False)
    applied_date: Optional[datetime] = Field(default=None)
    user_feedback: Optional[str] = Field(default=None, max_length=1000)
    effectiveness_rating: Optional[int] = Field(default=None, ge=1, le=5)
    
    # Expiry
    expires_at: Optional[datetime] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    fertilizer_type: FertilizerType = Relationship(back_populates="recommendations")


# Pydantic models for API

class FertilizerTypeCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    category: FertilizerCategory
    nitrogen_percentage: Optional[float] = None
    phosphorus_percentage: Optional[float] = None
    potassium_percentage: Optional[float] = None
    npk_ratio: Optional[str] = None
    description: Optional[str] = None
    recommended_dosage_per_tree: Optional[float] = None
    recommended_dosage_per_hectare: Optional[float] = None
    cost_per_kg: Optional[float] = None
    supplier: Optional[str] = None
    suitable_for_cinnamon: bool = True
    application_seasons: Optional[str] = None
    storage_instructions: Optional[str] = None
    expiry_period_months: Optional[int] = None


class FertilizerTypeUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[FertilizerCategory] = None
    nitrogen_percentage: Optional[float] = None
    phosphorus_percentage: Optional[float] = None
    potassium_percentage: Optional[float] = None
    npk_ratio: Optional[str] = None
    description: Optional[str] = None
    recommended_dosage_per_tree: Optional[float] = None
    recommended_dosage_per_hectare: Optional[float] = None
    cost_per_kg: Optional[float] = None
    supplier: Optional[str] = None
    suitable_for_cinnamon: Optional[bool] = None
    application_seasons: Optional[str] = None
    storage_instructions: Optional[str] = None
    expiry_period_months: Optional[int] = None
    is_active: Optional[bool] = None


class FertilizerTypeRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    name: str
    brand: Optional[str]
    category: FertilizerCategory
    nitrogen_percentage: Optional[float]
    phosphorus_percentage: Optional[float]
    potassium_percentage: Optional[float]
    npk_ratio: Optional[str]
    description: Optional[str]
    recommended_dosage_per_tree: Optional[float]
    recommended_dosage_per_hectare: Optional[float]
    cost_per_kg: Optional[float]
    supplier: Optional[str]
    suitable_for_cinnamon: bool
    application_seasons: Optional[str]
    storage_instructions: Optional[str]
    expiry_period_months: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class FertilizerApplicationCreate(BaseModel):
    farm_id: int
    plot_id: Optional[int] = None
    fertilizer_type_id: int
    user_id: int
    application_date: datetime
    planned_date: Optional[datetime] = None
    quantity_applied: float
    quantity_unit: str = "kg"
    application_method: ApplicationMethod
    status: ApplicationStatus = ApplicationStatus.PLANNED
    area_covered: Optional[float] = None
    trees_covered: Optional[int] = None
    weather_conditions: Optional[str] = None
    temperature_celsius: Optional[float] = None
    humidity_percentage: Optional[float] = None
    cost_per_unit: Optional[float] = None
    total_cost: Optional[float] = None
    notes: Optional[str] = None


class FertilizerApplicationUpdate(BaseModel):
    application_date: Optional[datetime] = None
    planned_date: Optional[datetime] = None
    quantity_applied: Optional[float] = None
    quantity_unit: Optional[str] = None
    application_method: Optional[ApplicationMethod] = None
    status: Optional[ApplicationStatus] = None
    area_covered: Optional[float] = None
    trees_covered: Optional[int] = None
    weather_conditions: Optional[str] = None
    temperature_celsius: Optional[float] = None
    humidity_percentage: Optional[float] = None
    cost_per_unit: Optional[float] = None
    total_cost: Optional[float] = None
    notes: Optional[str] = None
    effectiveness_rating: Optional[int] = None
    side_effects_observed: Optional[str] = None
    completed_at: Optional[datetime] = None


class FertilizerApplicationRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    farm_id: int
    plot_id: Optional[int]
    fertilizer_type_id: int
    user_id: int
    application_date: datetime
    planned_date: Optional[datetime]
    quantity_applied: float
    quantity_unit: str
    application_method: ApplicationMethod
    status: ApplicationStatus
    area_covered: Optional[float]
    trees_covered: Optional[int]
    weather_conditions: Optional[str]
    temperature_celsius: Optional[float]
    humidity_percentage: Optional[float]
    cost_per_unit: Optional[float]
    total_cost: Optional[float]
    notes: Optional[str]
    effectiveness_rating: Optional[int]
    side_effects_observed: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    # Additional fields populated via joins
    fertilizer_name: Optional[str] = None
    plot_name: Optional[str] = None
    farm_name: Optional[str] = None


class FertilizerScheduleCreate(BaseModel):
    farm_id: int
    plot_id: Optional[int] = None
    fertilizer_type_id: int
    user_id: int
    schedule_name: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    frequency: ScheduleFrequency
    application_method: ApplicationMethod
    quantity_per_application: float
    quantity_unit: str = "kg"
    days_of_week: Optional[str] = None
    day_of_month: Optional[int] = None
    reminder_days_before: int = 1
    auto_create_applications: bool = False
    notes: Optional[str] = None


class FertilizerScheduleUpdate(BaseModel):
    schedule_name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    frequency: Optional[ScheduleFrequency] = None
    application_method: Optional[ApplicationMethod] = None
    quantity_per_application: Optional[float] = None
    quantity_unit: Optional[str] = None
    days_of_week: Optional[str] = None
    day_of_month: Optional[int] = None
    reminder_days_before: Optional[int] = None
    is_active: Optional[bool] = None
    auto_create_applications: Optional[bool] = None
    notes: Optional[str] = None


class FertilizerScheduleRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    farm_id: int
    plot_id: Optional[int]
    fertilizer_type_id: int
    user_id: int
    schedule_name: str
    description: Optional[str]
    start_date: date
    end_date: Optional[date]
    frequency: ScheduleFrequency
    application_method: ApplicationMethod
    quantity_per_application: float
    quantity_unit: str
    days_of_week: Optional[str]
    day_of_month: Optional[int]
    reminder_days_before: int
    is_active: bool
    last_application_date: Optional[datetime]
    next_application_date: Optional[datetime]
    applications_completed: int
    auto_create_applications: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Additional fields populated via joins
    fertilizer_name: Optional[str] = None
    plot_name: Optional[str] = None
    farm_name: Optional[str] = None


class FertilizerRecommendationCreate(BaseModel):
    farm_id: int
    plot_id: Optional[int] = None
    fertilizer_type_id: int
    user_id: int
    recommended_quantity: float
    quantity_unit: str = "kg"
    recommended_application_date: datetime
    recommended_method: ApplicationMethod
    recommendation_reason: str
    soil_condition_factors: Optional[str] = None
    weather_factors: Optional[str] = None
    crop_stage_factors: Optional[str] = None
    model_version: str = "v1.0"
    confidence_score: Optional[float] = None
    priority: int = 3
    urgency_days: Optional[int] = None
    expires_at: Optional[datetime] = None


class FertilizerRecommendationUpdate(BaseModel):
    is_accepted: Optional[bool] = None
    is_applied: Optional[bool] = None
    applied_date: Optional[datetime] = None
    user_feedback: Optional[str] = None
    effectiveness_rating: Optional[int] = None


class FertilizerRecommendationRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    farm_id: int
    plot_id: Optional[int]
    fertilizer_type_id: int
    user_id: int
    recommended_quantity: float
    quantity_unit: str
    recommended_application_date: datetime
    recommended_method: ApplicationMethod
    recommendation_reason: str
    soil_condition_factors: Optional[str]
    weather_factors: Optional[str]
    crop_stage_factors: Optional[str]
    model_version: str
    confidence_score: Optional[float]
    priority: int
    urgency_days: Optional[int]
    is_accepted: Optional[bool]
    is_applied: bool
    applied_date: Optional[datetime]
    user_feedback: Optional[str]
    effectiveness_rating: Optional[int]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    # Additional fields populated via joins
    fertilizer_name: Optional[str] = None
    plot_name: Optional[str] = None
    farm_name: Optional[str] = None