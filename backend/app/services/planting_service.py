"""
Planting Records service with cascade logic implementation
"""
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from datetime import datetime

from app.services.base import BaseService, CascadeEvent, CascadeManager
from app.models.yield_weather.farm import PlantingRecord, PlantingRecordCreate, PlantingRecordUpdate, PlantingRecordRead


class PlantingRecordsService(BaseService):
    """Service for managing planting records with proper cascade logic"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.cascade_manager = CascadeManager(db)
    
    def create_planting_record(self, record_data: PlantingRecordCreate) -> PlantingRecord:
        """Create a new planting record"""
        record = PlantingRecord(**record_data.dict())
        record.created_at = datetime.utcnow()
        record.updated_at = datetime.utcnow()
        
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        
        # Trigger cascade event to update plot
        event = CascadeEvent('CREATE', PlantingRecord, record.record_id, record_data.dict())
        self.cascade_manager.trigger_cascade(event)
        
        return record
    
    def update_planting_record(self, record_id: int, record_data: PlantingRecordUpdate) -> PlantingRecord:
        """Update an existing planting record"""
        record = self.get_planting_record(record_id)
        
        # Update fields
        for field, value in record_data.dict(exclude_unset=True).items():
            setattr(record, field, value)
        
        record.updated_at = datetime.utcnow()
        
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        
        # Trigger cascade event to update plot
        event = CascadeEvent('UPDATE', PlantingRecord, record.record_id, record_data.dict())
        self.cascade_manager.trigger_cascade(event)
        
        return record
    
    def get_planting_record(self, record_id: int) -> PlantingRecord:
        """Get a planting record by ID"""
        record = self.db.get(PlantingRecord, record_id)
        if not record:
            raise ValueError(f"Planting record with ID {record_id} not found")
        return record
    
    def get_planting_records_by_user(self, user_id: int) -> List[PlantingRecord]:
        """Get all planting records for a specific user"""
        return list(self.db.exec(select(PlantingRecord).where(PlantingRecord.user_id == user_id)).all())
    
    def get_planting_records_by_plot(self, plot_id: int) -> List[PlantingRecord]:
        """Get all planting records for a specific plot"""
        return list(self.db.exec(select(PlantingRecord).where(PlantingRecord.plot_id == plot_id)).all())
    
    def delete_planting_record(self, record_id: int) -> Dict[str, str]:
        """Delete a planting record"""
        record = self.get_planting_record(record_id)
        plot_id = record.plot_id
        
        # Trigger pre-delete cascade event
        event = CascadeEvent('DELETE', PlantingRecord, record.record_id, {
            'plot_id': plot_id
        })
        self.cascade_manager.trigger_cascade(event)
        
        self.db.delete(record)
        self.db.commit()
        
        return {"message": "Planting record deleted successfully"}