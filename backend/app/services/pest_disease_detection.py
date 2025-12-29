import tempfile
import cv2

from app.core import RoboflowWorkflowClient
from app.algorithms.image_quality import is_image_good
from app.algorithms.cinnamon_check import is_cinnamon
from app.algorithms.area import calculate_area
from app.algorithms.stage import calculate_stage
from app.knowledge.knowledge_base import KB

class DetectionService:
    def __init__(self):
        self.client = RoboflowWorkflowClient()

    def process(self, image):
        if not is_image_good(image):
            return {"status": "invalid", "message": "Image quality not sufficient"}

        with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
            cv2.imwrite(tmp.name, image)
            result = self.client.predict(tmp.name)

        predictions = result.get("predictions", [])
        if not predictions:
            return {"status": "healthy"}

        labels = [p["class"] for p in predictions]
        if not is_cinnamon(labels):
            return {"status": "invalid", "message": "Not a cinnamon plant"}

        image_area = image.shape[0] * image.shape[1]
        area = calculate_area(predictions, image_area)
        avg_conf = sum(p["confidence"] for p in predictions) / len(predictions)
        stage = calculate_stage(area, avg_conf)

        results = []
        for label in set(labels):
            results.append({
                "name": label,
                "type": KB[label]["type"],
                "stage": stage,
                "confidence": round(avg_conf, 2)
            })

        return {
            "status": "infected",
            "stage": stage,
            "results": results
        }