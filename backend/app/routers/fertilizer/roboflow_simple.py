"""
Simplified Roboflow Fertilizer Detection Router
Using official Roboflow Inference SDK for reliable workflow execution
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import os
from dotenv import load_dotenv
from PIL import Image
import io
from pathlib import Path
from sqlmodel import Session, select

# Register HEIF/HEIC format support for PIL
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    logging.info("✅ HEIF/HEIC image format support enabled")
except ImportError:
    logging.warning("⚠️ pillow-heif not installed. HEIC images won't be supported.")
from app.database import get_session
from app.models.fertilizer_history import (
    FertilizerHistory,
    FertilizerHistoryCreate,
    FertilizerHistoryResponse
)
from app.services.soil_analysis import (
    parse_soil_detection_result,
    generate_soil_recommendations,
    generate_combined_analysis,
    SOIL_TYPE_DATA
)

# Import Roboflow Inference SDK
try:
    from inference_sdk import InferenceHTTPClient
    INFERENCE_SDK_AVAILABLE = True
except ImportError:
    INFERENCE_SDK_AVAILABLE = False
    logging.warning("⚠️ inference-sdk not installed. Run: pip install inference-sdk")

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../../..', '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/fertilizer/roboflow",
    tags=["Roboflow Simple Detection"]
)

# Roboflow configuration
ROBOFLOW_API_KEY = os.getenv('ROBOFLOW_API_KEY', '')
ROBOFLOW_WORKSPACE = os.getenv('ROBOFLOW_WORKSPACE', 'cinogrow')
ROBOFLOW_MODEL_ID = os.getenv('ROBOFLOW_MODEL_ID', 'cinnamon-deficiency')
ROBOFLOW_MODEL_VERSION = os.getenv('ROBOFLOW_MODEL_VERSION', '1')
ROBOFLOW_WORKFLOW_ID = os.getenv('ROBOFLOW_WORKFLOW_ID', 'custom-workflow-2')
ROBOFLOW_SOIL_WORKFLOW_ID = os.getenv('ROBOFLOW_SOIL_WORKFLOW_ID', 'soil-type-detection')
ROBOFLOW_USE_WORKFLOW = os.getenv('ROBOFLOW_USE_WORKFLOW', 'true').lower() == 'true'

# Initialize Roboflow client (will be None if SDK not available)
roboflow_client = None
if INFERENCE_SDK_AVAILABLE and ROBOFLOW_API_KEY:
    try:
        roboflow_client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=ROBOFLOW_API_KEY
        )
        logger.info("✅ Roboflow Inference SDK client initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Roboflow client: {e}")
        roboflow_client = None


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Check if Roboflow service is configured and ready
    """
    try:
        logger.info("🏥 Roboflow health check requested")
        
        if not ROBOFLOW_API_KEY:
            return {
                "success": False,
                "status": "not_configured",
                "message": "Roboflow API key not set",
                "configured": False,
                "sdk_available": INFERENCE_SDK_AVAILABLE
            }
        
        if not roboflow_client:
            return {
                "success": False,
                "status": "client_not_initialized",
                "message": "Roboflow client could not be initialized",
                "configured": True,
                "sdk_available": INFERENCE_SDK_AVAILABLE
            }
        
        logger.info("✅ Roboflow service is configured")
        return {
            "success": True,
            "status": "configured",
            "message": "Roboflow is ready",
            "configured": True,
            "sdk_available": INFERENCE_SDK_AVAILABLE,
            "details": {
                "workspace": ROBOFLOW_WORKSPACE,
                "workflow_id": ROBOFLOW_WORKFLOW_ID if ROBOFLOW_USE_WORKFLOW else ROBOFLOW_MODEL_ID,
                "use_workflow": ROBOFLOW_USE_WORKFLOW
            }
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )


@router.post("/analyze")
async def analyze_leaf_with_roboflow(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    user_id: Optional[int] = None,
    plant_age: int = Query(1, ge=1, description="Plant age in years")
) -> Dict[str, Any]:
    """
    Analyze leaf image using Roboflow Inference SDK and save to history
    
    Uses the official inference-sdk for reliable workflow execution.
    The SDK handles authentication and API communication automatically.
    Results are automatically saved to the database for history tracking.
    
    Args:
        file: Leaf image file (JPEG, PNG)
        db: Database session
        user_id: Optional user ID for tracking (query parameter)
        plant_age: Age of the plant in years (query parameter)
        
    Returns:
        Dict containing Roboflow workflow output and saved record ID
    """
    try:
        logger.info("🍃 Starting Roboflow workflow analysis with Inference SDK")
        logger.info(f"📁 File: {file.filename}, Content-Type: {file.content_type}")
        
        # Check if SDK is available
        if not INFERENCE_SDK_AVAILABLE:
            logger.error("❌ Inference SDK not installed")
            raise HTTPException(
                status_code=503,
                detail="Roboflow Inference SDK not installed. Run: pip install inference-sdk"
            )
        
        # Check if client is initialized
        if not roboflow_client:
            logger.error("❌ Roboflow client not initialized")
            raise HTTPException(
                status_code=503,
                detail="Roboflow client not initialized. Check API key configuration."
            )
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            logger.error(f"❌ Invalid file type: {file.content_type}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Expected image, got {file.content_type}"
            )
        
        # Read the uploaded file
        logger.info("📖 Reading image data...")
        image_bytes = await file.read()
        logger.info(f"✅ Read {len(image_bytes)} bytes")
        
        # Validate file size (10MB max)
        max_size = 10 * 1024 * 1024
        if len(image_bytes) > max_size:
            logger.error(f"❌ File too large: {len(image_bytes)} bytes")
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is 10MB, got {len(image_bytes) / 1024 / 1024:.2f}MB"
            )
        
        # Convert bytes to PIL Image (required by SDK)
        logger.info("🖼️ Converting to PIL Image...")
        image = Image.open(io.BytesIO(image_bytes))
        logger.info(f"✅ Image loaded: {image.size[0]}x{image.size[1]} pixels, mode: {image.mode}")
        
        # Run workflow using SDK
        if ROBOFLOW_USE_WORKFLOW:
            logger.info(f"🔄 Running Roboflow Workflow: {ROBOFLOW_WORKFLOW_ID}")
            logger.info(f"🏢 Workspace: {ROBOFLOW_WORKSPACE}")
            
            result = roboflow_client.run_workflow(
                workspace_name=ROBOFLOW_WORKSPACE,
                workflow_id=ROBOFLOW_WORKFLOW_ID,
                images={"image": image},
                use_cache=True
            )
            
            logger.info("✅ Workflow execution complete")
        else:
            # For model inference (not workflow)
            logger.info(f"🔄 Running Roboflow Model: {ROBOFLOW_MODEL_ID}")
            
            result = roboflow_client.infer(
                image=image,
                model_id=f"{ROBOFLOW_WORKSPACE}/{ROBOFLOW_MODEL_ID}/{ROBOFLOW_MODEL_VERSION}"
            )
            
            logger.info("✅ Model inference complete")
        
        # Extract detections from result
        detections = []
        primary_deficiency = None
        max_confidence = 0.0
        severity = None
        
        try:
            # Log the raw result structure for debugging
            logger.info(f"🔍 Raw result type: {type(result)}")
            logger.info(f"🔍 Raw result: {result}")
            
            # Parse Roboflow output to extract detections
            if isinstance(result, list) and len(result) > 0:
                predictions = result[0].get('predictions', [])
                
                logger.info(f"🔍 Predictions type: {type(predictions)}")
                logger.info(f"🔍 Predictions: {predictions}")
                
                if isinstance(predictions, dict):
                    # Handle dict format - iterate through all keys
                    for key, pred in predictions.items():
                        logger.info(f"🔍 Checking key: {key}, value type: {type(pred)}")
                        
                        # Check if pred is already a list of detections
                        if isinstance(pred, list):
                            logger.info(f"🔍 Found list directly in key '{key}' with {len(pred)} items")
                            for detection in pred:
                                if isinstance(detection, dict):
                                    class_name = detection.get('class', detection.get('deficiency', detection.get('class_name', 'Unknown')))
                                    confidence = detection.get('confidence', 0.0)
                                    
                                    logger.info(f"✅ Extracted: class={class_name}, confidence={confidence}")
                                    
                                    detections.append({
                                        'class': class_name,
                                        'confidence': confidence,
                                        'deficiency': class_name,
                                        'severity': 'High' if confidence > 0.8 else 'Medium' if confidence > 0.5 else 'Low'
                                    })
                                    
                                    if confidence > max_confidence:
                                        max_confidence = confidence
                                        primary_deficiency = class_name
                                        severity = 'High' if confidence > 0.8 else 'Medium' if confidence > 0.5 else 'Low'
                        
                        # Check if pred has nested predictions
                        elif isinstance(pred, dict) and 'predictions' in pred:
                            logger.info(f"🔍 Found nested predictions in key '{key}'")
                            for detection in pred['predictions']:
                                class_name = detection.get('class', detection.get('deficiency', detection.get('class_name', 'Unknown')))
                                confidence = detection.get('confidence', 0.0)
                                
                                logger.info(f"✅ Extracted: class={class_name}, confidence={confidence}")
                                
                                detections.append({
                                    'class': class_name,
                                    'confidence': confidence,
                                    'deficiency': class_name,
                                    'severity': 'High' if confidence > 0.8 else 'Medium' if confidence > 0.5 else 'Low'
                                })
                                
                                if confidence > max_confidence:
                                    max_confidence = confidence
                                    primary_deficiency = class_name
                                    severity = 'High' if confidence > 0.8 else 'Medium' if confidence > 0.5 else 'Low'
                
                elif isinstance(predictions, list):
                    # Handle list format - direct list of detections
                    logger.info(f"🔍 Processing list of {len(predictions)} predictions")
                    for detection in predictions:
                        if isinstance(detection, dict):
                            class_name = detection.get('class', detection.get('deficiency', detection.get('class_name', 'Unknown')))
                            confidence = detection.get('confidence', 0.0)
                            
                            logger.info(f"✅ Extracted: class={class_name}, confidence={confidence}")
                            
                            detections.append({
                                'class': class_name,
                                'confidence': confidence,
                                'deficiency': class_name,
                                'severity': 'High' if confidence > 0.8 else 'Medium' if confidence > 0.5 else 'Low'
                            })
                            
                            if confidence > max_confidence:
                                max_confidence = confidence
                                primary_deficiency = class_name
                                severity = 'High' if confidence > 0.8 else 'Medium' if confidence > 0.5 else 'Low'
            
            logger.info(f"📊 Processed detections: {detections}")
            logger.info(f"📊 Primary deficiency: {primary_deficiency}, Confidence: {max_confidence}, Severity: {severity}")
            
        except Exception as e:
            logger.error(f"❌ Failed to parse detections: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
        
        # Ensure we have default values if parsing failed
        if primary_deficiency is None and len(detections) == 0:
            logger.warning("⚠️ No detections extracted, using defaults")
            primary_deficiency = "Unknown"
            max_confidence = 0.0
            severity = "Low"
        
        # Generate recommendations based on deficiency, severity, and plant age
        recommendations = None
        try:
            logger.info(f"🌱 Generating recommendations for plant_age={plant_age}, deficiency={primary_deficiency}")
            recommendations = generate_recommendations(
                deficiency=primary_deficiency or "Unknown",
                severity=severity or "Low",
                plant_age=plant_age,
                confidence=max_confidence
            )
            logger.info(f"✅ Generated recommendations: {recommendations.get('summary', 'N/A')}")
        except Exception as e:
            logger.error(f"❌ Failed to generate recommendations: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
        
        # Save to database (simplified)
        try:
            logger.info(f"💾 Saving to database: deficiency={primary_deficiency}, confidence={max_confidence}, severity={severity}, plant_age={plant_age}")
            
            history_record = FertilizerHistory(
                primary_deficiency=primary_deficiency,
                confidence=max_confidence,
                severity=severity,
                plant_age=plant_age,
                recommendations=recommendations,
                analyzed_at=datetime.utcnow()
            )
            
            db.add(history_record)
            db.commit()
            db.refresh(history_record)
            
            logger.info(f"💾 Saved analysis to database with ID: {history_record.id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save to database: {e}")
            db.rollback()
            # Continue even if database save fails
        
        # Return formatted response
        return {
            "success": True,
            "message": "Roboflow analysis completed successfully",
            "roboflow_output": result,
            "detections": detections,
            "primary_deficiency": primary_deficiency,
            "confidence": max_confidence,
            "severity": severity,
            "plant_age": plant_age,
            "recommendations": recommendations,
            "history_id": history_record.id if 'history_record' in locals() else None,
            "metadata": {
                "filename": file.filename,
                "content_type": file.content_type,
                "model_type": "workflow" if ROBOFLOW_USE_WORKFLOW else "model",
                "workspace": ROBOFLOW_WORKSPACE,
                "workflow_id": ROBOFLOW_WORKFLOW_ID if ROBOFLOW_USE_WORKFLOW else ROBOFLOW_MODEL_ID
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Analysis failed: {e}")
        logger.error(f"📋 Error type: {type(e).__name__}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/status")
async def get_roboflow_status() -> Dict[str, Any]:
    """
    Get current Roboflow configuration status
    """
    try:
        config = {
            "api_key_configured": bool(ROBOFLOW_API_KEY),
            "api_key_length": len(ROBOFLOW_API_KEY) if ROBOFLOW_API_KEY else 0,
            "workspace": ROBOFLOW_WORKSPACE,
            "model_id": ROBOFLOW_MODEL_ID,
            "model_version": ROBOFLOW_MODEL_VERSION,
            "workflow_id": ROBOFLOW_WORKFLOW_ID,
            "use_workflow": ROBOFLOW_USE_WORKFLOW,
            "sdk_available": INFERENCE_SDK_AVAILABLE,
            "client_initialized": roboflow_client is not None
        }
        
        return {
            "success": True,
            "configuration": config
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get status: {str(e)}"
        )


@router.get("/history", response_model=List[FertilizerHistoryResponse])
async def get_fertilizer_history(
    db: Session = Depends(get_session),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of records to return"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    deficiency: Optional[str] = Query(None, description="Filter by deficiency type"),
    severity: Optional[str] = Query(None, description="Filter by severity (Low, Medium, High)")
) -> List[FertilizerHistoryResponse]:
    """
    Get fertilizer analysis history with optional filtering and pagination
    
    Args:
        db: Database session
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        user_id: Optional filter by user ID
        deficiency: Optional filter by deficiency type
        severity: Optional filter by severity level
        
    Returns:
        List of fertilizer history records
    """
    try:
        logger.info(f"📜 Fetching fertilizer history (skip={skip}, limit={limit})")
        
        # Build query
        query = select(FertilizerHistory)
        
        # Apply filters
        if user_id is not None:
            query = query.where(FertilizerHistory.user_id == user_id)
            logger.info(f"🔍 Filtering by user_id: {user_id}")
        
        if deficiency:
            query = query.where(FertilizerHistory.primary_deficiency == deficiency)
            logger.info(f"🔍 Filtering by deficiency: {deficiency}")
        
        if severity:
            query = query.where(FertilizerHistory.severity == severity)
            logger.info(f"🔍 Filtering by severity: {severity}")
        
        # Order by most recent first
        query = query.order_by(FertilizerHistory.analyzed_at.desc())
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Execute query
        results = db.exec(query).all()
        
        logger.info(f"✅ Found {len(results)} history records")
        
        return results
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch history: {str(e)}"
        )


@router.get("/history/{history_id}", response_model=FertilizerHistoryResponse)
async def get_fertilizer_history_by_id(
    history_id: int,
    db: Session = Depends(get_session)
) -> FertilizerHistoryResponse:
    """
    Get a specific fertilizer analysis record by ID
    
    Args:
        history_id: The ID of the history record
        db: Database session
        
    Returns:
        Single fertilizer history record
    """
    try:
        logger.info(f"🔍 Fetching history record ID: {history_id}")
        
        result = db.get(FertilizerHistory, history_id)
        
        if not result:
            logger.error(f"❌ History record {history_id} not found")
            raise HTTPException(
                status_code=404,
                detail=f"History record with ID {history_id} not found"
            )
        
        logger.info(f"✅ Found history record {history_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch history record: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch history record: {str(e)}"
        )


@router.get("/history/{history_id}/recommendations")
async def get_history_recommendations(
    history_id: int,
    plant_age: int = Query(1, ge=1, description="Plant age in years"),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get fertilizer recommendations for a specific history record
    
    Args:
        history_id: The ID of the history record
        plant_age: Age of the plant in years (for age-specific recommendations)
        db: Database session
        
    Returns:
        Dict containing history record and recommendations
    """
    try:
        logger.info(f"🔍 Fetching recommendations for history ID: {history_id}, plant age: {plant_age}")
        
        # Get the history record
        result = db.get(FertilizerHistory, history_id)
        
        if not result:
            logger.error(f"❌ History record {history_id} not found")
            raise HTTPException(
                status_code=404,
                detail=f"History record with ID {history_id} not found"
            )
        
        # Generate recommendations based on the stored deficiency and severity
        deficiency = result.deficiency or "Nitrogen Deficiency"
        severity = result.severity or "Medium"
        confidence = result.confidence or 0.5
        
        logger.info(f"📊 Generating recommendations: {deficiency}, {severity}, confidence: {confidence}")
        
        recommendations = generate_recommendations(deficiency, severity, plant_age, confidence)
        
        return {
            "success": True,
            "history_id": history_id,
            "plant_age": plant_age,
            "analysis": {
                "deficiency": deficiency,
                "severity": severity,
                "confidence": confidence,
                "analyzed_at": result.analyzed_at.isoformat() if result.analyzed_at else None
            },
            "recommendations": recommendations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recommendations: {str(e)}"
        )


@router.delete("/history/{history_id}")
async def delete_fertilizer_history(
    history_id: int,
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Delete a specific fertilizer analysis record
    
    Args:
        history_id: The ID of the history record to delete
        db: Database session
        
    Returns:
        Success message
    """
    try:
        logger.info(f"🗑️ Deleting history record ID: {history_id}")
        
        result = db.get(FertilizerHistory, history_id)
        
        if not result:
            logger.error(f"❌ History record {history_id} not found")
            raise HTTPException(
                status_code=404,
                detail=f"History record with ID {history_id} not found"
            )
        
        db.delete(result)
        db.commit()
        
        logger.info(f"✅ Deleted history record {history_id}")
        return {
            "success": True,
            "message": f"History record {history_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete history record: {e}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete history record: {str(e)}"
        )


@router.get("/history/stats/summary")
async def get_history_statistics(
    db: Session = Depends(get_session),
    user_id: Optional[int] = Query(None, description="Filter stats by user ID")
) -> Dict[str, Any]:
    """
    Get statistics summary of fertilizer analyses
    
    Args:
        db: Database session
        user_id: Optional filter by user ID
        
    Returns:
        Statistics summary including total analyses, deficiency counts, etc.
    """
    try:
        logger.info("📊 Calculating fertilizer history statistics")
        
        # Build base query
        query = select(FertilizerHistory)
        if user_id is not None:
            query = query.where(FertilizerHistory.user_id == user_id)
        
        results = db.exec(query).all()
        
        # Calculate statistics
        total_analyses = len(results)
        deficiency_counts = {}
        severity_counts = {"Low": 0, "Medium": 0, "High": 0}
        
        for record in results:
            # Count deficiencies
            if record.primary_deficiency:
                deficiency_counts[record.primary_deficiency] = deficiency_counts.get(record.primary_deficiency, 0) + 1
            
            # Count severities
            if record.severity in severity_counts:
                severity_counts[record.severity] += 1
        
        # Get most common deficiency
        most_common_deficiency = max(deficiency_counts.items(), key=lambda x: x[1]) if deficiency_counts else (None, 0)
        
        stats = {
            "total_analyses": total_analyses,
            "deficiency_counts": deficiency_counts,
            "severity_counts": severity_counts,
            "most_common_deficiency": {
                "name": most_common_deficiency[0],
                "count": most_common_deficiency[1]
            }
        }
        
        logger.info(f"✅ Statistics calculated for {total_analyses} records")
        
        return {
            "success": True,
            "statistics": stats
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to calculate statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate statistics: {str(e)}"
        )


@router.post("/recommendations")
async def get_fertilizer_recommendations(
    deficiency: str,
    severity: str,
    plant_age: int,
    confidence: float
) -> Dict[str, Any]:
    """
    Generate age-appropriate fertilizer recommendations based on detected deficiency
    
    Args:
        deficiency: Detected nutrient deficiency (e.g., "Nitrogen Deficiency")
        severity: Severity level (High, Medium, Low)
        plant_age: Age of the plant in years
        confidence: Detection confidence (0-1)
        
    Returns:
        Dict containing tailored fertilizer recommendations
    """
    try:
        logger.info(f"🌱 Generating recommendations for {plant_age}-year-old plant")
        logger.info(f"📊 Deficiency: {deficiency}, Severity: {severity}, Confidence: {confidence}")
        
        # Define fertilizer recommendations based on deficiency and age
        recommendations = generate_recommendations(deficiency, severity, plant_age, confidence)
        
        return {
            "success": True,
            "plant_age": plant_age,
            "deficiency": deficiency,
            "severity": severity,
            "confidence": confidence,
            "recommendations": recommendations
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to generate recommendations: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


def generate_recommendations(deficiency: str, severity: str, plant_age: int, confidence: float) -> Dict[str, Any]:
    """
    Generate fertilizer recommendations based on plant age and deficiency
    Following official cinnamon cultivation guidelines with soil preparation requirements
    Updated: December 2025 - Official Ministry Guidelines
    """
    
    # Determine plant year category for dosage and placement
    if plant_age == 1:
        year_category = "year_1"
        year_desc = "Year 1 (0-1 year)"
        ring_distance = "15 cm (6 inches)"
        placement_desc = "Apply fertilizer 15 cm (6 inches) away from the base of the seedling"
    elif plant_age == 2:
        year_category = "year_2"
        year_desc = "Year 2"
        ring_distance = "30 cm (12 inches)"
        placement_desc = "Apply fertilizer 30 cm (12 inches) away from the base"
    else:  # 3+ years
        year_category = "year_3_plus"
        year_desc = "Year 3+"
        ring_distance = "30 cm (12 inches)"
        placement_desc = "Apply fertilizer 30 cm (12 inches) away from the base"
    
    # Fertilizer recommendations by deficiency type
    fertilizer_guide = {
        "Nitrogen Deficiency": {
            "primary_nutrient": "Nitrogen (N)",
            "dosages": {
                "year_1": {"amount": 17, "unit": "g N"},
                "year_2": {"amount": 34, "unit": "g N"},
                "year_3_plus": {"amount": 50, "unit": "g N"}
            },
            "fertilizer": {
                "name": "Urea",
                "composition": "46% N",
                "description": "Main nitrogen source for cinnamon cultivation"
            },
            "application_method": {
                "timing": "Apply when soil has sufficient moisture (start or end of rainy season)",
                "placement": placement_desc,
                "coverage": "After applying fertilizer: mulch / lightly water"
            },
            "symptoms": [
                "Yellowing between veins",
                "Pale, thin leaves",
                "Overall poor growth"
            ],
            "extra_note": "Nitrogen deficiency combined with yellow-brown patches may indicate Magnesium deficiency, which can be corrected by Dolomite"
        },
        "Phosphorus Deficiency": {
            "primary_nutrient": "Phosphorus (P)",
            "dosages": {
                "year_1": {"amount": 8, "unit": "g P"},
                "year_2": {"amount": 17, "unit": "g P"},
                "year_3_plus": {"amount": 25, "unit": "g P"}
            },
            "fertilizer": {
                "name": "ERP (Eppawala Rock Phosphate)",
                "composition": "Variable P content (typically 20-30% P₂O₅)",
                "description": "Main phosphorus source, slow-release natural rock phosphate"
            },
            "application_method": {
                "timing": "Apply early in the season because P releases slowly",
                "placement": "Mix lightly with soil for better absorption",
                "coverage": "Maintain soil pH 5.5–6.5 for phosphorus efficiency"
            },
            "symptoms": [
                "Slow growth",
                "Purple or darkened lower leaves",
                "Thin stems"
            ],
            "extra_note": "Phosphorus is slow-release, so early application ensures availability during growth period"
        },
        "Potassium Deficiency": {
            "primary_nutrient": "Potassium (K)",
            "dosages": {
                "year_1": {"amount": 8, "unit": "g K"},
                "year_2": {"amount": 17, "unit": "g K"},
                "year_3_plus": {"amount": 25, "unit": "g K"}
            },
            "fertilizer": {
                "name": "MOP (Muriate of Potash)",
                "composition": "60% K₂O",
                "description": "Main potassium source for cinnamon cultivation"
            },
            "application_method": {
                "timing": "Apply during moist conditions only (start/end of rainy season)",
                "placement": f"Keep fertilizer {ring_distance} away from the base",
                "coverage": "Avoid applying on dry soil"
            },
            "symptoms": [
                "Brown leaf edges",
                "Leaf scorch",
                "Weak stems",
                "Reduced oil content in cinnamon bark"
            ],
            "extra_note": "Potassium deficiency can significantly reduce the quality and oil content of cinnamon bark"
        },
        "Magnesium Deficiency": {
            "primary_nutrient": "Magnesium (Mg)",
            "dosages": {
                "year_1": {"amount": 50, "unit": "g"},
                "year_2": {"amount": 75, "unit": "g"},
                "year_3_plus": {"amount": 100, "unit": "g"}
            },
            "fertilizer": {
                "name": "Dolomite",
                "composition": "Contains Ca and Mg",
                "description": "Corrects both Magnesium deficiency and soil acidity. Apply 6 weeks before fertilizer application."
            },
            "application_method": {
                "timing": "Apply during preparation or early season, 6 weeks before fertilizer",
                "placement": "Broadcast around plant and lightly incorporate",
                "coverage": "Also helps maintain optimal soil pH (5.5-6.5)"
            },
            "symptoms": [
                "Yellow-brown patches on leaves",
                "Interveinal chlorosis",
                "Often appears with Nitrogen deficiency"
            ],
            "extra_note": "If soil pH is below 5.5, apply dolomite. If pH < 5.0, apply 400 kg/acre"
        }
    }
    
    # Normalize deficiency name to handle typos (e.g., "Potasium" -> "Potassium")
    normalized_deficiency = deficiency
    if "potasium" in deficiency.lower():
        normalized_deficiency = "Potassium Deficiency"
    elif "nitrogen" in deficiency.lower():
        normalized_deficiency = "Nitrogen Deficiency"
    elif "phosphorus" in deficiency.lower():
        normalized_deficiency = "Phosphorus Deficiency"
    elif "magnesium" in deficiency.lower():
        normalized_deficiency = "Magnesium Deficiency"
    
    # Get recommendation for this deficiency
    deficiency_info = fertilizer_guide.get(normalized_deficiency, fertilizer_guide["Nitrogen Deficiency"])
    
    # Get the appropriate dosage for plant age
    dosage_info = deficiency_info["dosages"][year_category]
    nutrient_amount = dosage_info["amount"]
    nutrient_unit = dosage_info["unit"]
    
    # Get fertilizer details
    fertilizer = deficiency_info["fertilizer"]
    application = deficiency_info["application_method"]
    
    # Calculate actual fertilizer amount based on nutrient content
    if "Urea" in fertilizer["name"]:
        fertilizer_amount = round(nutrient_amount / 0.46)
        fertilizer_calculation = f"{nutrient_amount}g N ÷ 0.46 = {fertilizer_amount}g Urea"
    elif "ERP" in fertilizer["name"] or "Rock Phosphate" in fertilizer["name"]:
        fertilizer_amount = round(nutrient_amount / 0.11)
        fertilizer_calculation = f"{nutrient_amount}g P ÷ 0.11 (approx) = {fertilizer_amount}g ERP"
    elif "MOP" in fertilizer["name"] or "Muriate of Potash" in fertilizer["name"]:
        fertilizer_amount = round(nutrient_amount / 0.50)
        fertilizer_calculation = f"{nutrient_amount}g K ÷ 0.50 = {fertilizer_amount}g MOP"
    else:
        fertilizer_amount = nutrient_amount
        fertilizer_calculation = f"{nutrient_amount}{nutrient_unit}"
    
    # Determine urgency
    immediate_action = severity == "High" and confidence > 0.7
    
    # Build comprehensive recommendations
    recommendations = {
        # SOIL PREPARATION (CRITICAL - MUST DO FIRST)
        "soil_preparation": {
            "title": "⚠️ BEFORE APPLYING ANY FERTILIZER",
            "essential_conditions": [
                "Maintain adequate soil moisture",
                "Ensure proper soil aeration",
                "Maintain good soil microbial activity",
                "Maintain soil pH within 5.5 – 6.5 range",
                "Perform soil testing at least once a year (pH + nutrient availability)"
            ],
            "dolomite_application": {
                "when_to_apply": "Apply dolomite if soil pH is below 5.5",
                "dosage_guideline": "If pH < 5.0 → apply 400 kg/acre",
                "timing": "Apply 6 weeks BEFORE fertilizer application",
                "benefits": "Provides Calcium (Ca) and Magnesium (Mg), preventing Mg deficiency"
            }
        },
        
        # PLANT INFORMATION
        "plant_information": {
            "age_years": plant_age,
            "year_category": year_desc,
            "placement_distance": ring_distance,
            "description": f"Cinnamon plant in {year_desc} stage"
        },
        
        # DETECTED DEFICIENCY
        "deficiency_details": {
            "detected_deficiency": deficiency,
            "primary_nutrient": deficiency_info["primary_nutrient"],
            "symptoms": deficiency_info["symptoms"],
            "severity": severity,
            "confidence": round(confidence * 100, 1)
        },
        
        # FERTILIZER RECOMMENDATION
        "fertilizer_recommendation": {
            "fertilizer_name": fertilizer["name"],
            "composition": fertilizer["composition"],
            "description": fertilizer["description"],
            "nutrient_required": f"{nutrient_amount} {nutrient_unit}",
            "fertilizer_amount": f"{fertilizer_amount}g per plant",
            "calculation": fertilizer_calculation
        },
        
        # APPLICATION GUIDELINES
        "application_guidelines": {
            "timing": application["timing"],
            "placement": application["placement"],
            "method": application["coverage"],
            "urgency": "Within 3-7 days" if immediate_action else "Within 1-2 weeks",
            "best_time": "Early morning or late afternoon to avoid heat stress",
            "split_application": "Apply in two splits each year (every 6 months)" if plant_age >= 3 else "Apply every 3-4 months"
        },
        
        # IMPORTANT NOTES
        "important_notes": {
            "moisture_requirement": "✓ Apply ONLY when soil has sufficient moisture",
            "soil_preparation": "✓ Ensure soil pH is 5.5-6.5 before fertilizer application",
            "distance_from_stem": f"✓ Maintain {ring_distance} distance from plant base",
            "after_application": "✓ Mulch or lightly water after fertilizer application",
            "special_note": deficiency_info.get("extra_note", "Follow standard application practices")
        },
        
        # MATURE CINNAMON GUIDANCE (3+ years)
        "mature_plant_guide": {
            "applicable": plant_age >= 3,
            "npk_ratio": "23 : 7 : 15 (N : P₂O₅ : K₂O)",
            "annual_requirement": "900 kg per hectare",
            "application_frequency": "Apply in two splits each year (every 6 months)"
        } if plant_age >= 3 else None,
        
        # MONITORING
        "monitoring": {
            "improvement_timeline": "Expect visible improvement in 2-4 weeks in new growth",
            "full_recovery": "Complete recovery typically takes 6-8 weeks",
            "check_for": [
                "New leaf color and size",
                "Overall plant vigor",
                "Stem strength"
            ]
        },
        
        # WARNINGS
        "warnings": [
            "⚠️ Check and correct soil pH BEFORE applying fertilizer",
            "⚠️ Do not exceed recommended dosage",
            "⚠️ Keep fertilizer away from direct contact with stem",
            "⚠️ Apply only during moist conditions",
            "⚠️ Avoid application during drought or extreme heat"
        ],
        
        # SUMMARY
        "summary": f"For {year_desc} cinnamon plant with {deficiency}: Apply {fertilizer_amount}g of {fertilizer['name']} at {ring_distance} from base. Ensure soil pH is 5.5-6.5 and soil is moist before application.",
        
        # LEGACY FIELDS FOR MOBILE APP COMPATIBILITY
        "growth_stage": {
            "stage": year_category,
            "description": f"Cinnamon plant in {year_desc} stage",
            "age_years": plant_age
        },
        "primary_fertilizer": {
            "name": fertilizer["name"],
            "npk_ratio": fertilizer["composition"],
            "dosage": f"{fertilizer_amount}g per plant",
            "dosage_note": f"Based on {nutrient_amount}{nutrient_unit} requirement ({fertilizer_calculation})",
            "frequency": "Apply every 6 months" if plant_age >= 3 else "Apply every 3-4 months",
            "application_method": f"{application['placement']}. {application['coverage']}"
        },
        "application_schedule": {
            "immediate_action_required": immediate_action,
            "first_application": "Within 3-7 days" if immediate_action else "Within 1-2 weeks",
            "ongoing_schedule": "Apply every 6 months" if plant_age >= 3 else "Apply every 3-4 months",
            "best_time": "Early morning or late afternoon to avoid heat stress",
            "weather_conditions": "Apply when soil is moist; avoid rain within 24 hours"
        },
        "organic_alternative": {
            "description": deficiency_info["symptoms"][0] if deficiency_info["symptoms"] else "Organic alternatives available",
            "note": f"Consider organic options based on availability. {deficiency_info.get('extra_note', '')}"
        },
        "expected_results": {
            "improvement_timeline": "Expect visible improvement in 2-4 weeks in new growth",
            "full_recovery": "Complete recovery typically takes 6-8 weeks",
            "monitoring_points": [
                "New leaf color and size",
                "Overall plant vigor",
                "Stem strength",
                "Bark quality (for mature plants)"
            ]
        },
        "additional_care": {
            "watering": "Maintain consistent soil moisture; apply only when soil has sufficient moisture",
            "mulching": "Apply organic mulch after fertilizer application to retain moisture",
            "monitoring": "Check for improvement in new growth after 2-3 weeks",
            "soil_testing": "Maintain soil pH between 5.5-6.5 for optimal nutrient uptake"
        }
    }
    
    return recommendations
    
    # Fertilizer recommendations by deficiency type with exact dosages
    fertilizer_guide = {
        "Nitrogen Deficiency": {
            "primary_nutrient": "Nitrogen (N)",
            "dosages": {
                "year_1": {"amount": 17, "unit": "g N"},
                "year_2": {"amount": 34, "unit": "g N"},
                "year_3_plus": {"amount": 50, "unit": "g N"}
            },
            "fertilizer": {
                "name": "Urea",
                "composition": "46% N",
                "description": "Main nitrogen source for cinnamon cultivation"
            },
            "application_method": {
                "timing": "Apply when soil has sufficient moisture (start or end of rainy season)",
                "placement": "Apply in a ring around the plant (15-30 cm depending on plant age)",
                "coverage": "After applying fertilizer: mulch / lightly water"
            },
            "symptoms": [
                "Yellowing between veins",
                "Pale, thin leaves",
                "Overall poor growth"
            ],
            "extra_note": "Nitrogen deficiency combined with yellow-brown patches may indicate Magnesium deficiency, which can be corrected by Dolomite",
            "organic_alternatives": "Blood meal, fish emulsion, or well-composted manure"
        },
        "Phosphorus Deficiency": {
            "primary_nutrient": "Phosphorus (P)",
            "dosages": {
                "year_1": {"amount": 8, "unit": "g P"},
                "year_2": {"amount": 17, "unit": "g P"},
                "year_3_plus": {"amount": 25, "unit": "g P"}
            },
            "fertilizer": {
                "name": "ERP (Eppawala Rock Phosphate)",
                "composition": "Variable P content (typically 20-30% P₂O₅)",
                "description": "Main phosphorus source, slow-release natural rock phosphate"
            },
            "application_method": {
                "timing": "Apply early in the season because P releases slowly",
                "placement": "Mix lightly with soil for better absorption",
                "coverage": "Maintain soil pH 5.5–6.5 for phosphorus efficiency"
            },
            "symptoms": [
                "Slow growth",
                "Purple or darkened lower leaves",
                "Thin stems"
            ],
            "extra_note": "Phosphorus is slow-release, so early application ensures availability during growth period",
            "organic_alternatives": "Bone meal, rock phosphate from other sources"
        },
        "Potassium Deficiency": {
            "primary_nutrient": "Potassium (K)",
            "dosages": {
                "year_1": {"amount": 8, "unit": "g K"},
                "year_2": {"amount": 17, "unit": "g K"},
                "year_3_plus": {"amount": 25, "unit": "g K"}
            },
            "fertilizer": {
                "name": "MOP (Muriate of Potash)",
                "composition": "60% K₂O",
                "description": "Main potassium source for cinnamon cultivation"
            },
            "application_method": {
                "timing": "Apply during moist conditions only (start/end of rainy season)",
                "placement": "Keep fertilizer 15-30 cm away from the base",
                "coverage": "Avoid applying on dry soil"
            },
            "symptoms": [
                "Brown leaf edges",
                "Leaf scorch",
                "Weak stems",
                "Reduced oil content in cinnamon bark"
            ],
            "extra_note": "Potassium deficiency can significantly reduce the quality and oil content of cinnamon bark",
            "organic_alternatives": "Wood ash, kelp meal, banana peel compost"
        },
        "Magnesium Deficiency": {
            "primary_nutrient": "Magnesium (Mg)",
            "dosages": {
                "year_1": {"amount": 50, "unit": "g"},
                "year_2": {"amount": 75, "unit": "g"},
                "year_3_plus": {"amount": 100, "unit": "g"}
            },
            "fertilizer": {
                "name": "Dolomite",
                "composition": "Contains Ca and Mg",
                "description": "Corrects both Magnesium deficiency and soil acidity"
            },
            "application_method": {
                "timing": "Apply during preparation or early season",
                "placement": "Broadcast around plant and lightly incorporate",
                "coverage": "Also helps maintain optimal soil pH (5.5-6.5)"
            },
            "symptoms": [
                "Yellow-brown patches on leaves",
                "Interveinal chlorosis",
                "Often appears with Nitrogen deficiency"
            ],
            "extra_note": "Often appears together with Nitrogen deficiency symptoms",
            "organic_alternatives": "Epsom salt (foliar spray), dolomitic limestone"
        }
    }
    
    # Get recommendation for this deficiency
    deficiency_info = fertilizer_guide.get(deficiency, fertilizer_guide["Nitrogen Deficiency"])
    
    # Get the appropriate dosage for plant age
    dosage_info = deficiency_info["dosages"][year_category]
    nutrient_amount = dosage_info["amount"]
    nutrient_unit = dosage_info["unit"]
    
    # Get fertilizer details
    fertilizer = deficiency_info["fertilizer"]
    application = deficiency_info["application_method"]
    
    # Calculate actual fertilizer amount based on nutrient content
    # For example: If we need 17g N and Urea is 46% N, we need 17/0.46 = 37g Urea
    if "Urea" in fertilizer["name"]:
        fertilizer_amount = round(nutrient_amount / 0.46)
        fertilizer_calculation = f"{nutrient_amount}g N ÷ 0.46 = {fertilizer_amount}g Urea"
    elif "ERP" in fertilizer["name"] or "Rock Phosphate" in fertilizer["name"]:
        # ERP varies, assume ~25% P₂O₅ which is ~11% P
        fertilizer_amount = round(nutrient_amount / 0.11)
        fertilizer_calculation = f"{nutrient_amount}g P ÷ 0.11 (approx) = {fertilizer_amount}g ERP"
    elif "MOP" in fertilizer["name"] or "Muriate of Potash" in fertilizer["name"]:
        # MOP is 60% K₂O which is ~50% K
        fertilizer_amount = round(nutrient_amount / 0.50)
        fertilizer_calculation = f"{nutrient_amount}g K ÷ 0.50 = {fertilizer_amount}g MOP"
    else:
        fertilizer_amount = nutrient_amount
        fertilizer_calculation = f"{nutrient_amount}{nutrient_unit}"
    
    # Calculate timing based on severity and confidence
    immediate_action = severity == "High" and confidence > 0.7
    
    # Build frequency recommendation
    frequency_map = {
        "year_1": "Every 3-4 months (3 times per year)",
        "year_2": "Every 3-4 months (3 times per year)",
        "year_3_plus": "Every 2-3 months during growing season"
    }
    frequency = frequency_map.get(year_category, "Every 3-4 months")
    
    # Prepare application schedule details
    best_time = "Early morning or late afternoon to avoid heat stress"
    weather_conditions = "Apply when soil is moist, avoid rain within 24 hours"
    
    recommendations = {
        # NEW STRUCTURE (Detailed)
        "plant_information": {
            "age_years": plant_age,
            "year_category": year_desc,
            "ring_distance": ring_distance,
            "description": f"Cinnamon plant in {year_desc} requires specific nutrient management"
        },
        "deficiency_details": {
            "detected_deficiency": deficiency,
            "primary_nutrient": deficiency_info["primary_nutrient"],
            "symptoms": deficiency_info["symptoms"],
            "severity": severity,
            "confidence": confidence
        },
        "fertilizer_recommendation": {
            "fertilizer_name": fertilizer["name"],
            "composition": fertilizer["composition"],
            "description": fertilizer["description"],
            "nutrient_required": f"{nutrient_amount} {nutrient_unit}",
            "fertilizer_amount": f"{fertilizer_amount}g per plant",
            "calculation": fertilizer_calculation
        },
        "application_guidelines": {
            "timing": application["timing"],
            "placement": f"{application['placement']} ({ring_distance} from base)",
            "method": application["coverage"],
            "immediate_action_required": immediate_action,
            "first_application": "Within 3-7 days" if immediate_action else "Within 1-2 weeks",
            "best_time_of_day": best_time
        },
        "important_notes": {
            "moisture_requirement": "Apply only when soil has sufficient moisture",
            "soil_condition": "Never apply on completely dry soil",
            "distance_from_stem": f"Maintain {ring_distance} distance from plant base",
            "after_application": "Mulch or lightly water after fertilizer application",
            "special_note": deficiency_info.get("extra_note", "Follow standard application practices")
        },
        "organic_alternatives": {
            "options": deficiency_info["organic_alternatives"],
            "note": "Organic alternatives release nutrients slowly and improve soil health"
        },
        "monitoring_and_care": {
            "improvement_timeline": "Expect visible improvement in 2-4 weeks in new growth",
            "full_recovery": "Complete recovery typically takes 6-8 weeks",
            "monitor_for": [
                "New leaf color and size",
                "Overall plant vigor",
                "Stem strength",
                "Bark quality (for mature plants)"
            ],
            "soil_ph": "Maintain soil pH between 5.5-6.5 for optimal nutrient uptake",
            "follow_up": "Reapply according to annual fertilizer schedule for your plant's age"
        },
        "warnings": [
            "⚠️ Do not exceed recommended dosage - over-fertilization damages roots",
            "⚠️ Keep fertilizer away from direct contact with stem/trunk",
            "⚠️ Apply only during moist conditions (rainy season start/end)",
            "⚠️ Avoid application during drought or extreme heat",
            f"⚠️ For Year 1 plants, use extra care with gentle application"
        ],
        "seasonal_considerations": {
            "best_season": "Start or end of rainy season",
            "avoid": "Do not apply during heavy rain or drought periods",
            "frequency": "Follow annual fertilizer schedule: typically 2-3 applications per year"
        },
        
        # LEGACY STRUCTURE (For mobile app compatibility)
        "growth_stage": {
            "stage": year_category,
            "description": f"Cinnamon plant in {year_desc} requires specific nutrient management",
            "age_years": plant_age
        },
        "primary_fertilizer": {
            "name": fertilizer["name"],
            "npk_ratio": fertilizer["composition"],
            "dosage": f"{fertilizer_amount}g per plant",
            "dosage_note": f"Based on {nutrient_amount}{nutrient_unit} requirement ({fertilizer_calculation})",
            "frequency": frequency,
            "application_method": f"{application['placement']} ({ring_distance} from base). {application['coverage']}"
        },
        "application_schedule": {
            "immediate_action_required": immediate_action,
            "first_application": "Within 3-7 days" if immediate_action else "Within 1-2 weeks",
            "ongoing_schedule": frequency,
            "best_time": best_time,
            "weather_conditions": weather_conditions
        },
        "organic_alternative": {
            "description": deficiency_info["organic_alternatives"],
            "note": "Organic alternatives release nutrients slowly and improve soil health"
        },
        "additional_care": {
            "watering": "Maintain consistent soil moisture, apply only when soil has sufficient moisture",
            "mulching": f"Apply organic mulch after fertilizer application to retain moisture",
            "monitoring": "Check for improvement in new growth after 2-3 weeks",
            "soil_testing": "Maintain soil pH between 5.5-6.5 for optimal nutrient uptake"
        },
        "expected_results": {
            "improvement_timeline": "Expect visible improvement in 2-4 weeks in new growth",
            "full_recovery": "Complete recovery typically takes 6-8 weeks",
            "monitoring_points": [
                "New leaf color and size",
                "Overall plant vigor",
                "Stem strength",
                "Bark quality (for mature plants)"
            ]
        },
        "deficiency_info": {
            "nutrient": deficiency_info["primary_nutrient"],
            "symptoms": ", ".join(deficiency_info["symptoms"]) if isinstance(deficiency_info["symptoms"], list) else str(deficiency_info["symptoms"]),
            "confidence": confidence
        }
    }
    
    return recommendations


# ============================================================================
# NEW SOIL ANALYSIS ENDPOINTS
# ============================================================================

@router.post("/analyze-soil")
async def analyze_soil_with_roboflow(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    user_id: Optional[int] = None
) -> Dict[str, Any]:
    """
    Analyze soil image using Roboflow soil detection workflow
    
    Detects soil type (sandy, laterite, black) and provides:
    - Soil characteristics
    - Common issues in Sri Lankan cinnamon cultivation
    - Soil improvement recommendations
    - Fertilizer strategy for the soil type
    - Soil lab test recommendations
    
    Args:
        file: Soil image file (JPEG, PNG)
        db: Database session
        user_id: Optional user ID for tracking
        plant_age: Optional plant age for targeted recommendations
        
    Returns:
        Dict containing soil analysis results and recommendations
    """
    try:
        logger.info("🌍 Starting soil type detection with Roboflow")
        logger.info(f"📁 File: {file.filename}, Content-Type: {file.content_type}")
        
        # Check if SDK is available
        if not INFERENCE_SDK_AVAILABLE:
            logger.error("❌ Inference SDK not installed")
            raise HTTPException(
                status_code=503,
                detail="Roboflow Inference SDK not available. Install: pip install inference-sdk"
            )
        
        if not roboflow_client:
            logger.error("❌ Roboflow client not initialized")
            raise HTTPException(
                status_code=503,
                detail="Roboflow service not configured properly"
            )
        
        # Read and validate image
        image_data = await file.read()
        logger.info(f"📊 Image size: {len(image_data)} bytes")
        
        # Validate image format
        try:
            img = Image.open(io.BytesIO(image_data))
            logger.info(f"✅ Valid image: {img.format}, {img.size}")
        except Exception as e:
            logger.error(f"❌ Invalid image file: {e}")
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image file: {str(e)}"
            )
        
        # Save image to disk
        upload_dir = Path("uploads/fertilizer_analysis/soil")
        upload_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"soil_{timestamp}_{file.filename}"
        image_path = upload_dir / safe_filename
        
        with open(image_path, "wb") as f:
            f.write(image_data)
        logger.info(f"💾 Image saved: {image_path}")
        
        # Run Roboflow workflow for soil detection
        logger.info(f"🚀 Running Roboflow workflow: {ROBOFLOW_SOIL_WORKFLOW_ID}")
        result = roboflow_client.run_workflow(
            workspace_name=ROBOFLOW_WORKSPACE,
            workflow_id=ROBOFLOW_SOIL_WORKFLOW_ID,
            images={"image": str(image_path)},
            use_cache=True
        )
        logger.info("✅ Soil detection workflow complete")
        logger.info(f"🔍 Raw result: {result}")
        
        # Parse soil detection result
        parsed_result = parse_soil_detection_result(result)
        soil_type = parsed_result.get("soil_type")
        confidence = parsed_result.get("confidence", 0.0)
        
        logger.info(f"📊 Detected soil type: {soil_type}, Confidence: {confidence}")
        
        # Generate soil recommendations
        recommendations = None
        soil_detected = False
        
        if not soil_type:
            logger.warning("⚠️ No soil type detected")
            soil_type = "unknown"
            confidence = 0.0
            
            # Provide helpful message when soil type not detected
            recommendations = {
                "error": "Soil type not detected",
                "message": "Unable to detect soil type from the image",
                "suggestions": [
                    "Ensure the image clearly shows the soil surface",
                    "Remove any plant matter or debris from the soil",
                    "Take the photo in good lighting conditions",
                    "Capture a close-up view of the soil texture",
                    "Try taking another photo with better visibility of soil characteristics"
                ],
                "alternative_action": "Consider getting a professional soil lab test for accurate soil type identification"
            }
        else:
            soil_detected = True
            recommendations = generate_soil_recommendations(
                soil_type=soil_type,
                confidence=confidence,
                plant_age=None
            )
            logger.info("✅ Generated soil recommendations")
        
        # Save to database
        history_data = {
            "analysis_flow": "soil_only",
            "soil_type": soil_type if soil_detected else None,
            "soil_confidence": confidence if soil_detected else 0.0,
            "soil_image_path": str(image_path),
            "user_id": user_id,
            "recommendations": recommendations if soil_detected else None
        }
        
        history_record = FertilizerHistory(**history_data)
        db.add(history_record)
        db.commit()
        db.refresh(history_record)
        logger.info(f"💾 Saved to database: ID={history_record.id}")
        
        return {
            "success": soil_detected,
            "message": "Soil analysis completed successfully" if soil_detected else "Soil type not detected",
            "analysis_flow": "soil_only",
            "soil_type": soil_type if soil_detected else None,
            "soil_detected": soil_detected,
            "confidence": confidence,
            "soil_characteristics": recommendations.get("soil_characteristics") if soil_detected and recommendations else None,
            "soil_improvement_actions": recommendations.get("soil_improvement_actions") if soil_detected and recommendations else None,
            "recommendations": recommendations,
            "recommend_soil_lab_test": True,
            "option_to_proceed": "You can now proceed with leaf analysis for comprehensive results" if soil_detected else "Please try again with a clearer soil image",
            "history_id": history_record.id,
            "roboflow_output": result,
            "debug_info": parsed_result if not soil_detected else None,
            "metadata": {
                "filename": file.filename,
                "content_type": file.content_type,
                "workflow_id": ROBOFLOW_SOIL_WORKFLOW_ID
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Soil analysis failed: {e}")
        import traceback
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Soil analysis failed: {str(e)}"
        )


@router.post("/analyze-combined")
async def analyze_combined(
    leaf_file: UploadFile = File(..., description="Leaf image"),
    soil_file: UploadFile = File(..., description="Soil image"),
    db: Session = Depends(get_session),
    user_id: Optional[int] = None,
    plant_age: int = Query(1, ge=1, description="Plant age in years")
) -> Dict[str, Any]:
    """
    Combined leaf + soil analysis with cross-validation
    
    Performs both leaf deficiency detection and soil type detection,
    then provides cross-validated recommendations considering both factors.
    
    Benefits:
    - Enhanced confidence through cross-validation
    - Integrated fertilizer + soil amendment plan
    - Context-aware recommendations based on soil type
    - Identifies inconsistencies between leaf symptoms and soil type
    
    Args:
        leaf_file: Leaf image file
        soil_file: Soil image file
        db: Database session
        user_id: Optional user ID
        plant_age: Plant age in years
        
    Returns:
        Dict with comprehensive combined analysis and recommendations
    """
    try:
        logger.info("🔬 Starting combined leaf + soil analysis")
        
        # Check if SDK is available
        if not INFERENCE_SDK_AVAILABLE or not roboflow_client:
            raise HTTPException(
                status_code=503,
                detail="Roboflow service not available"
            )
        
        # === STEP 1: Analyze Leaf ===
        logger.info("🍃 Step 1: Analyzing leaf image")
        leaf_data = await leaf_file.read()
        
        # Validate leaf image
        try:
            img = Image.open(io.BytesIO(leaf_data))
            logger.info(f"✅ Valid leaf image: {img.format}, {img.size}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid leaf image: {str(e)}")
        
        # Save leaf image
        upload_dir = Path("uploads/fertilizer_analysis/combined")
        upload_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        leaf_path = upload_dir / f"leaf_{timestamp}_{leaf_file.filename}"
        
        with open(leaf_path, "wb") as f:
            f.write(leaf_data)
        
        # Run leaf analysis
        leaf_result = roboflow_client.run_workflow(
            workspace_name=ROBOFLOW_WORKSPACE,
            workflow_id=ROBOFLOW_WORKFLOW_ID,
            images={"image": str(leaf_path)},
            use_cache=True
        )
        logger.info("✅ Leaf analysis complete")
        
        # Parse leaf detections (reuse existing logic)
        detections = []
        primary_deficiency = None
        max_confidence = 0.0
        severity = None
        
        # Parse the leaf result (simplified version)
        if isinstance(leaf_result, list) and len(leaf_result) > 0:
            result_item = leaf_result[0]
            if isinstance(result_item, dict):
                for key in ['predictions', 'output', 'result']:
                    if key in result_item:
                        pred_data = result_item[key]
                        if isinstance(pred_data, dict):
                            if 'top' in pred_data:
                                primary_deficiency = pred_data['top']
                                max_confidence = pred_data.get('confidence', 0.0)
                                severity = 'High' if max_confidence > 0.8 else 'Medium' if max_confidence > 0.5 else 'Low'
                                break
        
        if not primary_deficiency:
            primary_deficiency = "Unknown"
            max_confidence = 0.0
            severity = "Low"
        
        logger.info(f"📊 Leaf: {primary_deficiency}, Confidence: {max_confidence}")
        
        # Generate leaf recommendations
        leaf_recommendations = generate_recommendations(
            deficiency=primary_deficiency,
            severity=severity,
            plant_age=plant_age,
            confidence=max_confidence
        )
        
        # === STEP 2: Analyze Soil ===
        logger.info("🌍 Step 2: Analyzing soil image")
        soil_data = await soil_file.read()
        
        # Validate soil image
        try:
            img = Image.open(io.BytesIO(soil_data))
            logger.info(f"✅ Valid soil image: {img.format}, {img.size}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid soil image: {str(e)}")
        
        # Save soil image
        soil_path = upload_dir / f"soil_{timestamp}_{soil_file.filename}"
        with open(soil_path, "wb") as f:
            f.write(soil_data)
        
        # Run soil analysis
        soil_result = roboflow_client.run_workflow(
            workspace_name=ROBOFLOW_WORKSPACE,
            workflow_id=ROBOFLOW_SOIL_WORKFLOW_ID,
            images={"image": str(soil_path)},
            use_cache=True
        )
        logger.info("✅ Soil analysis complete")
        
        # Parse soil result
        parsed_soil = parse_soil_detection_result(soil_result)
        soil_type = parsed_soil.get("soil_type")
        soil_confidence = parsed_soil.get("confidence", 0.0)
        soil_detected = bool(soil_type)
        
        if not soil_type:
            logger.warning("⚠️ Soil type not detected in combined analysis")
            soil_type = "unknown"
            soil_confidence = 0.0
        
        logger.info(f"📊 Soil: {soil_type}, Confidence: {soil_confidence}, Detected: {soil_detected}")
        
        # === STEP 3: Generate Combined Analysis ===
        logger.info("🔬 Step 3: Generating combined analysis")
        
        leaf_analysis = {
            "primary_deficiency": primary_deficiency,
            "confidence": max_confidence,
            "severity": severity,
            "recommendations": leaf_recommendations
        }
        
        soil_analysis = {
            "soil_type": soil_type if soil_detected else None,
            "confidence": soil_confidence
        }
        
        # Generate detailed soil info if soil was detected
        soil_details = None
        if soil_detected and soil_type in SOIL_TYPE_DATA:
            soil_data = SOIL_TYPE_DATA[soil_type]
            soil_details = {
                "soil_type": soil_data["display_name"],
                "confidence": round(soil_confidence * 100, 1),
                "confidence_level": "High" if soil_confidence > 0.8 else "Medium" if soil_confidence > 0.5 else "Low",
                "characteristics": soil_data["characteristics"],
                "common_issues": soil_data["common_issues_in_sri_lanka"],
                "improvement_actions": soil_data["improvement_actions"],
                "recommendations": soil_data["recommendations"]
            }
        
        # Only generate combined analysis if soil was detected
        if soil_detected:
            combined_recommendations = generate_combined_analysis(
                leaf_analysis=leaf_analysis,
                soil_analysis=soil_analysis,
                plant_age=plant_age
            )
        else:
            # Provide leaf-only recommendations with soil detection failure notice
            combined_recommendations = {
                "analysis_summary": {
                    "detected_deficiency": primary_deficiency,
                    "deficiency_confidence": round(max_confidence * 100, 1),
                    "detected_soil_type": "Not detected",
                    "soil_confidence": 0.0,
                    "combined_confidence": round(max_confidence * 100, 1),
                    "confidence_level": severity
                },
                "leaf_treatment_plan": leaf_recommendations,
                "soil_analysis_note": {
                    "status": "Soil type not detected",
                    "message": "Unable to detect soil type from the provided image",
                    "recommendation": "Consider retaking the soil image with better visibility, or proceed with leaf treatment and get a professional soil lab test"
                },
                "fertilizer_and_soil_amendment_plan": {
                    "note": "Soil-specific plan not available due to detection failure",
                    "general_advice": "Follow leaf deficiency treatment recommendations and consider getting a soil lab test for comprehensive soil analysis"
                },
                "soil_lab_test_recommendation": {
                    "priority": "High",
                    "reason": "Soil type detection failed - professional soil testing strongly recommended",
                    "test_parameters": ["pH", "NPK levels", "Organic matter", "Calcium", "Magnesium", "Micronutrients"]
                }
            }
        
        # === STEP 4: Save to Database ===
        history_data = {
            "analysis_flow": "combined",
            "primary_deficiency": primary_deficiency,
            "severity": severity,
            "confidence": max_confidence,
            "image_path": str(leaf_path),
            "soil_type": soil_type,
            "soil_confidence": soil_confidence,
            "soil_image_path": str(soil_path),
            "user_id": user_id,
            "plant_age": plant_age,
            "recommendations": combined_recommendations
        }
        
        history_record = FertilizerHistory(**history_data)
        db.add(history_record)
        db.commit()
        db.refresh(history_record)
        logger.info(f"💾 Saved combined analysis: ID={history_record.id}")
        
        return {
            "success": True,
            "message": "Combined analysis completed successfully",
            "analysis_flow": "combined",
            
            # Leaf results
            "leaf_analysis": {
                "detected_deficiency": primary_deficiency,
                "confidence": round(max_confidence * 100, 1),
                "severity": severity,
                "recommendations": leaf_recommendations
            },
            
            # Soil results (detailed)
            "soil_analysis": soil_details if soil_details else {
                "soil_type": "Not detected",
                "confidence": 0.0,
                "confidence_level": "None",
                "message": "Unable to detect soil type from the provided image"
            },
            
            # Combined insights
            "combined_confidence": round((max_confidence + soil_confidence) / 2 * 100, 1),
            "cross_validated_recommendation": combined_recommendations,
            
            # Action items
            "fertilizer_and_soil_amendment_plan": combined_recommendations.get("fertilizer_and_soil_amendment_plan"),
            "soil_lab_test_recommendation": combined_recommendations.get("soil_lab_test_recommendation"),
            
            "history_id": history_record.id,
            "metadata": {
                "leaf_filename": leaf_file.filename,
                "soil_filename": soil_file.filename,
                "plant_age": plant_age,
                "timestamp": timestamp
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Combined analysis failed: {e}")
        import traceback
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Combined analysis failed: {str(e)}"
        )


@router.get("/analysis-options")
async def get_analysis_options() -> Dict[str, Any]:
    """
    Get available analysis flow options
    
    Returns information about the three analysis approaches:
    - Leaf Analysis Only
    - Soil Analysis Only
    - Combined Leaf + Soil Analysis
    """
    return {
        "success": True,
        "analysis_options": [
            {
                "id": "leaf_only",
                "name": "Leaf Analysis Only",
                "description": "Detect NPK deficiencies from leaf images",
                "endpoint": "/fertilizer/roboflow/analyze",
                "outputs": [
                    "Detected NPK Deficiency",
                    "Fertilizer Recommendation",
                    "Confidence Level",
                    "Option to Proceed with Soil Analysis"
                ],
                "requires": ["leaf_image", "plant_age"]
            },
            {
                "id": "soil_only",
                "name": "Soil Analysis Only",
                "description": "Detect soil type and get soil-specific recommendations",
                "endpoint": "/fertilizer/roboflow/analyze-soil",
                "outputs": [
                    "Detected Soil Type",
                    "Soil Characteristics",
                    "Soil Improvement Actions",
                    "Recommendation to Perform Soil Lab Test",
                    "Option to Proceed with Leaf Analysis"
                ],
                "requires": ["soil_image", "plant_age (optional)"]
            },
            {
                "id": "combined",
                "name": "Leaf + Soil Combined Analysis",
                "description": "Comprehensive analysis with cross-validation",
                "endpoint": "/fertilizer/roboflow/analyze-combined",
                "outputs": [
                    "Detected Soil Type",
                    "Detected NPK Deficiency",
                    "Cross-validated Recommendation",
                    "Enhanced Confidence Level",
                    "Integrated Fertilizer + Soil Amendment Plan",
                    "Soil Lab Test Recommendation (If Required)"
                ],
                "requires": ["leaf_image", "soil_image", "plant_age"]
            }
        ],
        "soil_types_detected": [
            {
                "id": "sandy_soil",
                "name": "Sandy Soil",
                "characteristics": "Low nutrient retention, high drainage",
                "common_issues": "Nitrogen deficiency, low moisture retention"
            },
            {
                "id": "laterite_soil",
                "name": "Laterite Soil",
                "characteristics": "Acidic pH, iron/aluminum rich",
                "common_issues": "Phosphorus fixation, magnesium deficiency"
            },
            {
                "id": "black_soil",
                "name": "Black Soil",
                "characteristics": "High clay content, high water retention",
                "common_issues": "Waterlogging, root rot risk"
            }
        ]
    }