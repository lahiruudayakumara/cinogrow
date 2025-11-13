#!/usr/bin/env python3
"""
Test script for enhanced yield prediction service
This tests the new functionality where location and variety are fetched from the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import get_session
from app.services.yield_prediction_enhanced import YieldPredictionService
from app.models.yield_weather.farm import Farm, Plot, PlantingRecord
from sqlmodel import select
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_enhanced_prediction():
    """Test the enhanced prediction service with real plot data"""
    
    # Get database session
    db = next(get_session())
    
    try:
        # Create prediction service
        prediction_service = YieldPredictionService(db)
        
        print("=== Enhanced Yield Prediction Test ===\n")
        
        # Get a few plots to test with
        plots = db.exec(select(Plot).limit(3)).all()
        
        if not plots:
            print("❌ No plots found in database. Please create some plots first.")
            return
        
        print(f"Found {len(plots)} plots to test with:\n")
        
        for i, plot in enumerate(plots, 1):
            print(f"--- Test {i}: Plot {plot.id} ---")
            
            # Get farm info
            farm = db.exec(select(Farm).where(Farm.id == plot.farm_id)).first()
            farm_location = farm.location if farm else "Unknown"
            
            # Get planting records
            planting_records = db.exec(
                select(PlantingRecord).where(PlantingRecord.plot_id == plot.id)
            ).all()
            
            planted_variety = planting_records[-1].cinnamon_variety if planting_records else "Not planted"
            
            print(f"  Plot ID: {plot.id}")
            print(f"  Plot Name: {plot.name}")
            print(f"  Farm Location: {farm_location}")
            print(f"  Plot Area: {plot.area} ha")
            print(f"  Planted Variety: {planted_variety}")
            print(f"  Planting Status: {'✅ Planted' if planting_records else '❌ Not planted'}")
            
            # Make prediction
            try:
                result = prediction_service.predict_yield(plot_id=plot.id)
                
                if "error" in result:
                    print(f"  ❌ Prediction Error: {result['error']}")
                    print(f"     Message: {result['message']}")
                else:
                    print(f"  ✅ Predicted Yield: {result['predicted_yield']} kg")
                    print(f"     Yield per hectare: {result['yield_per_hectare']} kg/ha")
                    print(f"     Confidence: {result['confidence_score']:.3f}")
                    print(f"     Source: {result['prediction_source']}")
                    
                    if "farm_location" in result:
                        print(f"     Used Location: {result['farm_location']}")
                    if "planted_variety" in result:
                        print(f"     Used Variety: {result['planted_variety']}")
                
            except Exception as e:
                print(f"  ❌ Prediction failed: {e}")
            
            print()
        
        # Test model info
        print("--- Model Information ---")
        model_info = prediction_service.get_model_info()
        print(f"Model loaded: {'✅' if model_info['model_loaded'] else '❌'}")
        if model_info['model_loaded']:
            print(f"Model type: {model_info.get('model_type', 'Unknown')}")
            print(f"Model version: {model_info.get('model_version', 'Unknown')}")
            print(f"Dataset size: {model_info.get('dataset_size', 'Unknown')}")
            print(f"Features: {len(model_info.get('features', []))}")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_enhanced_prediction()