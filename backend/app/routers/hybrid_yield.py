"""
Hybrid Yield Prediction API endpoints
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db.session import get_session
from app.services.hybrid_yield_service import HybridYieldService
from app.models.yield_weather.hybrid_yield import (
    HybridYieldResult, HybridYieldResultRead,
    HybridYieldPredictionRequest, HybridYieldResultCreate
)

router = APIRouter(
    prefix="/hybrid-yield",
    tags=["Hybrid Yield Prediction"],
    responses={404: {"description": "Not found"}}
)


@router.post("/predict", response_model=HybridYieldResultRead)
async def predict_hybrid_yield(
    request: HybridYieldPredictionRequest,
    db: Session = Depends(get_session)
):
    """
    Calculate hybrid yield prediction combining tree-level and farm-level ML models
    """
    try:
        hybrid_service = HybridYieldService(db)
        result = hybrid_service.calculate_hybrid_yield(request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating hybrid yield: {str(e)}"
        )


@router.get("/plot/{plot_id}/latest", response_model=Optional[HybridYieldResultRead])
async def get_latest_prediction(
    plot_id: int,
    db: Session = Depends(get_session)
):
    """
    Get the most recent hybrid yield prediction for a plot
    """
    hybrid_service = HybridYieldService(db)
    result = hybrid_service.get_latest_prediction(plot_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No hybrid yield predictions found for plot {plot_id}"
        )
    
    return result


@router.get("/plot/{plot_id}/history", response_model=List[HybridYieldResultRead])
async def get_prediction_history(
    plot_id: int,
    db: Session = Depends(get_session)
):
    """
    Get all hybrid yield predictions for a plot (historical data)
    """
    hybrid_service = HybridYieldService(db)
    results = hybrid_service.get_all_predictions(plot_id)
    return results


@router.get("/plot/{plot_id}/summary")
async def get_yield_summary(
    plot_id: int,
    db: Session = Depends(get_session)
):
    """
    Get a summary of yield predictions including trends and statistics
    """
    hybrid_service = HybridYieldService(db)
    results = hybrid_service.get_all_predictions(plot_id)
    
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No yield predictions found for plot {plot_id}"
        )
    
    # Calculate summary statistics
    yields = [r.final_hybrid_yield for r in results]
    confidences = [r.confidence_score for r in results]
    
    summary = {
        "plot_id": plot_id,
        "total_predictions": len(results),
        "latest_prediction": {
            "yield": results[0].final_hybrid_yield,
            "confidence": results[0].confidence_score,
            "calculated_at": results[0].calculated_at
        },
        "statistics": {
            "avg_yield": sum(yields) / len(yields),
            "max_yield": max(yields),
            "min_yield": min(yields),
            "avg_confidence": sum(confidences) / len(confidences),
            "yield_trend": "increasing" if len(results) >= 2 and yields[0] > yields[-1] else "stable"
        },
        "model_performance": {
            "tree_model_avg_confidence": sum(r.tree_model_confidence for r in results) / len(results),
            "farm_model_avg_confidence": sum(r.farm_model_confidence for r in results) / len(results),
            "avg_tree_weight": sum(r.blending_weight_tree for r in results) / len(results),
            "avg_farm_weight": sum(r.blending_weight_farm for r in results) / len(results)
        }
    }
    
    return summary


@router.post("/bulk-predict")
async def bulk_predict_yields(
    plot_ids: List[int],
    environmental_factors: Optional[Dict[str, float]] = None,
    force_recalculate: bool = False,
    db: Session = Depends(get_session)
):
    """
    Calculate hybrid yield predictions for multiple plots
    """
    hybrid_service = HybridYieldService(db)
    results = []
    errors = []
    
    for plot_id in plot_ids:
        try:
            # For bulk predictions, we need to get total_trees from plot data
            from app.models.yield_weather.farm import Plot
            plot = db.get(Plot, plot_id)
            if not plot:
                errors.append({"plot_id": plot_id, "error": "Plot not found"})
                continue
            
            request = HybridYieldPredictionRequest(
                plot_id=plot_id,
                total_trees=plot.total_trees or 0,
                environmental_factors=environmental_factors,
                force_recalculate=force_recalculate
            )
            
            result = hybrid_service.calculate_hybrid_yield(request)
            results.append({
                "plot_id": plot_id,
                "yield_prediction": result.final_hybrid_yield,
                "confidence": result.confidence_score,
                "status": "success"
            })
            
        except Exception as e:
            errors.append({
                "plot_id": plot_id,
                "error": str(e),
                "status": "failed"
            })
    
    return {
        "total_plots": len(plot_ids),
        "successful_predictions": len(results),
        "failed_predictions": len(errors),
        "results": results,
        "errors": errors
    }


@router.get("/statistics/farm/{farm_id}")
async def get_farm_yield_statistics(
    farm_id: int,
    db: Session = Depends(get_session)
):
    """
    Get yield statistics aggregated at farm level
    """
    # Get all plots for the farm
    from sqlmodel import select
    from app.models.yield_weather.farm import Plot
    
    plots = list(db.exec(select(Plot).where(Plot.farm_id == farm_id)).all())
    
    if not plots:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No plots found for farm {farm_id}"
        )
    
    hybrid_service = HybridYieldService(db)
    farm_summary = {
        "farm_id": farm_id,
        "total_plots": len(plots),
        "plots_with_predictions": 0,
        "total_estimated_yield": 0.0,
        "avg_confidence": 0.0,
        "plots": []
    }
    
    total_confidence = 0.0
    plots_with_data = 0
    
    for plot in plots:
        latest_prediction = hybrid_service.get_latest_prediction(plot.id)
        if latest_prediction:
            farm_summary["plots_with_predictions"] += 1
            farm_summary["total_estimated_yield"] += latest_prediction.final_hybrid_yield
            total_confidence += latest_prediction.confidence_score
            plots_with_data += 1
            
            farm_summary["plots"].append({
                "plot_id": plot.id,
                "plot_name": plot.plot_name,
                "area": plot.area,
                "estimated_yield": latest_prediction.final_hybrid_yield,
                "yield_per_hectare": latest_prediction.final_hybrid_yield / plot.area if plot.area else 0,
                "confidence": latest_prediction.confidence_score,
                "last_updated": latest_prediction.calculated_at
            })
    
    if plots_with_data > 0:
        farm_summary["avg_confidence"] = total_confidence / plots_with_data
        farm_summary["yield_per_hectare"] = farm_summary["total_estimated_yield"] / sum(p.area for p in plots if p.area)
    
    return farm_summary