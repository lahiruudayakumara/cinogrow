import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from app.db.session import get_session
from app.models.oil_yield.predictions import (
    OilYieldPrediction,
)
from .schemas import (
    OilYieldPredictionCreate, OilYieldPredictionRead,
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

