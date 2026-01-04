from app.knowledge import DISEASE_PEST_KNOWLEDGE
from app.algorithms import calculate_severity

def build_normal_output(pred):
    print("Predicted class:", pred["class"])
    disease = DISEASE_PEST_KNOWLEDGE.get(pred["class"])
    if not disease:
        return {"status": "invalid", "message": "Unknown disease detected"}

    return {
        "status": "infected",
        "name": disease["name"],
        "severity": calculate_severity(pred, disease)["level"],
        "confidence": round(pred["confidence"] * 100, 1),
        "recommendation": disease["recommendations"][0]
    }

def build_advanced_output(pred):
    print("Predicted class:", pred["class"])
    disease = DISEASE_PEST_KNOWLEDGE.get(pred["class"])
    if not disease:
        return {"status": "invalid", "message": "Unknown disease detected"}

    return {
        "status": "infected",
        "name": disease["name"],
        "category": disease["category"],
        "severity": calculate_severity(pred, disease)["level"],
        "confidence": round(pred["confidence"] * 100, 1),
        "affected_area": disease["affected_area"],
        "symptoms": disease["symptoms"],
        "cause": disease["cause"],
        "life_cycle": disease["life_cycle"],
        "recommendations": disease["recommendations"]
    }