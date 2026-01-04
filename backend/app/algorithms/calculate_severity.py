def calculate_severity(pred: dict, disease_info: dict) -> dict:
    """
    Algorithmic severity calculation based on multiple factors:
    - Model confidence
    - Disease category (Fungal, Bacterial, Pest, etc.)
    - Growth stage affected
    - Number of symptoms visible
    Returns a dict with severity level and description.
    """
    confidence = pred.get("confidence", 0)
    category = disease_info.get("category", "").lower()
    stages = disease_info.get("stages_affected", [])
    symptoms = disease_info.get("symptoms", [])

    # Base score from confidence
    score = confidence * 100

    # Add category weight
    if "fungal" in category:
        score += 5
    elif "bacterial" in category:
        score += 7
    elif "insect" in category or "pest" in category:
        score += 3
    elif "mite" in category:
        score += 2

    # Stage factor: nursery stage more critical
    if "Nursery" in stages:
        score += 5
    if "Mature" in stages:
        score += 2

    # Symptoms factor: more symptoms = higher severity
    score += min(len(symptoms), 5)  # cap to avoid exaggeration

    # Map score to severity levels
    if score >= 90:
        level = "Critical"
        desc = "Immediate intervention required; severe risk"
    elif score >= 75:
        level = "High"
        desc = "High likelihood; take action soon"
    elif score >= 60:
        level = "Moderate"
        desc = "Moderate risk; monitor and treat as needed"
    elif score >= 45:
        level = "Low"
        desc = "Low risk; preventive measures recommended"
    else:
        level = "Very Low"
        desc = "Negligible risk; continue monitoring"

    return {"level": level, "description": desc, "score": round(score, 1)}