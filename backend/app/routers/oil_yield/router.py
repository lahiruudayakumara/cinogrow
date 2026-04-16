import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.oil_yield import (
    OilYieldInput, OilYieldOutput,
    PriceForecastOutput,
    MaterialBatchCreate, MaterialBatchUpdate, MaterialBatchRead,
    OilYieldPredictionCreate, OilYieldPredictionRead,
)
from app.services.oil.oil_yield_service import predict_oil_yield
import logging
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.oil_yield.material_batch import MaterialBatch
from app.models.oil_yield.predictions import (
    OilYieldPrediction,
)

router = APIRouter(prefix="/oil_yield", tags=["Oil Yield"])
logger = logging.getLogger(__name__)


@router.post("/predict", response_model=OilYieldOutput)
def predict_yield(data: OilYieldInput):
    try:
        result = predict_oil_yield(
            dried_mass_kg=data.dried_mass_kg,
            species_variety=data.species_variety,
            harvesting_season=data.harvesting_season
        )
        return result
    except ValueError as e:
        logger.warning(f"Validation error in oil yield prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in oil yield prediction: {e}")
        raise HTTPException(status_code=500, detail="Failed to predict oil yield")


@router.post("/predict/batch/{batch_id}", response_model=OilYieldOutput)
def predict_yield_for_batch(batch_id: int, session: Session = Depends(get_session)):
    batch = session.get(MaterialBatch, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    if batch.dried_mass_kg is None or batch.dried_mass_kg <= 0:
        raise HTTPException(status_code=400, detail="Batch has no valid dried_mass_kg for prediction")

    try:
        result = predict_oil_yield(
            dried_mass_kg=batch.dried_mass_kg,
            species_variety=batch.cinnamon_type,
            harvesting_season=batch.harvest_season,
        )
        return result
    except ValueError as e:
        logger.warning(f"Validation error in batch-based oil yield prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in batch-based oil yield prediction: {e}")
        raise HTTPException(status_code=500, detail="Failed to predict oil yield for batch")


@router.post("/predictions", response_model=OilYieldPredictionRead, status_code=201)
def save_yield_prediction(payload: OilYieldPredictionCreate, session: Session = Depends(get_session)):
    """Persist a predicted oil yield for a batch.

    This endpoint is called by the mobile app after a successful prediction
    to store the details for later display.
    """
    summary = payload.input_summary or {}
    rec     = payload.recommendation or {}

    existing = session.exec(
        select(OilYieldPrediction).where(OilYieldPrediction.batch_id == payload.batch_id)
    ).first()

    try:
        if existing:
            row = existing
            row.predicted_yield_kg = payload.predicted_yield_kg
            row.dried_mass_kg      = summary.get("dried_mass_kg", 0.0)
            row.species_variety    = summary.get("species_variety", "")
            row.age_years          = summary.get("age_years", 0.0)
            row.harvesting_season  = summary.get("harvesting_season", "")
            row.recommendation_primary = rec.get("primary", "")
            row.recommendation_tips    = json.dumps(rec.get("tips", []))
            row.recommendation_quality = rec.get("quality", "")
            row.predicted_at           = datetime.fromisoformat(payload.predicted_at)
        else:
            row = OilYieldPrediction(
                batch_id=payload.batch_id,
                predicted_yield_kg=payload.predicted_yield_kg,
                dried_mass_kg=summary.get("dried_mass_kg", 0.0),
                species_variety=summary.get("species_variety", ""),
                age_years=summary.get("age_years", 0.0),
                harvesting_season=summary.get("harvesting_season", ""),
                recommendation_primary=rec.get("primary", ""),
                recommendation_tips=json.dumps(rec.get("tips", [])),
                recommendation_quality=rec.get("quality", ""),
                predicted_at=datetime.fromisoformat(payload.predicted_at),
            )

        session.add(row)
        session.commit()
        session.refresh(row)
        return row
    except Exception as e:
        session.rollback()
        logger.error(f"Failed to save oil yield prediction: {e}")
        # Temporarily include underlying error to aid debugging
        raise HTTPException(status_code=500, detail=f"Failed to save oil yield prediction: {e}")


@router.get("/predictions", response_model=list[OilYieldPredictionRead])
def list_yield_predictions(session: Session = Depends(get_session)):
    try:
        # Ensure table exists in environments where migrations haven't run yet
        OilYieldPrediction.__table__.create(session.get_bind(), checkfirst=True)
        return session.exec(select(OilYieldPrediction)).all()
    except Exception as e:
        logger.error(f"Failed to list oil yield predictions: {e}")
        raise HTTPException(status_code=500, detail="Failed to list oil yield predictions")


@router.get("/predictions/{batch_id}", response_model=OilYieldPredictionRead)
def get_yield_prediction(batch_id: int, session: Session = Depends(get_session)):
    try:
        # Ensure table exists in environments where migrations haven't run yet
        OilYieldPrediction.__table__.create(session.get_bind(), checkfirst=True)

        row = session.exec(
            select(OilYieldPrediction).where(OilYieldPrediction.batch_id == batch_id)
        ).first()
        if not row:
            raise HTTPException(status_code=404, detail="Prediction not found")

        # Map explicitly to avoid response validation errors from nullable/legacy DB fields
        return OilYieldPredictionRead(
            id=row.id,
            batch_id=row.batch_id,
            predicted_yield_kg=float(row.predicted_yield_kg or 0.0),
            dried_mass_kg=float(row.dried_mass_kg or 0.0),
            species_variety=row.species_variety or "",
            age_years=float(row.age_years or 0.0),
            harvesting_season=row.harvesting_season or "",
            recommendation_primary=row.recommendation_primary or "",
            recommendation_tips=row.recommendation_tips or "[]",
            recommendation_quality=row.recommendation_quality or "",
            predicted_at=row.predicted_at or datetime.utcnow(),
        )
    except HTTPException:
        # Re-raise known HTTP errors
        raise
    except Exception as e:
        logger.error(f"Failed to get oil yield prediction for batch {batch_id}: {e}")
        # Include underlying error message in detail to aid debugging
        raise HTTPException(status_code=500, detail=f"Failed to get oil yield prediction: {e}")


@router.post("/price_forecast", response_model=PriceForecastOutput)
def get_price_forecast():
    try:
        from training_scripts.oil_yield.price_forecast_model import forecast_prices as generate_forecast
        return generate_forecast()
    except Exception as e:
        logger.error(f"Price forecast error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating price forecast: {str(e)}")


@router.post("/batch", response_model=MaterialBatchRead, status_code=201)
def create_material_batch(payload: MaterialBatchCreate, session: Session = Depends(get_session)):
    if payload.source == "purchased":
        stage    = payload.process_stage or "distilling"
        dried_kg = payload.dried_mass_kg if payload.dried_mass_kg is not None else payload.mass_kg
    else:
        stage    = payload.process_stage or "raw"
        dried_kg = payload.dried_mass_kg

    try:
        batch = MaterialBatch(
            batch_name=payload.batch_name,
            cinnamon_type=payload.cinnamon_type,
            mass_kg=payload.mass_kg if payload.mass_kg is not None else 0.0,
            dried_mass_kg=dried_kg,
            harvest_season=payload.harvest_season,
            source=payload.source,
            process_stage=stage,
        )
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return batch
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create material batch: {str(e)}")


@router.put("/batch/{batch_id}", response_model=MaterialBatchRead)
def update_material_batch(
    batch_id: int,
    payload: MaterialBatchUpdate,
    session: Session = Depends(get_session),
):
    batch = session.get(MaterialBatch, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")

    update_data = payload.model_dump(exclude_unset=True)

    if (
        "dried_mass_kg" in update_data
        and update_data["dried_mass_kg"] is not None
        and "process_stage" not in update_data
        and batch.source == "own_farm"
        and batch.process_stage == "drying"
    ):
        update_data["process_stage"] = "distilling"

    for field, value in update_data.items():
        setattr(batch, field, value)

    try:
        session.add(batch)
        session.commit()
        session.refresh(batch)
        return batch
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update batch: {str(e)}")


@router.delete("/batch/{batch_id}", status_code=204)
def delete_material_batch(batch_id: int, session: Session = Depends(get_session)):
    batch = session.get(MaterialBatch, batch_id)
    if batch is None:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} not found")
    try:
        session.delete(batch)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete batch: {str(e)}")


@router.get("/batch", response_model=list[MaterialBatchRead])
def list_material_batches(
    session: Session = Depends(get_session),
):
    try:
        MaterialBatch.__table__.create(session.get_bind(), checkfirst=True)
        stmt = select(MaterialBatch).order_by(MaterialBatch.created_at.desc())
        return session.exec(stmt).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list material batches: {str(e)}")
