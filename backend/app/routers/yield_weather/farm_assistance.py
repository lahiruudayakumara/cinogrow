from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
import json
from datetime import datetime, timedelta

from app.database import get_session
from app.models.yield_weather.farm_assistance import (
    ActivityHistory, 
    ActivityHistoryCreate, 
    ActivityHistoryRead,
    ActivityHistoryCreateRequest,
    WeatherSnapshot
)
from app.models.yield_weather.farm import Farm, Plot, PlantingRecord

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


@router.get("/plots-with-age/{user_id}")
async def get_plots_with_age_info(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Get all plots with calculated age information based on planting dates"""
    try:
        # Get all plots for the user's planting records
        planting_records_query = select(PlantingRecord, Plot, Farm).join(
            Plot, PlantingRecord.plot_id == Plot.id
        ).join(
            Farm, Plot.farm_id == Farm.id
        ).where(PlantingRecord.user_id == user_id)
        
        results = session.exec(planting_records_query).all()
        
        plots_with_age = []
        current_date = datetime.utcnow()
        
        for planting_record, plot, farm in results:
            # Calculate days old
            planted_date = planting_record.planted_date
            days_old = (current_date - planted_date).days
            
            # Determine growth stage based on age
            growth_stage = {
                "name": "Unknown",
                "stage_number": 0,
                "days_old": days_old
            }
            
            if days_old <= 180:
                growth_stage = {
                    "name": "Nursery / Establishment",
                    "stage_number": 1,
                    "days_old": days_old
                }
            elif days_old <= 540:
                growth_stage = {
                    "name": "Vegetative Growth", 
                    "stage_number": 2,
                    "days_old": days_old
                }
            else:
                growth_stage = {
                    "name": "Harvest / Maturity",
                    "stage_number": 3,
                    "days_old": days_old
                }
            
            plots_with_age.append({
                "plot_id": plot.id,
                "plot_name": plot.name,
                "farm_id": farm.id,
                "farm_name": farm.name,
                "planting_record_id": planting_record.record_id,
                "planted_date": planted_date.isoformat(),
                "days_old": days_old,
                "growth_stage": growth_stage,
                "cinnamon_variety": planting_record.cinnamon_variety,
                "seedling_count": planting_record.seedling_count,
                "plot_area": planting_record.plot_area,
                "plot_status": plot.status,
                "farm_location": farm.location
            })
        
        return {
            "success": True,
            "message": f"Retrieved {len(plots_with_age)} plots with age information",
            "data": plots_with_age
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve plots with age info: {str(e)}"
        )


@router.get("/activity-records/home/{user_id}")
async def get_home_activity_history(
    user_id: int,
    limit: Optional[int] = Query(default=5, le=20),
    session: Session = Depends(get_session)
):
    """Get recent activity history for home screen display with plot names"""
    try:
        # Join activity history with plots to get plot names
        statement = (
            select(ActivityHistory, Plot)
            .join(Plot, ActivityHistory.plot_id == Plot.id)
            .where(ActivityHistory.user_id == user_id)
            .order_by(ActivityHistory.activity_date.desc())
            .limit(limit)
        )
        
        results = session.exec(statement).all()
        
        activity_records = []
        for activity, plot in results:
            activity_records.append({
                "id": activity.id,
                "user_id": activity.user_id,
                "plot_id": activity.plot_id,
                "plot_name": plot.name,
                "activity_name": activity.activity_name,
                "activity_date": activity.activity_date.isoformat(),
                "trigger_condition": activity.trigger_condition,
                "weather_snapshot": activity.get_weather_snapshot(),
                "created_at": activity.created_at.isoformat(),
                # Human-readable date for display
                "formatted_date": activity.activity_date.strftime("%B %d, %Y at %I:%M %p")
            })
        
        return {
            "success": True,
            "message": f"Retrieved {len(activity_records)} recent activity records for home display",
            "data": activity_records
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve home activity history: {str(e)}"
        )


@router.get("/demo-farm-cards")
async def get_demo_farm_assistance_cards():
    """Get demo farm assistance cards with comprehensive recommendations"""
    try:
        # Mock weather data for demo
        current_weather = {
            "temperature": 29,
            "humidity": 78,
            "rainfall": 0.5,
            "wind_speed": 2.5,
            "weather_description": "Partly cloudy"
        }
        
        demo_cards = [
            {
                "id": "demo-1",
                "title": "Young Cinnamon Plot - Nursery Stage",
                "plot_info": {
                    "name": "Demo Plot A",
                    "area": "0.8 hectares",
                    "age": "90 days old",
                    "stage": "Nursery / Establishment",
                    "variety": "Ceylon Cinnamon",
                    "status": "growing"
                },
                "weather_conditions": current_weather,
                "recommendations": [
                    {
                        "activity": "Irrigation",
                        "priority": "high",
                        "action": "Water seedlings thoroughly - apply 10-15L per plant",
                        "reason": "Young plants need consistent moisture for proper root establishment during dry season",
                        "trigger": f"Low weekly rainfall: 3.5mm & high temperature: {current_weather['temperature']}°C",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    },
                    {
                        "activity": "Organic Fertilization", 
                        "priority": "medium",
                        "action": "Apply compost around the base of seedlings",
                        "reason": "Organic matter improves soil structure and provides slow-release nutrients",
                        "trigger": "Growth stage optimal & good soil moisture conditions",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    },
                    {
                        "activity": "Shade Management",
                        "priority": "medium",
                        "action": "Install temporary shade cloth (50% shade) during hottest hours",
                        "reason": "Protect young seedlings from heat stress and excessive sun exposure",
                        "trigger": f"Temperature above 28°C for extended periods",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    }
                ]
            },
            {
                "id": "demo-2", 
                "title": "Mature Cinnamon Plot - Harvest Ready",
                "plot_info": {
                    "name": "Demo Plot B",
                    "area": "1.2 hectares", 
                    "age": "950 days old",
                    "stage": "Harvest / Maturity",
                    "variety": "Ceylon Cinnamon",
                    "status": "mature"
                },
                "weather_conditions": current_weather,
                "recommendations": [
                    {
                        "activity": "Bark Harvesting",
                        "priority": "high",
                        "action": "Harvest cinnamon bark from shoots that are 2+ years old",
                        "reason": "Current weather conditions perfect for bark peeling - high humidity makes removal easier",
                        "trigger": f"Optimal humidity: {current_weather['humidity']}% & moderate temperature: {current_weather['temperature']}°C",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    },
                    {
                        "activity": "Post-Harvest Pruning",
                        "priority": "medium", 
                        "action": "Cut harvested shoots back to 15cm from ground level",
                        "reason": "Proper pruning encourages new shoot growth for next harvest cycle in 18-24 months",
                        "trigger": "After bark harvesting completion",
                        "suggested_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
                    },
                    {
                        "activity": "Quality Processing",
                        "priority": "high",
                        "action": "Process harvested bark immediately - scrape outer bark and dry inner bark",
                        "reason": "Fresh bark processing within 4-6 hours ensures premium quality and prevents spoilage",
                        "trigger": "Immediate post-harvest processing required",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    }
                ]
            },
            {
                "id": "demo-3",
                "title": "Growing Cinnamon Plot - Vegetative Stage", 
                "plot_info": {
                    "name": "Demo Plot C",
                    "area": "2.0 hectares",
                    "age": "420 days old", 
                    "stage": "Vegetative Growth",
                    "variety": "Ceylon Cinnamon",
                    "status": "growing"
                },
                "weather_conditions": current_weather,
                "recommendations": [
                    {
                        "activity": "Pest Monitoring",
                        "priority": "medium",
                        "action": "Inspect plants for leaf spot, scale insects, and stem borers",
                        "reason": "High humidity increases pest activity - early detection prevents major infestations",
                        "trigger": f"High humidity: {current_weather['humidity']}% promotes pest development",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    },
                    {
                        "activity": "Structural Pruning",
                        "priority": "medium",
                        "action": "Shape plants and remove weak/diseased branches to promote strong shoots",
                        "reason": "Proper structure development ensures better harvest yields in future cycles",
                        "trigger": f"Ideal temperature: {current_weather['temperature']}°C for plant recovery",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    },
                    {
                        "activity": "Soil Management",
                        "priority": "low",
                        "action": "Apply mulch around plants and check soil pH (ideal 6.0-7.0)",
                        "reason": "Maintain soil moisture and optimal pH for nutrient uptake",
                        "trigger": "Regular maintenance schedule - monthly soil care",
                        "suggested_date": datetime.utcnow().strftime("%Y-%m-%d")
                    }
                ]
            }
        ]
        
        return {
            "success": True,
            "message": f"Retrieved {len(demo_cards)} demo farm assistance cards",
            "data": demo_cards,
            "contact_info": {
                "support_center": "Cinnamon Research Center - Sri Lanka",
                "phone": "+94-11-2696734",
                "email": "info@cinnamonresearch.lk", 
                "website": "https://cinnamonresearch.lk",
                "address": "Cinnamon Research Station, Palolpitiya, Narammala, Sri Lanka",
                "working_hours": "Monday - Friday: 8:00 AM - 4:30 PM",
                "emergency_contact": "+94-77-1234567"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve demo cards: {str(e)}"
        )


@router.get("/contact-info")
async def get_contact_information():
    """Get contact information for Cinnamon Research Center"""
    return {
        "success": True,
        "data": {
            "support_center": "Cinnamon Research Center - Sri Lanka",
            "phone": "+94-11-2696734",
            "email": "info@cinnamonresearch.lk",
            "website": "https://cinnamonresearch.lk", 
            "address": "Cinnamon Research Station, Palolpitiya, Narammala, Sri Lanka",
            "working_hours": "Monday - Friday: 8:00 AM - 4:30 PM",
            "emergency_contact": "+94-77-1234567",
            "additional_resources": [
                {
                    "title": "Cinnamon Cultivation Guide", 
                    "url": "https://cinnamonresearch.lk/cultivation-guide",
                    "description": "Comprehensive guide for cinnamon farming"
                },
                {
                    "title": "Pest & Disease Management",
                    "url": "https://cinnamonresearch.lk/pest-management", 
                    "description": "Guidelines for managing common cinnamon pests and diseases"
                },
                {
                    "title": "Quality Standards & Processing",
                    "url": "https://cinnamonresearch.lk/quality-standards",
                    "description": "Ceylon Cinnamon quality standards and processing techniques"
                }
            ],
            "field_extension_officers": [
                {
                    "region": "Western Province",
                    "officer": "Mr. K.P. Silva",
                    "phone": "+94-77-2345678",
                    "email": "silva@cinnamonresearch.lk"
                },
                {
                    "region": "Southern Province", 
                    "officer": "Ms. N.R. Perera",
                    "phone": "+94-77-3456789",
                    "email": "perera@cinnamonresearch.lk"
                }
            ]
        }
    }


@router.get("/plots/realtime-updates/{user_id}")
async def get_realtime_plot_updates(
    user_id: int,
    session: Session = Depends(get_session)
):
    """Get real-time updates for all user plots with current status and recommendations"""
    try:
        # Get all plots with enhanced data including age calculations
        plotsWithAgeResponse = await get_plots_with_age_info(user_id, session)
        
        if not plotsWithAgeResponse.get("success"):
            raise HTTPException(status_code=404, detail="No plots found for user")
        
        plots_data = plotsWithAgeResponse["data"]
        
        # Enhance with real-time status updates
        realtime_updates = []
        for plot_data in plots_data:
            # Calculate status indicators
            days_old = plot_data["days_old"] 
            growth_stage = plot_data["growth_stage"]
            
            # Determine health status based on age and conditions
            health_status = "healthy"
            status_indicators = []
            
            if days_old <= 180:
                # Nursery stage - check for critical needs
                status_indicators.append({
                    "type": "water_needs",
                    "status": "monitor", 
                    "message": "Monitor soil moisture daily",
                    "priority": "medium"
                })
                if days_old < 30:
                    health_status = "critical"
                    status_indicators.append({
                        "type": "establishment",
                        "status": "critical",
                        "message": "Critical establishment period - monitor closely",
                        "priority": "high"
                    })
            elif days_old <= 540:
                # Vegetative growth - check for development needs
                status_indicators.append({
                    "type": "nutrition",
                    "status": "good",
                    "message": "Apply organic fertilizer monthly", 
                    "priority": "medium"
                })
                if days_old > 365:
                    status_indicators.append({
                        "type": "pruning",
                        "status": "action_needed",
                        "message": "Structural pruning recommended",
                        "priority": "medium"
                    })
            else:
                # Mature stage - harvest readiness
                if days_old >= 730:  # 2+ years
                    health_status = "harvest_ready"
                    status_indicators.append({
                        "type": "harvest",
                        "status": "ready",
                        "message": "Ready for bark harvesting",
                        "priority": "high"
                    })
                
            # Calculate productivity metrics
            expected_yield = 0
            if days_old >= 730:  # Mature enough for harvest
                # Basic yield calculation: ~2.5kg per hectare per year after 2 years
                years_mature = (days_old - 730) / 365
                expected_yield = plot_data["plot_area"] * 2.5 * (1 + years_mature * 0.1)
            
            realtime_updates.append({
                "plot_id": plot_data["plot_id"],
                "plot_name": plot_data["plot_name"],
                "farm_name": plot_data["farm_name"],
                "current_status": {
                    "health_status": health_status,
                    "days_old": days_old,
                    "growth_stage": growth_stage,
                    "progress_percentage": min(100, (days_old / 730) * 100),  # 100% at 2 years
                    "last_updated": datetime.utcnow().isoformat()
                },
                "status_indicators": status_indicators,
                "metrics": {
                    "plot_area": plot_data["plot_area"],
                    "seedling_count": plot_data["seedling_count"],
                    "expected_annual_yield_kg": round(expected_yield, 2),
                    "estimated_harvest_date": None if days_old < 730 else (
                        datetime.utcnow() + timedelta(days=30)
                    ).strftime("%Y-%m-%d")
                },
                "next_actions": [
                    indicator for indicator in status_indicators 
                    if indicator["priority"] in ["high", "critical"]
                ]
            })
        
        return {
            "success": True,
            "message": f"Retrieved real-time updates for {len(realtime_updates)} plots",
            "data": realtime_updates,
            "summary": {
                "total_plots": len(realtime_updates),
                "healthy_plots": len([p for p in realtime_updates if p["current_status"]["health_status"] == "healthy"]),
                "critical_plots": len([p for p in realtime_updates if p["current_status"]["health_status"] == "critical"]),
                "harvest_ready": len([p for p in realtime_updates if p["current_status"]["health_status"] == "harvest_ready"]),
                "total_area": sum(p["metrics"]["plot_area"] for p in realtime_updates),
                "last_sync": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get real-time plot updates: {str(e)}"
        )