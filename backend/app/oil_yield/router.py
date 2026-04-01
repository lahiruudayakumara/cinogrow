import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from .schemas import (
    OilYieldInput, OilYieldOutput,
    PriceForecastOutput,
    MaterialBatchCreate, MaterialBatchUpdate, MaterialBatchRead,
    OilYieldPredictionCreate, OilYieldPredictionRead,
    DistillationPredictionCreate, DistillationPredictionRead,
    QualityPredictionCreate, QualityPredictionRead,
)
from .oil_yield_model import load_model
import numpy as np
import logging
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.oil_yield.material_batch import MaterialBatch
from app.models.oil_yield.predictions import (
    OilYieldPrediction,
    DistillationPrediction,
    QualityPrediction,
)

router = APIRouter(prefix="/oil_yield", tags=["Oil Yield"])
logger = logging.getLogger(__name__)

_cached_model = None

def get_model():
    global _cached_model
    if _cached_model is None:
        _cached_model = load_model()
    return _cached_model


@router.post("/predict", response_model=OilYieldOutput)
def predict_yield(data: OilYieldInput):
    model = get_model()

    species_encoded = 0 if data.species_variety == "Sri Gemunu" else 1
    season_encoded  = 0 if data.harvesting_season == "January-May" else 1

    X = np.array([[data.dried_mass_kg, species_encoded, season_encoded]])
    prediction = model.predict(X)[0]

    return {
        "predicted_yield_kg": round(float(prediction), 2),
        "input_summary": {
            "dried_mass_kg": data.dried_mass_kg,
            "species_variety": data.species_variety,
            "harvesting_season": data.harvesting_season,
        },
    }


@router.post("/price_forecast", response_model=PriceForecastOutput)
def get_price_forecast():
    try:
        from app.oil_yield.price_forecast_model import forecast_prices as generate_forecast
        return generate_forecast(time_range="weeks", steps=4)
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
    source: str | None = None,
    process_stage: str | None = None,
    session: Session = Depends(get_session),
):
    try:
        MaterialBatch.__table__.create(session.get_bind(), checkfirst=True)

        stmt = select(MaterialBatch)
        if source:
            stmt = stmt.where(MaterialBatch.source == source)
        if process_stage:
            stmt = stmt.where(MaterialBatch.process_stage == process_stage)
        stmt = stmt.order_by(MaterialBatch.created_at.desc())

        return session.exec(stmt).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list material batches: {str(e)}")


@router.post("/predictions/yield", response_model=OilYieldPredictionRead, status_code=201)
def save_yield_prediction(payload: OilYieldPredictionCreate, session: Session = Depends(get_session)):
    summary = payload.input_summary
    rec     = payload.recommendation
    row = OilYieldPrediction(
        batch_id=payload.batch_id,
        predicted_yield_ml=payload.predicted_yield_ml,
        predicted_yield_kg=payload.predicted_yield_kg,
        dried_mass_kg=summary.get("dried_mass_kg", 0.0),
        species_variety=summary.get("species_variety", ""),
        plant_part=summary.get("plant_part", ""),
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


@router.get("/predictions/yield", response_model=list[OilYieldPredictionRead])
def list_yield_predictions(session: Session = Depends(get_session)):
    return session.exec(select(OilYieldPrediction)).all()


@router.get("/predictions/yield/{batch_id}", response_model=OilYieldPredictionRead)
def get_yield_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(OilYieldPrediction).where(OilYieldPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return row


@router.delete("/predictions/yield/{batch_id}", status_code=204)
def delete_yield_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(OilYieldPrediction).where(OilYieldPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    session.delete(row)
    session.commit()


@router.post("/predictions/distillation", response_model=DistillationPredictionRead, status_code=201)
def save_distillation_prediction(payload: DistillationPredictionCreate, session: Session = Depends(get_session)):
    row = DistillationPrediction(
        batch_id=payload.batch_id,
        predicted_time_hours=payload.predicted_time_hours,
        distillation_capacity_liters=payload.distillation_capacity_liters,
        plant_part=payload.plant_part,
        cinnamon_type=payload.cinnamon_type,
        predicted_at=datetime.fromisoformat(payload.predicted_at),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.get("/predictions/distillation", response_model=list[DistillationPredictionRead])
def list_distillation_predictions(session: Session = Depends(get_session)):
    return session.exec(select(DistillationPrediction)).all()


@router.get("/predictions/distillation/{batch_id}", response_model=DistillationPredictionRead)
def get_distillation_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(DistillationPrediction).where(DistillationPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return row


@router.delete("/predictions/distillation/{batch_id}", status_code=204)
def delete_distillation_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(DistillationPrediction).where(DistillationPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    session.delete(row)
    session.commit()


@router.post("/predictions/quality", response_model=QualityPredictionRead, status_code=201)
def save_quality_prediction(payload: QualityPredictionCreate, session: Session = Depends(get_session)):
    row = QualityPrediction(
        batch_id=payload.batch_id,
        score=payload.score,
        label=payload.label,
        price_range=payload.price_range,
        recommendations=json.dumps(payload.recommendations),
        lab_advice=payload.lab_advice,
        color=payload.color,
        clarity=payload.clarity,
        aroma=payload.aroma,
        cinnamon_type=payload.cinnamon_type,
        plant_part=payload.plant_part,
        predicted_at=datetime.fromisoformat(payload.predicted_at),
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.get("/predictions/quality", response_model=list[QualityPredictionRead])
def list_quality_predictions(session: Session = Depends(get_session)):
    return session.exec(select(QualityPrediction)).all()


@router.get("/predictions/quality/{batch_id}", response_model=QualityPredictionRead)
def get_quality_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(QualityPrediction).where(QualityPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return row


@router.delete("/predictions/quality/{batch_id}", status_code=204)
def delete_quality_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(QualityPrediction).where(QualityPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    session.delete(row)
    session.commit()