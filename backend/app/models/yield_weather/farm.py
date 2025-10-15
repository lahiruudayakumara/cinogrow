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