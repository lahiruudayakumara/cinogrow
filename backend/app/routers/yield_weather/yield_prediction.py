from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.db.session import get_session
from app.models.yield_weather.farm import (
    UserYieldRecord, 
    Plot,
    UserYieldRecordCreate, 
    UserYieldRecordUpdate, 
    UserYieldRecordRead
)

router = APIRouter(tags=["yield-prediction"])

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