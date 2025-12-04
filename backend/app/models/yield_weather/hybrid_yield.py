"""
Hybrid Yield Results model for storing combined ML predictions
"""
from sqlmodel import SQLModel, Field, Relationship
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import json


class HybridYieldResult(SQLModel, table=True):
    """Database model for storing hybrid yield prediction results"""
    __tablename__ = "hybrid_yield_results"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    plot_id: int = Field(foreign_key="plots.id")
    
    # Tree and scaling info
    total_trees: int = Field(description="Total number of trees in the plot")
    
    # ML Model predictions
    ml_yield_tree_level: float = Field(description="Sum of individual predicted yields from trees")
    ml_yield_farm_level: float = Field(description="Predicted yield from farm-level ML model")
    final_hybrid_yield: float = Field(description="Combined prediction: (tree_model + farm_model) / 2")
    
    # Confidence scores
    confidence_score: Optional[float] = Field(default=None, description="Overall prediction confidence (0-1)")
    tree_model_confidence: Optional[float] = Field(default=None, description="Tree-level model confidence")
    farm_model_confidence: Optional[float] = Field(default=None, description="Farm-level model confidence")
    
    # Blending weights
    blending_weight_tree: Optional[float] = Field(default=0.5, description="Weight given to tree model")
    blending_weight_farm: Optional[float] = Field(default=0.5, description="Weight given to farm model")
    
    # Model metadata
    model_versions: Optional[str] = Field(default=None, max_length=1000, description="JSON string of model versions")
    features_used: Optional[str] = Field(default=None, max_length=1000, description="JSON string of features used")
    
    # Timestamps
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    plot: "Plot" = Relationship()
    
    def set_model_versions(self, versions: Dict[str, Any]):
        """Helper method to set model versions as JSON string"""
        self.model_versions = json.dumps(versions)
    
    def get_model_versions(self) -> Dict[str, Any]:
        """Helper method to get model versions as dictionary"""
        try:
            return json.loads(self.model_versions) if self.model_versions else {}
        except json.JSONDecodeError:
            return {}
    
    def set_features_used(self, features: Dict[str, Any]):
        """Helper method to set features used as JSON string"""
        self.features_used = json.dumps(features)
    
    def get_features_used(self) -> Dict[str, Any]:
        """Helper method to get features used as dictionary"""
        try:
            return json.loads(self.features_used) if self.features_used else {}
        except json.JSONDecodeError:
            return {}


# Pydantic models for API
class HybridYieldResultCreate(BaseModel):
    plot_id: int
    total_trees: int
    ml_yield_tree_level: float
    ml_yield_farm_level: float
    final_hybrid_yield: float
    confidence_score: Optional[float] = None
    tree_model_confidence: Optional[float] = None
    farm_model_confidence: Optional[float] = None
    blending_weight_tree: Optional[float] = 0.5
    blending_weight_farm: Optional[float] = 0.5
    model_versions: Optional[Dict[str, Any]] = None
    features_used: Optional[Dict[str, Any]] = None


class HybridYieldResultRead(BaseModel):
    model_config = {"from_attributes": True}
    
    id: int
    plot_id: int
    total_trees: int
    ml_yield_tree_level: float
    ml_yield_farm_level: float
    final_hybrid_yield: float
    confidence_score: Optional[float]
    tree_model_confidence: Optional[float]
    farm_model_confidence: Optional[float]
    blending_weight_tree: Optional[float]
    blending_weight_farm: Optional[float]
    model_versions: Optional[str]
    features_used: Optional[str]
    calculated_at: datetime
    created_at: datetime
    
    def get_model_versions_dict(self) -> Dict[str, Any]:
        """Get model versions as dictionary"""
        try:
            return json.loads(self.model_versions) if self.model_versions else {}
        except json.JSONDecodeError:
            return {}
    
    def get_features_used_dict(self) -> Dict[str, Any]:
        """Get features used as dictionary"""
        try:
            return json.loads(self.features_used) if self.features_used else {}
        except json.JSONDecodeError:
            return {}


class HybridYieldPredictionRequest(BaseModel):
    """Request model for hybrid yield prediction"""
    plot_id: int
    total_trees: int
    environmental_factors: Optional[Dict[str, float]] = None
    force_recalculate: bool = False