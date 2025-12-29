import requests
from app.core.config import (
    PEST_DISEASE_ROBOFLOW_API_KEY,
    PEST_DISEASE_ROBOFLOW_WORKFLOW_ID,
    PEST_DISEASE_ROBOFLOW_API_URL,
)


class RoboflowWorkflowClient:
    def predict(self, image_path: str):
        url = f"{PEST_DISEASE_ROBOFLOW_API_URL}/{PEST_DISEASE_ROBOFLOW_WORKFLOW_ID}"
        params = {"api_key": PEST_DISEASE_ROBOFLOW_API_KEY}
        if not PEST_DISEASE_ROBOFLOW_API_KEY or PEST_DISEASE_ROBOFLOW_API_KEY == "your_api_key":
            raise requests.HTTPError("Roboflow API key is not configured", response=None)

        with open(image_path, "rb") as img:
            response = requests.post(url, params=params, files={"image": img}, timeout=15)

        response.raise_for_status()
        return response.json()
