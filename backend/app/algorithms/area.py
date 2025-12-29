def calculate_area(predictions, image_area):
    total = 0
    for p in predictions:
        total += p["width"] * p["height"]
    return (total / image_area) * 100