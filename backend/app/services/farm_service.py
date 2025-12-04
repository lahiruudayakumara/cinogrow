"""
Farm service with cascade logic implementation
"""
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from datetime import datetime, timedelta

from app.services.base import BaseService, CascadeEvent, CascadeManager
from app.models.yield_weather.farm import Farm, FarmCreate, FarmRead
from app.models.yield_weather.farm import Plot, PlantingRecord, UserYieldRecord


class FarmService(BaseService):
    """Service for managing farms with proper cascade logic"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.cascade_manager = CascadeManager(db)
        self._register_cascade_handlers()
    
    def _register_cascade_handlers(self):
        """Register cascade handlers for farm-related events"""
        # When a plot is created/updated/deleted, update farm statistics
        self.cascade_manager.register_handler(Plot, 'CREATE', self._on_plot_created)
        self.cascade_manager.register_handler(Plot, 'UPDATE', self._on_plot_updated)
        self.cascade_manager.register_handler(Plot, 'DELETE', self._on_plot_deleted)
    
    def create_farm(self, farm_data: FarmCreate) -> Farm:
        """Create a new farm"""
        farm = Farm(**farm_data.dict())
        farm.created_at = datetime.utcnow()
        farm.updated_at = datetime.utcnow()
        
        self.db.add(farm)
        self.db.commit()
        self.db.refresh(farm)
        
        # Trigger cascade event
        event = CascadeEvent('CREATE', Farm, farm.id, farm_data.dict())
        self.cascade_manager.trigger_cascade(event)
        
        return farm
    
    def update_farm(self, farm_id: int, farm_data: FarmCreate) -> Farm:
        """Update an existing farm"""
        farm = self.get_farm(farm_id)
        
        # Store old data for cascade comparison
        old_data = {
            'location': farm.location,
            'latitude': farm.latitude,
            'longitude': farm.longitude,
            'total_area': farm.total_area
        }
        
        # Update farm fields
        for field, value in farm_data.dict().items():
            setattr(farm, field, value)
        
        farm.updated_at = datetime.utcnow()
        
        self.db.add(farm)
        self.db.commit()
        self.db.refresh(farm)
        
        # Trigger cascade event with old and new data
        event = CascadeEvent('UPDATE', Farm, farm.id, {
            'old_data': old_data,
            'new_data': farm_data.dict()
        })
        self.cascade_manager.trigger_cascade(event)
        
        return farm
    
    def get_farm(self, farm_id: int) -> Farm:
        """Get a farm by ID"""
        farm = self.db.get(Farm, farm_id)
        if not farm:
            raise ValueError(f"Farm with ID {farm_id} not found")
        return farm
    
    def get_farms(self) -> List[Farm]:
        """Get all farms"""
        return list(self.db.exec(select(Farm)).all())
    
    def delete_farm(self, farm_id: int) -> Dict[str, str]:
        """Delete a farm (cascade handled by database FK constraints)"""
        farm = self.get_farm(farm_id)
        
        # Get related data before deletion for cascade event
        plots = self.db.exec(select(Plot).where(Plot.farm_id == farm_id)).all()
        
        # Trigger pre-delete cascade event
        event = CascadeEvent('DELETE', Farm, farm.id, {
            'farm': farm,
            'affected_plots': [{'id': p.id, 'name': p.name} for p in plots]
        })
        self.cascade_manager.trigger_cascade(event)
        
        # Database CASCADE will handle related records
        self.db.delete(farm)
        self.db.commit()
        
        return {"message": f"Farm '{farm.name}' and all associated data deleted successfully"}
    
    def recalculate_farm_statistics(self, farm_id: int):
        """Recalculate computed fields for a farm"""
        farm = self.get_farm(farm_id)
        
        # Get all plots for this farm
        plots = self.db.exec(select(Plot).where(Plot.farm_id == farm_id)).all()
        
        # Calculate statistics
        farm.active_plots_count = len([p for p in plots if p.status in ['GROWING', 'HARVESTING', 'MATURE']])
        farm.num_plots = len(plots)  # Update actual plot count
        
        # Calculate total yield from all plots
        total_yield = sum(plot.total_yield_kg or 0 for plot in plots)
        farm.total_yield_kg = total_yield
        
        # Find last activity date
        last_activity_dates = []
        for plot in plots:
            if plot.last_yield_date:
                last_activity_dates.append(plot.last_yield_date)
            if plot.last_planting_date:
                last_activity_dates.append(plot.last_planting_date)
        
        if last_activity_dates:
            farm.last_activity_date = max(last_activity_dates)
        
        farm.updated_at = datetime.utcnow()
        
        self.db.add(farm)
        self.db.commit()
    
    # Cascade handlers
    def _on_plot_created(self, event: CascadeEvent):
        """Handle plot creation"""
        if hasattr(event.data, 'farm_id'):
            farm_id = event.data['farm_id']
        else:
            # Get plot to find farm_id
            plot = self.db.get(Plot, event.source_id)
            farm_id = plot.farm_id if plot else None
        
        if farm_id:
            self.recalculate_farm_statistics(farm_id)
    
    def _on_plot_updated(self, event: CascadeEvent):
        """Handle plot updates"""
        plot = self.db.get(Plot, event.source_id)
        if plot:
            self.recalculate_farm_statistics(plot.farm_id)
    
    def _on_plot_deleted(self, event: CascadeEvent):
        """Handle plot deletion"""
        if 'farm_id' in event.data:
            self.recalculate_farm_statistics(event.data['farm_id'])