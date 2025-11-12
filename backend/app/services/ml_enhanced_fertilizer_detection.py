import os
import numpy as np
import cv2
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
from pathlib import Path
import logging
import json
import joblib

from app.services.cinnamon_deficiency_detector import CinnamonLeafDeficiencyDetector
from app.services.cinnamon_dataset_trainer import EnhancedCinnamonDetector, CinnamonDatasetTrainer

logger = logging.getLogger(__name__)


class MLEnhancedFertilizerDetectionService:
    """
    Enhanced Fertilizer Detection Service that integrates trained ML models
    Provides accurate deficiency detection and fertilizer recommendations
    """
    
    def __init__(self, db_session, models_path: str = "backend/models"):
        self.db = db_session
        self.models_path = Path(models_path)
        self.base_detector = CinnamonLeafDeficiencyDetector()
        
        # Initialize enhanced detector if trained model is available
        self.enhanced_detector = self._load_best_model()
        
        # Fertilizer recommendations mapping from Cinnamon Research Center
        self.fertilizer_recommendations = {
            "nitrogen_deficiency": {
                "severity": {
                    "mild": {
                        "organic": {
                            "name": "Composted Poultry Manure",
                            "amount": "1.5kg per plant",
                            "frequency": "Every 4 months",
                            "application": "Apply around root zone, 20cm from trunk",
                            "additional_nutrients": ["Potassium", "Phosphorus", "Organic matter"]
                        },
                        "inorganic": {
                            "name": "Urea (46% N)",
                            "amount": "75g per plant",
                            "frequency": "Every 3 months",
                            "application": "Broadcast around drip line, water thoroughly",
                            "timing": "Early morning or evening"
                        }
                    },
                    "moderate": {
                        "organic": {
                            "name": "Composted Poultry Manure",
                            "amount": "2kg per plant", 
                            "frequency": "Every 3 months",
                            "application": "Mix with topsoil around root zone",
                            "additional_nutrients": ["Potassium", "Phosphorus", "Organic matter"]
                        },
                        "inorganic": {
                            "name": "Urea (46% N)",
                            "amount": "100g per plant",
                            "frequency": "Every 3 months",
                            "application": "Split application: 50g each time, 2 weeks apart",
                            "timing": "Before rainy season"
                        }
                    },
                    "severe": {
                        "organic": {
                            "name": "Composted Poultry Manure + Blood Meal",
                            "amount": "2.5kg poultry manure + 200g blood meal per plant",
                            "frequency": "Every 2 months for 6 months",
                            "application": "Deep incorporation around root zone",
                            "additional_nutrients": ["Quick-release nitrogen", "Slow-release organic matter"]
                        },
                        "inorganic": {
                            "name": "Urea (46% N)",
                            "amount": "150g per plant",
                            "frequency": "Monthly for 3 months, then every 3 months",
                            "application": "Split into 3 applications, water immediately after",
                            "timing": "Monitor leaf color improvement"
                        },
                        "expert_consultation": True
                    }
                }
            },
            "phosphorus_deficiency": {
                "severity": {
                    "mild": {
                        "organic": {
                            "name": "Bone Meal",
                            "amount": "1kg per plant",
                            "frequency": "Twice per year",
                            "application": "Incorporate into soil around root zone",
                            "additional_nutrients": ["Calcium", "Slow-release phosphorus"]
                        },
                        "inorganic": {
                            "name": "Triple Super Phosphate (TSP)",
                            "amount": "50g per plant",
                            "frequency": "Once per year",
                            "application": "Apply before rainy season, incorporate well",
                            "timing": "April-May (pre-monsoon)"
                        }
                    },
                    "moderate": {
                        "organic": {
                            "name": "Bone Meal + Rock Phosphate",
                            "amount": "1.2kg bone meal + 800g rock phosphate per plant",
                            "frequency": "Twice per year",
                            "application": "Deep incorporation, 30cm depth around plant",
                            "additional_nutrients": ["Long-term phosphorus availability"]
                        },
                        "inorganic": {
                            "name": "Triple Super Phosphate (TSP)",
                            "amount": "75g per plant",
                            "frequency": "Once per year",
                            "application": "Band application 30cm from trunk",
                            "timing": "Split into 2 applications, 6 months apart"
                        }
                    },
                    "severe": {
                        "organic": {
                            "name": "Bone Meal + Rock Phosphate + Composted Manure",
                            "amount": "1.5kg bone meal + 1kg rock phosphate + 2kg compost per plant",
                            "frequency": "Every 4 months for first year",
                            "application": "Deep trenching around plant, backfill with mixture",
                            "additional_nutrients": ["Complete soil conditioning"]
                        },
                        "inorganic": {
                            "name": "Triple Super Phosphate (TSP)",
                            "amount": "100g per plant",
                            "frequency": "Split application: 50g twice yearly",
                            "application": "Ring application, 40cm from trunk, irrigate well",
                            "timing": "Pre and post monsoon"
                        },
                        "expert_consultation": True
                    }
                }
            },
            "healthy": {
                "maintenance": {
                    "organic": {
                        "name": "Balanced Compost",
                        "amount": "1.5kg per plant",
                        "frequency": "Every 4 months",
                        "application": "Surface application around drip line",
                        "additional_nutrients": ["Maintains soil health", "Slow nutrient release"]
                    },
                    "inorganic": {
                        "name": "NPK 15-15-15",
                        "amount": "100g per plant",
                        "frequency": "Twice per year",
                        "application": "Broadcast and incorporate lightly",
                        "timing": "Before each monsoon season"
                    }
                }
            }
        }
    
    def _load_best_model(self) -> Optional[EnhancedCinnamonDetector]:
        """Load the best available trained model"""
        try:
            if not self.models_path.exists():
                logger.info("Models directory does not exist, using rule-based detector only")
                return None
            
            # Find latest model file
            model_files = list(self.models_path.glob("cinnamon_deficiency_rf_model_*.joblib"))
            if not model_files:
                logger.info("No trained models found, using rule-based detector only") 
                return None
            
            # Get most recent model
            latest_model = max(model_files, key=lambda x: x.stat().st_mtime)
            logger.info(f"Loading trained model: {latest_model}")
            
            enhanced_detector = EnhancedCinnamonDetector(str(latest_model), self.base_detector)
            logger.info(f"Enhanced detector loaded successfully with model version: {enhanced_detector.model_version}")
            return enhanced_detector
            
        except Exception as e:
            logger.warning(f"Failed to load enhanced model: {str(e)}")
            logger.info("Falling back to rule-based detector")
            return None
    
    def analyze_leaf_image(self, image_path: str, farm_id: Optional[int] = None, 
                          plot_id: Optional[int] = None, user_id: int = 1) -> Dict[str, Any]:
        """
        Comprehensive leaf image analysis with ML enhancement and fertilizer recommendations
        """
        try:
            # Use enhanced detector if available, otherwise fall back to base detector
            detector = self.enhanced_detector if self.enhanced_detector else self.base_detector
            
            logger.info(f"Analyzing image with detector: {detector._class.name_}")
            
            # Perform analysis
            analysis_results = detector.analyze_leaf_image(image_path)
            
            if "error" in analysis_results:
                return analysis_results
            
            # Extract key information
            classification = analysis_results["classification_results"]
            detected_deficiency = classification["detected_deficiency"]
            confidence_score = classification["confidence_score"]
            
            # Determine severity based on confidence and color features
            severity = self._determine_severity(analysis_results, confidence_score)
            
            # Generate fertilizer recommendations
            fertilizer_recommendations = self._generate_fertilizer_recommendations(
                detected_deficiency, severity
            )
            
            # Create comprehensive response
            comprehensive_results = {
                "analysis_id": self._generate_analysis_id(),
                "timestamp": datetime.now().isoformat(),
                "image_path": image_path,
                "detector_type": "enhanced_ml" if self.enhanced_detector else "rule_based",
                
                "deficiency_analysis": {
                    "detected_deficiency": detected_deficiency,
                    "confidence_score": confidence_score,
                    "severity_level": severity,
                    "prediction_method": classification.get("prediction_method", "rule_based"),
                    "ensemble_details": classification.get("ensemble_details", {})
                },
                
                "image_features": {
                    "color_analysis": analysis_results.get("color_features", {}),
                    "texture_analysis": analysis_results.get("texture_features", {}),
                    "leaf_health_indicators": self._extract_health_indicators(analysis_results)
                },
                
                "fertilizer_recommendations": fertilizer_recommendations,
                
                "metadata": {
                    "farm_id": farm_id,
                    "plot_id": plot_id,
                    "user_id": user_id,
                    "model_version": getattr(detector, 'model_version', 'v1.0'),
                    "processing_time": analysis_results.get("analysis_metadata", {}).get("total_time", 0)
                }
            }
            
            return comprehensive_results
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            return {
                "error": f"Analysis failed: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "image_path": image_path
            }
    
    def _determine_severity(self, analysis_results: Dict, confidence_score: float) -> str:
        """Determine deficiency severity based on analysis results"""
        try:
            # Extract color features for severity assessment
            color_features = analysis_results.get("color_features", {})
            
            # Base severity on confidence score and color deviation
            if confidence_score >= 0.9:
                return "severe"
            elif confidence_score >= 0.7:
                return "moderate" 
            else:
                return "mild"
                
        except Exception:
            return "mild"  # Default to mild if assessment fails
    
    def _generate_fertilizer_recommendations(self, deficiency: str, severity: str) -> Dict[str, Any]:
        """Generate detailed fertilizer recommendations based on deficiency and severity"""
        try:
            base_recommendations = self.fertilizer_recommendations.get(deficiency, {})
            
            if deficiency == "healthy":
                recommendations = base_recommendations.get("maintenance", {})
            else:
                recommendations = base_recommendations.get("severity", {}).get(severity, {})
            
            if not recommendations:
                # Fallback recommendations
                recommendations = {
                    "organic": {
                        "name": "Balanced Compost",
                        "amount": "1.5kg per plant",
                        "frequency": "Every 4 months",
                        "application": "Apply around root zone"
                    },
                    "inorganic": {
                        "name": "NPK 15-15-15",
                        "amount": "100g per plant", 
                        "frequency": "Twice per year",
                        "application": "Broadcast and water thoroughly"
                    }
                }
            
            # Add timing recommendations
            current_month = datetime.now().month
            timing_advice = self._get_seasonal_timing_advice(current_month, deficiency)
            
            enhanced_recommendations = {
                "deficiency_type": deficiency,
                "severity_level": severity,
                "organic_option": recommendations.get("organic", {}),
                "inorganic_option": recommendations.get("inorganic", {}),
                "timing_advice": timing_advice,
                "application_tips": self._get_application_tips(deficiency, severity),
                "monitoring_schedule": self._get_monitoring_schedule(deficiency, severity),
                "expert_consultation_required": recommendations.get("expert_consultation", False)
            }
            
            return enhanced_recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return {"error": "Failed to generate recommendations"}
    
    def _get_seasonal_timing_advice(self, month: int, deficiency: str) -> Dict[str, Any]:
        """Provide seasonal timing advice for fertilizer application"""
        timing_advice = {
            "current_season": self._get_season(month),
            "optimal_application_time": "Early morning or evening",
            "weather_considerations": []
        }
        
        if month in [4, 5, 6]:  # Pre-monsoon
            timing_advice["weather_considerations"].append("Apply before heavy rains expected")
            timing_advice["optimal_period"] = "Pre-monsoon application recommended"
        elif month in [10, 11, 12]:  # Post-monsoon
            timing_advice["weather_considerations"].append("Good time for slow-release fertilizers")
            timing_advice["optimal_period"] = "Post-monsoon application for nutrient uptake"
        else:
            timing_advice["weather_considerations"].append("Ensure adequate soil moisture")
            timing_advice["optimal_period"] = "Regular maintenance period"
        
        return timing_advice
    
    def _get_season(self, month: int) -> str:
        """Get current season in Sri Lanka context"""
        if month in [12, 1, 2]:
            return "Maha season"
        elif month in [4, 5, 6]:
            return "Yala season" 
        elif month in [7, 8, 9]:
            return "Dry period"
        else:
            return "Intermediate season"
    
    def _get_application_tips(self, deficiency: str, severity: str) -> List[str]:
        """Get specific application tips based on deficiency type"""
        base_tips = [
            "Always apply fertilizers to moist soil",
            "Avoid application during hot midday hours",
            "Water thoroughly after application",
            "Keep fertilizer 15-20cm away from trunk"
        ]
        
        if deficiency == "nitrogen_deficiency":
            base_tips.extend([
                "Split nitrogen applications for better uptake",
                "Monitor leaf color change within 2-3 weeks",
                "Combine with potassium for balanced nutrition"
            ])
        elif deficiency == "phosphorus_deficiency":
            base_tips.extend([
                "Incorporate phosphorus fertilizers deep into soil",
                "Best applied before rainy season",
                "Effects may take 4-6 weeks to show"
            ])
        
        return base_tips
    
    def _get_monitoring_schedule(self, deficiency: str, severity: str) -> Dict[str, Any]:
        """Generate monitoring schedule for treatment effectiveness"""
        base_schedule = {
            "initial_assessment": "2 weeks after first application",
            "follow_up": "Monthly for 3 months",
            "indicators_to_watch": [
                "Leaf color changes",
                "New growth patterns", 
                "Overall plant vigor"
            ]
        }
        
        if severity == "severe":
            base_schedule["expert_follow_up"] = "Consult extension officer if no improvement in 4 weeks"
        
        return base_schedule
    
    def _extract_health_indicators(self, analysis_results: Dict) -> Dict[str, Any]:
        """Extract key health indicators from analysis"""
        try:
            color_features = analysis_results.get("color_features", {})
            
            indicators = {
                "leaf_greenness": color_features.get("mean_S", 0),
                "color_uniformity": 1 - color_features.get("std_H", 0),
                "overall_health_score": min(100, max(0, color_features.get("mean_S", 0) * 100))
            }
            
            return indicators
        except:
            return {}
    
    def _generate_analysis_id(self) -> str:
        """Generate unique analysis ID"""
        from uuid import uuid4
        return f"FERT_ANALYSIS_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid4())[:8]}"


# Example integration test
def test_ml_enhanced_service():
    """Test the ML enhanced fertilizer detection service"""
    print("🧪 Testing ML Enhanced Fertilizer Detection Service")
    
    # Mock database session
    class MockDB:
        pass
    
    # Initialize service
    service = MLEnhancedFertilizerDetectionService(MockDB())
    
    # Test basic functionality
    print(f"Enhanced detector available: {service.enhanced_detector is not None}")
    print(f"Fertilizer recommendations loaded: {len(service.fertilizer_recommendations)} categories")
    
    # Test recommendation generation
    test_recommendations = service._generate_fertilizer_recommendations("nitrogen_deficiency", "moderate")
    print(f"Generated recommendations for nitrogen deficiency: {bool(test_recommendations)}")
    
    print("✅ Service test completed")


if __name__ == "__main__":
    test_ml_enhanced_service()
