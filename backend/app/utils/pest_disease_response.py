from app.knowledge import DISEASE_PEST_KNOWLEDGE
from app.algorithms import calculate_severity


def _resolve_language(disease: dict, lang: str):
    """
    Resolve language-specific fields safely.
    """
    if lang == "en":
        return disease

    translations = disease.get("translations", {})
    localized = translations.get(lang)

    if not localized:
        return disease  # fallback to English

    return {
        **disease,
        "name": localized.get("name", disease["name"]),
        "category": localized.get("category", disease.get("category")),
        "affected_area": localized.get("affected_area", disease.get("affected_area")),
        "symptoms": localized.get("symptoms", disease.get("symptoms")),
        "cause": localized.get("cause", disease.get("cause")),
        "life_cycle": localized.get("life_cycle", disease.get("life_cycle")),
        "recommendations": localized.get(
            "recommendations", disease.get("recommendations")
        ),
    }


# --------------------------------------------------
# Normal Output
# --------------------------------------------------
def build_normal_output(pred, lang: str = "en"):
    print("Predicted class:", pred["class"])

    disease = DISEASE_PEST_KNOWLEDGE.get(pred["class"])
    if not disease:
        return {
            "status": "invalid",
            "message": "Unknown disease detected",
            "language": lang,
        }

    disease = _resolve_language(disease, lang)
    severity = calculate_severity(pred, disease, lang)

    return {
        "status": "infected",
        "name": disease["name"],
        "severity": severity["level"],
        "confidence": round(pred["confidence"] * 100, 1),
        "recommendation": disease["recommendations"][0],
        "language": lang,
    }


# --------------------------------------------------
# Advanced Output
# --------------------------------------------------
def build_advanced_output(pred, lang: str = "en"):
    print("Predicted class:", pred["class"])

    disease = DISEASE_PEST_KNOWLEDGE.get(pred["class"])
    if not disease:
        return {
            "status": "invalid",
            "message": "Unknown disease detected",
            "language": lang,
        }

    disease = _resolve_language(disease, lang)
    severity = calculate_severity(pred, disease, lang)

    return {
        "status": "infected",
        "name": disease["name"],
        "category": disease["category"],
        "severity": severity["level"],
        "confidence": round(pred["confidence"] * 100, 1),
        "affected_area": disease["affected_area"],
        "symptoms": disease.get("symptoms"),
        "cause": disease.get("cause"),
        "life_cycle": disease.get("life_cycle"),
        "recommendations": disease.get("recommendations"),
        "language": lang,
    }