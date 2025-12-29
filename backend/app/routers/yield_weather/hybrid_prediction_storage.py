"""
Hybrid Yield Prediction Storage API Routes
Handles saving and retrieving hybrid yield prediction results
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime
import json

from app.db.session import get_session
from ...models.yield_weather.hybrid_yield import (
    HybridYieldResult,
    HybridYieldResultCreate,
    HybridYieldResultRead
)
from ...models.yield_weather.farm import Plot

router = APIRouter(tags=["hybrid-prediction-storage"])


@router.post("/hybrid-predictions", response_model=HybridYieldResultRead)
async def save_hybrid_prediction(
    prediction: HybridYieldResultCreate,
    db: Session = Depends(get_session)
):
    """
    Save a hybrid yield prediction result to the database
    """
    # Verify plot exists
    plot = db.get(Plot, prediction.plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    # Create hybrid yield result
    db_prediction = HybridYieldResult(
        plot_id=prediction.plot_id,
        total_trees=prediction.total_trees,
        ml_yield_tree_level=prediction.ml_yield_tree_level,
        ml_yield_farm_level=prediction.ml_yield_farm_level,
        final_hybrid_yield=prediction.final_hybrid_yield,
        confidence_score=prediction.confidence_score,
        tree_model_confidence=prediction.tree_model_confidence,
        farm_model_confidence=prediction.farm_model_confidence,
        blending_weight_tree=prediction.blending_weight_tree,
        blending_weight_farm=prediction.blending_weight_farm,
        model_versions=json.dumps(prediction.model_versions) if prediction.model_versions else None,
        features_used=json.dumps(prediction.features_used) if prediction.features_used else None
    )
    
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    
    return db_prediction


@router.get("/hybrid-predictions", response_model=List[HybridYieldResultRead])
async def get_hybrid_predictions(
    plot_id: int = None,
    limit: int = 10,
    db: Session = Depends(get_session)
):
    """
    Get hybrid yield prediction results
    - If plot_id provided: get predictions for that plot
    - Otherwise: get recent predictions across all plots
    """
    query = select(HybridYieldResult)
    
    if plot_id:
        query = query.where(HybridYieldResult.plot_id == plot_id)
    
    query = query.order_by(HybridYieldResult.calculated_at.desc()).limit(limit)
    
    predictions = db.exec(query).all()
    return predictions


@router.get("/hybrid-predictions/{prediction_id}", response_model=HybridYieldResultRead)
async def get_hybrid_prediction(
    prediction_id: int,
    db: Session = Depends(get_session)
):
    """Get a specific hybrid yield prediction by ID"""
    prediction = db.get(HybridYieldResult, prediction_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Hybrid prediction not found")
    
    return prediction


@router.delete("/hybrid-predictions/{prediction_id}")
async def delete_hybrid_prediction(
    prediction_id: int,
    db: Session = Depends(get_session)
):
    """Delete a hybrid yield prediction"""
    prediction = db.get(HybridYieldResult, prediction_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Hybrid prediction not found")
    
    db.delete(prediction)
    db.commit()
    
    return {"message": "Hybrid prediction deleted successfully"}
