from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class PestDiseaseDetectionResult(Base):
    __tablename__ = "pest_disease_detection_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    image_url = Column(String, nullable=True)
    name = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    recommendation = Column(Text, nullable=True)
    status = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    category = Column(String, nullable=True)
    affected_area = Column(String, nullable=True)
    symptoms = Column(Text, nullable=True)
    cause = Column(Text, nullable=True)
    life_cycle = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    message = Column(Text, nullable=True)
    advanced_score = Column(Integer, nullable=True)
    advanced_notes = Column(Text, nullable=True)
    advanced_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def __repr__(self):
        return (
            f"<PestDiseaseDetectionResult(id={self.id}, user_id={self.user_id}, image_url={self.image_url}, name={self.name}, severity={self.severity}, recommendation={self.recommendation}, status={self.status}, confidence={self.confidence}, category={self.category}, affected_area={self.affected_area}, symptoms={self.symptoms}, cause={self.cause}, life_cycle={self.life_cycle}, recommendations={self.recommendations}, message={self.message}, advanced_score={self.advanced_score}, advanced_notes={self.advanced_notes}, advanced_metadata={self.advanced_metadata}, created_at={self.created_at})>"
        )
