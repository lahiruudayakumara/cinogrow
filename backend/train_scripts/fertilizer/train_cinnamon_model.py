#!/usr/bin/env python3
"""
Cinnamon Deficiency Detection Model Training Script
Downloads datasets from Google Drive and trains ML model for fertilizer recommendations
"""

import os
import sys
import json
import logging
from pathlib import Path
from datetime import datetime

# Add app to path for imports
sys.path.append(os.path.join(os.path.dirname(_file_), 'app'))

from app.services.cinnamon_dataset_trainer import CinnamonDatasetTrainer
from app.database import get_session
from sqlmodel import Session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(_name_)


def main():
    """Main training pipeline execution"""
    print("🌱 Starting Cinnamon Deficiency Detection Training Pipeline")
    print("=" * 60)
    
    try:
        # Initialize trainer
        trainer = CinnamonDatasetTrainer()
        
        # Check if we should force re-download
        force_redownload = input("Force re-download datasets from Google Drive? (y/N): ").lower() == 'y'
        
        print(f"\n📁 Base training path: {trainer.base_path}")
        print(f"🤖 Models will be saved to: {trainer.models_path}")
        print(f"📊 Dataset URLs configured:")
        for name, url in trainer.dataset_urls.items():
            print(f"   - {name}: {url}")
        
        # Run complete training pipeline
        print(f"\n🚀 Starting training pipeline...")
        results = trainer.run_full_pipeline(force_redownload=force_redownload)
        
        # Display results
        print("\n" + "=" * 60)
        if results["pipeline_successful"]:
            print("✅ Training Pipeline Completed Successfully!")
            print(f"📁 Final model: {results['final_model_path']}")
            
            # Display training metrics
            if "training_results" in results:
                metrics = results["training_results"]["model_metrics"]
                print(f"🎯 Model accuracy: {metrics['accuracy']:.4f}")
                print(f"📈 Feature importance:")
                for feature, importance in metrics['feature_importance'].items():
                    print(f"   - {feature}: {importance:.4f}")
        else:
            print("❌ Training Pipeline Failed!")
            print("Errors encountered:")
            for error in results.get("errors", []):
                print(f"   - {error}")
        
        # Save detailed results
        results_file = f"training_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n📄 Detailed results saved to: {results_file}")
        
        # Test the trained model if successful
        if results["pipeline_successful"]:
            print("\n🧪 Testing trained model...")
            test_enhanced_detector(results["final_model_path"])
        
    except KeyboardInterrupt:
        print("\n⏹ Training interrupted by user")
    except Exception as e:
        logger.error(f"Training pipeline failed with error: {str(e)}")
        print(f"❌ Error: {str(e)}")
        return 1
    
    return 0


def test_enhanced_detector(model_path: str):
    """Test the enhanced detector with sample predictions"""
    try:
        from app.services.cinnamon_dataset_trainer import CinnamonDatasetTrainer, EnhancedCinnamonDetector
        from app.services.cinnamon_deficiency_detector import CinnamonLeafDeficiencyDetector
        
        # Initialize components
        trainer = CinnamonDatasetTrainer()
        base_detector = CinnamonLeafDeficiencyDetector()
        enhanced_detector = EnhancedCinnamonDetector(model_path, base_detector)
        
        print(f"🤖 Enhanced detector created with model: {model_path}")
        print(f"📊 Model version: {enhanced_detector.model_version}")
        print(f"🎛 Feature columns: {len(enhanced_detector.feature_columns)}")
        
        # Check for sample images in dataset
        dataset_path = trainer.base_path / "cinnamon_dataset"
        if dataset_path.exists():
            for class_name in trainer.dataset_urls.keys():
                class_path = dataset_path / class_name
                if class_path.exists():
                    # Get first image from class
                    image_files = list(class_path.rglob(".jpg")) + list(class_path.rglob(".png"))
                    if image_files:
                        test_image = image_files[0]
                        print(f"\n🔍 Testing with {class_name} sample: {test_image.name}")
                        
                        # Analyze image
                        result = enhanced_detector.analyze_leaf_image(str(test_image))
                        
                        if "error" not in result:
                            classification = result["classification_results"]
                            print(f"   Prediction: {classification['detected_deficiency']}")
                            print(f"   Confidence: {classification['confidence_score']:.3f}")
                            print(f"   Method: {classification['prediction_method']}")
                            
                            # Show ensemble details
                            if "ensemble_details" in classification:
                                details = classification["ensemble_details"]
                                print(f"   Rule-based: {details['rule_based_prediction']} ({details['rule_based_confidence']:.3f})")
                                print(f"   ML model: {details['ml_prediction']} ({details['ml_confidence']:.3f})")
                        else:
                            print(f"   Error: {result['error']}")
                        
                        break  # Test only one image per class
        
        print("\n✅ Enhanced detector testing completed!")
        
    except Exception as e:
        logger.error(f"Enhanced detector testing failed: {str(e)}")
        print(f"❌ Testing error: {str(e)}")


if _name_ == "_main_":
    sys.exit(main())
