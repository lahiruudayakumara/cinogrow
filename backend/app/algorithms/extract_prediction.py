def extract_prediction(result, knowledge_base):
    """
    Extracts the most relevant prediction from Roboflow results using an algorithmic approach:
    - Filters unknown classes
    - Selects the highest weighted prediction
    - Returns class, confidence, and optional multiple matches
    """
    try:
        predictions = result[0]["model_predictions"]["predictions"]
        if not predictions:
            return None

        # Filter only known classes from knowledge base
        known_predictions = [p for p in predictions if p["class"] in knowledge_base]
        if not known_predictions:
            return None

        # Sort by confidence descending
        known_predictions.sort(key=lambda x: x["confidence"], reverse=True)

        # Optionally, combine top 2 predictions for more algorithmic effect
        top = known_predictions[:2]
        combined_confidence = sum(p["confidence"] for p in top) / len(top)
        selected_class = top[0]["class"]

        return {
            "class": selected_class,
            "confidence": combined_confidence,
            "top_predictions": [{"class": p["class"], "confidence": p["confidence"]} for p in top]
        }

    except Exception as e:
        print(f"Prediction extraction failed: {e}")
        return None