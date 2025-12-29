import requests
from app.core.config import (
    PEST_DISEASE_ROBOFLOW_API_KEY,
    PEST_DISEASE_ROBOFLOW_WORKFLOW_ID,
    PEST_DISEASE_ROBOFLOW_API_URL
)


class RoboflowWorkflowClient:
    def __init__(self):
        self.api_key = PEST_DISEASE_ROBOFLOW_API_KEY
        self.workflow_id = PEST_DISEASE_ROBOFLOW_WORKFLOW_ID
        self.api_url = PEST_DISEASE_ROBOFLOW_API_URL

    def predict(self, image_path: str) -> dict:
        """
        Sends an image to the Roboflow workflow and returns predictions.
        """
        url = f"{self.api_url}/{self.workflow_id}"
        params = {"api_key": self.api_key}

        with open(image_path, "rb") as img:
            response = requests.post(url, params=params, files={"image": img})

        response.raise_for_status()
        return response.json()