from pydantic import BaseModel
from typing import List, Optional
from app.enums.severity.enum import SeverityLevel

class DetectionItem(BaseModel):
    type: str
    name: str
    category: str
    severity: SeverityLevel
    confidence: float
    affected_area: str
    symptoms: List[str]
    cause: str
    life_cycle: str
    prevention: List[str]
    recommendations: List[str]

class DetectResponse(BaseModel):
    status: str
    overall_severity: Optional[SeverityLevel]
    results: Optional[List[DetectionItem]]