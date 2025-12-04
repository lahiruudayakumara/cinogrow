"""
Base service class for implementing cascade logic and business rules
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type
from sqlmodel import Session, SQLModel, select
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class BaseService(ABC):
    """Base service class with common cascade logic patterns"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def commit(self):
        """Commit database transaction"""
        self.db.commit()
    
    def rollback(self):
        """Rollback database transaction"""
        self.db.rollback()


class CascadeEvent:
    """Represents a cascade event that triggers related updates"""
    
    def __init__(self, 
                 event_type: str, 
                 source_model: Type[SQLModel], 
                 source_id: int, 
                 data: Dict[str, Any] = None):
        self.event_type = event_type  # CREATE, UPDATE, DELETE
        self.source_model = source_model
        self.source_id = source_id
        self.data = data or {}
        self.timestamp = datetime.utcnow()
    
    def __repr__(self):
        return f"CascadeEvent({self.event_type}, {self.source_model.__name__}, {self.source_id})"


class CascadeManager:
    """Manages cascade operations across all services"""
    
    def __init__(self, db: Session):
        self.db = db
        self._handlers = {}
    
    def register_handler(self, 
                        source_model: Type[SQLModel], 
                        event_type: str, 
                        handler_func):
        """Register a cascade handler for a specific model and event"""
        key = (source_model, event_type)
        if key not in self._handlers:
            self._handlers[key] = []
        self._handlers[key].append(handler_func)
    
    def trigger_cascade(self, event: CascadeEvent):
        """Trigger all registered cascade handlers for an event"""
        key = (event.source_model, event.event_type)
        handlers = self._handlers.get(key, [])
        
        logger.info(f"Triggering {len(handlers)} cascade handlers for {event}")
        
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Cascade handler failed: {handler.__name__}: {e}")
                raise