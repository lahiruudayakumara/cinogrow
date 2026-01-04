import os
from tempfile import NamedTemporaryFile
from typing import Optional
from PIL import Image

from inference_sdk import InferenceHTTPClient

from app.algorithms import extract_prediction, analyze_leaf_with_algorithms
from app.knowledge import DISEASE_PEST_KNOWLEDGE
from app.utils import build_normal_output, build_advanced_output
from app.core.config import (
    PEST_DISEASE_ROBOFLOW_API_KEY,
    PEST_DISEASE_ROBOFLOW_API_URL,
    PEST_DISEASE_ROBOFLOW_WORKSPACE,
    PEST_DISEASE_ROBOFLOW_WORKFLOW_ID,
)

# --------------------------------------------------
# Roboflow Client
# --------------------------------------------------
client = InferenceHTTPClient(
    api_url=PEST_DISEASE_ROBOFLOW_API_URL,
    api_key=PEST_DISEASE_ROBOFLOW_API_KEY,
)

# --------------------------------------------------
# Core Service Logic
# --------------------------------------------------
async def detect_pest_disease(file, mode: str):
    temp_path = None

    try:
        # Save uploaded image
        with NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(await file.read())
            temp_path = tmp.name

        pred: Optional[dict] = None

        # ---------------------------
        # 1️⃣ Roboflow Workflow
        # ---------------------------
        try:
            result = client.run_workflow(
                workspace_name=PEST_DISEASE_ROBOFLOW_WORKSPACE,
                workflow_id=PEST_DISEASE_ROBOFLOW_WORKFLOW_ID,
                images={"image": temp_path},
                use_cache=True,
            )
            pred = extract_prediction(result, DISEASE_PEST_KNOWLEDGE)
        except Exception:
            pred = None

        # ---------------------------
        # 2️⃣ Algorithm fallback
        # ---------------------------
        if not pred:
            try:
                with Image.open(temp_path) as img:
                    alg_preds = analyze_leaf_with_algorithms(img)

                known = [
                    p for p in alg_preds
                    if p.get("class") in DISEASE_PEST_KNOWLEDGE
                ]

                if known:
                    region_order = {
                        "leaf": 0,
                        "stem": 1,
                        "bark": 2,
                        "branch": 3,
                    }
                    known.sort(
                        key=lambda p: (
                            region_order.get(p.get("region", "leaf"), 99),
                            -(p.get("confidence") or 0),
                        )
                    )
                    pred = {
                        "class": known[0]["class"],
                        "confidence": float(known[0].get("confidence", 0.0)),
                    }
            except Exception:
                pred = None

        if not pred:
            return {"status": "invalid", "message": "No disease detected"}

        # ---------------------------
        # Output Mode
        # ---------------------------
        if mode == "advanced":
            return build_advanced_output(pred)

        return build_normal_output(pred)

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)