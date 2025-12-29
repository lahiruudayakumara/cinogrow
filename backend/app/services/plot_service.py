"""
Plot service with cascade logic implementation
"""
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select
from datetime import datetime, timedelta

from app.services.base import BaseService, CascadeEvent, CascadeManager
from app.models.yield_weather.farm import Plot, PlotCreate, PlotUpdate, PlotRead
from app.models.yield_weather.farm import PlantingRecord, UserYieldRecord
from app.models.yield_weather.tree import Tree


class PlotService(BaseService):
    """Service for managing plots with proper cascade logic"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.cascade_manager = CascadeManager(db)
        self._register_cascade_handlers()
    
    def _register_cascade_handlers(self):
        """Register cascade handlers for plot-related events"""
        # When planting/yield records are created/deleted, update plot
        self.cascade_manager.register_handler(PlantingRecord, 'CREATE', self._on_planting_created)
        self.cascade_manager.register_handler(PlantingRecord, 'DELETE', self._on_planting_deleted)
        self.cascade_manager.register_handler(UserYieldRecord, 'CREATE', self._on_yield_created)
        self.cascade_manager.register_handler(UserYieldRecord, 'DELETE', self._on_yield_deleted)
        self.cascade_manager.register_handler(Tree, 'CREATE', self._on_tree_created)
        self.cascade_manager.register_handler(Tree, 'DELETE', self._on_tree_deleted)
    
    def create_plot(self, plot_data: PlotCreate) -> Plot:
        """Create a new plot"""
        plot = Plot(**plot_data.dict())
        plot.created_at = datetime.utcnow()
        plot.updated_at = datetime.utcnow()
        
        # Initialize computed fields
        plot.planting_records_count = 0
        plot.yield_records_count = 0
        plot.trees_count = 0
        plot.total_yield_kg = 0.0
        
        self.db.add(plot)
        self.db.commit()
        self.db.refresh(plot)
        
        # Trigger cascade event
        event = CascadeEvent('CREATE', Plot, plot.id, plot_data.dict())
        self.cascade_manager.trigger_cascade(event)
        
        return plot
    
    def update_plot(self, plot_id: int, plot_data: PlotUpdate) -> Plot:
        """Update an existing plot"""
        plot = self.get_plot(plot_id)
        
        # Update plot fields
        for field, value in plot_data.dict(exclude_unset=True).items():
            setattr(plot, field, value)
        
        plot.updated_at = datetime.utcnow()
        
        self.db.add(plot)
        self.db.commit()
        self.db.refresh(plot)
        
        # Trigger cascade event
        event = CascadeEvent('UPDATE', Plot, plot.id, plot_data.dict())
        self.cascade_manager.trigger_cascade(event)
        
        return plot
    
    def get_plot(self, plot_id: int) -> Plot:
        """Get a plot by ID"""
        plot = self.db.get(Plot, plot_id)
        if not plot:
            raise ValueError(f"Plot with ID {plot_id} not found")
        return plot
    
    def get_plots_by_farm(self, farm_id: int) -> List[Plot]:
        """Get all plots for a specific farm"""
        return list(self.db.exec(select(Plot).where(Plot.farm_id == farm_id)).all())
    
    def delete_plot(self, plot_id: int) -> Dict[str, str]:
        """Delete a plot (cascade handled by database FK constraints)"""
        plot = self.get_plot(plot_id)
        farm_id = plot.farm_id
        plot_name = plot.name
        
        # Trigger pre-delete cascade event
        event = CascadeEvent('DELETE', Plot, plot.id, {
            'farm_id': farm_id,
            'plot_name': plot_name
        })
        self.cascade_manager.trigger_cascade(event)
        
        # Database CASCADE will handle related records
        self.db.delete(plot)
        self.db.commit()
        
        return {"message": f"Plot '{plot_name}' and all associated data deleted successfully"}
    
    def update_after_planting(self, plot_id: int):
        """Update plot fields after a planting record is created"""
        plot = self.get_plot(plot_id)
        
        # Get latest planting record
        latest_planting = self.db.exec(
            select(PlantingRecord)
            .where(PlantingRecord.plot_id == plot_id)
            .order_by(PlantingRecord.planted_date.desc())
        ).first()
        
        if latest_planting:
            # Update plot planting information
            plot.planting_date = latest_planting.planted_date
            plot.cinnamon_variety = latest_planting.cinnamon_variety
            plot.seedling_count = latest_planting.seedling_count
            
            # Calculate age and expected harvest
            self._calculate_plot_age_and_harvest(plot, latest_planting.planted_date)
            
            # Update status if not already planted
            if plot.status == 'PREPARING':
                plot.status = 'PLANTED'
            elif plot.status == 'PLANTED':
                plot.status = 'GROWING'
        
        # Update count
        plot.planting_records_count = len(list(self.db.exec(
            select(PlantingRecord).where(PlantingRecord.plot_id == plot_id)
        ).all()))
        
        plot.last_planting_date = latest_planting.planted_date if latest_planting else None
        plot.updated_at = datetime.utcnow()
        
        self.db.add(plot)
        self.db.commit()
    
    def update_after_yield(self, plot_id: int):
        """Update plot fields after a yield record is created"""
        plot = self.get_plot(plot_id)
        
        # Get all yield records for this plot
        yield_records = list(self.db.exec(
            select(UserYieldRecord)
            .where(UserYieldRecord.plot_id == plot_id)
            .order_by(UserYieldRecord.yield_date.desc())
        ).all())
        
        if yield_records:
            # Update yield statistics
            plot.yield_records_count = len(yield_records)
            plot.total_yield_kg = sum(record.yield_amount for record in yield_records)
            plot.average_yield_per_harvest = plot.total_yield_kg / len(yield_records)
            plot.best_yield_kg = max(record.yield_amount for record in yield_records)
            plot.last_yield_date = yield_records[0].yield_date
            
            # Update status
            plot.status = 'HARVESTED'
            plot.progress_percentage = 100
        else:
            # No yield records
            plot.yield_records_count = 0
            plot.total_yield_kg = 0.0
            plot.average_yield_per_harvest = None
            plot.best_yield_kg = None
            plot.last_yield_date = None
        
        plot.updated_at = datetime.utcnow()
        
        self.db.add(plot)
        self.db.commit()
    
    def update_after_trees(self, plot_id: int):
        """Update plot fields after trees are added/removed"""
        plot = self.get_plot(plot_id)
        
        # Count trees
        trees_count = len(list(self.db.exec(
            select(Tree).where(Tree.plot_id == plot_id)
        ).all()))
        
        plot.trees_count = trees_count
        plot.updated_at = datetime.utcnow()
        
        self.db.add(plot)
        self.db.commit()
    
    def _calculate_plot_age_and_harvest(self, plot: Plot, planting_date: datetime):
        """Calculate plot age and expected harvest date"""
        now = datetime.utcnow()
        age_delta = now - planting_date
        plot.age_months = int(age_delta.days / 30.44)  # Average days per month
        
        # Cinnamon typically ready for harvest in 3-4 years (36-48 months)
        if plot.age_months >= 36:
            plot.expected_harvest_date = planting_date + timedelta(days=36*30)
            if plot.status == 'GROWING':
                plot.status = 'MATURE'
        else:
            plot.expected_harvest_date = planting_date + timedelta(days=36*30)
        
        # Calculate progress percentage
        if plot.age_months >= 36:
            plot.progress_percentage = 100
        else:
            plot.progress_percentage = min(int((plot.age_months / 36) * 100), 100)
    
    # Cascade handlers
    def _on_planting_created(self, event: CascadeEvent):
        """Handle planting record creation"""
        planting = self.db.get(PlantingRecord, event.source_id)
        if planting:
            self.update_after_planting(planting.plot_id)
    
    def _on_planting_deleted(self, event: CascadeEvent):
        """Handle planting record deletion"""
        if 'plot_id' in event.data:
            self.update_after_planting(event.data['plot_id'])
    
    def _on_yield_created(self, event: CascadeEvent):
        """Handle yield record creation"""
        yield_record = self.db.get(UserYieldRecord, event.source_id)
        if yield_record:
            self.update_after_yield(yield_record.plot_id)
    
    def _on_yield_deleted(self, event: CascadeEvent):
        """Handle yield record deletion"""
        if 'plot_id' in event.data:
            self.update_after_yield(event.data['plot_id'])
    
    def _on_tree_created(self, event: CascadeEvent):
        """Handle tree creation"""
        tree = self.db.get(Tree, event.source_id)
        if tree:
            self.update_after_trees(tree.plot_id)
    
    def _on_tree_deleted(self, event: CascadeEvent):
        """Handle tree deletion"""
        if 'plot_id' in event.data:
            self.update_after_trees(event.data['plot_id'])