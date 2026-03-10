import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.oil_yield.predictions import (
    OilYieldPrediction,
    DistillationPrediction,
    QualityPrediction,
)
from .schemas import (
    OilYieldPredictionCreate, OilYieldPredictionRead,
    DistillationPredictionCreate, DistillationPredictionRead,
    QualityPredictionCreate, QualityPredictionRead,
)

router = APIRouter(prefix="/oil_yield/predictions", tags=["Oil Yield Predictions"])


# ─── Oil-yield predictions ────────────────────────────────────────────────────

@router.post("/yield", response_model=OilYieldPredictionRead, status_code=201)
def save_yield_prediction(
    payload: OilYieldPredictionCreate,
    session: Session = Depends(get_session),
):
    summary = payload.input_summary
    rec = payload.recommendation
    row = OilYieldPrediction(
        batch_id=payload.batch_id,
        predicted_yield_ml=payload.predicted_yield_ml,
        predicted_yield_liters=payload.predicted_yield_liters,
        dried_mass_kg=summary.get("dried_mass_kg", 0.0),
        species_variety=summary.get("species_variety", ""),
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


@router.get("/yield", response_model=list[OilYieldPredictionRead])
def list_yield_predictions(session: Session = Depends(get_session)):
    return session.exec(select(OilYieldPrediction)).all()


@router.get("/yield/{batch_id}", response_model=OilYieldPredictionRead)
def get_yield_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(OilYieldPrediction).where(OilYieldPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return row


@router.delete("/yield/{batch_id}", status_code=204)
def delete_yield_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(OilYieldPrediction).where(OilYieldPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    session.delete(row)
    session.commit()


# ─── Distillation-time predictions ───────────────────────────────────────────

@router.post("/distillation", response_model=DistillationPredictionRead, status_code=201)
def save_distillation_prediction(
    payload: DistillationPredictionCreate,
    session: Session = Depends(get_session),
):
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


@router.get("/distillation", response_model=list[DistillationPredictionRead])
def list_distillation_predictions(session: Session = Depends(get_session)):
    return session.exec(select(DistillationPrediction)).all()


@router.get("/distillation/{batch_id}", response_model=DistillationPredictionRead)
def get_distillation_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(DistillationPrediction).where(DistillationPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return row


@router.delete("/distillation/{batch_id}", status_code=204)
def delete_distillation_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(DistillationPrediction).where(DistillationPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    session.delete(row)
    session.commit()


# ─── Quality predictions ──────────────────────────────────────────────────────

@router.post("/quality", response_model=QualityPredictionRead, status_code=201)
def save_quality_prediction(
    payload: QualityPredictionCreate,
    session: Session = Depends(get_session),
):
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


@router.get("/quality", response_model=list[QualityPredictionRead])
def list_quality_predictions(session: Session = Depends(get_session)):
    return session.exec(select(QualityPrediction)).all()


@router.get("/quality/{batch_id}", response_model=QualityPredictionRead)
def get_quality_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(QualityPrediction).where(QualityPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return row


@router.delete("/quality/{batch_id}", status_code=204)
def delete_quality_prediction(batch_id: int, session: Session = Depends(get_session)):
    row = session.exec(
        select(QualityPrediction).where(QualityPrediction.batch_id == batch_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prediction not found")
    session.delete(row)
    session.commit()
