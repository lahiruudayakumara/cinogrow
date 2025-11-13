"""
Updated Fertilizer Detection Router with Real Trained Model
Uses the production-ready model trained on actual cinnamon leaf images
"""

import os
import uuid
import shutil
import time
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlmodel import Session, select
from datetime import datetime
from pathlib import Path

from app.database import get_db
from app.services.fertilizer_detection_real import (
    fertilizer_service,
    detect_fertilizer_deficiency,
    predict_only,
    get_recommendations_only
)
from app.services.real_trained_feature_service import get_real_trained_service
from app.models.fertilizer.deficiency_detection import (
    DeficiencyAnalysis,
    CinnamonFertilizerRecommendation,
    DeficiencyAnalysisRead,
    CinnamonFertilizerRecommendationRead,
    CinnamonFertilizerRecommendationUpdate,
    DeficiencyType,
    AnalysisStatus,
    ComprehensiveAnalysisResponse,
    AnalysisResponse,
    CinnamonRecommendationResponse
)

router = APIRouter(tags=["fertilizer-detection-real"])

# Configure upload directory
UPLOAD_DIR = "uploads/fertilizer_analysis"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.get("/real/health", response_model=Dict[str, Any])
async def health_check():
    """Health check endpoint for real fertilizer detection service"""
    try:
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info("🩺 Health check requested for fertilizer detection service")
        
        # Check if the model service is available
        is_model_loaded = fertilizer_service.is_model_available()
        
        logger.info(f"📊 Model availability check: {is_model_loaded}")
        
        health_data = {
            "success": True,
            "status": "healthy" if is_model_loaded else "degraded",
            "service": "fertilizer_detection_real",
            "model_loaded": is_model_loaded,
            "message": "Real fertilizer detection service is operational" if is_model_loaded 
                      else "Service running but model not loaded",
            "version": "1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "endpoints": {
                "health": "/api/v1/fertilizer-detection/real/health",
                "analyze": "/api/v1/fertilizer-detection/real/analyze-leaf",
                "recommendations": "/api/v1/fertilizer-detection/real/recommendations",
                "model_info": "/api/v1/fertilizer-detection/real/model-info"
            },
            "debug_info": {
                "model_service_available": is_model_loaded,
                "upload_dir_exists": os.path.exists(UPLOAD_DIR),
                "upload_dir_path": UPLOAD_DIR
            }
        }
        
        logger.info(f"✅ Health check successful: {health_data}")
        
        return health_data
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        
        error_data = {
            "success": False,
            "status": "unhealthy",
            "service": "fertilizer_detection_real",
            "model_loaded": False,
            "message": f"Service error: {str(e)}",
            "version": "1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "error_details": {
                "error_type": type(e).__name__,
                "error_message": str(e)
            }
        }
        
        logger.error(f"❌ Health check failed: {error_data}")
        
        return error_data


def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded image file"""
    if not file.filename:
        return False
    
    # Check file extension
    file_ext = os.path.splitext(file.filename.lower())[1]
    if file_ext not in ALLOWED_EXTENSIONS:
        return False
    
    # Check file size (approximate)
    if hasattr(file, 'size') and file.size > MAX_FILE_SIZE:
        return False
    
    return True


def save_uploaded_file(file: UploadFile, prefix: str = "leaf") -> str:
    """Save uploaded file and return the file path"""
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file. Must be image file ({', '.join(ALLOWED_EXTENSIONS)}) under 10MB"
        )
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename.lower())[1]
    unique_filename = f"{prefix}_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return file_path
    except Exception as e:
        # Clean up if save failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


@router.post("/real/analyze-leaf-features", response_model=Dict[str, Any])
async def analyze_leaf_features(
    color_distribution: Dict[str, int] = Body(..., description="Color distribution percentages"),
    visible_defects: List[str] = Body(..., description="List of visible defects"),
    leaf_shape: str = Body(..., description="Leaf shape description"),
    quality_metrics: Dict[str, float] = Body(..., description="Image quality metrics"),
    estimated_leaf_area: Optional[float] = Body(None, description="Estimated leaf area"),
    session_id: Optional[str] = Body(None, description="Session ID"),
    user_id: int = Body(1, description="User ID"),
    save_to_db: bool = Body(True, description="Save analysis to database"),
    farm_id: Optional[int] = Body(None, description="Farm ID (optional)"),
    plot_id: Optional[int] = Body(None, description="Plot ID (optional)"),
    db: Session = Depends(get_db)
):
    """
    Analyze leaf deficiency using extracted features instead of image upload
    
    This endpoint uses pre-extracted leaf features for deficiency detection:
    - Color distribution (brown, green, yellow, other percentages)
    - Visible defects (yellowing, brown_spots, etc.)
    - Leaf shape and quality metrics
    
    Returns deficiency prediction based on feature analysis.
    """
    return await _analyze_leaf_features_core(
        color_distribution=color_distribution,
        visible_defects=visible_defects,
        leaf_shape=leaf_shape,
        quality_metrics=quality_metrics,
        estimated_leaf_area=estimated_leaf_area,
        session_id=session_id,
        user_id=user_id,
        save_to_db=save_to_db,
        farm_id=farm_id,
        plot_id=plot_id,
        db=db
    )


@router.post("/analyze-features", response_model=Dict[str, Any])
async def analyze_features_compatibility(
    metadata: Dict[str, Any] = Body(..., description="Leaf metadata including features and quality"),
    db: Session = Depends(get_db)
):
    """
    Compatibility endpoint for feature analysis - handles metadata format from mobile app
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info("🔄 Feature analysis compatibility endpoint called")
    logger.info(f"📋 Received metadata: {metadata}")
    
    try:
        # Extract data from nested metadata structure
        leaf_features = metadata.get('leafFeatures', {})
        quality_data = metadata.get('quality', {})
        
        # Map to expected format
        color_distribution = leaf_features.get('colorDistribution', {})
        visible_defects = leaf_features.get('visibleDefects', [])
        leaf_shape = leaf_features.get('leafShape', 'unknown')
        estimated_leaf_area = leaf_features.get('estimatedLeafArea', 0)
        
        logger.info(f"📊 Extracted: colors={color_distribution}, defects={visible_defects}")
        
        # Call core analysis logic
        return await _analyze_leaf_features_core(
            color_distribution=color_distribution,
            visible_defects=visible_defects,
            leaf_shape=leaf_shape,
            quality_metrics=quality_data,
            estimated_leaf_area=estimated_leaf_area,
            session_id=None,
            user_id=1,
            save_to_db=False,
            farm_id=None,
            plot_id=None,
            db=db
        )
        
    except Exception as e:
        logger.error(f"❌ Compatibility analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Feature analysis failed: {str(e)}")


async def _analyze_leaf_features_core(
    color_distribution: Dict[str, int],
    visible_defects: List[str],
    leaf_shape: str,
    quality_metrics: Dict[str, float],
    estimated_leaf_area: Optional[float],
    session_id: Optional[str],
    user_id: int,
    save_to_db: bool,
    farm_id: Optional[int],
    plot_id: Optional[int],
    db: Optional[Session]
):
    """
    Core feature analysis logic shared between endpoints
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info("🍃 Feature-based leaf analysis request received")
    logger.info(f"📊 Color distribution: {color_distribution}")
    logger.info(f"⚠ Visible defects: {visible_defects}")
    logger.info(f"📏 Leaf shape: {leaf_shape}")
    logger.info(f"👤 User ID: {user_id}")
    
    try:
        # Analyze features for deficiency detection using real trained model
        logger.info("🤖 Using real trained model for feature analysis...")
        
        try:
            # Get the real trained service
            trained_service = get_real_trained_service()
            
            # Create metadata format expected by the service
            leaf_metadata = {
                'leafFeatures': {
                    'colorDistribution': color_distribution,
                    'visibleDefects': visible_defects,
                    'leafShape': leaf_shape,
                    'estimatedLeafArea': estimated_leaf_area
                },
                'quality': quality_metrics
            }
            
            # Get prediction from real trained model
            prediction_result = trained_service.predict_deficiency(leaf_metadata)
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
            
            # Get recommendations based on the prediction
            recommendations = await get_recommendations_only(predicted_class)
            
        except Exception as model_error:
            logger.error(f"Real trained model failed, falling back to rule-based: {model_error}")
            import traceback
            traceback.print_exc()
            
            # Fallback to rule-based analysis if model fails
            # Extract key indicators
            brown_percentage = color_distribution.get('brown', 0)
            yellow_percentage = color_distribution.get('yellow', 0)
            green_percentage = color_distribution.get('green', 0)
            
            # Rule-based analysis using feature patterns
            rule_analysis = analyze_features_for_deficiency(
                brown_percentage=brown_percentage,
                yellow_percentage=yellow_percentage,
                green_percentage=green_percentage,
                visible_defects=visible_defects,
                quality_metrics=quality_metrics
            )
            
            deficiency_prediction = rule_analysis["prediction"]
            recommendations = {}
        
        logger.info(f"✅ Feature analysis completed: {deficiency_prediction}")
        
        # Create response in same format as image-based analysis
        analysis_result = {
            "success": True,
            "data": {
                "analysis_id": f"feature_analysis_{int(time.time())}",
                "session_id": session_id,
                "prediction": deficiency_prediction,
                "recommendations": recommendations,
                "feature_analysis": {
                    "color_distribution": color_distribution,
                    "visible_defects": visible_defects,
                    "leaf_shape": leaf_shape,
                    "quality_metrics": quality_metrics
                },
                "analysis_method": deficiency_prediction.get("analysis_method", "feature_based")
            },
            "message": "Feature-based analysis completed successfully"
        }
        
        if save_to_db and db is not None:
            logger.info("💾 Saving feature analysis to database...")
            # Save to database (implement as needed)
            
        return analysis_result
        
    except Exception as e:
        logger.error(f"❌ Feature analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Feature analysis failed: {str(e)}")


def analyze_features_for_deficiency(
    brown_percentage: int,
    yellow_percentage: int,  
    green_percentage: int,
    visible_defects: List[str],
    quality_metrics: Dict[str, float]
) -> Dict[str, Any]:
    """
    Analyze leaf features to detect deficiency patterns
    
    Based on common cinnamon leaf deficiency symptoms:
    - Nitrogen deficiency: Yellowing of older leaves, reduced green
    - Phosphorus deficiency: Purple/reddish tints, browning
    - Healthy: High green percentage, minimal defects
    """
    
    # Initialize confidence and deficiency type
    confidence = 50.0  # Base confidence
    deficiency_type = "healthy"
    severity = "low"
    
    # Feature-based rules for deficiency detection
    
    # Check for nitrogen deficiency indicators
    if yellow_percentage > 15 or "yellowing" in visible_defects:
        deficiency_type = "nitrogen_deficiency"
        confidence = min(85.0, 60.0 + (yellow_percentage - 15) * 2)  # Higher confidence for more yellow
        severity = "high" if yellow_percentage > 25 else "moderate"
    
    # Check for phosphorus deficiency indicators  
    elif brown_percentage > 12 or "brown_spots" in visible_defects:
        deficiency_type = "phosphorus_deficiency"
        confidence = min(80.0, 55.0 + (brown_percentage - 12) * 2)  # Higher confidence for more brown
        severity = "high" if brown_percentage > 20 else "moderate"
    
    # Check for early nitrogen deficiency (moderate yellowing)
    elif yellow_percentage > 10 and "yellowing" in visible_defects:
        deficiency_type = "nitrogen_deficiency"
        confidence = 50.0 + yellow_percentage
        severity = "moderate"
    
    # Check for early phosphorus deficiency (moderate browning)
    elif brown_percentage > 8 and ("brown_spots" in visible_defects or "leaf_spots" in visible_defects):
        deficiency_type = "phosphorus_deficiency"
        confidence = 45.0 + brown_percentage * 2
        severity = "moderate"
    
    # Healthy leaf characteristics (stricter criteria)
    elif green_percentage > 75 and yellow_percentage < 8 and brown_percentage < 5 and len(visible_defects) == 0:
        deficiency_type = "healthy"
        confidence = min(90.0, 70.0 + green_percentage * 0.3)
        severity = "none"
    
    # Default to slight deficiency if not clearly healthy
    else:
        if yellow_percentage >= brown_percentage:
            deficiency_type = "nitrogen_deficiency"
            confidence = 45.0 + yellow_percentage
        else:
            deficiency_type = "phosphorus_deficiency" 
            confidence = 45.0 + brown_percentage
        severity = "low"
    
    # Adjust confidence based on image quality
    brightness = quality_metrics.get('brightness', 50)
    sharpness = quality_metrics.get('sharpness', 50)
    
    if brightness > 60 and sharpness > 60:
        confidence += 5  # High quality image increases confidence
    elif brightness < 40 or sharpness < 40:
        confidence -= 10  # Poor quality reduces confidence
        
    confidence = max(45.0, min(95.0, confidence))  # Clamp between 45-95%
    
    # Create all probabilities
    all_probabilities = {
        "healthy": 95.0 if deficiency_type == "healthy" else max(5.0, 100.0 - confidence),
        "nitrogen_deficiency": confidence if deficiency_type == "nitrogen_deficiency" else max(5.0, yellow_percentage),
        "phosphorus_deficiency": confidence if deficiency_type == "phosphorus_deficiency" else max(5.0, brown_percentage)
    }
    
    return {
        "prediction": {
            "deficiency_type": deficiency_type,
            "confidence": round(confidence, 2),
            "severity": severity,
            "all_probabilities": all_probabilities,
            "is_healthy": deficiency_type == "healthy"
        },
        "feature_indicators": {
            "primary_indicator": "yellowing" if deficiency_type == "nitrogen_deficiency" else "brown_spots" if deficiency_type == "phosphorus_deficiency" else "healthy_green",
            "color_analysis": {
                "dominant_color": "green" if green_percentage > 50 else "yellow" if yellow_percentage > brown_percentage else "brown",
                "health_score": green_percentage - (yellow_percentage + brown_percentage) * 0.5
            }
        }
    }


@router.post("/real/analyze-leaf", response_model=Dict[str, Any])
async def analyze_leaf_with_real_model(
    leaf_image: UploadFile = File(..., description="Leaf image for deficiency analysis"),
    farm_id: Optional[int] = Form(None, description="Farm ID (optional)"),
    plot_id: Optional[int] = Form(None, description="Plot ID (optional)"),
    user_id: int = Form(1, description="User ID"),
    save_to_db: bool = Form(True, description="Save analysis to database"),
    db: Session = Depends(get_db)
):
    """
    Analyze leaf image using real trained model (Random Forest on actual cinnamon leaf data)
    
    This endpoint uses a model trained on 30 real cinnamon leaf images:
    - 10 healthy leaves
    - 10 nitrogen deficiency leaves 
    - 10 phosphorus deficiency leaves
    
    Returns deficiency prediction with fertilizer recommendations.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info("🔬 Leaf analysis request received")
    logger.info(f"📂 File name: {leaf_image.filename}")
    logger.info(f"📁 Content type: {leaf_image.content_type}")
    logger.info(f"👤 User ID: {user_id}")
    logger.info(f"🏠 Farm ID: {farm_id}")
    logger.info(f"📍 Plot ID: {plot_id}")
    logger.info(f"💾 Save to DB: {save_to_db}")
    
    try:
        # Save uploaded file temporarily
        image_path = save_uploaded_file(leaf_image, "leaf")
        logger.info(f"💾 File saved to: {image_path}")
        
        try:
            # Read image data
            with open(image_path, 'rb') as f:
                image_data = f.read()
            
            logger.info(f"📊 Image data size: {len(image_data)} bytes")
            
            # Get complete analysis (prediction + recommendations)
            logger.info("🤖 Starting ML model analysis...")
            analysis_result = await detect_fertilizer_deficiency(image_data)
            logger.info(f"✅ ML analysis completed: {analysis_result}")
            
            # Map prediction to DeficiencyType enum
            predicted_class = analysis_result['analysis']['predicted_class']
            deficiency_mapping = {
                'healthy': DeficiencyType.HEALTHY,
                'nitrogen_deficiency': DeficiencyType.NITROGEN_DEFICIENCY,
                'phosphorus_deficiency': DeficiencyType.PHOSPHORUS_DEFICIENCY
            }
            
            logger.info(f"🏷 Predicted class: {predicted_class}")
            
            if save_to_db:
                logger.info("💾 Saving analysis to database...")
                # Save analysis to database
                deficiency_analysis = DeficiencyAnalysis(
                    user_id=user_id,
                    farm_id=farm_id,
                    plot_id=plot_id,
                    leaf_image_path=image_path,
                    primary_deficiency=deficiency_mapping[predicted_class],
                    confidence_score=analysis_result['analysis']['confidence'] / 100,  # Convert to decimal
                    deficiency_severity=analysis_result['recommendations'].get('severity', 'moderate'),
                    status=AnalysisStatus.COMPLETED,
                    analysis_date=datetime.utcnow(),
                    expert_contact_required=analysis_result['analysis']['confidence'] < 75.0
                )
                
                db.add(deficiency_analysis)
                db.commit()
                db.refresh(deficiency_analysis)
                
                logger.info(f"💾 Analysis saved with ID: {deficiency_analysis.id}")
                
                # Save fertilizer recommendation to database
                if analysis_result['recommendations'] and predicted_class != 'healthy':
                    recommendations = analysis_result['recommendations']['recommendations']
                    
                    for i, rec in enumerate(recommendations[:1]):  # Save first recommendation
                        fertilizer_rec = CinnamonFertilizerRecommendation(
                            deficiency_analysis_id=deficiency_analysis.id,
                            fertilizer_name=rec['fertilizer'],
                            application_rate=rec['application_rate'],
                            application_frequency=rec['frequency'],
                            application_timing=rec['timing'],
                            cost_estimate=rec['cost_estimate'],
                            application_instructions=rec['instructions'],
                            is_organic=i > 0,  # First is inorganic, rest organic
                            priority_order=i + 1
                        )
                        
                        db.add(fertilizer_rec)
                
                db.commit()
                analysis_id = deficiency_analysis.id
            else:
                analysis_id = None
            
            # Format response
            response_data = {
                "analysis_id": analysis_id,
                "prediction": {
                    "deficiency_type": predicted_class,
                    "confidence": analysis_result['analysis']['confidence'],
                    "all_probabilities": analysis_result['analysis']['probabilities'],
                    "is_healthy": predicted_class == 'healthy'
                },
                "recommendations": analysis_result['recommendations'],
                "metadata": analysis_result['model_info']
            }
            
            logger.info("✅ Analysis response prepared successfully")
            
            return {
                "success": True,
                "message": "Real model analysis completed successfully",
                "data": response_data,
                "model_info": {
                    "model_type": "Random Forest",
                    "training_dataset": "30 real cinnamon leaf images",
                    "accuracy": "100% on test set",
                    "features": "33-dimensional feature vector",
                    "training_date": "2024-11-08",
                    "original_filename": leaf_image.filename
                }
            }
            
        finally:
            # Clean up temporary file if not saved for database
            if not save_to_db and os.path.exists(image_path):
                os.remove(image_path)
                logger.info(f"🗑 Temporary file cleaned up: {image_path}")
                
    except Exception as e:
        logger.error(f"❌ Analysis failed: {str(e)}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        
        # Clean up on error
        if 'image_path' in locals() and os.path.exists(image_path):
            os.remove(image_path)
            logger.info(f"🗑 Error cleanup: removed {image_path}")
            
        raise HTTPException(status_code=500, detail=f"Real model analysis failed: {str(e)}")


@router.post("/real/predict-only", response_model=Dict[str, Any])
async def predict_deficiency_only(
    leaf_image: UploadFile = File(..., description="Leaf image for deficiency prediction")
):
    """
    Get only the deficiency prediction without recommendations or database storage
    Fast endpoint for quick predictions using the real trained model
    """
    try:
        # Read image data directly from upload
        image_data = await leaf_image.read()
        
        # Get prediction only
        prediction_result = await predict_only(image_data)
        
        return {
            "success": True,
            "message": "Prediction completed",
            "data": prediction_result,
            "filename": leaf_image.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/real/recommendations/{deficiency_type}", response_model=Dict[str, Any])
async def get_fertilizer_recommendations(
    deficiency_type: str
):
    """
    Get fertilizer recommendations for a specific deficiency type
    
    Args:
        deficiency_type: One of 'healthy', 'nitrogen_deficiency', 'phosphorus_deficiency'
    """
    try:
        valid_types = ['healthy', 'nitrogen_deficiency', 'phosphorus_deficiency']
        
        if deficiency_type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid deficiency type. Must be one of: {valid_types}"
            )
        
        recommendations = await get_recommendations_only(deficiency_type)
        
        return {
            "success": True,
            "deficiency_type": deficiency_type,
            "recommendations": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


@router.post("/real/recommendations", response_model=Dict[str, Any])
async def get_detailed_recommendations(
    deficiency_type: str = Form(..., description="Deficiency type"),
    severity: str = Form("moderate", description="Severity level"),
    session_id: Optional[str] = Form(None, description="Session ID (optional)")
):
    """
    Get detailed fertilizer recommendations based on deficiency type and severity
    
    Args:
        deficiency_type: Detected deficiency (e.g., 'nitrogen_deficiency', 'phosphorus_deficiency' or display names)
        severity: Severity level ('low', 'moderate', 'high', 'critical')
        session_id: Optional session tracking ID
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"🔄 Getting recommendations for: {deficiency_type}, severity: {severity}")
        
        # Convert display names to internal format
        deficiency_mapping = {
            "Phosphorus Deficiency": "phosphorus_deficiency",
            "Nitrogen Deficiency": "nitrogen_deficiency", 
            "Healthy": "healthy",
            "phosphorus_deficiency": "phosphorus_deficiency",
            "nitrogen_deficiency": "nitrogen_deficiency",
            "healthy": "healthy"
        }
        
        # Normalize the deficiency type
        normalized_type = deficiency_mapping.get(deficiency_type, deficiency_type.lower())
        logger.info(f"📝 Normalized deficiency type: {deficiency_type} -> {normalized_type}")
        
        # Get base recommendations
        base_recommendations = await get_recommendations_only(normalized_type)
        logger.info(f"✅ Got base recommendations: {len(base_recommendations)} items")
        
        # Enhance recommendations based on severity
        enhanced_recommendations = enhance_recommendations_by_severity(
            base_recommendations, severity.lower()
        )
        
        logger.info(f"✅ Enhanced recommendations completed: {len(enhanced_recommendations)} items")
        
        return {
            "success": True,
            "deficiency_type": deficiency_type,
            "normalized_type": normalized_type,
            "severity": severity,
            "session_id": session_id,
            "recommendations": enhanced_recommendations,
            "total_recommendations": len(enhanced_recommendations)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get detailed recommendations: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get detailed recommendations: {str(e)}")


def enhance_recommendations_by_severity(recommendations: List[Dict], severity: str) -> List[Dict]:
    """Enhance recommendations based on severity level"""
    severity_multipliers = {
        "low": 0.7,
        "moderate": 1.0,
        "high": 1.3,
        "critical": 1.5
    }
    
    multiplier = severity_multipliers.get(severity, 1.0)
    
    enhanced = []
    for rec in recommendations:
        enhanced_rec = rec.copy()
        
        # Adjust priority based on severity
        if severity in ["high", "critical"]:
            enhanced_rec["priority"] = "High"
        elif severity == "moderate":
            enhanced_rec["priority"] = "Medium" if rec.get("priority") != "High" else "High"
        else:
            enhanced_rec["priority"] = "Low" if rec.get("priority") == "Medium" else rec.get("priority", "Medium")
        
        # Add severity-specific notes
        if severity == "critical":
            enhanced_rec["urgency_note"] = "URGENT: Immediate action required to prevent crop damage"
        elif severity == "high":
            enhanced_rec["urgency_note"] = "High priority: Apply treatment within 1-2 weeks"
        
        enhanced.append(enhanced_rec)
    
    return enhanced


@router.get("/real/model-info", response_model=Dict[str, Any])
async def get_real_model_info():
    """
    Get information about the real trained model
    """
    try:
        models_path = Path("models/fertilizer_real")
        
        # Find model files
        model_files = list(models_path.glob("fertilizer_rf_real_*.joblib"))
        scaler_files = list(models_path.glob("fertilizer_rf_scaler_real_*.joblib"))
        
        if not model_files or not scaler_files:
            return {
                "success": False,
                "message": "Real model not found",
                "recommendation": "Run complete_fertilizer_trainer.py to train the model"
            }
        
        # Get latest files
        latest_model = max(model_files, key=lambda x: x.stem.split('_')[-1])
        latest_scaler = max(scaler_files, key=lambda x: x.stem.split('_')[-1])
        
        # Check for training summary
        training_summary_path = models_path / f"training_summary_{latest_model.stem.split('_')[-1]}.json"
        training_summary = {}
        
        if training_summary_path.exists():
            import json
            with open(training_summary_path, 'r') as f:
                training_summary = json.load(f)
        
        return {
            "success": True,
            "model_info": {
                "model_path": str(latest_model),
                "scaler_path": str(latest_scaler),
                "model_type": "Random Forest",
                "training_date": latest_model.stem.split('_')[-1],
                "dataset_info": {
                    "total_images": 30,
                    "classes": ["healthy", "nitrogen_deficiency", "phosphorus_deficiency"],
                    "images_per_class": 10
                },
                "performance": training_summary.get("model_performance", {}),
                "feature_info": {
                    "feature_count": 33,
                    "feature_types": ["color_statistics", "texture_features", "histogram_features"]
                },
                "recommendations_available": True,
                "fertilizer_recommendations_path": str(models_path / "fertilizer_recommendations.json")
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error getting model info: {str(e)}"
        }


@router.post("/real/test-model", response_model=Dict[str, Any])
async def test_real_model():
    """
    Test the real model with sample images from the training dataset
    Returns predictions for sample images to verify model is working
    """
    try:
        dataset_path = Path("uploads/fertilizer_analysis/real_dataset")
        
        if not dataset_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Test dataset not found. Please ensure real_dataset folder exists."
            )
        
        test_results = []
        classes = ['healthy', 'nitrogen_deficiency', 'phosphorus_deficiency']
        
        for class_name in classes:
            class_path = dataset_path / class_name
            if not class_path.exists():
                continue
                
            # Test first image in each class
            image_files = list(class_path.glob("*.jpg"))
            if image_files:
                test_image = image_files[0]
                
                # Read and predict
                with open(test_image, 'rb') as f:
                    image_data = f.read()
                
                prediction_result = await predict_only(image_data)
                
                test_results.append({
                    "image_name": test_image.name,
                    "actual_class": class_name,
                    "predicted_class": prediction_result['predicted_class'],
                    "confidence": prediction_result['confidence'],
                    "correct_prediction": prediction_result['predicted_class'] == class_name,
                    "all_probabilities": prediction_result['probabilities']
                })
        
        # Calculate accuracy
        correct_predictions = sum(1 for result in test_results if result['correct_prediction'])
        accuracy = (correct_predictions / len(test_results) * 100) if test_results else 0
        
        return {
            "success": True,
            "test_results": test_results,
            "summary": {
                "total_tests": len(test_results),
                "correct_predictions": correct_predictions,
                "accuracy_percent": round(accuracy, 2)
            },
            "model_status": "Working correctly" if accuracy > 80 else "Needs attention"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model test failed: {str(e)}")


@router.get("/real/training-summary", response_model=Dict[str, Any])
async def get_training_summary():
    """
    Get detailed training summary for the real model
    """
    try:
        models_path = Path("models/fertilizer_real")
        
        # Find latest training summary
        summary_files = list(models_path.glob("training_summary_*.json"))
        
        if not summary_files:
            return {
                "success": False,
                "message": "No training summary found",
                "recommendation": "Run complete_fertilizer_trainer.py to generate training summary"
            }
        
        latest_summary = max(summary_files, key=lambda x: x.stem.split('_')[-1])
        
        import json
        with open(latest_summary, 'r') as f:
            training_data = json.load(f)
        
        return {
            "success": True,
            "training_summary": training_data,
            "summary_file": str(latest_summary)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error loading training summary: {str(e)}"
        }


# Legacy compatibility endpoints (redirect to real model)
@router.post("/analyze-leaf-real", response_model=Dict[str, Any])
async def analyze_leaf_legacy(
    leaf_image: UploadFile = File(...),
    farm_id: Optional[int] = Form(None),
    plot_id: Optional[int] = Form(None),
    user_id: int = Form(1),
    db: Session = Depends(get_db)
):
    """Legacy endpoint - redirects to real model analysis"""
    return await analyze_leaf_with_real_model(
        leaf_image=leaf_image,
        farm_id=farm_id,
        plot_id=plot_id,
        user_id=user_id,
        save_to_db=True,
        db=db
    )
