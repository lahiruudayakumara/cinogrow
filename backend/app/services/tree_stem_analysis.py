"""
Tree Stem Analysis Service using Roboflow
Analyzes tree images to detect stem count and circumference using Roboflow Workflow
"""

from typing import Dict, Any, List, Optional
import logging
import os
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

# Pixel to inch conversion factor
# Calibrated using actual field measurement: 

PIXEL_TO_INCH_CONVERSION = float(os.getenv('TREE_ANALYSIS_PIXEL_TO_INCH', '0.00355'))

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
            parsed['raw_response'] = result
            
            logger.info(f"✅ Parsed results: stem_count={parsed['stem_count']}, circumference={parsed['stem_circumference_inches']}")
            
            return parsed
            
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
                "stem_count": analysis["stem_count"],
                "stem_circumference_inches": analysis["stem_circumference_inches"],
                "confidence": analysis["confidence"],
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
                - stem_count: Number of stems detected
                - stem_circumference_inches: Average circumference in inches
                - confidence: Overall confidence score
                - individual_stems: List of individual stem measurements
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
                "stem_count": analysis["stem_count"],
                "stem_circumference_inches": analysis["stem_circumference_inches"],
                "confidence": analysis["confidence"],
                "individual_stems": analysis["individual_stems"],
                "raw_output": result
            }
            
        except Exception as e:
            logger.error(f"❌ Tree image analysis failed: {e}")
            raise
    
    @staticmethod
    def _parse_workflow_output(workflow_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the Roboflow workflow output to extract stem measurements
        
        The workflow should output:
        - Number of stems detected
        - Individual stem circumferences (in pixels or real measurements)
        - Confidence scores
        
        Args:
            workflow_output: Raw output from Roboflow workflow
            
        Returns:
            Parsed analysis with stem_count, circumference, etc.
        """
        try:
            # Default values
            stem_count = 0
            individual_stems = []
            total_circumference = 0.0
            confidence = 0.0
            
            logger.info(f"🔍 Parsing workflow output type: {type(workflow_output)}")
            logger.info(f"🔍 Workflow output: {workflow_output}")
            
            # Handle custom-workflow-3 output format
            # Output is a list with a dict containing "average cane width" and "stem count"
            if isinstance(workflow_output, list) and len(workflow_output) > 0:
                data = workflow_output[0]
                logger.info(f"🔍 Data extracted: {data}")
                logger.info(f"🔍 Keys in data: {data.keys() if isinstance(data, dict) else 'not a dict'}")
                
                # Extract stem count - handle nested arrays or direct value
                if "stem count" in data:
                    stem_count_data = data["stem count"]
                    logger.info(f"🔍 stem_count_data type: {type(stem_count_data)}, value: {stem_count_data}")
                    
                    # Handle direct integer value
                    if isinstance(stem_count_data, (int, float)):
                        stem_count = int(stem_count_data)
                        logger.info(f"✅ Extracted stem_count (direct): {stem_count}")
                    # Handle various nesting levels in arrays
                    elif isinstance(stem_count_data, list) and len(stem_count_data) > 0:
                        # Could be [7] or [[7]] or [[[7]]]
                        temp = stem_count_data[0]
                        logger.info(f"🔍 stem_count_data[0] type: {type(temp)}, value: {temp}")
                        
                        # Keep unwrapping until we get a number
                        while isinstance(temp, list) and len(temp) > 0:
                            temp = temp[0]
                            logger.info(f"🔍 Unwrapped to type: {type(temp)}, value: {temp}")
                        
                        stem_count = int(temp) if temp is not None else 0
                        logger.info(f"✅ Extracted stem_count (from array): {stem_count}")
                
                # Extract individual cane widths (misnamed as "average cane width")
                # This is actually an array of individual stem widths
                if "average cane width" in data:
                    cane_width_data = data["average cane width"]
                    logger.info(f"🔍 cane_width_data type: {type(cane_width_data)}, length: {len(cane_width_data) if isinstance(cane_width_data, list) else 'N/A'}")
                    
                    if isinstance(cane_width_data, list) and len(cane_width_data) > 0:
                        # Unwrap nested arrays to get to the actual width values
                        individual_widths = cane_width_data
                        
                        # Keep unwrapping if we have nested arrays
                        while (isinstance(individual_widths, list) and 
                               len(individual_widths) > 0 and 
                               isinstance(individual_widths[0], list) and
                               not isinstance(individual_widths[0], (int, float))):
                            individual_widths = individual_widths[0]
                            logger.info(f"🔍 Unwrapped to: {individual_widths}")
                        
                        logger.info(f"🔍 Final individual_widths type: {type(individual_widths)}, value: {individual_widths}")
                        
                        # Process each individual stem width
                        if isinstance(individual_widths, list):
                            for width in individual_widths:
                                if isinstance(width, (int, float)):
                                    width_pixels = float(width)
                                    # Convert pixels to inches using calibration factor
                                    width_inches = width_pixels * PIXEL_TO_INCH_CONVERSION
                                    individual_stems.append({
                                        "circumference_inches": round(width_inches, 2),
                                        "confidence": 0.85
                                    })
                                    total_circumference += width_inches
                            
                            logger.info(f"✅ Extracted {len(individual_stems)} stem widths")
                            logger.info(f"📏 Converted from pixels to inches: total {total_circumference:.2f} inches")
                
                # If we have stem count but no width measurements, log a warning
                if stem_count > 0 and len(individual_stems) == 0:
                    logger.warning(f"⚠️ Detected {stem_count} stems but no width measurements available")
                    logger.warning(f"⚠️ Check if workflow is extracting 'width' property correctly")
                
                # Set confidence based on whether we got data
                confidence = 0.85 if stem_count > 0 else 0.0
                
                avg_width = total_circumference / stem_count if stem_count > 0 else 0.0
                logger.info(f"📊 Parsed custom-workflow-3: {stem_count} stems, avg width: {avg_width:.2f} inches, {len(individual_stems)} measurements")
            
            # Fallback: Check for standard workflow structures
            elif isinstance(workflow_output, dict):
                # Check for predictions in output
                if "output" in workflow_output:
                    output_data = workflow_output["output"]
                    
                    # If workflow returns stem detections
                    if "stem_detections" in output_data:
                        detections = output_data["stem_detections"]
                        if isinstance(detections, list):
                            stem_count = len(detections)
                            
                            for detection in detections:
                                # Extract circumference from each stem
                                # This assumes the workflow calculates circumference
                                circumference = detection.get("circumference_inches", 0)
                                confidence = detection.get("confidence", 0)
                                
                                individual_stems.append({
                                    "circumference_inches": circumference,
                                    "confidence": confidence
                                })
                                total_circumference += circumference
                    
                    # Alternative: workflow might return count and average directly
                    elif "stem_count" in output_data:
                        stem_count = output_data.get("stem_count", 0)
                        total_circumference = output_data.get("average_circumference_inches", 0) * stem_count
                        individual_stems = output_data.get("stems", [])
                
                # Some workflows return results in a predictions array
                elif "predictions" in workflow_output:
                    predictions = workflow_output["predictions"]
                    if isinstance(predictions, list) and len(predictions) > 0:
                        # Count stems from predictions
                        stem_count = len(predictions)
                        
                        for pred in predictions:
                            # Extract measurements from prediction
                            circumference = pred.get("circumference_inches", pred.get("width", 0))
                            confidence = pred.get("confidence", 0.0)
                            
                            individual_stems.append({
                                "circumference_inches": circumference,
                                "confidence": confidence
                            })
                            total_circumference += circumference
            
            # Calculate average circumference
            avg_circumference = total_circumference / stem_count if stem_count > 0 else 0.0
            
            # Calculate overall confidence
            if individual_stems:
                avg_confidence = sum(s["confidence"] for s in individual_stems) / len(individual_stems)
            else:
                avg_confidence = confidence  # Use the confidence set earlier (for custom-workflow-3)
            
            logger.info(f"📊 Parsed: {stem_count} stems, avg circumference: {avg_circumference:.2f} inches, confidence: {avg_confidence:.2f}")
            
            return {
                "stem_count": stem_count,
                "stem_circumference_inches": round(avg_circumference, 2),
                "confidence": round(avg_confidence, 2),
                "individual_stems": individual_stems
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to parse workflow output: {e}")
            # Return default values if parsing fails
            return {
                "stem_count": 0,
                "stem_circumference_inches": 0.0,
                "confidence": 0.0,
                "individual_stems": []
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
        total_stems = 0
        total_circumference = 0.0
        all_individual_stems = []
        
        for idx, image_path in enumerate(image_paths, 1):
            try:
                result = await TreeStemAnalysisService.analyze_tree_image(image_path)
                all_results.append(result)
                
                total_stems += result["stem_count"]
                total_circumference += result["stem_circumference_inches"] * result["stem_count"]
                all_individual_stems.extend(result["individual_stems"])
                
                logger.info(f"✅ Image {idx}/{len(image_paths)}: {result['stem_count']} stems detected")
                
            except Exception as e:
                logger.error(f"❌ Failed to analyze image {idx}: {e}")
                # Continue with other images
                continue
        
        if not all_results:
            raise ValueError("Failed to analyze any images")
        
        # Calculate averages
        avg_stem_count = round(total_stems / len(all_results))
        avg_circumference = total_circumference / total_stems if total_stems > 0 else 0.0
        
        # Calculate overall confidence
        avg_confidence = sum(r["confidence"] for r in all_results) / len(all_results)
        
        return {
            "success": True,
            "images_analyzed": len(all_results),
            "average_stem_count": avg_stem_count,
            "average_circumference_inches": round(avg_circumference, 2),
            "overall_confidence": round(avg_confidence, 2),
            "individual_results": all_results,
            "all_stems": all_individual_stems,
            "total_stems_detected": total_stems
        }


# Export service instance
tree_stem_analysis_service = TreeStemAnalysisService()
