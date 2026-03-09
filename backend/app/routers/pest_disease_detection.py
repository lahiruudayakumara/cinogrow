from fastapi import APIRouter, UploadFile, File, Query, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import traceback

from app.services import detect_pest_disease
from app.models.pest_disease.detection_result import PestDiseaseDetectionResult
from app.db import get_db

router = APIRouter(tags=["Detection"])

# --------------------------------------------------
# API Endpoint
# --------------------------------------------------
@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    mode: str = Query("normal", enum=["normal", "advanced"]),
    lang: str = Query("en", enum=["en", "si", "ta"]),
    user_id: str = Query("anonymous"),
    db: Session = Depends(get_db),
):
    try:
        result = await detect_pest_disease(
            file=file,
            mode=mode,
            lang=lang,
        )

        # Upsert: update if exists, else insert
        db_result = db.query(PestDiseaseDetectionResult).filter_by(user_id=user_id).first()
        if db_result is None:
            db_result = PestDiseaseDetectionResult(user_id=user_id)
            db.add(db_result)

        # Update all fields from result
        db_result.image_url = None
        db_result.name = result.get("name")
        db_result.severity = result.get("severity")
        # Always use 'recommendation' column for both basic and advanced
        if result.get("recommendations"):
            # If recommendations is a list, join as string
            recs = result.get("recommendations")
            if isinstance(recs, list):
                db_result.recommendation = ", ".join(recs)
            else:
                db_result.recommendation = str(recs)
        else:
            db_result.recommendation = result.get("recommendation")
        db_result.status = result.get("status")
        db_result.confidence = result.get("confidence")
        db_result.category = result.get("category")
        db_result.affected_area = result.get("affected_area")
        db_result.symptoms = ",".join(result.get("symptoms", [])) if result.get("symptoms") else None
        db_result.cause = result.get("cause")
        db_result.life_cycle = result.get("life_cycle")
        # Do not use the recommendations column for new data
        db_result.recommendations = None
        db_result.message = result.get("message")
        # If advanced fields are not present in result, set them to None
        # Only set advanced fields to None if not in advanced mode
        if mode == "advanced":
            db_result.advanced_score = result.get("advanced_score")
            db_result.advanced_notes = result.get("advanced_notes")
            db_result.advanced_metadata = result.get("advanced_metadata")
        else:
            db_result.advanced_score = None
            db_result.advanced_notes = None
            db_result.advanced_metadata = None

        db.commit()
        db.refresh(db_result)
        return result

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=502,
            content={
                "status": "error",
                "message": "Detection service failed",
                "details": str(e),
                "language": lang,
            },
        )