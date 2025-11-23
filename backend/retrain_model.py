"""
Script to retrain the yield prediction model with the new dataset
"""
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import get_db
from app.services.yield_prediction_enhanced import YieldPredictionService

def retrain_model():
    """Retrain the model with new data"""
    print("🤖 Retraining yield prediction model...")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Initialize service
        service = YieldPredictionService(db)
        
        # Train model
        result = service.train_model(retrain=True)
        
        print("✅ Model training completed!")
        print(f"   Model Type: {result.get('model_type', 'Unknown')}")
        print(f"   CV R²: {result.get('cv_r2', 0):.4f}")
        print(f"   Test R²: {result.get('test_r2', 0):.4f}")
        print(f"   Test MAE: {result.get('test_mae', 0):.1f}")
        print(f"   Training samples: {result.get('training_samples', 0)}")
        print(f"   Features used: {result.get('features_used', 0)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during training: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = retrain_model()
    if success:
        print("\n🎉 Ready to test predictions!")
    else:
        print("\n❌ Training failed")