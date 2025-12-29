"""
Hybrid Cinnamon Yield Prediction Service
Combines plot-level ML, tree-level ML, and agronomic formulas for improved accuracy
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from sqlmodel import Session, select
from datetime import datetime
import logging

from app.models.yield_weather.tree import (
    TreeSampleMeasurement, TreeSamplingRequest, HybridPredictionResult,
    Tree, TreeMeasurement, DiseaseStatus, FertilizerType
)
from app.models.yield_weather.farm import Plot, Farm
from app.services.tree_level_models_real import TreeLevelMLModels
from app.services.plot_level_yield_model import PlotLevelYieldModel

logger = logging.getLogger(__name__)


class HybridYieldPredictionService:
    """Enhanced hybrid service combining multiple prediction approaches"""
    
    def __init__(self, db: Session):
        self.db = db
        self.tree_models = TreeLevelMLModels(db)
        self.plot_model = PlotLevelYieldModel(db)
        
        # Hybrid parameters
        self.tree_model_weight = 0.6  # From project spec
        self.plot_model_weight = 0.4
        self.dry_bark_percentage = 0.05  # 5% of fresh weight becomes dry bark
        
        # Sri Lankan cinnamon agronomic constants
        self.trees_per_hectare_default = 1250  # Typical planting density
        self.min_trees_per_hectare = 800
        self.max_trees_per_hectare = 2000
    
    def predict_hybrid_yield(self, request: TreeSamplingRequest) -> HybridPredictionResult:
        """
        Main hybrid prediction method following the 6-step process:
        1. Tree sampling (farmer input)
        2. Tree model prediction (canes + fresh weight)
        3. Convert to dry weight (5% conversion)
        4. Upscale to plot level (tree density estimation)
        5. Plot model prediction (enhanced plot-level ML)
        6. Hybrid combination (weighted average)
        """
        logger.info(f"Starting hybrid prediction for plot {request.plot_id}")
        
        # Validate plot exists
        plot = self.db.get(Plot, request.plot_id)
        if not plot:
            raise ValueError(f"Plot {request.plot_id} not found")

        # Note: Skip farm lookup for now due to schema issues
        farm = None
        
        # Step 1: Validate tree sampling
        if len(request.sample_trees) < 5:
            raise ValueError("At least 5 tree samples required for reliable prediction")
        
        # Step 2: Tree-level predictions (use default location since farm lookup is skipped)
        tree_predictions = self._predict_sampled_trees(request.sample_trees, 'Galle')
        
        # Step 3: Convert to dry weight
        dry_weight_predictions = self._convert_to_dry_weight(tree_predictions)
        
        # Step 4: Upscale to plot level using trees_per_plot from request
        tree_based_yield = self._upscale_to_plot_level(dry_weight_predictions, plot, request.trees_per_plot)
        
        # Step 5: Plot-level ML prediction
        plot_based_yield = self._get_enhanced_plot_prediction(plot, request)
        
        # Step 6: Hybrid combination
        final_yield = self._combine_predictions(tree_based_yield, plot_based_yield)
        
        # Calculate confidence scores
        tree_confidence = self._calculate_tree_confidence(dry_weight_predictions, request.sample_trees)
        plot_confidence = plot_based_yield.get("confidence_score", 0.7)
        
        # Overall confidence based on sample size and model agreement
        overall_confidence = self._calculate_hybrid_confidence(
            tree_based_yield, plot_based_yield, tree_confidence, plot_confidence
        )
        
        # Economic projections
        estimated_revenue = None
        if request.sample_trees and len(request.sample_trees) > 0:
            # Estimate market price based on quality indicators
            avg_diameter = np.mean([t.stem_diameter_mm for t in request.sample_trees])
            disease_severity = max([self._disease_severity_score(t.disease_status) for t in request.sample_trees])
            
            # Base price with quality adjustments
            base_price_per_kg = 1000  # Sri Lankan rupees
            quality_factor = min(1.3, max(0.7, avg_diameter / 45.0 * (1 - disease_severity * 0.2)))
            estimated_price = base_price_per_kg * quality_factor
            estimated_revenue = final_yield["final_yield_kg"] * estimated_price
        
        # Build comprehensive result
        result = HybridPredictionResult(
            plot_id=request.plot_id,
            plot_area=plot.area,
            
            # Tree-level predictions
            sample_size=len(request.sample_trees),
            avg_predicted_canes_per_tree=tree_based_yield["avg_canes_per_tree"],
            avg_predicted_fresh_weight_per_tree=tree_based_yield["avg_fresh_weight_per_tree"],
            avg_predicted_dry_weight_per_tree=tree_based_yield["avg_dry_weight_per_tree"],
            
            # Scaled-up predictions
            estimated_trees_per_hectare=tree_based_yield["trees_per_hectare"],
            total_estimated_trees=tree_based_yield["total_trees"],
            tree_model_yield_kg=tree_based_yield["total_yield_kg"],
            
            # Plot-level ML prediction
            plot_model_yield_kg=plot_based_yield["predicted_yield"],
            
            # Final hybrid result
            final_hybrid_yield_kg=final_yield["final_yield_kg"],
            yield_per_hectare=final_yield["yield_per_hectare"],
            confidence_score=overall_confidence,
            
            # Metadata
            tree_model_confidence=tree_confidence,
            plot_model_confidence=plot_confidence,
            blending_weight_tree=self.tree_model_weight,
            blending_weight_plot=self.plot_model_weight,
            prediction_date=datetime.utcnow(),
            model_versions={
                "tree_cane_model": "v1.0",
                "tree_weight_model": "v1.0", 
                "plot_model": "v2.0_enhanced",
                "hybrid_service": "v1.0"
            },
            features_used={
                "tree_features": self.tree_models.cane_feature_names or [],
                "plot_features": self.plot_model.feature_names or [],
                "agronomic_factors": ["tree_density", "dry_conversion", "weighted_blending"]
            },
            
            # Economic projections
            estimated_dry_bark_percentage=self.dry_bark_percentage * 100,
            estimated_market_price_per_kg=estimated_price if estimated_revenue else None,
            estimated_revenue=estimated_revenue,
            
            notes=f"Hybrid prediction using {len(request.sample_trees)} tree samples from plot {plot.name}"
        )
        
        logger.info(f"Hybrid prediction completed: {final_yield['final_yield_kg']:.1f} kg (confidence: {overall_confidence:.3f})")
        return result
    
    def _predict_sampled_trees(self, sample_trees: List[TreeSampleMeasurement], location: str) -> List[Dict[str, Any]]:
        """Step 2: Predict canes and fresh weight for each sampled tree"""
        predictions = []
        
        for i, tree_sample in enumerate(sample_trees):
            try:
                # Prepare tree data for ML models
                tree_data = {
                    'stem_diameter_mm': tree_sample.stem_diameter_mm,
                    'tree_age_years': tree_sample.tree_age_years or 4.0,
                    'fertilizer_used': tree_sample.fertilizer_used,
                    'fertilizer_type': tree_sample.fertilizer_type.value if tree_sample.fertilizer_type else None,
                    'disease_status': tree_sample.disease_status.value,
                    'num_existing_stems': tree_sample.num_existing_stems,
                    'soil_type': 'Loamy',  # Default, could be enhanced
                    'rainfall_recent_mm': 2500,  # Default, should use actual data
                    'temperature_recent_c': 26.0,  # Default, should use actual data
                    'location': location or 'Sri Lanka'
                }
                
                # Predict canes
                predicted_canes = self.tree_models.predict_tree_canes(tree_data)
                
                # Predict fresh weight
                predicted_fresh_weight = self.tree_models.predict_tree_weight(tree_data, predicted_canes)
                
                predictions.append({
                    'tree_index': i,
                    'predicted_canes': predicted_canes,
                    'predicted_fresh_weight_kg': predicted_fresh_weight,
                    'stem_diameter_mm': tree_sample.stem_diameter_mm,
                    'disease_status': tree_sample.disease_status.value,
                    'fertilizer_used': tree_sample.fertilizer_used
                })
                
            except Exception as e:
                logger.warning(f"Failed to predict for tree {i}: {e}")
                # Fallback prediction based on diameter
                fallback_canes = max(1, int(tree_sample.stem_diameter_mm / 4))
                fallback_weight = fallback_canes * 0.25  # Rough estimate
                
                predictions.append({
                    'tree_index': i,
                    'predicted_canes': fallback_canes,
                    'predicted_fresh_weight_kg': fallback_weight,
                    'stem_diameter_mm': tree_sample.stem_diameter_mm,
                    'disease_status': tree_sample.disease_status.value,
                    'fertilizer_used': tree_sample.fertilizer_used
                })
        
        return predictions
    
    def _convert_to_dry_weight(self, tree_predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Step 3: Convert fresh weight to dry weight using 5% conversion rate"""
        dry_predictions = []
        
        for pred in tree_predictions:
            dry_weight = pred['predicted_fresh_weight_kg'] * self.dry_bark_percentage
            
            pred_with_dry = pred.copy()
            pred_with_dry['predicted_dry_weight_kg'] = dry_weight
            dry_predictions.append(pred_with_dry)
        
        return dry_predictions
    
    def _upscale_to_plot_level(self, tree_predictions: List[Dict[str, Any]], plot: Plot, trees_per_plot: Optional[int] = None) -> Dict[str, Any]:
        """Step 4: Scale up tree predictions to plot level using tree density"""
        
        # Calculate averages from sample
        avg_canes = np.mean([p['predicted_canes'] for p in tree_predictions])
        avg_fresh_weight = np.mean([p['predicted_fresh_weight_kg'] for p in tree_predictions])
        avg_dry_weight = np.mean([p['predicted_dry_weight_kg'] for p in tree_predictions])
        
        # Use trees_per_plot from request if provided, otherwise estimate density
        if trees_per_plot and trees_per_plot > 0:
            total_trees = trees_per_plot
            trees_per_hectare = int(total_trees / plot.area) if plot.area > 0 else self.trees_per_hectare_default
        else:
            trees_per_hectare = self._estimate_tree_density(plot, tree_predictions)
            total_trees = trees_per_hectare * plot.area
        
        # Calculate total yield
        total_yield_kg = avg_dry_weight * total_trees
        
        return {
            'avg_canes_per_tree': avg_canes,
            'avg_fresh_weight_per_tree': avg_fresh_weight,
            'avg_dry_weight_per_tree': avg_dry_weight,
            'trees_per_hectare': trees_per_hectare,
            'total_trees': total_trees,
            'total_yield_kg': total_yield_kg
        }
    
    def _estimate_tree_density(self, plot: Plot, tree_predictions: List[Dict[str, Any]]) -> int:
        """Estimate trees per hectare based on plot characteristics and sample"""
        
        # For now, use default since Plot model doesn't have trees_per_hectare field
        # TODO: Add trees_per_hectare field to Plot model in the future
        
        # Estimate based on tree characteristics
        avg_diameter = np.mean([p['stem_diameter_mm'] for p in tree_predictions])
        
        # Larger trees need more space
        if avg_diameter > 50:
            trees_per_hectare = 1000  # Lower density for larger trees
        elif avg_diameter > 45:
            trees_per_hectare = 1250  # Standard density
        else:
            trees_per_hectare = 1500  # Higher density for smaller trees
        
        # Adjust for plot age (younger plots might be denser)
        if hasattr(plot, 'age_months') and plot.age_months and plot.age_months < 36:  # Less than 3 years
            trees_per_hectare = int(trees_per_hectare * 1.2)
        
        # Ensure within reasonable bounds
        trees_per_hectare = max(self.min_trees_per_hectare, 
                               min(self.max_trees_per_hectare, trees_per_hectare))
        
        return trees_per_hectare
    
    def _get_enhanced_plot_prediction(self, plot: Plot, request: TreeSamplingRequest) -> Dict[str, Any]:
        """Step 5: Get enhanced plot-level ML prediction"""
        
        try:
            # Calculate diameters from sample trees
            if request.sample_trees:
                avg_diameter = np.mean([t.stem_diameter_mm for t in request.sample_trees])
                min_diameter = min([t.stem_diameter_mm for t in request.sample_trees])
                max_diameter = max([t.stem_diameter_mm for t in request.sample_trees])
            else:
                # Use defaults since Plot model doesn't store diameter info
                avg_diameter = 45.0
                min_diameter = 35.0  
                max_diameter = 55.0
            
            # Get farm info for location (skip for now due to schema issues)
            # farm = self.db.get(Farm, plot.farm_id) if plot.farm_id else None
            farm = None
            
            # Prepare plot data for the new model
            plot_data = {
                'area_hectares': plot.area,  # Plot model uses 'area' not 'area_hectares'
                'location': farm.location if farm else 'Galle',
                'variety': plot.cinnamon_variety or plot.crop_type or 'Sri Gemunu',
                'soil_type': 'Loamy',  # Default since Plot model doesn't have soil_type
                'age_years': (plot.age_months / 12.0) if hasattr(plot, 'age_months') and plot.age_months else 5.0,
                'rainfall_mm': request.rainfall_recent_mm or 2500,
                'temperature_c': request.temperature_recent_c or 26.0,
                'avg_stem_diameter_mm': avg_diameter,
                'min_stem_diameter_mm': min_diameter,
                'max_stem_diameter_mm': max_diameter,
                'fertilizer_used_plot': True,  # Default assumption
                'disease_present_plot': 'mild'  # Default assumption
            }
            
            # Get plot prediction using new model
            predicted_yield = self.plot_model.predict_plot_yield(plot_data)
            
            plot_prediction = {
                "predicted_yield": predicted_yield,
                "confidence_score": 0.8,  # High confidence for trained model
                "prediction_source": "plot_ml_model"
            }
            
            return plot_prediction
            
        except Exception as e:
            logger.warning(f"Plot prediction failed: {e}")
            # Fallback to area-based estimate
            fallback_yield = plot.area * 2500  # 2500 kg/ha average
            return {
                "predicted_yield": fallback_yield,
                "confidence_score": 0.5,
                "prediction_source": "fallback"
            }
    
    def _combine_predictions(self, tree_yield: Dict[str, Any], plot_yield: Dict[str, Any]) -> Dict[str, Any]:
        """Step 6: Combine tree and plot predictions using weighted average"""
        
        tree_prediction = tree_yield["total_yield_kg"]
        plot_prediction = plot_yield["predicted_yield"]
        
        # Weighted combination
        final_yield = (self.tree_model_weight * tree_prediction + 
                      self.plot_model_weight * plot_prediction)
        
        # Calculate yield per hectare
        plot_area = tree_yield.get("total_trees", 1000) / tree_yield.get("trees_per_hectare", 1250)
        yield_per_hectare = final_yield / plot_area if plot_area > 0 else final_yield
        
        return {
            "final_yield_kg": final_yield,
            "yield_per_hectare": yield_per_hectare,
            "tree_contribution": tree_prediction,
            "plot_contribution": plot_prediction
        }
    
    def _calculate_tree_confidence(self, tree_predictions: List[Dict[str, Any]], 
                                  sample_trees: List[TreeSampleMeasurement]) -> float:
        """Calculate confidence for tree-level predictions"""
        
        # Base confidence on sample size
        sample_size_factor = min(1.0, len(sample_trees) / 3.0)  # Max confidence at 3+ samples (demo)
        
        # Reduce confidence for diseased trees
        disease_factor = 1.0
        severe_disease_count = sum(1 for t in sample_trees 
                                 if t.disease_status == DiseaseStatus.SEVERE)
        if severe_disease_count > 0:
            disease_factor = max(0.6, 1.0 - (severe_disease_count / len(sample_trees)) * 0.4)
        
        # Consistency check - lower confidence if predictions vary widely
        if len(tree_predictions) > 1:
            yields = [p['predicted_dry_weight_kg'] for p in tree_predictions]
            cv = np.std(yields) / np.mean(yields) if np.mean(yields) > 0 else 1.0
            consistency_factor = max(0.7, 1.0 - cv)
        else:
            consistency_factor = 0.8
        
        confidence = 0.9 * sample_size_factor * disease_factor * consistency_factor
        return max(0.5, min(0.95, confidence))
    
    def _calculate_hybrid_confidence(self, tree_yield: Dict[str, Any], plot_yield: Dict[str, Any],
                                   tree_confidence: float, plot_confidence: float) -> float:
        """Calculate overall confidence for hybrid prediction"""
        
        # Weighted average of individual confidences
        base_confidence = (self.tree_model_weight * tree_confidence + 
                          self.plot_model_weight * plot_confidence)
        
        # Agreement bonus - if predictions are similar, increase confidence
        tree_pred = tree_yield["total_yield_kg"]
        plot_pred = plot_yield["predicted_yield"]
        
        if tree_pred > 0 and plot_pred > 0:
            ratio = min(tree_pred, plot_pred) / max(tree_pred, plot_pred)
            agreement_bonus = (ratio - 0.5) * 0.2  # Up to 0.1 bonus for perfect agreement
            agreement_bonus = max(0, agreement_bonus)
        else:
            agreement_bonus = 0
        
        final_confidence = base_confidence + agreement_bonus
        return max(0.5, min(0.95, final_confidence))
    
    def _disease_severity_score(self, disease_status: DiseaseStatus) -> float:
        """Convert disease status to severity score (0-1)"""
        mapping = {
            DiseaseStatus.NONE: 0.0,
            DiseaseStatus.MILD: 0.3,
            DiseaseStatus.SEVERE: 0.8
        }
        return mapping.get(disease_status, 0.0)
    
    def train_tree_models(self, retrain: bool = False) -> Dict[str, Any]:
        """Train both tree-level models"""
        logger.info("Training tree-level models for hybrid prediction...")
        
        results = {}
        
        # Train cane prediction model
        try:
            cane_result = self.tree_models.train_cane_prediction_model(retrain=retrain)
            results["cane_model"] = cane_result
        except Exception as e:
            logger.error(f"Failed to train cane model: {e}")
            results["cane_model"] = {"error": str(e)}
        
        # Train weight prediction model
        try:
            weight_result = self.tree_models.train_weight_prediction_model(retrain=retrain)
            results["weight_model"] = weight_result
        except Exception as e:
            logger.error(f"Failed to train weight model: {e}")
            results["weight_model"] = {"error": str(e)}
        
        # Train plot-level model
        try:
            # Plot models are now pre-trained, no training needed
            plot_result = {"message": "Plot model already trained", "model_available": self.plot_model.model_available()}
            results["plot_model"] = plot_result
        except Exception as e:
            logger.error(f"Failed to train plot model: {e}")
            results["plot_model"] = {"error": str(e)}
        
        return {
            "message": "Hybrid model training completed",
            "results": results,
            "hybrid_parameters": {
                "tree_weight": self.tree_model_weight,
                "plot_weight": self.plot_model_weight,
                "dry_conversion_rate": self.dry_bark_percentage
            }
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get comprehensive information about all models"""
        tree_info = self.tree_models.get_model_info()
        plot_info = self.plot_model.get_model_info()
        
        return {
            "hybrid_service": {
                "version": "v1.0",
                "tree_weight": self.tree_model_weight,
                "plot_weight": self.plot_model_weight,
                "dry_conversion_rate": self.dry_bark_percentage,
                "default_tree_density": self.trees_per_hectare_default
            },
            "tree_models": tree_info,
            "plot_model": plot_info,
            "capabilities": [
                "Tree-level cane prediction",
                "Tree-level fresh weight prediction", 
                "Plot-level yield prediction",
                "Hybrid weighted combination",
                "Agronomic dry weight conversion",
                "Tree density estimation",
                "Confidence assessment"
            ]
        }