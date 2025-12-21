"""
Tree-level models for hybrid cinnamon yield prediction
Includes individual tree measurements and characteristics needed for tree-level ML models
"""
from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from enum import Enum

if TYPE_CHECKING:
    from app.models.yield_weather.farm import Plot


class DiseaseStatus(str, Enum):
    """Enum for tree disease status"""
    NONE = "none"
    MILD = "mild" 
    SEVERE = "severe"


class FertilizerType(str, Enum):
    """Enum for fertilizer types"""
    ORGANIC = "organic"
    NPK = "npk"
    UREA = "urea"
    COMPOST = "compost"
    NONE = "none"


class Tree(SQLModel, table=True):
    """Database model for individual cinnamon trees"""
    __tablename__ = "trees"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    plot_id: int = Field(foreign_key="plots.id", ondelete="CASCADE")
    tree_code: str = Field(max_length=50)  # Unique identifier within plot (e.g., "A1", "B3")
    location_x: Optional[float] = Field(default=None)  # X coordinate within plot
    location_y: Optional[float] = Field(default=None)  # Y coordinate within plot
    planting_date: Optional[datetime] = Field(default=None)
    variety: str = Field(max_length=100, default="Sri Gemunu")
    
    # Tree characteristics
    tree_age_years: Optional[float] = Field(default=None)
    stem_count: int = Field(default=1)  # Number of stems on this tree
    stem_diameter_mm: Optional[float] = Field(default=None)  # Stem diameter for ML predictions
    is_active: bool = Field(default=True)  # Whether tree is alive and productive
    
    # ML Predictions
    hybrid_yield_estimate: Optional[float] = Field(default=None)  # Predicted yield from this tree
    
    # Management history
    last_harvest_date: Optional[datetime] = Field(default=None)
    fertilizer_used: bool = Field(default=False)
    fertilizer_type: Optional[FertilizerType] = Field(default=None)
    fertilizer_application_date: Optional[datetime] = Field(default=None)
    disease_status: DiseaseStatus = Field(default=DiseaseStatus.NONE)
    disease_notes: Optional[str] = Field(default=None, max_length=500)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    plot: "Plot" = Relationship(back_populates="trees")
    measurements: List["TreeMeasurement"] = Relationship(back_populates="tree")
    harvest_records: List["TreeHarvestRecord"] = Relationship(back_populates="tree")


class TreeMeasurement(SQLModel, table=True):
    """Database model for tree measurements and characteristics at specific points in time"""
    __tablename__ = "tree_measurements"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tree_id: int = Field(foreign_key="trees.id")
    measurement_date: datetime = Field(default_factory=datetime.utcnow)
    measured_by: Optional[str] = Field(default=None, max_length=100)  # Who took the measurement
    
    # Stem measurements (key features for ML model)
    stem_diameter_mm: float = Field(description="Average stem diameter in millimeters")
    num_existing_stems: int = Field(default=1, description="Number of harvestable stems")
    stem_length_cm: Optional[float] = Field(default=None, description="Average stem length in cm")
    stem_thickness_variability: Optional[float] = Field(default=None, description="Std dev of stem diameters")
    
    # Tree health indicators
    canopy_coverage: Optional[float] = Field(default=None, ge=0, le=100, description="Canopy coverage percentage")
    leaf_health_score: Optional[int] = Field(default=None, ge=1, le=5, description="Leaf health score 1-5")
    pest_damage: Optional[float] = Field(default=None, ge=0, le=100, description="Pest damage percentage")
    
    # Environmental conditions at measurement time
    soil_moisture: Optional[float] = Field(default=None, description="Soil moisture percentage")
    rainfall_recent_mm: Optional[float] = Field(default=None, description="Rainfall in last 30 days")
    temperature_recent_c: Optional[float] = Field(default=None, description="Average temperature in last 30 days")
    
    # Prediction targets (for training data)
    actual_canes: Optional[int] = Field(default=None, description="Actual number of canes harvested")
    actual_fresh_weight_kg: Optional[float] = Field(default=None, description="Fresh weight of bark in kg")
    actual_dry_weight_kg: Optional[float] = Field(default=None, description="Dry weight of bark in kg")
    
    # Metadata
    notes: Optional[str] = Field(default=None, max_length=1000)
    is_training_data: bool = Field(default=False, description="Whether this record is used for ML training")
    
    # Relationships
    tree: Tree = Relationship(back_populates="measurements")


class TreeHarvestRecord(SQLModel, table=True):
    """Database model for tree harvest records"""
    __tablename__ = "tree_harvest_records"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    tree_id: int = Field(foreign_key="trees.id")
    harvest_date: datetime
    harvested_by: Optional[str] = Field(default=None, max_length=100)
    
    # Harvest results
    canes_harvested: int = Field(description="Number of canes harvested from this tree")
    fresh_bark_weight_kg: float = Field(description="Fresh weight of bark harvested")
    dry_bark_weight_kg: Optional[float] = Field(default=None, description="Weight after drying")
    bark_quality_grade: Optional[str] = Field(default=None, max_length=20, description="Quality grade A/B/C")
    
    # Post-harvest tree condition
    stems_remaining: int = Field(default=0, description="Number of stems left on tree")
    tree_health_after_harvest: Optional[str] = Field(default=None, max_length=200)
    
    # Economic data
    price_per_kg: Optional[float] = Field(default=None, description="Price received per kg")
    total_revenue: Optional[float] = Field(default=None, description="Total revenue from this tree")
    
    notes: Optional[str] = Field(default=None, max_length=500)
    
    # Relationships
    tree: Tree = Relationship(back_populates="harvest_records")


# Pydantic models for API
class TreeCreate(BaseModel):
    plot_id: int
    tree_code: str
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    planting_date: Optional[datetime] = None
    variety: str = "Sri Gemunu"
    tree_age_years: Optional[float] = None
    stem_diameter_mm: Optional[float] = None
    fertilizer_used: bool = False
    fertilizer_type: Optional[FertilizerType] = None
    fertilizer_application_date: Optional[datetime] = None
    disease_status: DiseaseStatus = DiseaseStatus.NONE
    disease_notes: Optional[str] = None


class TreeUpdate(BaseModel):
    tree_code: Optional[str] = None
    location_x: Optional[float] = None
    location_y: Optional[float] = None
    variety: Optional[str] = None
    tree_age_years: Optional[float] = None
    stem_diameter_mm: Optional[float] = None
    hybrid_yield_estimate: Optional[float] = None
    fertilizer_used: Optional[bool] = None
    fertilizer_type: Optional[FertilizerType] = None
    fertilizer_application_date: Optional[datetime] = None
    disease_status: Optional[DiseaseStatus] = None
    disease_notes: Optional[str] = None
    is_active: Optional[bool] = None


class TreeRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    plot_id: int
    tree_code: str
    location_x: Optional[float]
    location_y: Optional[float]
    planting_date: Optional[datetime]
    variety: str
    tree_age_years: Optional[float]
    stem_count: int
    stem_diameter_mm: Optional[float]
    hybrid_yield_estimate: Optional[float]
    is_active: bool
    fertilizer_used: bool
    fertilizer_type: Optional[FertilizerType]
    fertilizer_application_date: Optional[datetime]
    disease_status: DiseaseStatus
    disease_notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class TreeMeasurementCreate(BaseModel):
    tree_id: int
    measurement_date: Optional[datetime] = None
    measured_by: Optional[str] = None
    stem_diameter_mm: float
    num_existing_stems: int = 1
    stem_length_cm: Optional[float] = None
    stem_thickness_variability: Optional[float] = None
    canopy_coverage: Optional[float] = None
    leaf_health_score: Optional[int] = None
    pest_damage: Optional[float] = None
    soil_moisture: Optional[float] = None
    rainfall_recent_mm: Optional[float] = None
    temperature_recent_c: Optional[float] = None
    actual_canes: Optional[int] = None
    actual_fresh_weight_kg: Optional[float] = None
    actual_dry_weight_kg: Optional[float] = None
    notes: Optional[str] = None
    is_training_data: bool = False


class TreeMeasurementRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    tree_id: int
    measurement_date: datetime
    measured_by: Optional[str]
    stem_diameter_mm: float
    num_existing_stems: int
    stem_length_cm: Optional[float]
    stem_thickness_variability: Optional[float]
    canopy_coverage: Optional[float]
    leaf_health_score: Optional[int]
    pest_damage: Optional[float]
    soil_moisture: Optional[float]
    rainfall_recent_mm: Optional[float]
    temperature_recent_c: Optional[float]
    actual_canes: Optional[int]
    actual_fresh_weight_kg: Optional[float]
    actual_dry_weight_kg: Optional[float]
    notes: Optional[str]
    is_training_data: bool


class TreeHarvestRecordCreate(BaseModel):
    tree_id: int
    harvest_date: datetime
    harvested_by: Optional[str] = None
    canes_harvested: int
    fresh_bark_weight_kg: float
    dry_bark_weight_kg: Optional[float] = None
    bark_quality_grade: Optional[str] = None
    stems_remaining: int = 0
    tree_health_after_harvest: Optional[str] = None
    price_per_kg: Optional[float] = None
    total_revenue: Optional[float] = None
    notes: Optional[str] = None


class TreeHarvestRecordRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    tree_id: int
    harvest_date: datetime
    harvested_by: Optional[str]
    canes_harvested: int
    fresh_bark_weight_kg: float
    dry_bark_weight_kg: Optional[float]
    bark_quality_grade: Optional[str]
    stems_remaining: int
    tree_health_after_harvest: Optional[str]
    price_per_kg: Optional[float]
    total_revenue: Optional[float]
    notes: Optional[str]


# Tree sampling models for hybrid prediction
class TreeSampleMeasurement(BaseModel):
    """Individual tree measurement for sampling-based prediction"""
    tree_code: Optional[str] = None
    stem_diameter_mm: float
    fertilizer_used: bool = False
    fertilizer_type: Optional[FertilizerType] = None
    disease_status: DiseaseStatus = DiseaseStatus.NONE
    num_existing_stems: int = 1
    tree_age_years: Optional[float] = None
    canopy_coverage: Optional[float] = None
    notes: Optional[str] = None


class TreeSamplingRequest(BaseModel):
    """Request for hybrid yield prediction using tree sampling"""
    plot_id: int
    sample_trees: List[TreeSampleMeasurement] = Field(min_items=5, max_items=20)
    trees_per_plot: Optional[int] = None  # Total number of trees in the plot
    rainfall_recent_mm: Optional[float] = None
    temperature_recent_c: Optional[float] = None
    soil_moisture: Optional[float] = None
    expected_harvest_date: Optional[datetime] = None
    notes: Optional[str] = None


class HybridPredictionResult(BaseModel):
    """Result of hybrid yield prediction"""
    plot_id: int
    plot_area: float
    
    # Tree-level predictions
    sample_size: int
    avg_predicted_canes_per_tree: float
    avg_predicted_fresh_weight_per_tree: float
    avg_predicted_dry_weight_per_tree: float
    
    # Scaled-up predictions
    estimated_trees_per_hectare: int
    total_estimated_trees: int
    tree_model_yield_kg: float
    
    # Plot-level ML prediction
    plot_model_yield_kg: float
    
    # Final hybrid result
    final_hybrid_yield_kg: float
    yield_per_hectare: float
    confidence_score: float
    
    # Metadata
    tree_model_confidence: float
    plot_model_confidence: float
    blending_weight_tree: float
    blending_weight_plot: float
    prediction_date: datetime
    model_versions: dict
    features_used: dict
    
    # Economic projections
    estimated_dry_bark_percentage: float = 5.0
    estimated_market_price_per_kg: Optional[float] = None
    estimated_revenue: Optional[float] = None
    
    notes: Optional[str] = None