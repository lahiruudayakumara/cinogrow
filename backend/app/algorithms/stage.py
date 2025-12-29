from app.enums.severity import SeverityLevel

def calculate_stage(area, confidence):
    if area > 35 or confidence >= 0.8:
        return SeverityLevel.HIGH
    if area >= 15 or confidence >= 0.6:
        return SeverityLevel.MEDIUM
    return SeverityLevel.LOW