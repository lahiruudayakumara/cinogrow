from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PlotStatus(str, Enum):
    """Enum for plot status"""
    PREPARING = "PREPARING"
    PLANTED = "PLANTED"
    GROWING = "GROWING"
    MATURE = "MATURE"
    HARVESTING = "HARVESTING"
    HARVESTED = "HARVESTED"
    RESTING = "RESTING"


class Farm(SQLModel, table=True):
    """Database model for farms"""
    __tablename__ = "farms"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    owner_name: str = Field(max_length=255)
    total_area: float  # in hectares
    num_plots: int = Field(default=1)  # Number of plots in the farm
    location: str = Field(max_length=255)
    latitude: float
    longitude: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    plots: List["Plot"] = Relationship(back_populates="farm")


class Plot(SQLModel, table=True):
    """Database model for farm plots"""
    __tablename__ = "plots"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    farm_id: int = Field(foreign_key="farms.id")
    name: str = Field(max_length=100)
    area: float  # in hectares
    status: PlotStatus = Field(default=PlotStatus.PREPARING)
    crop_type: Optional[str] = Field(default=None, max_length=100)
    planting_date: Optional[datetime] = Field(default=None)
    expected_harvest_date: Optional[datetime] = Field(default=None)
    age_months: Optional[int] = Field(default=None)
    progress_percentage: int = Field(default=0, ge=0, le=100)
    notes: Optional[str] = Field(default=None, max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    farm: Farm = Relationship(back_populates="plots")
    planting_records: List["PlantingRecord"] = Relationship(back_populates="plot")



class FarmActivity(SQLModel, table=True):
    """Database model for farm activities"""
    __tablename__ = "farm_activities"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    farm_id: int = Field(foreign_key="farms.id")
    plot_id: Optional[int] = Field(default=None, foreign_key="plots.id")
    activity_type: str = Field(max_length=100)  # planting, fertilizing, watering, etc.
    description: str = Field(max_length=500)
    activity_date: datetime
    cost: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PlantingRecord(SQLModel, table=True):
    """Database model for planting records"""
    __tablename__ = "planting_records"
    
    record_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int  # Remove foreign key constraint until users table is implemented
    plot_id: int = Field(foreign_key="plots.id")
    plot_area: float  # in hectares - redundant but useful for historical data
    cinnamon_variety: str = Field(max_length=255)
    seedling_count: int
    planted_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    plot: Plot = Relationship(back_populates="planting_records")


# Pydantic models for API responses
class FarmCreate(BaseModel):
    name: str
    owner_name: str
    total_area: float
    num_plots: int = 1
    location: str
    latitude: float
    longitude: float


class FarmRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    name: str
    owner_name: str
    total_area: float
    num_plots: int
    location: str
    latitude: float
    longitude: float
    created_at: datetime


class PlotCreate(BaseModel):
    farm_id: int
    name: str
    area: float
    crop_type: Optional[str] = None
    planting_date: Optional[datetime] = None


class PlotUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[float] = None
    crop_type: Optional[str] = None
    planting_date: Optional[datetime] = None


class PlotRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    farm_id: int
    name: str
    area: float
    status: PlotStatus
    crop_type: Optional[str]
    planting_date: Optional[datetime]
    expected_harvest_date: Optional[datetime]
    age_months: Optional[int]
    progress_percentage: int


# Pydantic models for PlantingRecord API
class PlantingRecordCreate(BaseModel):
    user_id: int
    plot_id: int
    plot_area: float
    cinnamon_variety: str
    seedling_count: int
    planted_date: datetime


class PlantingRecordUpdate(BaseModel):
    plot_area: Optional[float] = None
    cinnamon_variety: Optional[str] = None
    seedling_count: Optional[int] = None
    planted_date: Optional[datetime] = None


class PlantingRecordRead(BaseModel):
    model_config = {"from_attributes": True}
    
    record_id: int
    user_id: int
    plot_id: int
    plot_area: float
    cinnamon_variety: str
    seedling_count: int
    planted_date: datetime
    created_at: datetime
    plot_name: Optional[str] = None  # Will be populated via join


# Yield-related models
class YieldDataset(SQLModel, table=True):
    """Database model for yield dataset (training data for ML model)"""
    __tablename__ = "yield_dataset"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    location: str = Field(max_length=255)  # Geographic location
    variety: str = Field(max_length=255)   # Cinnamon variety (Ceylon, Cassia, etc.)
    area: float                           # Area in hectares
    yield_amount: float                   # Yield in kg
    soil_type: Optional[str] = Field(default=None, max_length=100)
    rainfall: Optional[float] = Field(default=None)  # Annual rainfall in mm
    temperature: Optional[float] = Field(default=None)  # Average temperature in Celsius
    age_years: Optional[int] = Field(default=None)      # Age of cinnamon trees in years
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserYieldRecord(SQLModel, table=True):
    """Database model for user's actual yield records"""
    __tablename__ = "user_yield_records"
    
    yield_id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int  # Remove foreign key constraint until users table is implemented
    plot_id: int = Field(foreign_key="plots.id")
    yield_amount: float  # Actual yield in kg
    yield_date: datetime  # Date when yield was harvested
    notes: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    plot: Plot = Relationship()


class YieldPrediction(SQLModel, table=True):
    """Database model to store ML predictions (optional, for caching)"""
    __tablename__ = "yield_predictions"
    
    prediction_id: Optional[int] = Field(default=None, primary_key=True)
    plot_id: int = Field(foreign_key="plots.id")
    predicted_yield: float  # Predicted yield in kg
    confidence_score: Optional[float] = Field(default=None)  # Model confidence (0-1)
    model_version: str = Field(max_length=100, default="v1.0")
    prediction_date: datetime = Field(default_factory=datetime.utcnow)
    features_used: Optional[str] = Field(default=None, max_length=1000)  # JSON string of features
    
    # Relationships
    plot: Plot = Relationship()


# Pydantic models for Yield API
class YieldDatasetCreate(BaseModel):
    location: str
    variety: str
    area: float
    yield_amount: float
    soil_type: Optional[str] = None
    rainfall: Optional[float] = None
    temperature: Optional[float] = None
    age_years: Optional[int] = None


class YieldDatasetRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    location: str
    variety: str
    area: float
    yield_amount: float
    soil_type: Optional[str]
    rainfall: Optional[float]
    temperature: Optional[float]
    age_years: Optional[int]
    created_at: datetime


class UserYieldRecordCreate(BaseModel):
    user_id: int
    plot_id: int
    yield_amount: float
    yield_date: datetime
    notes: Optional[str] = None


class UserYieldRecordUpdate(BaseModel):
    yield_amount: Optional[float] = None
    yield_date: Optional[datetime] = None
    notes: Optional[str] = None


class UserYieldRecordRead(BaseModel):
    model_config = {"from_attributes": True}
    
    yield_id: int
    user_id: int
    plot_id: int
    yield_amount: float
    yield_date: datetime
    notes: Optional[str]
    created_at: datetime
    plot_name: Optional[str] = None  # Will be populated via join


class YieldPredictionRead(BaseModel):
    model_config = {"from_attributes": True}
    
    prediction_id: int
    plot_id: int
    predicted_yield: float
    confidence_score: Optional[float]
    model_version: str
    prediction_date: datetime
    plot_name: Optional[str] = None