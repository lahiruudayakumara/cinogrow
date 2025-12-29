"""
Tree Management and Hybrid Yield Prediction API Routes
Handles tree data management and hybrid yield predictions using tree sampling
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
import numpy as np

from app.db.session import get_session
from app.models.yield_weather.tree import (
    Tree, TreeMeasurement, TreeHarvestRecord,
    TreeCreate, TreeUpdate, TreeRead,
    TreeMeasurementCreate, TreeMeasurementRead,
    TreeHarvestRecordCreate, TreeHarvestRecordRead,
    TreeSamplingRequest, HybridPredictionResult
)
from app.models.yield_weather.farm import Plot

router = APIRouter(tags=["hybrid-yield-prediction"])


# ============================================================================
# PRECISION YIELD PREDICTION HELPER FUNCTIONS
# ============================================================================

def _analyze_tree_samples(sample_trees: List) -> Dict[str, Any]:
    """Analyze tree sample characteristics for yield modeling"""
    if not sample_trees:
        return {}
    
    # Extract measurements
    diameters = [t.stem_diameter_mm for t in sample_trees]
    stems = [t.num_existing_stems for t in sample_trees]
    ages = [t.tree_age_years for t in sample_trees]
    fertilized_count = sum(1 for t in sample_trees if t.fertilizer_used)
    diseased_count = sum(1 for t in sample_trees if t.disease_status != 'none')
    
    # Calculate statistics
    avg_diameter = np.mean(diameters)
    diameter_cv = np.std(diameters) / avg_diameter if avg_diameter > 0 else 0
    avg_stems = np.mean(stems)
    avg_age = np.mean(ages) if ages else 4.0
    
    # Quality indicators
    fertilization_rate = fertilized_count / len(sample_trees)
    disease_rate = diseased_count / len(sample_trees)
    
    # Vigor classification based on diameter
    if avg_diameter >= 60:
        vigor_class = "excellent"
    elif avg_diameter >= 45:
        vigor_class = "good"  
    elif avg_diameter >= 30:
        vigor_class = "moderate"
    else:
        vigor_class = "poor"
    
    return {
        "sample_size": len(sample_trees),
        "avg_diameter_mm": avg_diameter,
        "diameter_coefficient_variation": diameter_cv,
        "avg_stems_per_tree": avg_stems,
        "avg_tree_age_years": avg_age,
        "fertilization_rate": fertilization_rate,
        "disease_rate": disease_rate,
        "vigor_class": vigor_class,
        "uniformity_score": max(0, 1 - diameter_cv)  # Higher is more uniform
    }


def _predict_individual_tree_yields(sample_trees: List) -> Dict[str, Any]:
    """Predict yields for individual trees using research-based models"""
    tree_yields = []
    
    for tree in sample_trees:
        # Research-based cane prediction model (empirical formula)
        # Based on Sri Lankan cinnamon research: canes ∝ diameter² × stems
        diameter_factor = (tree.stem_diameter_mm / 45.0) ** 1.8  # Optimal diameter is ~45mm
        stem_factor = min(tree.num_existing_stems / 3.0, 2.0)  # Optimal stems ~3, max factor 2.0
        age_factor = min(tree.tree_age_years / 4.0, 1.2) if tree.tree_age_years else 1.0
        
        # Base canes per tree for optimal conditions
        base_canes = 25
        
        # Calculate predicted canes
        predicted_canes = base_canes * diameter_factor * stem_factor * age_factor
        
        # Apply management factors
        if tree.fertilizer_used:
            predicted_canes *= 1.15  # 15% boost from fertilization
        
        # Disease penalty
        disease_factor = 1.0
        if tree.disease_status == 'mild':
            disease_factor = 0.90
        elif tree.disease_status == 'severe':
            disease_factor = 0.70
        predicted_canes *= disease_factor
        
        # Fresh weight prediction (research-based: 0.12-0.18 kg per cane)
        weight_per_cane = 0.15 * (tree.stem_diameter_mm / 45.0)  # Thicker canes are heavier
        fresh_weight_kg = predicted_canes * weight_per_cane
        
        # Dry bark conversion (5% of fresh weight becomes dry bark)
        dry_weight_kg = fresh_weight_kg * 0.05
        
        tree_yields.append({
            "tree_code": tree.tree_code,
            "predicted_canes": predicted_canes,
            "fresh_weight_kg": fresh_weight_kg,
            "dry_weight_kg": dry_weight_kg,
            "diameter_factor": diameter_factor,
            "stem_factor": stem_factor,
            "age_factor": age_factor,
            "disease_factor": disease_factor
        })
    
    # Aggregate statistics
    total_canes = sum(t["predicted_canes"] for t in tree_yields)
    total_fresh = sum(t["fresh_weight_kg"] for t in tree_yields)
    total_dry = sum(t["dry_weight_kg"] for t in tree_yields)
    
    return {
        "individual_trees": tree_yields,
        "avg_canes_per_tree": total_canes / len(tree_yields),
        "avg_fresh_weight_per_tree": total_fresh / len(tree_yields),
        "avg_dry_weight_per_tree": total_dry / len(tree_yields),
        "total_sample_canes": total_canes,
        "total_sample_fresh_kg": total_fresh,
        "total_sample_dry_kg": total_dry
    }


def _scale_to_plot_level(tree_predictions: Dict, plot: Plot, trees_per_plot: Optional[int]) -> Dict[str, Any]:
    """Scale tree-level predictions to plot level using density calculations"""
    
    # Determine trees per plot
    if trees_per_plot:
        total_trees = trees_per_plot
    else:
        # Estimate based on plot area and standard planting density
        standard_density = 1250  # trees per hectare
        total_trees = int(plot.area * standard_density)
    
    # Calculate trees per hectare
    trees_per_hectare = int(total_trees / plot.area) if plot.area > 0 else 1250
    
    # Scale up predictions
    avg_dry_per_tree = tree_predictions["avg_dry_weight_per_tree"]
    plot_total_dry_kg = avg_dry_per_tree * total_trees
    yield_per_hectare = plot_total_dry_kg / plot.area if plot.area > 0 else plot_total_dry_kg
    
    return {
        "total_trees_in_plot": total_trees,
        "trees_per_hectare": trees_per_hectare,
        "plot_total_yield_kg": plot_total_dry_kg,
        "yield_per_hectare_kg": yield_per_hectare,
        "avg_tree_contribution_kg": avg_dry_per_tree,
        "planting_density_rating": _rate_planting_density(trees_per_hectare)
    }


def _apply_yield_modifiers(plot_yield: Dict, tree_analysis: Dict, plot: Plot) -> Dict[str, Any]:
    """Apply environmental and management modifiers to base yield estimate"""
    base_yield = plot_yield["plot_total_yield_kg"]
    
    # Environmental factors
    site_factor = 1.0
    if hasattr(plot, 'elevation') and plot.elevation:
        # Optimal elevation for cinnamon: 500-1000m
        if 500 <= plot.elevation <= 1000:
            site_factor = 1.1
        elif plot.elevation > 1500:
            site_factor = 0.9
    
    # Management quality factor based on tree analysis
    management_factor = 1.0
    if tree_analysis.get("fertilization_rate", 0) > 0.7:  # >70% trees fertilized
        management_factor *= 1.12
    elif tree_analysis.get("fertilization_rate", 0) < 0.3:  # <30% trees fertilized
        management_factor *= 0.92
    
    # Disease pressure factor
    disease_rate = tree_analysis.get("disease_rate", 0)
    if disease_rate < 0.1:  # <10% diseased
        management_factor *= 1.05
    elif disease_rate > 0.3:  # >30% diseased
        management_factor *= 0.85
    
    # Uniformity bonus (consistent trees yield more collectively)
    uniformity_score = tree_analysis.get("uniformity_score", 0.5)
    if uniformity_score > 0.8:
        management_factor *= 1.08
    
    # Apply all modifiers
    adjusted_yield = base_yield * site_factor * management_factor
    
    return {
        "base_yield_kg": base_yield,
        "site_factor": site_factor,
        "management_factor": management_factor,
        "final_adjusted_yield_kg": adjusted_yield,
        "yield_increase_percentage": ((adjusted_yield / base_yield) - 1) * 100
    }


def _calculate_prediction_confidence(sample_trees: List, tree_predictions: Dict) -> Dict[str, Any]:
    """Calculate confidence metrics for the prediction"""
    sample_size = len(sample_trees)
    
    # Base confidence from sample size
    if sample_size >= 15:
        size_confidence = 0.95
    elif sample_size >= 10:
        size_confidence = 0.90
    elif sample_size >= 5:
        size_confidence = 0.85
    else:
        size_confidence = 0.75
    
    # Consistency confidence based on coefficient of variation
    individual_yields = [t["dry_weight_kg"] for t in tree_predictions["individual_trees"]]
    if len(individual_yields) > 1:
        cv = np.std(individual_yields) / np.mean(individual_yields)
        if cv < 0.2:  # Low variation
            consistency_confidence = 0.95
        elif cv < 0.4:  # Medium variation
            consistency_confidence = 0.85
        else:  # High variation
            consistency_confidence = 0.70
    else:
        consistency_confidence = 0.80
    
    # Overall confidence (weighted average)
    overall_confidence = (size_confidence * 0.6 + consistency_confidence * 0.4)
    
    return {
        "sample_size_confidence": size_confidence,
        "consistency_confidence": consistency_confidence,
        "overall_confidence": overall_confidence,
        "yield_coefficient_variation": np.std(individual_yields) / np.mean(individual_yields) if individual_yields else 0,
        "reliability_rating": "high" if overall_confidence > 0.85 else "medium" if overall_confidence > 0.75 else "low"
    }


def _generate_prediction_result(
    request: TreeSamplingRequest, 
    plot: Plot, 
    tree_analysis: Dict,
    tree_predictions: Dict,
    plot_yield: Dict,
    adjusted_yield: Dict,
    confidence_metrics: Dict
) -> HybridPredictionResult:
    """Generate comprehensive prediction result"""
    
    # Economic calculations
    avg_diameter = tree_analysis.get("avg_diameter_mm", 45)
    disease_rate = tree_analysis.get("disease_rate", 0)
    
    # Quality-based pricing
    base_price = 1000  # LKR per kg
    quality_multiplier = min(1.3, max(0.7, (avg_diameter / 45.0) * (1 - disease_rate * 0.3)))
    estimated_price = base_price * quality_multiplier
    
    final_yield = adjusted_yield["final_adjusted_yield_kg"]
    estimated_revenue = final_yield * estimated_price
    
    # Harvest timing recommendation
    if avg_diameter >= 45 and tree_analysis.get("avg_tree_age_years", 0) >= 3:
        harvest_recommendation = "Ready for harvest - optimal maturity achieved"
    elif avg_diameter >= 35:
        harvest_recommendation = "Approaching harvest readiness - monitor for 2-3 months"
    else:
        harvest_recommendation = "Continue growth - harvest not recommended yet"
    
    return HybridPredictionResult(
        plot_id=request.plot_id,
        plot_area=plot.area,
        
        # Tree-level results
        sample_size=tree_analysis["sample_size"],
        avg_predicted_canes_per_tree=tree_predictions["avg_canes_per_tree"],
        avg_predicted_fresh_weight_per_tree=tree_predictions["avg_fresh_weight_per_tree"],
        avg_predicted_dry_weight_per_tree=tree_predictions["avg_dry_weight_per_tree"],
        
        # Plot-level results  
        estimated_trees_per_hectare=plot_yield["trees_per_hectare"],
        total_estimated_trees=plot_yield["total_trees_in_plot"],
        tree_model_yield_kg=plot_yield["plot_total_yield_kg"],
        
        # Enhanced plot prediction (same as tree model in this implementation)
        plot_model_yield_kg=plot_yield["plot_total_yield_kg"],
        
        # Final hybrid result
        final_hybrid_yield_kg=final_yield,
        yield_per_hectare=adjusted_yield["final_adjusted_yield_kg"] / plot.area if plot.area > 0 else final_yield,
        confidence_score=confidence_metrics["overall_confidence"],
        
        # Model metadata
        tree_model_confidence=confidence_metrics["consistency_confidence"],
        plot_model_confidence=confidence_metrics["sample_size_confidence"],
        blending_weight_tree=0.8,  # Higher weight to tree model since it's more direct
        blending_weight_plot=0.2,
        prediction_date=datetime.utcnow(),
        
        model_versions={
            "tree_model": "research_based_v2.0",
            "plot_model": "density_scaled_v2.0",
            "hybrid_service": "precise_v2.0"
        },
        
        features_used={
            "tree_features": ["stem_diameter_mm", "num_existing_stems", "tree_age_years", "fertilizer_used", "disease_status"],
            "plot_features": ["area", "planting_density", "management_quality"],
            "environmental_factors": ["site_conditions", "disease_pressure", "uniformity"]
        },
        
        # Economic projections
        estimated_dry_bark_percentage=5.0,
        estimated_price_per_kg=estimated_price,
        estimated_total_revenue=estimated_revenue,
        harvest_recommendation=harvest_recommendation,
        
        quality_indicators={
            "avg_stem_diameter": avg_diameter,
            "tree_vigor": tree_analysis.get("vigor_class", "moderate"),
            "disease_pressure": "low" if disease_rate < 0.1 else "medium" if disease_rate < 0.3 else "high",
            "management_quality": "good" if tree_analysis.get("fertilization_rate", 0) > 0.5 else "fair",
            "plot_uniformity": tree_analysis.get("uniformity_score", 0.5)
        }
    )


def _rate_planting_density(trees_per_hectare: int) -> str:
    """Rate the planting density"""
    if trees_per_hectare > 1500:
        return "high_density"
    elif trees_per_hectare > 1000:
        return "optimal_density"
    elif trees_per_hectare > 800:
        return "moderate_density"
    else:
        return "low_density"


# ============================================================================
# API ENDPOINTS
# ============================================================================


# Tree Management endpoints
@router.post("/trees", response_model=TreeRead)
async def create_tree(tree_data: TreeCreate, db: Session = Depends(get_session)):
    """Create a new tree"""
    # Check if plot exists
    plot = db.get(Plot, tree_data.plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    # Check if tree code already exists in this plot
    existing_tree = db.exec(
        select(Tree).where(
            Tree.plot_id == tree_data.plot_id,
            Tree.tree_code == tree_data.tree_code
        )
    ).first()
    
    if existing_tree:
        raise HTTPException(status_code=400, detail=f"Tree with code '{tree_data.tree_code}' already exists in this plot")
    
    tree = Tree(**tree_data.dict())
    db.add(tree)
    db.commit()
    db.refresh(tree)
    return tree


@router.get("/trees", response_model=List[TreeRead])
async def get_trees(
    plot_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_session)
):
    """Get trees with optional filtering"""
    query = select(Tree)
    
    if plot_id:
        query = query.where(Tree.plot_id == plot_id)
    
    if is_active is not None:
        query = query.where(Tree.is_active == is_active)
    
    trees = db.exec(query).all()
    return trees


@router.get("/trees/{tree_id}", response_model=TreeRead)
async def get_tree(tree_id: int, db: Session = Depends(get_session)):
    """Get a specific tree by ID"""
    tree = db.get(Tree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    return tree


@router.put("/trees/{tree_id}", response_model=TreeRead)
async def update_tree(
    tree_id: int,
    tree_update: TreeUpdate,
    db: Session = Depends(get_session)
):
    """Update a tree"""
    tree = db.get(Tree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    # Update only provided fields
    update_data = tree_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tree, field, value)
    
    tree.updated_at = datetime.utcnow()
    
    db.add(tree)
    db.commit()
    db.refresh(tree)
    return tree


@router.delete("/trees/{tree_id}")
async def delete_tree(tree_id: int, db: Session = Depends(get_session)):
    """Delete a tree and all its measurements"""
    tree = db.get(Tree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    # Delete associated measurements and harvest records
    measurements = db.exec(select(TreeMeasurement).where(TreeMeasurement.tree_id == tree_id)).all()
    for measurement in measurements:
        db.delete(measurement)
    
    harvest_records = db.exec(select(TreeHarvestRecord).where(TreeHarvestRecord.tree_id == tree_id)).all()
    for record in harvest_records:
        db.delete(record)
    
    db.delete(tree)
    db.commit()
    return {"message": "Tree and associated records deleted successfully"}


# Tree Measurement endpoints
@router.post("/tree-measurements", response_model=TreeMeasurementRead)
async def create_tree_measurement(
    measurement_data: TreeMeasurementCreate, 
    db: Session = Depends(get_session)
):
    """Create a new tree measurement"""
    # Check if tree exists
    tree = db.get(Tree, measurement_data.tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    measurement = TreeMeasurement(**measurement_data.dict())
    if not measurement.measurement_date:
        measurement.measurement_date = datetime.utcnow()
    
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/tree-measurements", response_model=List[TreeMeasurementRead])
async def get_tree_measurements(
    tree_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    is_training_data: Optional[bool] = None,
    db: Session = Depends(get_session)
):
    """Get tree measurements with optional filtering"""
    query = select(TreeMeasurement)
    
    if tree_id:
        query = query.where(TreeMeasurement.tree_id == tree_id)
    
    if plot_id:
        # Join with Tree to filter by plot_id
        query = query.join(Tree).where(Tree.plot_id == plot_id)
    
    if is_training_data is not None:
        query = query.where(TreeMeasurement.is_training_data == is_training_data)
    
    measurements = db.exec(query.order_by(TreeMeasurement.measurement_date.desc())).all()
    return measurements


@router.get("/trees/{tree_id}/measurements", response_model=List[TreeMeasurementRead])
async def get_tree_measurements_for_tree(tree_id: int, db: Session = Depends(get_session)):
    """Get all measurements for a specific tree"""
    tree = db.get(Tree, tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    measurements = db.exec(
        select(TreeMeasurement)
        .where(TreeMeasurement.tree_id == tree_id)
        .order_by(TreeMeasurement.measurement_date.desc())
    ).all()
    return measurements


# Hybrid Yield Prediction endpoints
@router.post("/hybrid-prediction", response_model=HybridPredictionResult)
async def predict_hybrid_yield(
    request: TreeSamplingRequest,
    db: Session = Depends(get_session)
):
    """
    Precise hybrid yield prediction endpoint
    Uses sophisticated tree sampling analysis with research-based agronomic calculations
    """
    try:
        # Validate plot exists
        plot = db.get(Plot, request.plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Plot not found")
        
        # Validate minimum sample size for statistical reliability
        if len(request.sample_trees) < 3:
            raise HTTPException(status_code=400, detail="At least 3 tree samples required for reliable prediction")
        
        # STEP 1: Analyze tree samples with precision
        tree_analysis = _analyze_tree_samples(request.sample_trees)
        
        # STEP 2: Tree-level yield prediction using research-based models
        tree_predictions = _predict_individual_tree_yields(request.sample_trees)
        
        # STEP 3: Scale to plot level using proper density calculations
        plot_yield_estimate = _scale_to_plot_level(tree_predictions, plot, request.trees_per_plot)
        
        # STEP 4: Apply environmental and management factors
        adjusted_yield = _apply_yield_modifiers(plot_yield_estimate, tree_analysis, plot)
        
        # STEP 5: Calculate confidence based on sample consistency
        confidence_metrics = _calculate_prediction_confidence(request.sample_trees, tree_predictions)
        
        # STEP 6: Generate comprehensive results
        result = _generate_prediction_result(
            request, plot, tree_analysis, tree_predictions, 
            plot_yield_estimate, adjusted_yield, confidence_metrics
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/hybrid-prediction/quick")
async def quick_hybrid_prediction(
    plot_id: int,
    avg_diameter: float,
    tree_count: int = 10,
    fertilized_trees: int = 5,
    diseased_trees: int = 0,
    db: Session = Depends(get_session)
):
    """
    Quick hybrid prediction with simplified tree sampling
    Automatically generates sample trees based on average characteristics
    """
    try:
        # Validate plot
        plot = db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Plot not found")
        
        # Generate sample trees based on parameters
        from app.models.yield_weather.tree import TreeSampleMeasurement, DiseaseStatus, FertilizerType
        
        sample_trees = []
        for i in range(min(tree_count, 20)):  # Limit to 20 samples
            # Vary diameter around average (±10%)
            diameter_variation = avg_diameter * 0.1
            tree_diameter = avg_diameter + np.random.uniform(-diameter_variation, diameter_variation)
            
            # Determine fertilizer use
            fertilizer_used = i < fertilized_trees
            fertilizer_type = FertilizerType.ORGANIC if fertilizer_used else None
            
            # Determine disease status
            if i < diseased_trees:
                disease_status = DiseaseStatus.MILD if i < diseased_trees // 2 else DiseaseStatus.SEVERE
            else:
                disease_status = DiseaseStatus.NONE
            
            sample_tree = TreeSampleMeasurement(
                tree_code=f"Sample_{i+1}",
                stem_diameter_mm=tree_diameter,
                fertilizer_used=fertilizer_used,
                fertilizer_type=fertilizer_type,
                disease_status=disease_status,
                num_existing_stems=np.random.randint(2, 5),
                tree_age_years=4.0  # Default age
            )
            sample_trees.append(sample_tree)
        
        # Create sampling request
        request = TreeSamplingRequest(
            plot_id=plot_id,
            sample_trees=sample_trees,
            notes=f"Quick prediction with {tree_count} simulated trees"
        )
        
        # Get prediction using our new precise algorithm
        result = predict_hybrid_yield_internal(request, db)
        
        return {
            "prediction": result,
            "generated_samples": len(sample_trees),
            "parameters_used": {
                "avg_diameter": avg_diameter,
                "tree_count": tree_count,
                "fertilized_trees": fertilized_trees,
                "diseased_trees": diseased_trees
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quick prediction failed: {str(e)}")


def predict_hybrid_yield_internal(request: TreeSamplingRequest, db: Session) -> HybridPredictionResult:
    """Internal function that mirrors the main prediction endpoint"""
    # Validate plot exists
    plot = db.get(Plot, request.plot_id)
    if not plot:
        raise ValueError("Plot not found")
    
    # Validate minimum sample size for statistical reliability
    if len(request.sample_trees) < 3:
        raise ValueError("At least 3 tree samples required for reliable prediction")
    
    # Use the same algorithm as the main endpoint
    tree_analysis = _analyze_tree_samples(request.sample_trees)
    tree_predictions = _predict_individual_tree_yields(request.sample_trees)
    plot_yield_estimate = _scale_to_plot_level(tree_predictions, plot, request.trees_per_plot)
    adjusted_yield = _apply_yield_modifiers(plot_yield_estimate, tree_analysis, plot)
    confidence_metrics = _calculate_prediction_confidence(request.sample_trees, tree_predictions)
    
    result = _generate_prediction_result(
        request, plot, tree_analysis, tree_predictions, 
        plot_yield_estimate, adjusted_yield, confidence_metrics
    )
    
    return result


# Tree Harvest Record endpoints
@router.post("/tree-harvest-records", response_model=TreeHarvestRecordRead)
async def create_tree_harvest_record(
    record_data: TreeHarvestRecordCreate,
    db: Session = Depends(get_session)
):
    """Create a new tree harvest record"""
    # Check if tree exists
    tree = db.get(Tree, record_data.tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    record = TreeHarvestRecord(**record_data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/tree-harvest-records", response_model=List[TreeHarvestRecordRead])
async def get_tree_harvest_records(
    tree_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_session)
):
    """Get tree harvest records with optional filtering"""
    query = select(TreeHarvestRecord)
    
    if tree_id:
        query = query.where(TreeHarvestRecord.tree_id == tree_id)
    
    if plot_id:
        query = query.join(Tree).where(Tree.plot_id == plot_id)
    
    if limit:
        query = query.limit(limit)
    
    records = db.exec(query.order_by(TreeHarvestRecord.harvest_date.desc())).all()
    return records


# Analytics endpoints
@router.get("/plots/{plot_id}/tree-analytics")
async def get_plot_tree_analytics(plot_id: int, db: Session = Depends(get_session)):
    """Get tree analytics for a specific plot"""
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    # Get trees in this plot
    trees = db.exec(select(Tree).where(Tree.plot_id == plot_id)).all()
    
    if not trees:
        return {
            "plot_id": plot_id,
            "message": "No trees found in this plot",
            "analytics": {}
        }
    
    # Get latest measurements
    measurements = db.exec(
        select(TreeMeasurement)
        .join(Tree)
        .where(Tree.plot_id == plot_id)
        .order_by(TreeMeasurement.measurement_date.desc())
    ).all()
    
    # Calculate analytics
    tree_count = len(trees)
    active_trees = len([t for t in trees if t.is_active])
    fertilized_trees = len([t for t in trees if t.fertilizer_used])
    
    if measurements:
        diameters = [m.stem_diameter_mm for m in measurements]
        avg_diameter = np.mean(diameters)
        min_diameter = min(diameters)
        max_diameter = max(diameters)
        diameter_std = np.std(diameters)
        
        # Disease analysis
        diseased_trees = len([t for t in trees if t.disease_status != 'none'])
        
        # Age analysis
        ages = [t.tree_age_years for t in trees if t.tree_age_years]
        avg_age = np.mean(ages) if ages else 0
    else:
        avg_diameter = min_diameter = max_diameter = diameter_std = 0
        diseased_trees = 0
        avg_age = 0
    
    return {
        "plot_id": plot_id,
        "plot_area": plot.area,
        "tree_analytics": {
            "total_trees": tree_count,
            "active_trees": active_trees,
            "trees_per_hectare": tree_count / plot.area if plot.area > 0 else 0,
            "fertilized_trees": fertilized_trees,
            "fertilization_rate": fertilized_trees / tree_count if tree_count > 0 else 0,
            "diseased_trees": diseased_trees,
            "disease_rate": diseased_trees / tree_count if tree_count > 0 else 0,
            "average_age_years": avg_age
        },
        "diameter_analytics": {
            "average_diameter_mm": avg_diameter,
            "min_diameter_mm": min_diameter,
            "max_diameter_mm": max_diameter,
            "diameter_variability": diameter_std
        },
        "measurement_count": len(measurements),
        "readiness_for_hybrid_prediction": {
            "has_trees": tree_count > 0,
            "has_measurements": len(measurements) > 0,
            "sufficient_samples": tree_count >= 5,
            "recommendation": "Ready for hybrid prediction" if tree_count >= 5 else "Need at least 5 trees for reliable prediction"
        }
    }