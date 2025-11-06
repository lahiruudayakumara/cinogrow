from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import pandas as pd
import json
from io import StringIO

from app.database import get_db
from app.models.yield_weather import (
    YieldDataset, UserYieldRecord, YieldPrediction, Plot,
    YieldDatasetCreate, YieldDatasetRead,
    UserYieldRecordCreate, UserYieldRecordUpdate, UserYieldRecordRead,
    YieldPredictionRead
)

router = APIRouter(tags=["yield-prediction"])


# Yield Dataset endpoints
@router.post("/yield-dataset", response_model=YieldDatasetRead)
async def create_yield_dataset_record(record_data: YieldDatasetCreate, db: Session = Depends(get_db)):
    """Create a new yield dataset record"""
    record = YieldDataset(**record_data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/yield-dataset", response_model=List[YieldDatasetRead])
async def get_yield_dataset(
    location: Optional[str] = None,
    variety: Optional[str] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get yield dataset records with optional filtering"""
    query = select(YieldDataset)
    
    if location:
        query = query.where(YieldDataset.location.ilike(f"%{location}%"))
    
    if variety:
        query = query.where(YieldDataset.variety.ilike(f"%{variety}%"))
    
    if limit:
        query = query.limit(limit)
    
    records = db.exec(query).all()
    return records


@router.post("/yield-dataset/bulk-upload")
async def bulk_upload_yield_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload yield dataset from CSV file"""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read CSV content
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Parse CSV with pandas
        df = pd.read_csv(StringIO(csv_content))
        
        # Validate required columns
        required_columns = ['location', 'variety', 'area', 'yield_amount']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {missing_columns}"
            )
        
        # Create records
        records_created = 0
        for _, row in df.iterrows():
            record_data = {
                'location': row['location'],
                'variety': row['variety'],
                'area': float(row['area']),
                'yield_amount': float(row['yield_amount']),
                'soil_type': row.get('soil_type'),
                'rainfall': float(row['rainfall']) if pd.notna(row.get('rainfall')) else None,
                'temperature': float(row['temperature']) if pd.notna(row.get('temperature')) else None,
                'age_years': int(row['age_years']) if pd.notna(row.get('age_years')) else None,
            }
            
            record = YieldDataset(**record_data)
            db.add(record)
            records_created += 1
        
        db.commit()
        
        return {
            "message": f"Successfully uploaded {records_created} yield dataset records",
            "records_created": records_created
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


# User Yield Records endpoints
@router.post("/yield-records", response_model=UserYieldRecordRead)
async def create_user_yield_record(record_data: UserYieldRecordCreate, db: Session = Depends(get_db)):
    """Create a new user yield record"""
    # Check if plot exists
    plot = db.get(Plot, record_data.plot_id)
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    record = UserYieldRecord(**record_data.dict())
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Return with plot name
    result = UserYieldRecordRead.from_orm(record)
    result.plot_name = plot.name
    return result


@router.get("/yield-records", response_model=List[UserYieldRecordRead])
async def get_user_yield_records(
    user_id: Optional[int] = None,
    plot_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get user yield records with optional filtering"""
    query = select(UserYieldRecord, Plot).join(Plot)
    
    if user_id:
        query = query.where(UserYieldRecord.user_id == user_id)
    
    if plot_id:
        query = query.where(UserYieldRecord.plot_id == plot_id)
    
    results = db.exec(query.order_by(UserYieldRecord.yield_date.desc())).all()
    
    # Convert results to include plot names
    records = []
    for record, plot in results:
        record_dict = UserYieldRecordRead.from_orm(record).dict()
        record_dict['plot_name'] = plot.name
        records.append(UserYieldRecordRead(**record_dict))
    
    return records


@router.get("/users/{user_id}/yield-records", response_model=List[UserYieldRecordRead])
async def get_user_yield_records_by_user_id(user_id: int, db: Session = Depends(get_db)):
    """Get all yield records for a specific user"""
    results = db.exec(
        select(UserYieldRecord, Plot)
        .join(Plot)
        .where(UserYieldRecord.user_id == user_id)
        .order_by(UserYieldRecord.yield_date.desc())
    ).all()
    
    # Convert results to include plot names
    records = []
    for record, plot in results:
        record_dict = UserYieldRecordRead.from_orm(record).dict()
        record_dict['plot_name'] = plot.name
        records.append(UserYieldRecordRead(**record_dict))
    
    return records


@router.put("/yield-records/{yield_id}", response_model=UserYieldRecordRead)
async def update_user_yield_record(
    yield_id: int,
    record_update: UserYieldRecordUpdate,
    db: Session = Depends(get_db)
):
    """Update a user yield record"""
    record = db.get(UserYieldRecord, yield_id)
    if not record:
        raise HTTPException(status_code=404, detail="Yield record not found")
    
    # Update only provided fields
    update_data = record_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_at = datetime.utcnow()
    
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Get plot name
    plot = db.get(Plot, record.plot_id)
    result = UserYieldRecordRead.from_orm(record)
    result.plot_name = plot.name if plot else None
    return result


@router.delete("/yield-records/{yield_id}")
async def delete_user_yield_record(yield_id: int, db: Session = Depends(get_db)):
    """Delete a user yield record"""
    record = db.get(UserYieldRecord, yield_id)
    if not record:
        raise HTTPException(status_code=404, detail="Yield record not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Yield record deleted successfully"}


# Yield Predictions endpoints
@router.get("/users/{user_id}/predicted-yields")
async def get_predicted_yields(
    user_id: int,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get predicted yields for user's plots using ML model"""
    from app.services.yield_prediction import YieldPredictionService
    
    # Get user's plots
    plots_query = select(Plot).join(UserYieldRecord).where(UserYieldRecord.user_id == user_id).distinct()
    plots = db.exec(plots_query).all()
    
    if not plots:
        # If no yield records exist, get plots from farms (assuming user owns farms)
        # This is a simplified approach - in reality, you'd have a user-farm relationship
        plots = db.exec(select(Plot).limit(10)).all()  # Get some plots for demo
    
    # Initialize prediction service
    prediction_service = YieldPredictionService(db)
    
    predictions = []
    for plot in plots:
        try:
            predicted_yield = await prediction_service.predict_yield(
                plot_id=plot.id,
                location=location or "Sri Lanka",
                variety="Ceylon Cinnamon",  # Default variety
                area=plot.area
            )
            
            predictions.append({
                "plot_id": plot.id,
                "plot_name": plot.name,
                "plot_area": plot.area,
                "predicted_yield": predicted_yield["predicted_yield"],
                "confidence_score": predicted_yield.get("confidence_score"),
                "prediction_source": predicted_yield.get("prediction_source", "ml_model")
            })
        except Exception as e:
            # Fallback prediction if ML model fails
            fallback_yield = plot.area * 2500  # 2500 kg/ha average
            predictions.append({
                "plot_id": plot.id,
                "plot_name": plot.name,
                "plot_area": plot.area,
                "predicted_yield": round(fallback_yield),
                "confidence_score": 0.5,
                "prediction_source": "fallback"
            })
    
    return predictions


@router.get("/yield-predictions/{plot_id}", response_model=YieldPredictionRead)
async def get_yield_prediction_for_plot(plot_id: int, db: Session = Depends(get_db)):
    """Get the latest yield prediction for a specific plot"""
    prediction = db.exec(
        select(YieldPrediction, Plot)
        .join(Plot)
        .where(YieldPrediction.plot_id == plot_id)
        .order_by(YieldPrediction.prediction_date.desc())
    ).first()
    
    if not prediction:
        raise HTTPException(status_code=404, detail="No prediction found for this plot")
    
    pred_record, plot = prediction
    result = YieldPredictionRead.from_orm(pred_record)
    result.plot_name = plot.name
    return result


# ML Model Management endpoints
@router.post("/ml/train-model")
async def train_yield_model(retrain: bool = False, db: Session = Depends(get_db)):
    """Train the yield prediction ML model"""
    from app.services.yield_prediction import YieldPredictionService
    
    try:
        prediction_service = YieldPredictionService(db)
        result = prediction_service.train_model(retrain=retrain)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/ml/model-info")
async def get_model_info(db: Session = Depends(get_db)):
    """Get information about the current ML model"""
    from app.services.yield_prediction import YieldPredictionService
    
    prediction_service = YieldPredictionService(db)
    return prediction_service.get_model_info()


@router.post("/ml/predict-single")
async def predict_yield_single(
    location: str,
    variety: str,
    area: float,
    plot_id: Optional[int] = None,
    rainfall: Optional[float] = None,
    temperature: Optional[float] = None,
    age_years: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Make a single yield prediction using the ML model"""
    from app.services.yield_prediction import YieldPredictionService
    
    # Use a temporary plot_id if not provided
    temp_plot_id = plot_id or 0
    
    try:
        prediction_service = YieldPredictionService(db)
        result = prediction_service.predict_yield(
            plot_id=temp_plot_id,
            location=location,
            variety=variety,
            area=area,
            rainfall=rainfall,
            temperature=temperature,
            age_years=age_years
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/ml/dataset-stats")
async def get_dataset_statistics(db: Session = Depends(get_db)):
    """Get statistics about the yield dataset"""
    records = db.exec(select(YieldDataset)).all()
    
    if not records:
        return {
            "total_records": 0,
            "message": "No dataset records found"
        }
    
    # Convert to DataFrame for analysis
    data = []
    for record in records:
        data.append({
            'location': record.location,
            'variety': record.variety,
            'area': record.area,
            'yield_amount': record.yield_amount,
            'yield_per_hectare': record.yield_amount / record.area,
            'rainfall': record.rainfall,
            'temperature': record.temperature,
            'age_years': record.age_years
        })
    
    df = pd.DataFrame(data)
    
    return {
        "total_records": len(records),
        "locations": df['location'].value_counts().to_dict(),
        "varieties": df['variety'].value_counts().to_dict(),
        "yield_stats": {
            "mean_yield": round(df['yield_amount'].mean(), 2),
            "min_yield": round(df['yield_amount'].min(), 2),
            "max_yield": round(df['yield_amount'].max(), 2),
            "mean_yield_per_hectare": round(df['yield_per_hectare'].mean(), 2)
        },
        "area_stats": {
            "mean_area": round(df['area'].mean(), 2),
            "min_area": round(df['area'].min(), 2),
            "max_area": round(df['area'].max(), 2),
            "total_area": round(df['area'].sum(), 2)
        }
    }