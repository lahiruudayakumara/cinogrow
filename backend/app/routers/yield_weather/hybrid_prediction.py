"""
Tree Management and Hybrid Yield Prediction API Routes
Handles tree data management and hybrid yield predictions using tree sampling
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import numpy as np

from app.database import get_session
from app.models.yield_weather.tree import (
    Tree, TreeMeasurement, TreeHarvestRecord,
    TreeCreate, TreeUpdate, TreeRead,
    TreeMeasurementCreate, TreeMeasurementRead,
    TreeHarvestRecordCreate, TreeHarvestRecordRead,
    TreeSamplingRequest, HybridPredictionResult
)
from app.models.yield_weather.farm import Plot
from app.services.hybrid_yield_prediction import HybridYieldPredictionService
from app.services.tree_level_models import TreeLevelMLModels

router = APIRouter(tags=["hybrid-yield-prediction"])


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
    Main hybrid yield prediction endpoint
    Uses tree sampling data to predict yield through:
    1. Tree-level ML models (canes + fresh weight)
    2. Plot-level ML models (enhanced with diameter data)
    3. Agronomic formulas (dry conversion + tree density)
    4. Hybrid blending (weighted combination)
    """
    try:
        hybrid_service = HybridYieldPredictionService(db)
        result = hybrid_service.predict_hybrid_yield(request)
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
        
        # Get prediction
        hybrid_service = HybridYieldPredictionService(db)
        result = hybrid_service.predict_hybrid_yield(request)
        
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


# Model Management endpoints
@router.post("/hybrid-models/train")
async def train_hybrid_models(retrain: bool = False, db: Session = Depends(get_session)):
    """Train all models used in hybrid prediction"""
    try:
        hybrid_service = HybridYieldPredictionService(db)
        result = hybrid_service.train_tree_models(retrain=retrain)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.post("/tree-models/train")
async def train_tree_level_models(retrain: bool = False, db: Session = Depends(get_session)):
    """Train only the tree-level models (cane and weight prediction)"""
    try:
        tree_models = TreeLevelMLModels(db)
        
        results = {}
        
        # Train cane model
        cane_result = tree_models.train_cane_prediction_model(retrain=retrain)
        results["cane_model"] = cane_result
        
        # Train weight model
        weight_result = tree_models.train_weight_prediction_model(retrain=retrain)
        results["weight_model"] = weight_result
        
        return {
            "message": "Tree-level models trained successfully",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tree model training failed: {str(e)}")


@router.get("/hybrid-models/info")
async def get_hybrid_model_info(db: Session = Depends(get_session)):
    """Get information about all hybrid prediction models"""
    try:
        hybrid_service = HybridYieldPredictionService(db)
        info = hybrid_service.get_model_info()
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")


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