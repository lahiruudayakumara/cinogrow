from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional
import json
from datetime import datetime

from app.database import get_session
from app.models.yield_weather.farm_assistance import (
    ActivityHistory, 
    ActivityHistoryCreate, 
    ActivityHistoryRead,
    ActivityHistoryCreateRequest,
    WeatherSnapshot
)

router = APIRouter(prefix="/farm-assistance", tags=["farm-assistance"])


@router.get("/health")
async def health_check():
    """Health check endpoint for farm assistance service"""
    return {
        "status": "healthy",
        "service": "farm-assistance",
        "message": "Farm assistance service is operational",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/activity-records", response_model=dict)
async def create_activity_record(
    activity_data: ActivityHistoryCreateRequest,
    session: Session = Depends(get_session)
):
    """Create a new activity record"""
    try:
        # Convert weather snapshot to JSON string
        weather_json = activity_data.weather_snapshot.model_dump_json()
        
        # Create activity history record
        activity_record = ActivityHistory(
            user_id=activity_data.user_id,
            plot_id=activity_data.plot_id,
            activity_name=activity_data.activity_name,
            activity_date=activity_data.activity_date,
            trigger_condition=activity_data.trigger_condition,
            weather_snapshot=weather_json
        )
        
        session.add(activity_record)
        session.commit()
        session.refresh(activity_record)
        
        return {
            "success": True,
            "message": "Activity record created successfully",
            "data": {
                "id": activity_record.id,
                "user_id": activity_record.user_id,
                "plot_id": activity_record.plot_id,
                "activity_name": activity_record.activity_name,
                "activity_date": activity_record.activity_date.isoformat(),
                "trigger_condition": activity_record.trigger_condition,
                "weather_snapshot": activity_record.get_weather_snapshot(),
                "created_at": activity_record.created_at.isoformat()
            }
        }
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create activity record: {str(e)}"
        )


@router.get("/activity-records/{user_id}")
async def get_user_activity_history(
    user_id: int,
    limit: Optional[int] = Query(default=50, le=100),
    session: Session = Depends(get_session)
):
    """Get activity history for a specific user"""
    try:
        statement = (
            select(ActivityHistory)
            .where(ActivityHistory.user_id == user_id)
            .order_by(ActivityHistory.activity_date.desc())
            .limit(limit)
        )
        
        activities = session.exec(statement).all()
        
        activity_records = []
        for activity in activities:
            activity_records.append({
                "id": activity.id,
                "user_id": activity.user_id,
                "plot_id": activity.plot_id,
                "activity_name": activity.activity_name,
                "activity_date": activity.activity_date.isoformat(),
                "trigger_condition": activity.trigger_condition,
                "weather_snapshot": activity.get_weather_snapshot(),
                "created_at": activity.created_at.isoformat()
            })
        
        return {
            "success": True,
            "message": f"Retrieved {len(activity_records)} activity records",
            "data": activity_records
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve activity history: {str(e)}"
        )


@router.get("/activity-records/plot/{plot_id}")
async def get_plot_activity_history(
    plot_id: int,
    limit: Optional[int] = Query(default=20, le=100),
    session: Session = Depends(get_session)
):
    """Get activity history for a specific plot"""
    try:
        statement = (
            select(ActivityHistory)
            .where(ActivityHistory.plot_id == plot_id)
            .order_by(ActivityHistory.activity_date.desc())
            .limit(limit)
        )
        
        activities = session.exec(statement).all()
        
        activity_records = []
        for activity in activities:
            activity_records.append({
                "id": activity.id,
                "user_id": activity.user_id,
                "plot_id": activity.plot_id,
                "activity_name": activity.activity_name,
                "activity_date": activity.activity_date.isoformat(),
                "trigger_condition": activity.trigger_condition,
                "weather_snapshot": activity.get_weather_snapshot(),
                "created_at": activity.created_at.isoformat()
            })
        
        return {
            "success": True,
            "message": f"Retrieved {len(activity_records)} activity records for plot {plot_id}",
            "data": activity_records
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve plot activity history: {str(e)}"
        )


@router.delete("/activity-records/{record_id}")
async def delete_activity_record(
    record_id: int,
    session: Session = Depends(get_session)
):
    """Delete an activity record"""
    try:
        statement = select(ActivityHistory).where(ActivityHistory.id == record_id)
        activity = session.exec(statement).first()
        
        if not activity:
            raise HTTPException(
                status_code=404,
                detail=f"Activity record with id {record_id} not found"
            )
        
        session.delete(activity)
        session.commit()
        
        return {
            "success": True,
            "message": f"Activity record {record_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete activity record: {str(e)}"
        )


@router.get("/activity-summary/{user_id}")
async def get_activity_summary(
    user_id: int,
    days: Optional[int] = Query(default=30, le=365),
    session: Session = Depends(get_session)
):
    """Get activity summary for the last N days"""
    try:
        from datetime import datetime, timedelta
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        statement = (
            select(ActivityHistory)
            .where(
                ActivityHistory.user_id == user_id,
                ActivityHistory.activity_date >= start_date
            )
            .order_by(ActivityHistory.activity_date.desc())
        )
        
        activities = session.exec(statement).all()
        
        # Group activities by type
        activity_counts = {}
        recent_activities = []
        
        for activity in activities:
            activity_name = activity.activity_name
            if activity_name not in activity_counts:
                activity_counts[activity_name] = 0
            activity_counts[activity_name] += 1
            
            if len(recent_activities) < 10:  # Keep last 10 activities
                recent_activities.append({
                    "activity_name": activity.activity_name,
                    "activity_date": activity.activity_date.isoformat(),
                    "plot_id": activity.plot_id,
                    "trigger_condition": activity.trigger_condition
                })
        
        return {
            "success": True,
            "message": f"Activity summary for last {days} days",
            "data": {
                "period_days": days,
                "total_activities": len(activities),
                "activity_counts": activity_counts,
                "recent_activities": recent_activities
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve activity summary: {str(e)}"
        )