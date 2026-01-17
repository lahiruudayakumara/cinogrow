"""
Tree Stem Analysis Router
API endpoints for analyzing tree images using Roboflow to detect stem count and circumference
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
import os
import shutil
from pathlib import Path
from sqlmodel import Session
from app.database import get_session
from app.services.tree_stem_analysis import tree_stem_analysis_service, TreeStemAnalysisService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/tree-analysis",
    tags=["Tree Stem Analysis"]
)

# Upload directory for tree images
UPLOAD_DIR = Path("uploads/tree_analysis")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Check if tree analysis service is configured and ready
    """
    try:
        logger.info("🏥 Tree analysis health check requested")
        
        is_available = TreeStemAnalysisService.is_available()
        
        if not is_available:
            return {
                "success": False,
                "status": "not_configured",
                "message": "Tree analysis service not available. Check Roboflow configuration.",
                "available": False
            }
        
        logger.info("✅ Tree analysis service is available")
        return {
            "success": True,
            "status": "available",
            "message": "Tree analysis service is ready",
            "available": True
        }
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )


@router.post("/analyze-single")
async def analyze_single_tree_image(
    file: UploadFile = File(..., description="Tree image file"),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Analyze a single tree image to detect stem count and circumference
    
    Args:
        file: Tree image file (JPEG, PNG)
        db: Database session
        
    Returns:
        Dict containing stem_count, stem_circumference_inches, confidence, and individual_stems
    """
    try:
        logger.info(f"🌳 Analyzing single tree image: {file.filename}")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {file.content_type}. Must be an image."
            )
        
        # Save uploaded file temporarily
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"tree_{timestamp}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"📁 Saved image to: {file_path}")
        
        # Analyze the image using SDK workflow method
        result = await tree_stem_analysis_service.analyze_tree_image_sdk(str(file_path))
        
        # Add metadata and success flag
        result["success"] = True
        result["filename"] = file.filename
        result["saved_path"] = str(file_path)
        result["analyzed_at"] = datetime.now().isoformat()
        
        logger.info(f"✅ Analysis complete: {result['stem_count']} stems, {result['stem_circumference_inches']} inches")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Single tree analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Tree analysis failed: {str(e)}"
        )


@router.post("/analyze-multiple")
async def analyze_multiple_tree_images(
    files: List[UploadFile] = File(..., description="Multiple tree image files (typically 3)"),
    tree_code: Optional[str] = Form(None, description="Optional tree identifier"),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Analyze multiple tree images (typically 3) and aggregate results
    
    This endpoint accepts 3 images of the same tree from different angles
    and provides aggregated measurements for better accuracy.
    
    Args:
        files: List of tree image files (JPEG, PNG)
        tree_code: Optional identifier for the tree
        db: Database session
        
    Returns:
        Dict containing aggregated measurements:
            - average_stem_count: Average number of stems across all images
            - average_circumference_inches: Average stem circumference
            - overall_confidence: Overall confidence score
            - individual_results: Results from each image
    """
    try:
        logger.info(f"🌳 Analyzing {len(files)} tree images")
        
        if len(files) > 5:
            raise HTTPException(
                status_code=400,
                detail="Maximum 5 images allowed per analysis"
            )
        
        # Save all uploaded files
        saved_paths = []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for idx, file in enumerate(files, 1):
            # Validate file type
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type for image {idx}: {file.content_type}. Must be an image."
                )
            
            # Save file
            filename = f"tree_{timestamp}_{idx}_{file.filename}"
            file_path = UPLOAD_DIR / filename
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_paths.append(str(file_path))
            logger.info(f"📁 Saved image {idx} to: {file_path}")
        
        # Analyze all images
        result = await tree_stem_analysis_service.analyze_multiple_tree_images(saved_paths)
        
        # Add metadata
        result["tree_code"] = tree_code
        result["filenames"] = [f.filename for f in files]
        result["saved_paths"] = saved_paths
        result["analyzed_at"] = datetime.now().isoformat()
        
        logger.info(
            f"✅ Multi-image analysis complete: "
            f"{result['average_stem_count']} avg stems, "
            f"{result['average_circumference_inches']} avg inches"
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Multiple tree analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Tree analysis failed: {str(e)}"
        )


@router.post("/analyze-batch")
async def analyze_batch_trees(
    files: List[UploadFile] = File(..., description="Multiple tree images (9 images for 3 trees)"),
    tree_codes: Optional[str] = Form(None, description="Comma-separated tree identifiers (e.g., 'TREE_1,TREE_2,TREE_3')"),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Analyze a batch of tree images where each tree has 3 images
    
    This endpoint is optimized for the yield prediction workflow where
    users upload 3 images for each of 3 sample trees (total 9 images).
    
    Args:
        files: List of 9 tree image files (3 images per tree)
        tree_codes: Comma-separated tree identifiers
        db: Database session
        
    Returns:
        Dict containing results for each tree and overall summary
    """
    try:
        num_files = len(files)
        logger.info(f"🌳 Analyzing batch of {num_files} tree images")
        
        # Validate number of files (should be multiple of 3)
        if num_files % 3 != 0:
            raise HTTPException(
                status_code=400,
                detail=f"Number of images must be a multiple of 3. Got {num_files} images."
            )
        
        num_trees = num_files // 3
        if num_trees > 10:
            raise HTTPException(
                status_code=400,
                detail="Maximum 10 trees allowed per batch (30 images)"
            )
        
        # Parse tree codes
        tree_code_list = []
        if tree_codes:
            tree_code_list = [code.strip() for code in tree_codes.split(',')]
            if len(tree_code_list) != num_trees:
                raise HTTPException(
                    status_code=400,
                    detail=f"Number of tree codes ({len(tree_code_list)}) must match number of trees ({num_trees})"
                )
        else:
            tree_code_list = [f"TREE_{i+1}" for i in range(num_trees)]
        
        # Process each tree (3 images per tree)
        tree_results = []
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for tree_idx in range(num_trees):
            start_idx = tree_idx * 3
            end_idx = start_idx + 3
            tree_files = files[start_idx:end_idx]
            tree_code = tree_code_list[tree_idx]
            
            logger.info(f"🌳 Processing tree {tree_idx + 1}/{num_trees}: {tree_code}")
            
            # Save the 3 images for this tree
            saved_paths = []
            for img_idx, file in enumerate(tree_files, 1):
                # Validate file type
                if not file.content_type or not file.content_type.startswith('image/'):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid file type for {tree_code} image {img_idx}: {file.content_type}"
                    )
                
                # Save file
                filename = f"{tree_code}_{timestamp}_{img_idx}_{file.filename}"
                file_path = UPLOAD_DIR / filename
                
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                saved_paths.append(str(file_path))
            
            # Analyze this tree's images
            tree_result = await tree_stem_analysis_service.analyze_multiple_tree_images(saved_paths)
            tree_result["tree_code"] = tree_code
            tree_result["tree_index"] = tree_idx + 1
            tree_results.append(tree_result)
            
            logger.info(
                f"✅ Tree {tree_idx + 1} complete: "
                f"{tree_result['average_stem_count']} stems, "
                f"{tree_result['average_circumference_inches']} inches"
            )
        
        # Calculate overall statistics
        total_avg_stems = sum(t["average_stem_count"] for t in tree_results) / len(tree_results)
        total_avg_circumference = sum(t["average_circumference_inches"] for t in tree_results) / len(tree_results)
        overall_confidence = sum(t["overall_confidence"] for t in tree_results) / len(tree_results)
        
        return {
            "success": True,
            "trees_analyzed": num_trees,
            "images_per_tree": 3,
            "total_images": num_files,
            "tree_results": tree_results,
            "overall_statistics": {
                "average_stem_count_across_trees": round(total_avg_stems, 1),
                "average_circumference_across_trees": round(total_avg_circumference, 2),
                "overall_confidence": round(overall_confidence, 2)
            },
            "analyzed_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Batch tree analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch tree analysis failed: {str(e)}"
        )


@router.delete("/cleanup")
async def cleanup_old_images(
    days: int = 7,
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Cleanup tree analysis images older than specified days
    
    Args:
        days: Remove images older than this many days (default: 7)
        db: Database session
        
    Returns:
        Cleanup statistics
    """
    try:
        logger.info(f"🧹 Cleaning up tree images older than {days} days")
        
        import time
        current_time = time.time()
        cutoff_time = current_time - (days * 24 * 60 * 60)
        
        deleted_count = 0
        total_size = 0
        
        for file_path in UPLOAD_DIR.glob("tree_*"):
            if file_path.is_file():
                file_time = file_path.stat().st_mtime
                if file_time < cutoff_time:
                    file_size = file_path.stat().st_size
                    file_path.unlink()
                    deleted_count += 1
                    total_size += file_size
                    logger.debug(f"🗑️ Deleted: {file_path.name}")
        
        logger.info(f"✅ Cleanup complete: {deleted_count} files, {total_size / 1024 / 1024:.2f} MB")
        
        return {
            "success": True,
            "files_deleted": deleted_count,
            "space_freed_mb": round(total_size / 1024 / 1024, 2),
            "days_threshold": days
        }
        
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Cleanup failed: {str(e)}"
        )
