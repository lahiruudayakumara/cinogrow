def calculate_severity(pred: dict, disease_info: dict, lang: str = "en") -> dict:
    """
    Calculate severity and return localized level and description.
    """
    confidence = pred.get("confidence", 0)
    category = disease_info.get("category", "").lower()
    stages = disease_info.get("stages_affected", [])
    symptoms = disease_info.get("symptoms", [])

    # Base score from confidence
    score = confidence * 100

    # Category weight
    if "fungal" in category:
        score += 5
    elif "bacterial" in category:
        score += 7
    elif "insect" in category or "pest" in category:
        score += 3
    elif "mite" in category:
        score += 2

    # Stage factor
    if "Nursery" in stages:
        score += 5
    if "Mature" in stages:
        score += 2

    # Symptoms factor
    score += min(len(symptoms), 5)

    # Determine severity level
    if score >= 90:
        level_key = "Critical"
    elif score >= 75:
        level_key = "High"
    elif score >= 60:
        level_key = "Moderate"
    elif score >= 45:
        level_key = "Low"
    else:
        level_key = "Very Low"

    # Localized levels
    level_translations = {
        "Critical": {"en": "Critical", "si": "ගැඹුරු", "ta": "மிகவுமாக"},
        "High": {"en": "High", "si": "ඉහළ", "ta": "உயர்"},
        "Moderate": {"en": "Moderate", "si": "මධ්‍යම", "ta": "மிதமான"},
        "Low": {"en": "Low", "si": "අඩු", "ta": "குறைந்த"},
        "Very Low": {"en": "Very Low", "si": "ඉතා අඩු", "ta": "மிகக் குறைந்த"}
    }

    # Localized descriptions
    descriptions = {
        "Critical": {
            "en": "Immediate intervention required; severe risk",
            "si": "තහවුරු කළ ක්‍රියාමාර්ග අවශ්‍යයි; දැඩි අවදානමක්",
            "ta": "மிகவுமாகச் செயல்பாடு தேவை; கடுமையான ஆபத்து"
        },
        "High": {
            "en": "High likelihood; take action soon",
            "si": "ඉහළ අවදානමක්; ඉක්මනින් ක්‍රියා කරන්න",
            "ta": "உயர் வாய்ப்பு; விரைவில் நடவடிக்கை எடுக்கவும்"
        },
        "Moderate": {
            "en": "Moderate risk; monitor and treat as needed",
            "si": "මධ්‍යම අවදානමක්; අවශ්‍ය පරිදි නිරීක්ෂණය සහ ප්‍රතිකාර කරන්න",
            "ta": "மிதமான ஆபத்து; தேவையான பட்சத்தில் கண்காணித்து சிகிச்சை செய்யவும்"
        },
        "Low": {
            "en": "Low risk; preventive measures recommended",
            "si": "අඩු අවදානමක්; ප්‍රතිරෝධාත්මක ක්‍රියාමාර්ග යෝජිතයි",
            "ta": "குறைந்த ஆபத்து; தடுப்பு நடவடிக்கைகள் பரிந்துரைக்கப்படுகிறது"
        },
        "Very Low": {
            "en": "Negligible risk; continue monitoring",
            "si": "අවධානම අඩුයි; නිරීක්ෂණය කරගෙන යන්න",
            "ta": "மிகக் குறைந்த ஆபத்து; கண்காணிப்பை தொடரவும்"
        }
    }

    return {
        "level": level_translations[level_key].get(lang, level_translations[level_key]["en"]),
        "description": descriptions[level_key].get(lang, descriptions[level_key]["en"]),
        "score": round(score, 1)
    }