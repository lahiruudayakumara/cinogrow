from roboflow import Roboflow
from app.core.config import ROBOFLOW_API_KEY, ROBOFLOW_MODEL, CONF_THRESHOLD
import cv2
import numpy as np

class RoboflowModel:
    def __init__(self):
        rf = Roboflow(api_key=ROBOFLOW_API_KEY)
        workspace, project_name, version = ROBOFLOW_MODEL.split("/")
        project = rf.workspace(workspace).project(project_name)
        self.model = project.version(int(version)).model

    def detect(self, image: np.ndarray):
        success, encoded_image = cv2.imencode('.jpg', image)
        if not success:
            return []
        results = self.model.predict(encoded_image.tobytes(), confidence=CONF_THRESHOLD)
        return results.json().get('predictions', [])