"""
Hybrid Yield Service for ML-powered yield predictions
"""
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from datetime import datetime
import json

from app.services.base import BaseService, CascadeEvent, CascadeManager
from app.models.yield_weather.farm import Plot
from app.models.yield_weather.tree import Tree
from app.models.yield_weather.hybrid_yield import (
    HybridYieldResult, HybridYieldResultCreate, HybridYieldResultRead,
    HybridYieldPredictionRequest
)


class HybridYieldService(BaseService):
    """Service for managing hybrid yield predictions"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.cascade_manager = CascadeManager(db)
    
    def calculate_hybrid_yield(self, request: HybridYieldPredictionRequest) -> HybridYieldResult:
        """Calculate hybrid yield prediction combining tree-level and farm-level models"""
        
        # Get plot information
        plot = self.db.get(Plot, request.plot_id)
        if not plot:
            raise ValueError(f"Plot with ID {request.plot_id} not found")
        
        # Get trees in the plot
        trees = list(self.db.exec(select(Tree).where(Tree.plot_id == request.plot_id)).all())
        
        if not trees:
            raise ValueError(f"No trees found for plot {request.plot_id}")
        
        # Check if we already have a recent prediction (unless force_recalculate is True)
        if not request.force_recalculate:
            existing_result = self.get_latest_prediction(request.plot_id)
            if existing_result and self._is_prediction_recent(existing_result):
                return existing_result
        
        # Calculate tree-level yield
        tree_level_yield, tree_confidence = self._calculate_tree_level_yield(trees)
        
        # Calculate farm-level yield
        farm_level_yield, farm_confidence = self._calculate_farm_level_yield(
            plot, request.total_trees, request.environmental_factors or {}
        )
        
        # Calculate blending weights based on confidence scores
        tree_weight, farm_weight = self._calculate_blending_weights(
            tree_confidence, farm_confidence, len(trees), request.total_trees
        )
        
        # Calculate final hybrid yield
        final_yield = (tree_level_yield * tree_weight) + (farm_level_yield * farm_weight)
        overall_confidence = (tree_confidence * tree_weight) + (farm_confidence * farm_weight)
        
        # Create hybrid yield result
        result_data = HybridYieldResultCreate(
            plot_id=request.plot_id,
            total_trees=request.total_trees,
            ml_yield_tree_level=tree_level_yield,
            ml_yield_farm_level=farm_level_yield,
            final_hybrid_yield=final_yield,
            confidence_score=overall_confidence,
            tree_model_confidence=tree_confidence,
            farm_model_confidence=farm_confidence,
            blending_weight_tree=tree_weight,
            blending_weight_farm=farm_weight,
            model_versions={
                "tree_model": "v2.1",
                "farm_model": "v1.3",
                "hybrid_blender": "v1.0"
            },
            features_used={
                "tree_features": ["stem_diameter_mm", "stem_count", "tree_age", "fertilizer_used", "disease_status"],
                "farm_features": ["area", "variety", "location", "rainfall", "temperature", "soil_type"],
                "sample_size": len(trees),
                "total_trees": request.total_trees
            }
        )
        
        # Save result to database
        result = HybridYieldResult(**result_data.dict())
        result.calculated_at = datetime.utcnow()
        result.created_at = datetime.utcnow()
        
        # Set JSON fields
        if result_data.model_versions:
            result.set_model_versions(result_data.model_versions)
        if result_data.features_used:
            result.set_features_used(result_data.features_used)
        
        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)
        
        # Update individual tree yield estimates
        self._update_tree_yield_estimates(trees, tree_level_yield, request.total_trees)
        
        return result
    
    def _calculate_tree_level_yield(self, trees: List[Tree]) -> tuple[float, float]:
        """Calculate yield based on individual tree measurements"""
        total_predicted_yield = 0.0
        confidence_scores = []
        
        for tree in trees:
            if not tree.stem_diameter_mm or tree.stem_diameter_mm <= 0:
                # Use average diameter if missing
                avg_diameter = 45.0  # Default average for mature cinnamon trees
            else:
                avg_diameter = tree.stem_diameter_mm
            
            # Research-based yield prediction model
            # Based on Sri Lankan cinnamon research
            diameter_factor = (avg_diameter / 45.0) ** 1.8  # Optimal diameter ~45mm
            stem_factor = min(tree.stem_count / 3.0, 2.0)   # Optimal stems ~3
            age_factor = min((tree.tree_age_years or 4.0) / 4.0, 1.2)  # Mature at 4+ years
            
            # Base yield per tree (kg of fresh bark per harvest cycle)
            base_yield = 2.5  # kg per tree for mature cinnamon
            
            # Calculate predicted yield for this tree
            predicted_yield = base_yield * diameter_factor * stem_factor * age_factor
            
            # Apply management factors
            if tree.fertilizer_used:
                predicted_yield *= 1.15  # 15% boost from fertilization
            
            # Disease penalty
            if tree.disease_status.value == 'mild':
                predicted_yield *= 0.90
            elif tree.disease_status.value == 'severe':
                predicted_yield *= 0.70
            
            total_predicted_yield += predicted_yield
            
            # Calculate confidence based on data quality
            data_completeness = sum([
                1.0 if tree.stem_diameter_mm else 0.5,
                1.0 if tree.tree_age_years else 0.7,
                1.0,  # stem_count always available
                1.0,  # fertilizer status always available
                1.0   # disease status always available
            ]) / 5.0
            
            confidence_scores.append(data_completeness)
            
            # Update tree's yield estimate
            tree.hybrid_yield_estimate = predicted_yield
            self.db.add(tree)
        
        self.db.commit()
        
        # Calculate overall tree model confidence
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5
        
        # Adjust confidence based on sample size
        sample_size_factor = min(len(trees) / 10.0, 1.0)  # Optimal sample size is 10+ trees
        final_confidence = avg_confidence * sample_size_factor
        
        return total_predicted_yield, final_confidence
    
    def _calculate_farm_level_yield(self, plot: Plot, total_trees: int, 
                                   environmental_factors: Dict[str, float]) -> tuple[float, float]:
        """Calculate yield based on farm-level characteristics"""
        
        # Base yield calculation using empirical data
        # Typical cinnamon yield in Sri Lanka: 1500-3000 kg/ha
        base_yield_per_ha = 2200  # kg/ha average for Ceylon cinnamon
        
        # Scale by plot area
        base_yield = base_yield_per_ha * plot.area
        
        # Variety factor
        variety_factor = 1.0
        if "ceylon" in plot.cinnamon_variety.lower():
            variety_factor = 1.0  # Premium quality, standard yield
        elif "cassia" in plot.cinnamon_variety.lower():
            variety_factor = 1.15  # Higher yield but lower quality
        
        # Tree density factor
        if total_trees and plot.area:
            trees_per_ha = total_trees / plot.area
            optimal_density = 1111  # trees per hectare (3m x 3m spacing)
            
            if trees_per_ha < optimal_density * 0.8:
                density_factor = trees_per_ha / optimal_density  # Under-planted
            elif trees_per_ha > optimal_density * 1.3:
                density_factor = 0.9  # Over-crowded
            else:
                density_factor = 1.0  # Optimal density
        else:
            density_factor = 0.95  # Unknown density, slight penalty
        
        # Environmental factors
        rainfall = environmental_factors.get('rainfall', 2500)  # mm/year
        temperature = environmental_factors.get('temperature', 26)  # Celsius
        
        # Rainfall factor (optimal: 1500-3000mm)
        if 1500 <= rainfall <= 3000:
            rainfall_factor = 1.0
        elif rainfall < 1500:
            rainfall_factor = 0.8 + (rainfall / 1500) * 0.2
        else:
            rainfall_factor = max(0.7, 1.0 - (rainfall - 3000) / 2000 * 0.3)
        
        # Temperature factor (optimal: 24-28°C)
        if 24 <= temperature <= 28:
            temp_factor = 1.0
        else:
            temp_factor = max(0.8, 1.0 - abs(temperature - 26) / 10 * 0.2)
        
        # Age factor based on plot age
        age_months = plot.age_months or 48  # Default to 4 years if unknown
        if age_months < 36:
            age_factor = 0.3  # Young trees, low yield
        elif age_months < 48:
            age_factor = 0.7 + (age_months - 36) / 12 * 0.3  # Increasing yield
        else:
            age_factor = 1.0  # Mature trees
        
        # Calculate final farm-level yield
        farm_yield = (base_yield * variety_factor * density_factor * 
                     rainfall_factor * temp_factor * age_factor)
        
        # Calculate confidence based on data availability
        confidence_factors = [
            1.0 if plot.area else 0.5,
            1.0 if plot.cinnamon_variety else 0.8,
            1.0 if total_trees else 0.7,
            1.0 if plot.age_months else 0.6,
            0.9 if 'rainfall' in environmental_factors else 0.6,
            0.9 if 'temperature' in environmental_factors else 0.6
        ]
        
        farm_confidence = sum(confidence_factors) / len(confidence_factors)
        
        return farm_yield, farm_confidence
    
    def _calculate_blending_weights(self, tree_confidence: float, farm_confidence: float,
                                   sample_size: int, total_trees: int) -> tuple[float, float]:
        """Calculate optimal blending weights for tree and farm models"""
        
        # Base weights
        tree_weight = 0.5
        farm_weight = 0.5
        
        # Adjust based on confidence scores
        confidence_ratio = tree_confidence / (tree_confidence + farm_confidence) if (tree_confidence + farm_confidence) > 0 else 0.5
        
        # Adjust based on sample size representativeness
        if total_trees > 0:
            sample_ratio = min(sample_size / total_trees, 0.3)  # Max 30% sample is very good
            
            # Higher sample ratio increases tree model weight
            tree_weight = 0.3 + (confidence_ratio * 0.4) + (sample_ratio * 0.3)
            farm_weight = 1.0 - tree_weight
        
        # Ensure weights are within reasonable bounds
        tree_weight = max(0.2, min(0.8, tree_weight))
        farm_weight = 1.0 - tree_weight
        
        return tree_weight, farm_weight
    
    def _update_tree_yield_estimates(self, trees: List[Tree], total_tree_yield: float, total_trees: int):
        """Update individual tree yield estimates based on total prediction"""
        if not trees or total_trees <= 0:
            return
        
        # Calculate scaling factor to match total prediction
        sampled_total = sum(tree.hybrid_yield_estimate or 0 for tree in trees)
        if sampled_total > 0:
            # Scale up to full plot
            scaling_factor = (total_tree_yield * total_trees / len(trees)) / sampled_total
            
            for tree in trees:
                if tree.hybrid_yield_estimate:
                    tree.hybrid_yield_estimate *= scaling_factor
                    self.db.add(tree)
        
        self.db.commit()
    
    def get_latest_prediction(self, plot_id: int) -> Optional[HybridYieldResult]:
        """Get the most recent hybrid yield prediction for a plot"""
        result = self.db.exec(
            select(HybridYieldResult)
            .where(HybridYieldResult.plot_id == plot_id)
            .order_by(HybridYieldResult.calculated_at.desc())
        ).first()
        
        return result
    
    def get_all_predictions(self, plot_id: int) -> List[HybridYieldResult]:
        """Get all hybrid yield predictions for a plot"""
        results = self.db.exec(
            select(HybridYieldResult)
            .where(HybridYieldResult.plot_id == plot_id)
            .order_by(HybridYieldResult.calculated_at.desc())
        ).all()
        
        return list(results)
    
    def _is_prediction_recent(self, result: HybridYieldResult, hours: int = 24) -> bool:
        """Check if a prediction is recent (within specified hours)"""
        time_diff = datetime.utcnow() - result.calculated_at
        return time_diff.total_seconds() < (hours * 3600)