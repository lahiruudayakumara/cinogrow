"""
Simplified Roboflow Fertilizer Detection Router
Using official Roboflow Inference SDK for reliable workflow execution
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any
import logging
import os
from dotenv import load_dotenv
from PIL import Image
import io

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
async def analyze_leaf_with_roboflow(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Analyze leaf image using Roboflow Inference SDK
    
    Uses the official inference-sdk for reliable workflow execution.
    The SDK handles authentication and API communication automatically.
    
    Args:
        file: Leaf image file (JPEG, PNG)
        
    Returns:
        Dict containing Roboflow workflow output
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
        
        # Return formatted response
        return {
            "success": True,
            "message": "Roboflow analysis completed successfully",
            "roboflow_output": result,
            "metadata": {
                "filename": file.filename,
                "content_type": file.content_type,
                "size_bytes": len(image_bytes),
                "image_dimensions": f"{image.size[0]}x{image.size[1]}",
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
