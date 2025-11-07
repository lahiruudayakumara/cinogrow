from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime
from app.database import get_db
from app.models.yield_weather.farm import (
    Farm, Plot, PlantingRecord, FarmActivity, UserYieldRecord, YieldPrediction,
    FarmCreate, FarmRead, PlotCreate, PlotUpdate, PlotRead,
    PlantingRecordCreate, PlantingRecordUpdate, PlantingRecordRead
)
from app.models.yield_weather.farm_assistance import ActivityHistory

router = APIRouter(tags=["yield-weather-farms"])


@router.post("/farms", response_model=FarmRead)
async def create_farm(farm_data: FarmCreate, db: Session = Depends(get_db)):
    """Create a new farm"""
    farm = Farm(**farm_data.dict())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.get("/farms", response_model=List[FarmRead])
async def get_farms(db: Session = Depends(get_db)):
    """Get all farms"""
    farms = db.exec(select(Farm)).all()
    return farms


@router.get("/farms/{farm_id}", response_model=FarmRead)
async def get_farm(farm_id: int, db: Session = Depends(get_db)):
    """Get a specific farm by ID"""
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    return farm


@router.put("/farms/{farm_id}", response_model=FarmRead)
async def update_farm(farm_id: int, farm_data: FarmCreate, db: Session = Depends(get_db)):
    """Update an existing farm"""
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    # Get current plot count
    plots_query = db.exec(select(Plot).where(Plot.farm_id == farm_id))
    actual_plots_count = len(list(plots_query))
    
    # Update farm fields
    for field, value in farm_data.dict().items():
        setattr(farm, field, value)
    
    # Keep the num_plots value from the frontend request
    # This allows the frontend to manage plot count changes properly
    # The actual plot creation/deletion should be handled separately
    
    farm.updated_at = datetime.utcnow()
    
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.delete("/farms/{farm_id}")
async def delete_farm(farm_id: int, db: Session = Depends(get_db)):
    """Delete a farm and all its associated activities and plots"""
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    # Delete all farm activities associated with the farm first
    farm_activities = db.exec(select(FarmActivity).where(FarmActivity.farm_id == farm_id)).all()
    for activity in farm_activities:
        db.delete(activity)
    
    # Delete all plots associated with the farm
    plots = db.exec(select(Plot).where(Plot.farm_id == farm_id)).all()
    for plot in plots:
        db.delete(plot)
    
    # Delete the farm
    db.delete(farm)
    db.commit()
    
    return {"message": "Farm and all associated activities and plots deleted successfully"}


@router.post("/plots", response_model=PlotRead)
async def create_plot(plot_data: PlotCreate, db: Session = Depends(get_db)):
    """Create a new plot"""
    # Check if farm exists
    farm = db.get(Farm, plot_data.farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    plot = Plot(**plot_data.dict())
    db.add(plot)
    db.commit()
    db.refresh(plot)
    
    # Update farm's num_plots count
    plots_query = db.exec(select(Plot).where(Plot.farm_id == plot_data.farm_id))
    actual_plots_count = len(list(plots_query))
    farm.num_plots = actual_plots_count
    farm.updated_at = datetime.utcnow()
    db.add(farm)
    db.commit()
    
    return plot


@router.get("/farms/{farm_id}/plots", response_model=List[PlotRead])
async def get_farm_plots(farm_id: int, db: Session = Depends(get_db)):
    """Get all plots for a specific farm"""
    farm = db.get(Farm, farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    plots = db.exec(select(Plot).where(Plot.farm_id == farm_id)).all()
    return plots


@router.get("/plots/{plot_id}", response_model=PlotRead)
async def get_plot(plot_id: int, db: Session = Depends(get_db)):
    """Get a specific plot by ID"""
    plot = db.get(Plot, plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    return plot


@router.put("/plots/{plot_id}", response_model=PlotRead)
async def update_plot(plot_id: int, plot_data: PlotUpdate, db: Session = Depends(get_db)):
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


@router.put("/plots/{plot_id}/status")
async def update_plot_status(
    plot_id: int, 
    status: str, 
    progress_percentage: int = None,
    db: Session = Depends(get_db)
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
async def delete_plot(plot_id: int, db: Session = Depends(get_db)):
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
async def get_dashboard_stats(db: Session = Depends(get_db)):
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
async def create_planting_record(record_data: PlantingRecordCreate, db: Session = Depends(get_db)):
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
    db.commit()
    db.refresh(record)
    
    # Return with plot name
    result = PlantingRecordRead.from_orm(record)
    result.plot_name = plot.name
    return result


@router.get("/planting-records", response_model=List[PlantingRecordRead])
async def get_planting_records(user_id: int = None, db: Session = Depends(get_db)):
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
async def get_planting_record(record_id: int, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db)
):
    """Update a planting record"""
    record = db.get(PlantingRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Planting record not found")
    
    # Update only provided fields
    update_data = record_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    # Update timestamp
    record.updated_at = datetime.utcnow()
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Get plot name
    plot = db.get(Plot, record.plot_id)
    result = PlantingRecordRead.from_orm(record)
    result.plot_name = plot.name if plot else None
    return result


@router.delete("/planting-records/{record_id}")
async def delete_planting_record(record_id: int, db: Session = Depends(get_db)):
    """Delete a planting record"""
    record = db.get(PlantingRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Planting record not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Planting record deleted successfully"}


@router.get("/users/{user_id}/planting-records", response_model=List[PlantingRecordRead])
async def get_user_planting_records(user_id: int, db: Session = Depends(get_db)):
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