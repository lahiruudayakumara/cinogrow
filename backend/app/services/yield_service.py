"""
Yield Records service with cascade logic implementation
"""
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from datetime import datetime

from app.services.base import BaseService, CascadeEvent, CascadeManager
from app.models.yield_weather.farm import UserYieldRecord, UserYieldRecordCreate, UserYieldRecordUpdate, UserYieldRecordRead


class YieldRecordsService(BaseService):
    """Service for managing yield records with proper cascade logic"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.cascade_manager = CascadeManager(db)
    
    def create_yield_record(self, record_data: UserYieldRecordCreate) -> UserYieldRecord:
        """Create a new yield record"""
        record = UserYieldRecord(**record_data.dict())
        record.created_at = datetime.utcnow()
        record.updated_at = datetime.utcnow()
        
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        
        # Trigger cascade event to update plot
        event = CascadeEvent('CREATE', UserYieldRecord, record.yield_id, record_data.dict())
        self.cascade_manager.trigger_cascade(event)
        
        return record
    
    def update_yield_record(self, record_id: int, record_data: UserYieldRecordUpdate) -> UserYieldRecord:
        """Update an existing yield record"""
        record = self.get_yield_record(record_id)
        
        # Update fields
        for field, value in record_data.dict(exclude_unset=True).items():
            setattr(record, field, value)
        
        record.updated_at = datetime.utcnow()
        
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        
        # Trigger cascade event to update plot
        event = CascadeEvent('UPDATE', UserYieldRecord, record.yield_id, record_data.dict())
        self.cascade_manager.trigger_cascade(event)
        
        return record
    
    def get_yield_record(self, record_id: int) -> UserYieldRecord:
        """Get a yield record by ID"""
        record = self.db.get(UserYieldRecord, record_id)
        if not record:
            raise ValueError(f"Yield record with ID {record_id} not found")
        return record
    
    def get_yield_records_by_user(self, user_id: int) -> List[UserYieldRecord]:
        """Get all yield records for a specific user"""
        return list(self.db.exec(select(UserYieldRecord).where(UserYieldRecord.user_id == user_id)).all())
    
    def get_yield_records_by_plot(self, plot_id: int) -> List[UserYieldRecord]:
        """Get all yield records for a specific plot"""
        return list(self.db.exec(select(UserYieldRecord).where(UserYieldRecord.plot_id == plot_id)).all())
    
    def delete_yield_record(self, record_id: int) -> Dict[str, str]:
        """Delete a yield record"""
        record = self.get_yield_record(record_id)
        plot_id = record.plot_id
        
        # Trigger pre-delete cascade event
        event = CascadeEvent('DELETE', UserYieldRecord, record.yield_id, {
            'plot_id': plot_id
        })
        self.cascade_manager.trigger_cascade(event)
        
        self.db.delete(record)
        self.db.commit()
        
        return {"message": "Yield record deleted successfully"}