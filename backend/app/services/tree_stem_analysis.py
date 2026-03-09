"""
Tree Stem Analysis Service using Roboflow
Analyzes tree images to detect stem count and circumference using Roboflow Workflow
"""

from typing import Dict, Any, List, Optional
import logging
import os
import math
import requests
from dotenv import load_dotenv

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
logger = logging.getLogger(__name__)

# Roboflow configuration for tree stem analysis
TREE_ANALYSIS_ROBOFLOW_API_KEY = os.getenv('TREE_ANALYSIS_ROBOFLOW_API_KEY', os.getenv('ROBOFLOW_API_KEY', ''))
TREE_ANALYSIS_ROBOFLOW_WORKSPACE = os.getenv('TREE_ANALYSIS_ROBOFLOW_WORKSPACE', 'cinogrow')
TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID = os.getenv('TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID', 'custom-workflow-3')

# Harvest threshold in inches
HARVEST_THRESHOLD = 5.0  # inches

# Pixel to inch conversion factor
# Calibrated using actual field measurement
PIXEL_TO_INCH_CONVERSION = float(
    os.getenv('TREE_ANALYSIS_PIXEL_TO_INCH', '0.012')
)

# IoU threshold for filtering duplicate detections via Non-Maximum Suppression (NMS)
NMS_IOU_THRESHOLD = float(
    os.getenv('TREE_ANALYSIS_NMS_IOU_THRESHOLD', '0.5')
)

# Debug: Log configuration (mask API key for security)
if TREE_ANALYSIS_ROBOFLOW_API_KEY:
    masked_key = f"{TREE_ANALYSIS_ROBOFLOW_API_KEY[:10]}...{TREE_ANALYSIS_ROBOFLOW_API_KEY[-5:]}" if len(TREE_ANALYSIS_ROBOFLOW_API_KEY) > 15 else "***"
    logger.info(f"🔑 Tree Analysis API Key loaded: {masked_key}")
    logger.info(f"🏢 Workspace: {TREE_ANALYSIS_ROBOFLOW_WORKSPACE}")
    logger.info(f"📏 Pixel-to-Inch Conversion: {PIXEL_TO_INCH_CONVERSION} inches/pixel")
    logger.info(f"⚙️  Workflow ID: {TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID}")
else:
    logger.warning("⚠️  TREE_ANALYSIS_ROBOFLOW_API_KEY not found in environment!")

# Initialize Roboflow client
tree_analysis_client = None
if INFERENCE_SDK_AVAILABLE and TREE_ANALYSIS_ROBOFLOW_API_KEY:
    try:
        tree_analysis_client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=TREE_ANALYSIS_ROBOFLOW_API_KEY
        )
        logger.info("✅ Tree Analysis Roboflow client initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Tree Analysis Roboflow client: {e}")
        tree_analysis_client = None


class TreeStemAnalysisService:
    """Service for analyzing tree images to extract stem count and circumference"""
    
    @staticmethod
    def is_available() -> bool:
        """Check if the service is available"""
        return bool(TREE_ANALYSIS_ROBOFLOW_API_KEY) and INFERENCE_SDK_AVAILABLE
    
    @staticmethod
    async def analyze_tree_image_sdk(image_path: str) -> Dict[str, Any]:
        """
        Analyze tree image using Roboflow Inference SDK's run_workflow method
        """
        if not INFERENCE_SDK_AVAILABLE:
            raise RuntimeError("inference-sdk not installed. Run: pip install inference-sdk")
            
        if not TREE_ANALYSIS_ROBOFLOW_API_KEY:
            raise ValueError("Tree analysis API key not configured")
        
        try:
            logger.info(f"🌳 SDK Workflow: Analyzing tree image: {image_path}")
            
            # Verify image exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            file_size = os.path.getsize(image_path)
            logger.info(f"📊 Image file size: {file_size} bytes")
            
            # Initialize client
            client = InferenceHTTPClient(
                api_url="https://serverless.roboflow.com",
                api_key=TREE_ANALYSIS_ROBOFLOW_API_KEY
            )
            
            # Run workflow
            logger.info(f"📤 Running workflow: {TREE_ANALYSIS_ROBOFLOW_WORKSPACE}/{TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID}")
            result = client.run_workflow(
                workspace_name=TREE_ANALYSIS_ROBOFLOW_WORKSPACE,
                workflow_id=TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID,
                images={"image": image_path},
                use_cache=True
            )
            
            logger.info(f"📊 Workflow result type: {type(result)}")
            logger.info(f"📊 Workflow result: {result}")
            
            # Parse the results
            parsed = TreeStemAnalysisService._parse_workflow_output(result)
            
            logger.info(f"✅ Parsed results: total={parsed['total_stems_detected']}, harvestable={parsed['harvestable_stems']}")
            
            return {
                "success": True,
                "total_stems_detected": parsed["total_stems_detected"],
                "harvestable_stems": parsed["harvestable_stems"],
                "individual_stems": parsed["individual_stems"],
                "raw_response": result
            }
            
        except Exception as e:
            logger.error(f"❌ SDK workflow analysis failed: {str(e)}", exc_info=True)
            raise RuntimeError(f"Tree stem analysis failed: {str(e)}")
    
    @staticmethod
    async def analyze_tree_image_direct(image_path: str) -> Dict[str, Any]:
        """
        Analyze tree image using direct HTTP API call (alternative to SDK)
        This matches the cURL example format exactly
        """
        if not TREE_ANALYSIS_ROBOFLOW_API_KEY:
            raise ValueError("Tree analysis API key not configured")
        
        try:
            logger.info(f"🌳 Direct API: Analyzing tree image: {image_path}")
            
            # Verify image exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            file_size = os.path.getsize(image_path)
            logger.info(f"📊 Image file size: {file_size} bytes")
            
            # Prepare the direct API call
            api_url = f"https://serverless.roboflow.com/{TREE_ANALYSIS_ROBOFLOW_WORKSPACE}/{TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID}"
            logger.info(f"🔧 API URL: {api_url}")
            
            # Debug: Log API key being used (masked)
            if TREE_ANALYSIS_ROBOFLOW_API_KEY:
                masked_key = f"{TREE_ANALYSIS_ROBOFLOW_API_KEY[:10]}...{TREE_ANALYSIS_ROBOFLOW_API_KEY[-5:]}"
                logger.info(f"🔑 Using API Key: {masked_key}")
            else:
                logger.error(f"❌ API KEY IS EMPTY!")
            
            # Send request with api_key as query parameter and file field
            # (This is the correct format for Roboflow workflow API)
            with open(image_path, 'rb') as f:
                params = {'api_key': TREE_ANALYSIS_ROBOFLOW_API_KEY}
                files = {'file': (os.path.basename(image_path), f, 'image/jpeg')}
                
                logger.info(f"📤 Sending request to Roboflow...")
                response = requests.post(api_url, params=params, files=files, timeout=30)
            
            logger.info(f"📊 Response status: {response.status_code}")
            
            if not response.ok:
                error_text = response.text
                logger.error(f"❌ Roboflow API error: {error_text}")
                raise Exception(f"Roboflow API failed: {response.status_code} - {error_text}")
            
            result = response.json()
            logger.info(f"✅ Direct API workflow completed")
            logger.info(f"📦 Raw result: {result}")
            
            # Parse the result
            analysis = TreeStemAnalysisService._parse_workflow_output(result)
            
            return {
                "success": True,
                "total_stems_detected": analysis["total_stems_detected"],
                "harvestable_stems": analysis["harvestable_stems"],
                "individual_stems": analysis["individual_stems"],
                "raw_output": result
            }
            
        except Exception as e:
            logger.error(f"❌ Direct API analysis failed: {e}")
            raise
    
    @staticmethod
    async def analyze_tree_image(image_path: str) -> Dict[str, Any]:
        """
        Analyze a tree image to detect stem count and circumference
        
        Args:
            image_path: Path to the tree image file
            
        Returns:
            Dict containing:
                - total_stems_detected: Total number of stems detected
                - harvestable_stems: Number of stems meeting harvest threshold
                - individual_stems: List of individual stem measurements with harvestable flag
                - raw_output: Complete Roboflow workflow output
        """
        if not tree_analysis_client:
            raise ValueError("Tree analysis client not initialized. Check TREE_ANALYSIS_ROBOFLOW_API_KEY configuration.")
        
        try:
            logger.info(f"🌳 Analyzing tree image: {image_path}")
            
            # Verify image exists and log its properties
            import os
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            file_size = os.path.getsize(image_path)
            logger.info(f"📊 Image file size: {file_size} bytes")
            
            # Run Roboflow workflow with explicit parameters
            logger.info(f"🔧 Calling workflow: {TREE_ANALYSIS_ROBOFLOW_WORKSPACE}/{TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID}")
            logger.info(f"🔧 Image path: {image_path}")
            
            result = tree_analysis_client.run_workflow(
                workspace_name=TREE_ANALYSIS_ROBOFLOW_WORKSPACE,
                workflow_id=TREE_ANALYSIS_ROBOFLOW_WORKFLOW_ID,
                images={
                    "image": image_path
                },
                use_cache=False  # Disable cache to ensure fresh results
            )
            
            logger.info(f"✅ Roboflow workflow completed")
            logger.info(f"📦 Raw result type: {type(result)}")
            logger.info(f"📦 Raw result: {result}")
            
            # Parse results from workflow
            analysis = TreeStemAnalysisService._parse_workflow_output(result)
            
            return {
                "success": True,
                "total_stems_detected": analysis["total_stems_detected"],
                "harvestable_stems": analysis["harvestable_stems"],
                "individual_stems": analysis["individual_stems"],
                "raw_output": result
            }
            
        except Exception as e:
            logger.error(f"❌ Tree image analysis failed: {e}")
            raise
    
    @staticmethod
    def _calculate_iou(box1: Dict[str, Any], box2: Dict[str, Any]) -> float:
        """
        Calculate Intersection over Union (IoU) between two bounding boxes.
        Boxes have center coordinates (x, y) and dimensions (width, height).
        """
        x1, y1, w1, h1 = box1['x'], box1['y'], box1['width'], box1['height']
        x2, y2, w2, h2 = box2['x'], box2['y'], box2['width'], box2['height']
        
        # Convert to corner coordinates
        left1, top1 = x1 - w1/2, y1 - h1/2
        right1, bottom1 = x1 + w1/2, y1 + h1/2
        left2, top2 = x2 - w2/2, y2 - h2/2
        right2, bottom2 = x2 + w2/2, y2 + h2/2
        
        # Calculate intersection
        inter_left = max(left1, left2)
        inter_top = max(top1, top2)
        inter_right = min(right1, right2)
        inter_bottom = min(bottom1, bottom2)
        
        inter_width = max(0, inter_right - inter_left)
        inter_height = max(0, inter_bottom - inter_top)
        inter_area = inter_width * inter_height
        
        # Calculate union
        area1 = w1 * h1
        area2 = w2 * h2
        union_area = area1 + area2 - inter_area
        
        return inter_area / union_area if union_area > 0 else 0.0
    
    @staticmethod
    def _filter_duplicate_detections(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter duplicate/overlapping detections using Non-Maximum Suppression (NMS).
        Keeps the detection with highest confidence when IoU > threshold.
        """
        if len(detections) <= 1:
            return detections
        
        # Sort by confidence (highest first)
        sorted_dets = sorted(detections, key=lambda d: d.get('confidence', 0), reverse=True)
        
        filtered = []
        for det in sorted_dets:
            # Check if this detection overlaps significantly with any kept detection
            is_duplicate = False
            for kept in filtered:
                iou = TreeStemAnalysisService._calculate_iou(det, kept)
                if iou > NMS_IOU_THRESHOLD:
                    logger.info(f"🚫 Filtering duplicate: width={det.get('width')}px (IoU={iou:.2f} with width={kept.get('width')}px)")
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                filtered.append(det)
        
        logger.info(f"📊 NMS: {len(detections)} detections → {len(filtered)} unique stems (removed {len(detections) - len(filtered)} duplicates)")
        return filtered
    
    @staticmethod
    def _parse_workflow_output(workflow_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the Roboflow workflow output to extract stem measurements
        
        Expected workflow output format:
        [
          {
            "predictions": {
              "image": {"width": 1536, "height": 2048},
              "predictions": [
                {
                  "width": 303,
                  "height": 2038,
                  "x": 509.5,
                  "y": 1027,
                  "confidence": 0.9584445953369141,
                  "class_id": 0,
                  "class": "cinnamon_stem",
                  "detection_id": "...",
                  "parent_id": "image"
                },
                ...
              ]
            }
          }
        ]
        
        Args:
            workflow_output: Raw output from Roboflow workflow
            
        Returns:
            Dict with total_stems_detected, harvestable_stems, and individual_stems
        """
        individual_stems = []
        harvestable_count = 0
        total_stems = 0

        try:
            logger.info(f"🔍 Parsing workflow output type: {type(workflow_output)}")
            logger.info(f"🔍 Workflow output: {workflow_output}")
            
            detections = workflow_output[0]["predictions"]["predictions"]

            logger.info(f"🔍 Found {len(detections)} raw stem detections")
            
            # Log raw detection data for debugging
            for idx, det in enumerate(detections, 1):
                logger.info(f"🔍 Raw stem {idx}: width={det.get('width')}px, height={det.get('height')}px, "
                           f"x={det.get('x')}, y={det.get('y')}, conf={det.get('confidence'):.2f}")
            
            # Apply Non-Maximum Suppression to filter duplicate/overlapping detections
            detections = TreeStemAnalysisService._filter_duplicate_detections(detections)

            total_stems = len(detections)

            for idx, detection in enumerate(detections, 1):
                width_pixels = float(detection.get("width", 0))
                height_pixels = float(detection.get("height", 0))
                confidence = float(detection.get("confidence", 0))

                # Convert pixel width to diameter in inches
                diameter_inches = width_pixels * PIXEL_TO_INCH_CONVERSION
                
                # Convert diameter to circumference (C = π * d)
                circumference_inches = math.pi * diameter_inches

                logger.info(f"📏 Stem {idx}: {width_pixels:.1f}px → {diameter_inches:.2f}\" diameter → {circumference_inches:.2f}\" circumference")

                is_harvestable = circumference_inches >= HARVEST_THRESHOLD

                if is_harvestable:
                    harvestable_count += 1

                individual_stems.append({
                    "circumference_inches": round(circumference_inches, 2),
                    "diameter_inches": round(diameter_inches, 2),
                    "width_pixels": round(width_pixels, 1),
                    "height_pixels": round(height_pixels, 1),
                    "confidence": round(confidence, 2),
                    "harvestable": is_harvestable
                })
            
            logger.info(f"📊 Parsed: {total_stems} total stems, {harvestable_count} harvestable (>= {HARVEST_THRESHOLD} inches)")

        except (KeyError, IndexError, TypeError) as e:
            logger.error(f"❌ Failed to parse workflow output: {e}")
            return {
                "total_stems_detected": 0,
                "harvestable_stems": 0,
                "individual_stems": []
            }

        return {
            "total_stems_detected": total_stems,
            "harvestable_stems": harvestable_count,
            "individual_stems": individual_stems
        }
    
    @staticmethod
    async def analyze_multiple_tree_images(
        image_paths: List[str]
    ) -> Dict[str, Any]:
        """
        Analyze multiple tree images and aggregate results
        
        Args:
            image_paths: List of paths to tree images (typically 3 images)
            
        Returns:
            Aggregated analysis with average measurements
        """
        if not image_paths:
            raise ValueError("No images provided")
        
        logger.info(f"🌳 Analyzing {len(image_paths)} tree images")
        
        all_results = []
        total_stems_detected = 0
        total_harvestable = 0
        all_individual_stems = []
        
        for idx, image_path in enumerate(image_paths, 1):
            try:
                result = await TreeStemAnalysisService.analyze_tree_image(image_path)
                all_results.append(result)
                
                total_stems_detected += result["total_stems_detected"]
                total_harvestable += result["harvestable_stems"]
                all_individual_stems.extend(result["individual_stems"])
                
                logger.info(f"✅ Image {idx}/{len(image_paths)}: {result['total_stems_detected']} stems detected, {result['harvestable_stems']} harvestable")
                
            except Exception as e:
                logger.error(f"❌ Failed to analyze image {idx}: {e}")
                # Continue with other images
                continue
        
        if not all_results:
            raise ValueError("Failed to analyze any images")
        
        # Calculate averages
        avg_total_stems = round(total_stems_detected / len(all_results))
        avg_harvestable = round(total_harvestable / len(all_results))
        
        # Calculate average confidence from all stems
        all_confidences = [s["confidence"] for s in all_individual_stems if "confidence" in s]
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
        
        return {
            "success": True,
            "images_analyzed": len(all_results),
            "average_total_stems": avg_total_stems,
            "average_harvestable_stems": avg_harvestable,
            "total_stems_detected": total_stems_detected,
            "total_harvestable_stems": total_harvestable,
            "overall_confidence": round(avg_confidence, 2),
            "individual_results": all_results,
            "all_stems": all_individual_stems
        }


# Export service instance
tree_stem_analysis_service = TreeStemAnalysisService()
