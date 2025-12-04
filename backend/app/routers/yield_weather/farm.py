from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from app.db.session import get_session
from app.models.yield_weather.farm import (
    Farm, Plot, PlantingRecord, FarmActivity, UserYieldRecord, YieldPrediction,
    FarmCreate, FarmRead, PlotCreate, PlotUpdate, PlotRead,
    PlantingRecordCreate, PlantingRecordUpdate, PlantingRecordRead,
    UserYieldRecordCreate, UserYieldRecordUpdate, UserYieldRecordRead
)
from app.models.yield_weather.farm_assistance import ActivityHistory
from app.services.farm_service import FarmService
from app.services.plot_service import PlotService
from app.services.planting_service import PlantingRecordsService
from app.services.yield_service import YieldRecordsService
from app.utils.plot_status import calculate_plot_status, should_update_plot_status

router = APIRouter(tags=["yield-weather-farms"])


@router.post("/farms", response_model=FarmRead)
async def create_farm(farm_data: FarmCreate, db: Session = Depends(get_session)):
    """Create a new farm"""
    farm_service = FarmService(db)
    return farm_service.create_farm(farm_data)


@router.get("/farms", response_model=List[FarmRead])
async def get_farms(db: Session = Depends(get_session)):
    """Get all farms"""
    farm_service = FarmService(db)
    return farm_service.get_farms()


@router.get("/farms/{farm_id}", response_model=FarmRead)
async def get_farm(farm_id: int, db: Session = Depends(get_session)):
    """Get a specific farm by ID"""
    farm_service = FarmService(db)
    try:
        return farm_service.get_farm(farm_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/farms/{farm_id}", response_model=FarmRead)
async def update_farm(farm_id: int, farm_data: FarmCreate, db: Session = Depends(get_session)):
    """Update an existing farm"""
    farm_service = FarmService(db)
    try:
        return farm_service.update_farm(farm_id, farm_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/farms/{farm_id}")
async def delete_farm(farm_id: int, db: Session = Depends(get_session)):
    """Delete a farm and all its associated data (handled by CASCADE)"""
    farm_service = FarmService(db)
    try:
        return farm_service.delete_farm(farm_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/plots", response_model=PlotRead)
async def create_plot(plot_data: PlotCreate, db: Session = Depends(get_session)):
    """Create a new plot"""
    plot_service = PlotService(db)
    try:
        return plot_service.create_plot(plot_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create plot")


@router.get("/farms/{farm_id}/plots", response_model=List[PlotRead])
async def get_farm_plots(farm_id: int, db: Session = Depends(get_session)):
    """Get all plots for a specific farm"""
    plot_service = PlotService(db)
    try:
        return plot_service.get_plots_by_farm(farm_id)
    except Exception as e:
        print(f"Error in get_farm_plots: {e}")
        return []


@router.get("/plots/{plot_id}", response_model=PlotRead)
async def get_plot(plot_id: int, db: Session = Depends(get_session)):
    """Get a specific plot by ID"""
    try:
        plot = db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Plot not found")
        return plot
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_plot: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/plots/{plot_id}", response_model=PlotRead)
async def update_plot(plot_id: int, plot_data: PlotUpdate, db: Session = Depends(get_session)):
    """Update plot details (name, area, crop_type)"""
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    # Update plot fields
    for field, value in plot_data.dict(exclude_unset=True).items():
        setattr(plot, field, value)
    
    plot.updated_at = datetime.utcnow()
    db.add(plot)
    db.commit()
    db.refresh(plot)
    return plot


@router.put("/farms/{farm_id}/plots/areas")
async def update_plot_areas(farm_id: int, plots_data: List[PlotUpdate], db: Session = Depends(get_session)):
    """Update multiple plot areas with validation"""
    # Get farm to validate total area
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    # Calculate total area from all plots
    total_area = sum(plot_data.area for plot_data in plots_data if plot_data.area)
    
    # Validate total area doesn't exceed farm area
    if total_area > farm.total_area:
        raise HTTPException(
            status_code=400, 
            detail=f"Total plot area ({total_area} ha) exceeds farm area ({farm.total_area} ha)"
        )
    
    # Update all plots
    updated_plots = []
    for plot_data in plots_data:
        if plot_data.name:  # Use name to find plot if no ID
            plot = db.exec(
                select(Plot).where(Plot.farm_id == farm_id, Plot.name == plot_data.name)
            ).first()
        else:
            continue
            
        if plot:
            # Update existing plot
            if plot_data.area:
                plot.area = plot_data.area
            plot.updated_at = datetime.utcnow()
            db.add(plot)
            updated_plots.append(plot)
    
    db.commit()
    
    # Refresh all updated plots
    for plot in updated_plots:
        db.refresh(plot)
    
    return {"message": "Plot areas updated successfully", "plots": updated_plots}


@router.put("/plots/{plot_id}/status")
async def update_plot_status(
    plot_id: int, 
    status: str, 
    progress_percentage: int = None,
    db: Session = Depends(get_session)
):
    """Update plot status and progress"""
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    plot.status = status
    if progress_percentage is not None:
        plot.progress_percentage = max(0, min(100, progress_percentage))
    
    plot.updated_at = datetime.utcnow()
    
    db.add(plot)
    db.commit()
    db.refresh(plot)
    return {"message": "Plot status updated successfully", "plot": plot}


@router.delete("/plots/{plot_id}")
async def delete_plot(plot_id: int, db: Session = Depends(get_session)):
    """Delete a plot and all its associated records"""
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    farm_id = plot.farm_id
    
    # Delete all related records in the correct order (child tables first)
    
    # 1. Delete ActivityHistory records
    activity_histories = db.exec(select(ActivityHistory).where(ActivityHistory.plot_id == plot_id)).all()
    for history in activity_histories:
        db.delete(history)
    
    # 2. Delete YieldPrediction records
    yield_predictions = db.exec(select(YieldPrediction).where(YieldPrediction.plot_id == plot_id)).all()
    for prediction in yield_predictions:
        db.delete(prediction)
    
    # 3. Delete UserYieldRecord records
    user_yield_records = db.exec(select(UserYieldRecord).where(UserYieldRecord.plot_id == plot_id)).all()
    for yield_record in user_yield_records:
        db.delete(yield_record)
    
    # 4. Delete PlantingRecords
    planting_records = db.exec(select(PlantingRecord).where(PlantingRecord.plot_id == plot_id)).all()
    for record in planting_records:
        db.delete(record)
    
    # 5. Delete FarmActivities where plot_id matches
    farm_activities = db.exec(select(FarmActivity).where(FarmActivity.plot_id == plot_id)).all()
    for activity in farm_activities:
        db.delete(activity)
    
    # 6. Finally delete the plot itself
    db.delete(plot)
    db.commit()
    
    # Update farm's num_plots count
    farm = db.get(Farm, farm_id)
    if farm:
        plots_query = db.exec(select(Plot).where(Plot.farm_id == farm_id))
        actual_plots_count = len(list(plots_query))
        farm.num_plots = actual_plots_count
        farm.updated_at = datetime.utcnow()
        db.add(farm)
        db.commit()
    
    return {"message": "Plot deleted successfully"}


@router.get("/stats/dashboard")
async def get_dashboard_stats(db: Session = Depends(get_session)):
    """Get dashboard statistics"""
    # Get total farms and area
    farms = db.exec(select(Farm)).all()
    total_farms = len(farms)
    total_area = sum(farm.total_area for farm in farms)
    
    # Get plot statistics
    plots = db.exec(select(Plot)).all()
    active_plots = len([plot for plot in plots if plot.status in ["PLANTED", "GROWING", "MATURE"]])
    total_plots = len(plots)
    
    return {
        "total_farms": total_farms,
        "total_area": total_area,
        "active_plots": active_plots,
        "total_plots": total_plots,
        "farms": farms[:3] if farms else []  # Return first 3 farms for preview
    }


# Planting Records Routes

@router.post("/planting-records", response_model=PlantingRecordRead)
async def create_planting_record(record_data: PlantingRecordCreate, db: Session = Depends(get_session)):
    """Create a new planting record"""
    # Check if plot exists
    plot = db.get(Plot, record_data.plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    # Check if there's already a planting record for this plot
    existing_record = db.exec(
        select(PlantingRecord).where(PlantingRecord.plot_id == record_data.plot_id)
    ).first()
    
    if existing_record:
        raise HTTPException(
            status_code=400, 
            detail="A planting record already exists for this plot"
        )
    
    record = PlantingRecord(**record_data.dict())
    db.add(record)
    
    # Calculate and update plot status based on planting date
    plot_status_info = calculate_plot_status(record_data.planted_date)
    
    # Update plot status and related fields
    plot.status = plot_status_info["status"]
    plot.progress_percentage = plot_status_info["progress_percentage"]
    plot.age_months = plot_status_info["age_months"]  # Automatically calculate and store age
    plot.planting_date = record_data.planted_date
    plot.seedling_count = record_data.seedling_count
    plot.updated_at = datetime.utcnow()
    
    db.add(plot)
    db.commit()
    db.refresh(record)
    
    # Return with plot name
    result = PlantingRecordRead.from_orm(record)
    result.plot_name = plot.name
    return result


@router.get("/planting-records", response_model=List[PlantingRecordRead])
async def get_planting_records(user_id: int = None, db: Session = Depends(get_session)):
    """Get all planting records, optionally filtered by user"""
    query = select(PlantingRecord, Plot).join(Plot)
    
    if user_id:
        query = query.where(PlantingRecord.user_id == user_id)
    
    results = db.exec(query).all()
    
    # Convert results to include plot names
    records = []
    for record, plot in results:
        record_dict = PlantingRecordRead.from_orm(record).dict()
        record_dict['plot_name'] = plot.name
        records.append(PlantingRecordRead(**record_dict))
    
    return records


@router.get("/planting-records/{record_id}", response_model=PlantingRecordRead)
async def get_planting_record(record_id: int, db: Session = Depends(get_session)):
    """Get a specific planting record by ID"""
    result = db.exec(
        select(PlantingRecord, Plot)
        .join(Plot)
        .where(PlantingRecord.record_id == record_id)
    ).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Planting record not found")
    
    record, plot = result
    record_dict = PlantingRecordRead.from_orm(record).dict()
    record_dict['plot_name'] = plot.name
    return PlantingRecordRead(**record_dict)


@router.put("/planting-records/{record_id}", response_model=PlantingRecordRead)
async def update_planting_record(
    record_id: int, 
    record_update: PlantingRecordUpdate, 
    db: Session = Depends(get_session)
):
    """Update a planting record"""
    record = db.get(PlantingRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Planting record not found")
    
    # Get the associated plot
    plot = db.get(Plot, record.plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Associated plot not found")
    
    # Update only provided fields
    update_data = record_update.dict(exclude_unset=True)
    planted_date_updated = False
    
    for field, value in update_data.items():
        setattr(record, field, value)
        if field == "planted_date":
            planted_date_updated = True
    
    # Update timestamp
    record.updated_at = datetime.utcnow()
    
    # If planted_date was updated, recalculate plot status
    if planted_date_updated or "planted_date" in update_data:
        plot_status_info = calculate_plot_status(record.planted_date)
        
        # Only update if the calculated status is different or higher in hierarchy
        if should_update_plot_status(plot.status, plot_status_info["status"]):
            plot.status = plot_status_info["status"]
            plot.progress_percentage = plot_status_info["progress_percentage"]
            plot.age_months = plot_status_info["age_months"]  # Automatically calculate and store age
            plot.planting_date = record.planted_date
            
            # Update seedling count if provided
            if "seedling_count" in update_data:
                plot.seedling_count = record.seedling_count
                
            plot.updated_at = datetime.utcnow()
            db.add(plot)
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Return with plot name
    result = PlantingRecordRead.from_orm(record)
    result.plot_name = plot.name if plot else None
    return result


@router.delete("/planting-records/{record_id}")
async def delete_planting_record(record_id: int, db: Session = Depends(get_session)):
    """Delete a planting record"""
    record = db.get(PlantingRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Planting record not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Planting record deleted successfully"}


@router.get("/users/{user_id}/planting-records", response_model=List[PlantingRecordRead])
async def get_user_planting_records(user_id: int, db: Session = Depends(get_session)):
    """Get all planting records for a specific user"""
    results = db.exec(
        select(PlantingRecord, Plot)
        .join(Plot)
        .where(PlantingRecord.user_id == user_id)
        .order_by(PlantingRecord.planted_date.desc())
    ).all()
    
    # Convert results to include plot names
    records = []
    for record, plot in results:
        record_dict = PlantingRecordRead.from_orm(record).dict()
        record_dict['plot_name'] = plot.name
        records.append(PlantingRecordRead(**record_dict))
    
    return records


@router.get("/farms/{farm_id}/planting-records", response_model=List[PlantingRecordRead])
async def get_farm_planting_records(farm_id: int, db: Session = Depends(get_session)):
    """Get all planting records for a specific farm"""
    # First check if farm exists
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    try:
        results = db.exec(
            select(PlantingRecord, Plot)
            .join(Plot)
            .where(Plot.farm_id == farm_id)
            .order_by(PlantingRecord.planted_date.desc())
        ).all()
        
        # Convert results to include plot names
        records = []
        for record, plot in results:
            record_dict = PlantingRecordRead.from_orm(record).dict()
            record_dict['plot_name'] = plot.name
            records.append(PlantingRecordRead(**record_dict))
        
        return records
    except Exception as e:
        # Return empty list if there are no planting records or any other error
        print(f"Warning: Could not load planting records for farm {farm_id}: {e}")
        return []


@router.get("/plots/{plot_id}/planting-records", response_model=List[PlantingRecordRead])
async def get_plot_planting_records(plot_id: int, db: Session = Depends(get_session)):
    """Get all planting records for a specific plot"""
    # First check if plot exists
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    try:
        results = db.exec(
            select(PlantingRecord, Plot)
            .join(Plot)
            .where(PlantingRecord.plot_id == plot_id)
            .order_by(PlantingRecord.planted_date.desc())
        ).all()
        
        # Convert results to include plot names
        records = []
        for record, plot_data in results:
            record_dict = PlantingRecordRead.from_orm(record).dict()
            record_dict['plot_name'] = plot_data.name
            records.append(PlantingRecordRead(**record_dict))
        
        return records
    except Exception as e:
        # Return empty list if there are no planting records or any other error
        print(f"Warning: Could not load planting records for plot {plot_id}: {e}")
        return []


@router.post("/plots/sync-status-with-planting-records")
async def sync_plot_statuses_with_planting_records(db: Session = Depends(get_session)):
    """
    Sync all plot statuses with their planting records.
    This endpoint recalculates and updates plot status based on existing planting records.
    """
    # Get all planting records with their associated plots
    results = db.exec(
        select(PlantingRecord, Plot)
        .join(Plot)
        .order_by(PlantingRecord.planted_date.desc())
    ).all()
    
    updated_plots = []
    
    for record, plot in results:
        # Store original status for reporting
        original_status = plot.status
        
        # Calculate correct status based on planting date
        plot_status_info = calculate_plot_status(record.planted_date)
        
        # Check if plot needs status update
        if should_update_plot_status(plot.status, plot_status_info["status"]):
            plot.status = plot_status_info["status"]
            plot.progress_percentage = plot_status_info["progress_percentage"]
            plot.age_months = plot_status_info["age_months"]  # Automatically calculate and store age
            plot.planting_date = record.planted_date
            plot.seedling_count = record.seedling_count
            plot.updated_at = datetime.utcnow()
            
            db.add(plot)
            updated_plots.append({
                "plot_id": plot.id,
                "plot_name": plot.name,
                "old_status": original_status,
                "new_status": plot_status_info["status"],
                "progress_percentage": plot_status_info["progress_percentage"]
            })
    
    db.commit()
    
    return {
        "message": f"Successfully updated {len(updated_plots)} plots",
        "updated_plots": updated_plots
    }


@router.post("/plots/update-all-ages")
async def update_all_plot_ages(db: Session = Depends(get_session)):
    """
    Update age_months for all plots that have planting_date set.
    This endpoint recalculates and updates age based on planting dates.
    """
    # Get all plots that have planting_date
    plots_with_planting_date = db.exec(
        select(Plot).where(Plot.planting_date.is_not(None))
    ).all()
    
    updated_plots = []
    current_time = datetime.utcnow()
    
    for plot in plots_with_planting_date:
        if plot.planting_date:
            # Calculate new age
            time_diff = current_time - plot.planting_date
            days_diff = time_diff.days
            months_diff = days_diff / 30.44  # Average month length
            new_age_months = int(round(months_diff))
            
            # Store old age for reporting
            old_age_months = plot.age_months
            
            # Update age
            plot.age_months = new_age_months
            plot.updated_at = current_time
            
            db.add(plot)
            updated_plots.append({
                "plot_id": plot.id,
                "plot_name": plot.name,
                "planting_date": plot.planting_date.isoformat(),
                "old_age_months": old_age_months,
                "new_age_months": new_age_months,
                "calculated_days": days_diff
            })
    
    db.commit()
    
    return {
        "message": f"Successfully updated ages for {len(updated_plots)} plots",
        "updated_plots": updated_plots,
        "timestamp": current_time.isoformat()
    }


# ============================================================================
# USER YIELD RECORDS ENDPOINTS
# ============================================================================

@router.get("/users/{user_id}/yield-records", response_model=List[UserYieldRecordRead])
async def get_user_yield_records_by_user_id(user_id: int, db: Session = Depends(get_session)):
    """Get all yield records for a specific user"""
    results = db.exec(
        select(UserYieldRecord, Plot)
        .join(Plot)
        .where(UserYieldRecord.user_id == user_id)
        .order_by(UserYieldRecord.yield_date.desc())
    ).all()
    
    # Convert results to include plot names
    records = []
    for record, plot in results:
        record_dict = UserYieldRecordRead.from_orm(record).dict()
        record_dict['plot_name'] = plot.name
        records.append(UserYieldRecordRead(**record_dict))
    
    return records

@router.post("/yield-records", response_model=UserYieldRecordRead)
async def create_user_yield_record(record_data: UserYieldRecordCreate, db: Session = Depends(get_session)):
    """Create a new user yield record"""
    # Check if plot exists
    plot = db.get(Plot, record_data.plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    record = UserYieldRecord(**record_data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Return with plot name
    result = UserYieldRecordRead.from_orm(record)
    result.plot_name = plot.name
    return result

@router.get("/yield-records", response_model=List[UserYieldRecordRead])
async def get_user_yield_records(
    user_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    db: Session = Depends(get_session)
):
    """Get user yield records with optional filtering"""
    query = select(UserYieldRecord, Plot).join(Plot)
    
    if user_id:
        query = query.where(UserYieldRecord.user_id == user_id)
    
    if plot_id:
        query = query.where(UserYieldRecord.plot_id == plot_id)
    
    results = db.exec(query.order_by(UserYieldRecord.yield_date.desc())).all()
    
    # Convert results to include plot names
    records = []
    for record, plot in results:
        record_dict = UserYieldRecordRead.from_orm(record).dict()
        record_dict['plot_name'] = plot.name
        records.append(UserYieldRecordRead(**record_dict))
    
    return records

@router.put("/yield-records/{yield_id}", response_model=UserYieldRecordRead)
async def update_user_yield_record(
    yield_id: int,
    record_update: UserYieldRecordUpdate,
    db: Session = Depends(get_session)
):
    """Update a user yield record"""
    record = db.get(UserYieldRecord, yield_id)
    if not record:
        raise HTTPException(status_code=404, detail="Yield record not found")
    
    # Update only provided fields
    update_data = record_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_at = datetime.utcnow()
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Get plot name
    plot = db.get(Plot, record.plot_id)
    result = UserYieldRecordRead.from_orm(record)
    result.plot_name = plot.name if plot else None
    return result

@router.delete("/yield-records/{yield_id}")
async def delete_user_yield_record(yield_id: int, db: Session = Depends(get_session)):
    """Delete a user yield record"""
    record = db.get(UserYieldRecord, yield_id)
    if not record:
        raise HTTPException(status_code=404, detail="Yield record not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Yield record deleted successfully"}


# Predicted Yields Routes

@router.get("/users/{user_id}/predicted-yields")
async def get_predicted_yields(user_id: int, location: Optional[str] = None, db: Session = Depends(get_session)):
    """Get predicted yields for a user's plots"""
    # Get all farms belonging to the user
    farms = db.exec(select(Farm).where(Farm.user_id == user_id)).all()
    if not farms:
        return []
    
    predicted_yields = []
    
    for farm in farms:
        # Get all plots for this farm
        plots = db.exec(select(Plot).where(Plot.farm_id == farm.id)).all()
        
        for plot in plots:
            # Skip plots if location filter is provided and doesn't match
            if location and farm.location and location.lower() not in farm.location.lower():
                continue
                
            # Get the latest yield prediction for this plot
            latest_prediction = db.exec(
                select(YieldPrediction)
                .where(YieldPrediction.plot_id == plot.id)
                .order_by(YieldPrediction.prediction_date.desc())
            ).first()
            
            if latest_prediction:
                predicted_yields.append({
                    "plot_id": plot.id,
                    "plot_name": plot.plot_name,
                    "plot_area": plot.area or 0,
                    "predicted_yield": latest_prediction.predicted_yield,
                    "confidence_score": latest_prediction.confidence_score,
                    "prediction_source": "hybrid_model"
                })
            else:
                # If no prediction exists, provide a default based on plot area
                default_yield = (plot.area or 1) * 100  # 100kg per hectare as default
                predicted_yields.append({
                    "plot_id": plot.id,
                    "plot_name": plot.plot_name,
                    "plot_area": plot.area or 0,
                    "predicted_yield": default_yield,
                    "confidence_score": 0.5,
                    "prediction_source": "average"
                })
    
    return predicted_yields