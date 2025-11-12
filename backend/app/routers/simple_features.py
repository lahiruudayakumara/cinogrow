from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, List
import time
import logging

router = APIRouter(tags=["fertilizer-feature-analysis"])

# Simple working endpoint for feature analysis
@router.post("/analyze-features")
async def analyze_features_simple(
    metadata: Dict[str, Any] = Body(..., description="Leaf metadata")
):
    """
    Simple working endpoint for feature analysis using real trained model
    """
    logger = logging.getLogger(_name_)
    
    try:
        logger.info("🔄 Feature analysis endpoint called")
        logger.info(f"📋 Received metadata: {metadata}")
        
        # Import the real trained service
        from app.services.real_trained_feature_service import get_real_trained_service
        
        # Get the service
        trained_service = get_real_trained_service()
        
        # Get prediction from real trained model
        prediction_result = trained_service.predict_deficiency(metadata)
        logger.info(f"🤖 Real model prediction: {prediction_result}")
        
        # Convert NumPy strings to regular Python strings
        predicted_class = str(prediction_result['predicted_class'])
        probabilities = {str(k): float(v) for k, v in prediction_result['probabilities'].items()}
        
        # Format prediction for response
        deficiency_prediction = {
            "deficiency_type": predicted_class,
            "confidence": float(prediction_result['confidence']),
            "severity": prediction_result['severity'],
            "all_probabilities": probabilities,
            "is_healthy": prediction_result['is_healthy'],
            "analysis_method": prediction_result['analysis_method']
        }
        
        # Create response
        analysis_result = {
            "success": True,
            "data": {
                "analysis_id": f"feature_analysis_{int(time.time())}",
                "prediction": deficiency_prediction,
                "recommendations": [],  # Will be empty for now
                "analysis_method": prediction_result['analysis_method']
            },
            "message": "Feature-based analysis completed successfully using real trained model"
        }
        
        logger.info(f"✅ Feature analysis completed: {deficiency_prediction}")
        return analysis_result
        
    except Exception as e:
        logger.error(f"❌ Feature analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Feature analysis failed: {str(e)}")
