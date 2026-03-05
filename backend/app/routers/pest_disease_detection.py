from fastapi import APIRouter, UploadFile, File, Query
from fastapi.responses import JSONResponse
import traceback

from app.services import detect_pest_disease

router = APIRouter(tags=["Detection"])

# --------------------------------------------------
# API Endpoint
# --------------------------------------------------
@router.post("/detect")
async def detect(
    file: UploadFile = File(...),
    mode: str = Query("normal", enum=["normal", "advanced"]),
    lang: str = Query("en", enum=["en", "si", "ta"]),
):
    try:
        return await detect_pest_disease(
            file=file,
            mode=mode,
            lang=lang,
        )

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