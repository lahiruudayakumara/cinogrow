from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime, timedelta
from enum import Enum

if TYPE_CHECKING:
    from app.models.yield_weather.tree import Tree


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
    """Database model for farm plots - contains only core form data"""
    __tablename__ = "plots"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    farm_id: int = Field(foreign_key="farms.id")
    name: str = Field(max_length=100)
    area: float  # in hectares
    crop_type: Optional[str] = Field(default="Ceylon Cinnamon", max_length=100)  # Cinnamon variety from form
    notes: Optional[str] = Field(default=None, max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    farm: Farm = Relationship(back_populates="plots")
    planting_records: List["PlantingRecord"] = Relationship(back_populates="plot")
    trees: List["Tree"] = Relationship(back_populates="plot")
    
    @property
    def status(self) -> PlotStatus:
        """Calculate status based on planting records"""
        if not self.planting_records:
            return PlotStatus.PREPARING
        
        # Get the most recent planting record
        latest_planting = max(self.planting_records, key=lambda x: x.planted_date)
        days_since_planting = (datetime.utcnow() - latest_planting.planted_date).days
        
        if days_since_planting < 30:
            return PlotStatus.PLANTED
        elif days_since_planting < 365:
            return PlotStatus.GROWING
        elif days_since_planting < 1095:  # 3 years
            return PlotStatus.GROWING
        else:
            return PlotStatus.MATURE
    
    @property
    def planting_date(self) -> Optional[datetime]:
        """Get planting date from most recent planting record"""
        if not self.planting_records:
            return None
        return max(self.planting_records, key=lambda x: x.planted_date).planted_date
    
    @property
    def age_months(self) -> Optional[int]:
        """Calculate age in months from planting date"""
        if not self.planting_date:
            return None
        return int((datetime.utcnow() - self.planting_date).days / 30.44)  # Average days per month
    
    @property
    def progress_percentage(self) -> int:
        """Calculate progress percentage based on age"""
        if not self.age_months:
            return 0
        
        # Cinnamon is typically ready to harvest after 36 months
        progress = min(100, int((self.age_months / 36) * 100))
        return progress
    
    @property
    def expected_harvest_date(self) -> Optional[datetime]:
        """Calculate expected harvest date (36 months after planting)"""
        if not self.planting_date:
            return None
        return self.planting_date + timedelta(days=1095)  # 3 years
    
    @property
    def seedling_count(self) -> int:
        """Get total seedling count from planting records"""
        if not self.planting_records:
            return 0
        return sum(record.seedling_count for record in self.planting_records)
    
    @property
    def cinnamon_variety(self) -> Optional[str]:
        """Get cinnamon variety from most recent planting record or crop_type"""
        if self.planting_records:
            latest_planting = max(self.planting_records, key=lambda x: x.planted_date)
            return latest_planting.cinnamon_variety
        return self.crop_type



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
    crop_type: Optional[str] = "Ceylon Cinnamon"
    notes: Optional[str] = None


class PlotUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[float] = None
    crop_type: Optional[str] = None
    notes: Optional[str] = None


class PlotRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    farm_id: int
    name: str
    area: float
    crop_type: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    # Computed properties (will be set manually)
    status: Optional[str] = None
    planting_date: Optional[datetime] = None
    expected_harvest_date: Optional[datetime] = None
    age_months: Optional[int] = None
    progress_percentage: Optional[int] = None
    seedling_count: Optional[int] = None
    cinnamon_variety: Optional[str] = None


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