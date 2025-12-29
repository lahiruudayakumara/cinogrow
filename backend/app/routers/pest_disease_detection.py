from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from requests.exceptions import HTTPError
from app.services import DetectionService
from app.utils import load_image

router = APIRouter(tags=["Detection"])
service = DetectionService()

@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = load_image(image_bytes)
    except ValueError as e:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(e)})

    try:
        result = service.process(image)
        return result
    except HTTPError as e:
        status = e.response.status_code if e.response is not None else 502
        message = "Upstream detection service error"
        if status == 401:
            message = "Upstream detection service unauthorized. Check API key configuration."
        return JSONResponse(status_code=502, content={"status": "error", "message": message})
    except Exception:
        return JSONResponse(status_code=500, content={"status": "error", "message": "Internal server error"})