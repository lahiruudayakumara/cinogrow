"""
ML Metadata API Router
Handles storage and retrieval of machine learning training data from mobile app
"""

import os
import uuid
import shutil
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from datetime import datetime

from app.database import get_db
from app.models.fertilizer.ml_metadata import (
    MLAnalysisSession,
    MLImageAnalysis,
    MLTrainingDataset,
    SampleType,
    SessionStatus,
    CaptureMethod,
    convert_mobile_metadata_to_db,
    generate_session_id,
    generate_analysis_id
)

router = APIRouter(tags=["ml-metadata"])

# Configure upload directory for ML images
ML_UPLOAD_DIR = "uploads/ml_training_data"
os.makedirs(ML_UPLOAD_DIR, exist_ok=True)


@router.post("/ml-metadata/sessions")
async def create_analysis_session(
    user_id: int = Form(1, description="User ID creating the session"),
    db: Session = Depends(get_db)
):
    """
    Create a new ML analysis session
    Returns a session ID that can be used to store related image analyses
    """
    try:
        session_id = generate_session_id()
        
        session = MLAnalysisSession(
            session_id=session_id,
            user_id=user_id,
            status=SessionStatus.ACTIVE
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return {
            "success": True,
            "session_id": session_id,
            "created_at": session.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.post("/ml-metadata/analyses")
async def store_image_analysis(
    session_id: str = Form(..., description="Session ID from create_analysis_session"),
    sample_type: SampleType = Form(..., description="Type of sample (leaf/soil)"),
    capture_method: CaptureMethod = Form(..., description="Capture method (camera/library)"),
    metadata: str = Form(..., description="JSON string of analysis metadata"),
    image: Optional[UploadFile] = File(None, description="Optional: Image file to store"),
    db: Session = Depends(get_db)
):
    """
    Store image analysis metadata for ML training
    Accepts metadata from mobile app imageAnalysisService
    """
    try:
        import json
        
        # Verify session exists
        session = db.exec(
            select(MLAnalysisSession).where(MLAnalysisSession.session_id == session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Parse metadata
        try:
            metadata_dict = json.loads(metadata)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid metadata JSON")
        
        # Generate analysis ID
        analysis_id = generate_analysis_id()
        
        # Convert mobile metadata to database format
        db_metadata = convert_mobile_metadata_to_db(metadata_dict, sample_type)
        
        # Handle image upload if provided
        stored_image_path = None
        if image and image.filename:
            # Validate and save image
            file_ext = os.path.splitext(image.filename.lower())[1]
            if file_ext not in {".jpg", ".jpeg", ".png", ".webp"}:
                raise HTTPException(status_code=400, detail="Invalid image format")
            
            unique_filename = f"{sample_type.value}_{analysis_id}{file_ext}"
            stored_image_path = os.path.join(ML_UPLOAD_DIR, unique_filename)
            
            with open(stored_image_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
        
        # Create analysis record
        analysis = MLImageAnalysis(
            analysis_id=analysis_id,
            session_id=session_id,
            sample_type=sample_type,
            image_uri=metadata_dict.get("imageUri", ""),
            stored_image_path=stored_image_path,
            file_metadata=db_metadata.get("file_metadata", {}),
            quality_metrics=db_metadata.get("quality_metrics", {}),
            color_analysis=db_metadata.get("color_analysis", {}),
            environmental_context=db_metadata.get("environmental_context", {}),
            leaf_features=db_metadata.get("leaf_features"),
            soil_features=db_metadata.get("soil_features")
        )
        
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        
        # Update session timestamp
        session.updated_at = datetime.utcnow()
        db.add(session)
        db.commit()
        
        return {
            "success": True,
            "analysis_id": analysis_id,
            "stored_image_path": stored_image_path,
            "quality_approved": analysis.quality_approved,
            "created_at": analysis.created_at.isoformat()
        }
        
    except Exception as e:
        # Clean up uploaded file if something went wrong
        if 'stored_image_path' in locals() and stored_image_path and os.path.exists(stored_image_path):
            os.remove(stored_image_path)
        
        raise HTTPException(status_code=500, detail=f"Failed to store analysis: {str(e)}")


@router.put("/ml-metadata/sessions/{session_id}/complete")
async def complete_analysis_session(
    session_id: str,
    analysis_summary: Optional[str] = Form(None, description="Summary of analysis results"),
    recommendation_data: Optional[str] = Form(None, description="JSON string of recommendation data"),
    db: Session = Depends(get_db)
):
    """
    Mark an analysis session as complete
    Optionally store analysis summary and recommendations
    """
    try:
        session = db.exec(
            select(MLAnalysisSession).where(MLAnalysisSession.session_id == session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Parse recommendation data if provided
        recommendation_dict = {}
        if recommendation_data:
            try:
                import json
                recommendation_dict = json.loads(recommendation_data)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid recommendation JSON")
        
        # Update session
        session.status = SessionStatus.COMPLETED
        session.completed_at = datetime.utcnow()
        session.updated_at = datetime.utcnow()
        
        if analysis_summary:
            session.analysis_summary = analysis_summary
        if recommendation_dict:
            session.recommendation_data = recommendation_dict
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return {
            "success": True,
            "session_id": session_id,
            "status": session.status.value,
            "completed_at": session.completed_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete session: {str(e)}")


@router.get("/ml-metadata/sessions/{session_id}")
async def get_analysis_session(
    session_id: str,
    include_analyses: bool = True,
    db: Session = Depends(get_db)
):
    """
    Retrieve analysis session and optionally its related analyses
    """
    try:
        session = db.exec(
            select(MLAnalysisSession).where(MLAnalysisSession.session_id == session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        response_data = {
            "id": session.id,
            "session_id": session.session_id,
            "user_id": session.user_id,
            "status": session.status.value,
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
            "completed_at": session.completed_at.isoformat() if session.completed_at else None,
            "analysis_summary": session.analysis_summary,
            "recommendation_data": session.recommendation_data
        }
        
        if include_analyses:
            analyses = db.exec(
                select(MLImageAnalysis).where(MLImageAnalysis.session_id == session_id)
            ).all()
            
            response_data["analyses"] = [
                {
                    "analysis_id": analysis.analysis_id,
                    "sample_type": analysis.sample_type.value,
                    "quality_metrics": analysis.quality_metrics,
                    "created_at": analysis.created_at.isoformat(),
                    "is_labeled": analysis.is_labeled,
                    "quality_approved": analysis.quality_approved
                }
                for analysis in analyses
            ]
        
        return {
            "success": True,
            "data": response_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve session: {str(e)}")


@router.get("/ml-metadata/sessions")
async def get_user_sessions(
    user_id: int,
    status: Optional[SessionStatus] = None,
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Get user's analysis sessions with optional filtering
    """
    try:
        query = select(MLAnalysisSession).where(MLAnalysisSession.user_id == user_id)
        
        if status:
            query = query.where(MLAnalysisSession.status == status)
        
        # Order by most recent first
        query = query.order_by(MLAnalysisSession.created_at.desc())
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        sessions = db.exec(query).all()
        
        # Format response
        formatted_sessions = []
        for session in sessions:
            # Count analyses in each session
            analysis_count = len(db.exec(
                select(MLImageAnalysis).where(MLImageAnalysis.session_id == session.session_id)
            ).all())
            
            formatted_sessions.append({
                "session_id": session.session_id,
                "status": session.status.value,
                "created_at": session.created_at.isoformat(),
                "completed_at": session.completed_at.isoformat() if session.completed_at else None,
                "analysis_count": analysis_count,
                "has_recommendation": bool(session.recommendation_data)
            })
        
        return {
            "success": True,
            "data": {
                "sessions": formatted_sessions,
                "pagination": {
                    "skip": skip,
                    "limit": limit,
                    "total_returned": len(formatted_sessions)
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve sessions: {str(e)}")


@router.get("/ml-metadata/export/training-data")
async def export_training_data(
    user_id: Optional[int] = None,
    quality_threshold: float = 0.7,
    include_unapproved: bool = False,
    sample_type: Optional[SampleType] = None,
    db: Session = Depends(get_db)
):
    """
    Export ML training data in format suitable for model training
    Similar to the mobile app's exportMetadataForML function
    """
    try:
        # Build query for approved analyses
        query = select(MLImageAnalysis)
        
        if not include_unapproved:
            query = query.where(MLImageAnalysis.quality_approved == True)
        
        if sample_type:
            query = query.where(MLImageAnalysis.sample_type == sample_type)
        
        # Filter by quality threshold
        # Note: This requires extracting quality score from JSON field
        analyses = db.exec(query).all()
        
        # Filter by quality threshold and user
        filtered_analyses = []
        for analysis in analyses:
            quality_metrics = analysis.quality_metrics or {}
            overall_quality = quality_metrics.get("sharpness", 0) / 100.0  # Convert to 0-1 scale
            
            if overall_quality >= quality_threshold:
                # Filter by user if specified
                if user_id is None:
                    filtered_analyses.append(analysis)
                else:
                    session = db.exec(
                        select(MLAnalysisSession).where(MLAnalysisSession.session_id == analysis.session_id)
                    ).first()
                    if session and session.user_id == user_id:
                        filtered_analyses.append(analysis)
        
        # Format for ML training
        training_data = {
            "export_info": {
                "timestamp": datetime.utcnow().isoformat(),
                "total_samples": len(filtered_analyses),
                "quality_threshold": quality_threshold,
                "include_unapproved": include_unapproved,
                "user_filter": user_id
            },
            "samples": []
        }
        
        for analysis in filtered_analyses:
            sample_data = {
                "analysis_id": analysis.analysis_id,
                "sample_type": analysis.sample_type.value,
                "image_uri": analysis.image_uri,
                "stored_image_path": analysis.stored_image_path,
                "metadata": {
                    "file_metadata": analysis.file_metadata,
                    "quality_metrics": analysis.quality_metrics,
                    "color_analysis": analysis.color_analysis,
                    "environmental_context": analysis.environmental_context
                },
                "features": analysis.leaf_features or analysis.soil_features,
                "labels": analysis.manual_labels,
                "timestamp": analysis.created_at.isoformat()
            }
            training_data["samples"].append(sample_data)
        
        return {
            "success": True,
            "data": training_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export training data: {str(e)}")


@router.get("/ml-metadata/stats/summary")
async def get_metadata_stats(
    user_id: Optional[int] = None,
    days_back: int = 30,
    db: Session = Depends(get_db)
):
    """
    Get ML metadata collection statistics
    Similar to the mobile app's getMetadataSummary function
    """
    try:
        from datetime import timedelta
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        # Base queries
        session_query = select(MLAnalysisSession).where(MLAnalysisSession.created_at >= cutoff_date)
        analysis_query = select(MLImageAnalysis).where(MLImageAnalysis.created_at >= cutoff_date)
        
        if user_id:
            session_query = session_query.where(MLAnalysisSession.user_id == user_id)
            # For analyses, we need to join with sessions
            analysis_query = analysis_query.join(MLAnalysisSession).where(MLAnalysisSession.user_id == user_id)
        
        sessions = db.exec(session_query).all()
        analyses = db.exec(analysis_query).all()
        
        # Calculate statistics
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.status == SessionStatus.COMPLETED])
        total_analyses = len(analyses)
        
        # Sample type distribution
        leaf_samples = len([a for a in analyses if a.sample_type == SampleType.LEAF])
        soil_samples = len([a for a in analyses if a.sample_type == SampleType.SOIL])
        
        # Quality statistics
        quality_approved = len([a for a in analyses if a.quality_approved])
        labeled_samples = len([a for a in analyses if a.is_labeled])
        
        # Average quality scores
        quality_scores = []
        for analysis in analyses:
            if analysis.quality_metrics:
                sharpness = analysis.quality_metrics.get("sharpness", 0)
                quality_scores.append(sharpness)
        
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        
        return {
            "success": True,
            "data": {
                "collection_summary": {
                    "total_sessions": total_sessions,
                    "completed_sessions": completed_sessions,
                    "total_analyses": total_analyses,
                    "period_days": days_back
                },
                "sample_distribution": {
                    "leaf_samples": leaf_samples,
                    "soil_samples": soil_samples,
                    "quality_approved": quality_approved,
                    "labeled_samples": labeled_samples
                },
                "quality_metrics": {
                    "average_quality_score": round(avg_quality, 2),
                    "quality_threshold_met": len([q for q in quality_scores if q >= 70]),
                    "samples_ready_for_training": quality_approved
                },
                "data_readiness": {
                    "training_ready_samples": quality_approved,
                    "needs_labeling": total_analyses - labeled_samples,
                    "quality_review_pending": total_analyses - quality_approved
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate stats: {str(e)}")


@router.delete("/ml-metadata/sessions/{session_id}")
async def delete_analysis_session(
    session_id: str,
    delete_images: bool = True,
    db: Session = Depends(get_db)
):
    """
    Delete an analysis session and its related data
    Optionally removes stored image files
    """
    try:
        session = db.exec(
            select(MLAnalysisSession).where(MLAnalysisSession.session_id == session_id)
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get related analyses
        analyses = db.exec(
            select(MLImageAnalysis).where(MLImageAnalysis.session_id == session_id)
        ).all()
        
        # Delete image files if requested
        if delete_images:
            for analysis in analyses:
                if analysis.stored_image_path and os.path.exists(analysis.stored_image_path):
                    os.remove(analysis.stored_image_path)
        
        # Delete analyses first (foreign key constraint)
        for analysis in analyses:
            db.delete(analysis)
        
        # Delete session
        db.delete(session)
        db.commit()
        
        return {
            "success": True,
            "message": f"Session {session_id} and {len(analyses)} analyses deleted",
            "images_deleted": delete_images
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")
