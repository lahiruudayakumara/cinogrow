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
from app.database import get_db
from app.models.fertilizer_history import (
    FertilizerHistory,
    FertilizerHistoryCreate,
    FertilizerHistoryResponse
)

# Import Roboflow Inference SDK
try:
    from inference_sdk import InferenceHTTPClient
    INFERENCE_SDK_AVAILABLE = True
except ImportError:
    INFERENCE_SDK_AVAILABLE = False
    logging.warning("⚠️ inference-sdk not installed. Run: pip install inference-sdk")

# Load environment variables
load_dotenv()

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
    db: Session = Depends(get_db),
    user_id: Optional[int] = None
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
        
        # Save to database (simplified)
        try:
            logger.info(f"💾 Saving to database: deficiency={primary_deficiency}, confidence={max_confidence}, severity={severity}")
            
            history_record = FertilizerHistory(
                deficiency=primary_deficiency,
                confidence=max_confidence,
                severity=severity,
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
    db: Session = Depends(get_db),
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db),
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
    Following official cinnamon cultivation guidelines for N, P, K deficiencies
    """
    
    # Determine plant year category for dosage
    if plant_age == 1:
        year_category = "year_1"
        year_desc = "Year 1"
        ring_distance = "15 cm"
    elif plant_age == 2:
        year_category = "year_2"
        year_desc = "Year 2"
        ring_distance = "20 cm"
    else:  # 3+ years
        year_category = "year_3_plus"
        year_desc = "Year 3+"
        ring_distance = "30 cm"
    
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