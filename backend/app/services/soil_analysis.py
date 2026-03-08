"""
Soil Type Detection and Analysis Service
Integrates Roboflow soil detection workflow with recommendations
"""

from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


# Soil type characteristics and recommendations for Sri Lankan cinnamon cultivation
SOIL_TYPE_DATA = {
    "sandy_soil": {
        "display_name": "Sandy Soil",
        "characteristics": [
            "Low nutrient retention",
            "High drainage",
            "Low organic matter",
            "Prone to nitrogen leaching"
        ],
        "common_issues_in_sri_lanka": [
            "Nitrogen deficiency",
            "Low moisture retention",
            "Reduced microbial activity"
        ],
        "recommendations": {
            "organic_matter": [
                "Apply compost (5-10 kg per plant annually)",
                "Incorporate well-decomposed cattle manure",
                "Use green manure crops"
            ],
            "fertilizer_strategy": [
                "Split nitrogen application into multiple doses",
                "Use slow-release nitrogen fertilizers",
                "Apply urea carefully before rainfall"
            ],
            "moisture_management": [
                "Mulching with coconut husk or straw",
                "Drip irrigation if possible"
            ],
            "soil_testing": "Strongly recommended every 6-12 months to monitor nutrient leaching."
        },
        "improvement_actions": [
            "Increase organic matter content through regular compost application",
            "Implement moisture retention strategies like mulching",
            "Use split fertilizer applications to prevent nutrient leaching",
            "Consider installing drip irrigation system"
        ]
    },
    
    "laterite_soil": {
        "display_name": "Laterite Soil",
        "characteristics": [
            "Acidic pH",
            "Iron and aluminum rich",
            "Moderate drainage",
            "Low phosphorus availability"
        ],
        "common_issues_in_sri_lanka": [
            "Phosphorus fixation",
            "Magnesium deficiency",
            "Calcium deficiency"
        ],
        "recommendations": {
            "pH_management": [
                "Apply agricultural lime if pH < 5.5",
                "Dolomite application for magnesium correction"
            ],
            "fertilizer_strategy": [
                "Apply rock phosphate or TSP (Triple Super Phosphate)",
                "Use phosphorus in split applications",
                "Combine organic matter to improve nutrient availability"
            ],
            "organic_matter": [
                "Apply compost to improve soil buffering capacity",
                "Maintain leaf litter in plantation"
            ],
            "soil_testing": "Essential to check pH and phosphorus levels before major fertilizer application."
        },
        "improvement_actions": [
            "Test and correct soil pH using agricultural lime",
            "Apply dolomite for magnesium supplementation",
            "Use rock phosphate to address phosphorus fixation",
            "Increase organic matter to improve nutrient availability"
        ]
    },
    
    "black_soil": {
        "display_name": "Black Soil",
        "characteristics": [
            "High clay content",
            "High water retention",
            "Rich in potassium",
            "Slow drainage"
        ],
        "common_issues_in_sri_lanka": [
            "Waterlogging",
            "Root rot risk",
            "Nitrogen immobilization"
        ],
        "recommendations": {
            "drainage_management": [
                "Ensure proper drainage channels",
                "Raised beds if heavy rainfall area"
            ],
            "fertilizer_strategy": [
                "Avoid excessive potassium fertilizer",
                "Apply nitrogen in moderate split doses",
                "Incorporate organic compost to improve structure"
            ],
            "aeration": [
                "Periodic soil loosening",
                "Avoid compaction from machinery"
            ],
            "soil_testing": "Recommended to assess nitrogen availability and drainage condition."
        },
        "improvement_actions": [
            "Improve drainage with channels or raised beds",
            "Reduce potassium fertilizer application",
            "Apply moderate nitrogen in split doses",
            "Improve soil structure with organic compost",
            "Prevent soil compaction through proper cultivation practices"
        ]
    }
}


def parse_soil_detection_result(roboflow_result: Any) -> Dict[str, Any]:
    """
    Parse Roboflow soil detection workflow result
    
    Args:
        roboflow_result: Raw result from Roboflow workflow
        
    Returns:
        Dictionary with parsed soil type and confidence
    """
    try:
        logger.info(f"🔍 Parsing soil detection result: {type(roboflow_result)}")
        logger.info(f"🔍 Full result structure: {roboflow_result}")
        
        detected_soil_type = None
        confidence = 0.0
        
        # Handle different result formats
        if isinstance(roboflow_result, list) and len(roboflow_result) > 0:
            result_item = roboflow_result[0]
            
            # Look for predictions in various keys
            if isinstance(result_item, dict):
                logger.info(f"🔍 Result item keys: {result_item.keys()}")
                
                # Try different common keys for workflow outputs
                for key in ['output', 'predictions', 'result', 'classification', 'top_class', 'class']:
                    if key in result_item:
                        prediction_data = result_item[key]
                        logger.info(f"🔍 Found key '{key}': {prediction_data}")
                        
                        # Handle when output is directly a string (class name)
                        if isinstance(prediction_data, str):
                            detected_soil_type = prediction_data
                            confidence = result_item.get('confidence', 0.8)  # Default confidence
                            break
                        
                        # Handle nested structure
                        if isinstance(prediction_data, dict):
                            # Check for top class and confidence
                            if 'top' in prediction_data:
                                detected_soil_type = prediction_data['top']
                                confidence = prediction_data.get('confidence', 0.8)
                                break
                            elif 'class' in prediction_data:
                                detected_soil_type = prediction_data['class']
                                confidence = prediction_data.get('confidence', 0.8)
                                break
                            elif 'predicted_classes' in prediction_data:
                                classes = prediction_data['predicted_classes']
                                if classes and len(classes) > 0:
                                    detected_soil_type = classes[0]
                                    confidence = prediction_data.get('confidence', 0.8)
                                    break
                        
                        # Handle when it's a list of predictions
                        if isinstance(prediction_data, list) and len(prediction_data) > 0:
                            first_pred = prediction_data[0]
                            if isinstance(first_pred, dict):
                                detected_soil_type = first_pred.get('class', first_pred.get('label'))
                                confidence = first_pred.get('confidence', 0.8)
                                break
                
                # If still not found, try direct keys on result_item
                if not detected_soil_type:
                    if 'top_class' in result_item:
                        detected_soil_type = result_item['top_class']
                        confidence = result_item.get('confidence', 0.8)
                    elif 'class' in result_item:
                        detected_soil_type = result_item['class']
                        confidence = result_item.get('confidence', 0.8)
        
        # Handle dict result format (not list)
        elif isinstance(roboflow_result, dict):
            logger.info(f"🔍 Dict result keys: {roboflow_result.keys()}")
            for key in ['output', 'top_class', 'class', 'prediction']:
                if key in roboflow_result:
                    detected_soil_type = roboflow_result[key]
                    confidence = roboflow_result.get('confidence', 0.8)
                    break
        
        # Normalize soil type name to match our data keys
        if detected_soil_type:
            original_type = detected_soil_type
            detected_soil_type = detected_soil_type.lower().replace(' ', '_').replace('-', '_')
            
            # Map common variations
            if 'sandy' in detected_soil_type:
                detected_soil_type = 'sandy_soil'
            elif 'laterite' in detected_soil_type or 'red' in detected_soil_type:
                detected_soil_type = 'laterite_soil'
            elif 'black' in detected_soil_type or 'clay' in detected_soil_type:
                detected_soil_type = 'black_soil'
            
            logger.info(f"✅ Normalized '{original_type}' to '{detected_soil_type}'")
        
        logger.info(f"✅ Final parsed - soil type: {detected_soil_type}, confidence: {confidence}")
        
        return {
            "soil_type": detected_soil_type,
            "confidence": confidence,
            "raw_result": roboflow_result  # Include raw result for debugging
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to parse soil detection result: {e}")
        import traceback
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        return {
            "soil_type": None,
            "confidence": 0.0,
            "error": str(e)
        }


def generate_soil_recommendations(
    soil_type: str,
    confidence: float,
    detected_leaf_deficiency: Optional[str] = None,
    plant_age: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generate comprehensive soil-based recommendations
    
    Args:
        soil_type: Detected soil type (sandy_soil, laterite_soil, black_soil)
        confidence: Detection confidence (0-1)
        detected_leaf_deficiency: Optional leaf deficiency for cross-validation
        plant_age: Optional plant age for targeted recommendations
        
    Returns:
        Dictionary with comprehensive soil recommendations
    """
    try:
        logger.info(f"🌱 Generating soil recommendations for {soil_type}")
        
        if soil_type not in SOIL_TYPE_DATA:
            logger.warning(f"⚠️ Unknown soil type: {soil_type}")
            return {
                "error": "Unknown soil type",
                "message": "Unable to generate recommendations for this soil type"
            }
        
        soil_data = SOIL_TYPE_DATA[soil_type]
        
        # Filter fertilizer strategies based on detected leaf deficiency
        detailed_recommendations = soil_data["recommendations"].copy()
        if detected_leaf_deficiency:
            # Filter fertilizer strategy to only show deficiency-relevant recommendations
            deficiency_lower = detected_leaf_deficiency.lower()
            filtered_strategies = []
            
            for strategy in soil_data["recommendations"]["fertilizer_strategy"]:
                strategy_lower = strategy.lower()
                # Check if strategy is relevant to the detected deficiency
                if (("nitrogen" in deficiency_lower or "n" == deficiency_lower.strip()) and "nitrogen" in strategy_lower) or \
                   (("phosphorus" in deficiency_lower or "p" == deficiency_lower.strip() or "phosphorous" in deficiency_lower) and ("phosphorus" in strategy_lower or "phosphate" in strategy_lower)) or \
                   (("potassium" in deficiency_lower or "k" == deficiency_lower.strip() or "potasium" in deficiency_lower) and ("potassium" in strategy_lower or "potash" in strategy_lower)) or \
                   (("magnesium" in deficiency_lower or "mg" == deficiency_lower.strip()) and ("magnesium" in strategy_lower or "dolomite" in strategy_lower)) or \
                   (("calcium" in deficiency_lower or "ca" == deficiency_lower.strip()) and ("calcium" in strategy_lower or "lime" in strategy_lower)):
                    filtered_strategies.append(strategy)
            
            # If we found relevant strategies, use them; otherwise provide deficiency-focused note
            if filtered_strategies:
                detailed_recommendations = detailed_recommendations.copy()
                detailed_recommendations["fertilizer_strategy"] = filtered_strategies
                logger.info(f"✅ Filtered fertilizer strategies based on {detected_leaf_deficiency}: {len(filtered_strategies)} relevant strategies")
            else:
                # No soil-specific strategies for this deficiency - provide targeted guidance
                detailed_recommendations = detailed_recommendations.copy()
                detailed_recommendations["fertilizer_strategy"] = [
                    f"Focus on treating the detected {detected_leaf_deficiency}",
                    f"The {soil_data['display_name']} characteristics may affect nutrient availability",
                    "Follow the leaf-based fertilizer recommendations provided",
                    "Consider soil testing to identify any underlying soil-specific issues"
                ]
                logger.info(f"⚠️ No specific soil strategies for {detected_leaf_deficiency} in {soil_type}, providing general guidance")
        
        # Build recommendation response
        recommendations = {
            "soil_analysis": {
                "detected_soil_type": soil_data["display_name"],
                "confidence": round(confidence * 100, 1),
                "confidence_level": "High" if confidence > 0.8 else "Medium" if confidence > 0.5 else "Low"
            },
            
            "soil_characteristics": {
                "key_properties": soil_data["characteristics"],
                "common_issues": soil_data["common_issues_in_sri_lanka"]
            },
            
            "soil_improvement_actions": soil_data["improvement_actions"],
            
            "detailed_recommendations": detailed_recommendations,
            
            "soil_testing_recommendation": {
                "priority": "High" if soil_type == "laterite_soil" else "Medium",
                "guidance": soil_data["recommendations"]["soil_testing"],
                "parameters_to_test": [
                    "pH level",
                    "Nitrogen (N)",
                    "Phosphorus (P)",
                    "Potassium (K)",
                    "Organic matter content",
                    "Calcium and Magnesium levels"
                ]
            },
            
            "next_steps": [
                "Consider performing a professional soil lab test",
                "Implement the recommended soil improvement actions",
                "Monitor soil moisture and drainage patterns",
                "Adjust fertilizer application based on soil type"
            ]
        }
        
        # Add cross-validation with leaf deficiency if provided
        if detected_leaf_deficiency:
            recommendations["cross_validation"] = generate_cross_validation(
                soil_type, detected_leaf_deficiency
            )
        
        # Add plant age specific recommendations
        if plant_age:
            recommendations["age_specific_guidance"] = generate_age_specific_guidance(
                soil_type, plant_age
            )
        
        return recommendations
        
    except Exception as e:
        logger.error(f"❌ Failed to generate soil recommendations: {e}")
        return {
            "error": str(e),
            "message": "Failed to generate recommendations"
        }


def generate_cross_validation(soil_type: str, leaf_deficiency: str) -> Dict[str, Any]:
    """
    Cross-validate leaf deficiency with soil type for enhanced recommendations
    
    Args:
        soil_type: Detected soil type
        leaf_deficiency: Detected leaf deficiency
        
    Returns:
        Cross-validation insights and enhanced recommendations
    """
    # Mapping of soil types to likely deficiencies
    soil_deficiency_correlation = {
        "sandy_soil": {
            "expected": ["Nitrogen Deficiency", "Potassium Deficiency"],
            "explanation": "Sandy soils have poor nutrient retention and are prone to leaching"
        },
        "laterite_soil": {
            "expected": ["Phosphorus Deficiency", "Magnesium Deficiency"],
            "explanation": "Laterite soils fix phosphorus and often lack magnesium"
        },
        "black_soil": {
            "expected": ["Nitrogen Deficiency"],
            "explanation": "Black soils can immobilize nitrogen in high clay content"
        }
    }
    
    if not soil_type or soil_type == "unknown" or soil_type not in soil_deficiency_correlation:
        return {
            "correlation_status": "Not available",
            "message": "Cross-validation requires valid soil type detection",
            "detected_deficiency": leaf_deficiency,
            "recommendation": "Focus on treating the detected leaf deficiency and consider getting a soil lab test for comprehensive analysis"
        }
    
    correlation = soil_deficiency_correlation[soil_type]
    is_expected = any(deficiency.lower() in leaf_deficiency.lower() 
                     for deficiency in correlation["expected"])
    
    return {
        "correlation_status": "Expected" if is_expected else "Unexpected",
        "explanation": correlation["explanation"],
        "expected_deficiencies": correlation["expected"],
        "detected_deficiency": leaf_deficiency,
        "recommendation": (
            f"The detected {leaf_deficiency} is consistent with {SOIL_TYPE_DATA[soil_type]['display_name']} characteristics. "
            f"Follow both leaf treatment and soil improvement recommendations for best results."
            if is_expected else
            f"The detected {leaf_deficiency} is not typically associated with {SOIL_TYPE_DATA[soil_type]['display_name']}. "
            f"Consider additional factors like irrigation, pest damage, or other environmental stresses."
        )
    }


def generate_age_specific_guidance(soil_type: str, plant_age: int) -> Dict[str, Any]:
    """
    Generate age-specific guidance based on soil type
    
    Args:
        soil_type: Detected soil type
        plant_age: Plant age in years
        
    Returns:
        Age-specific recommendations
    """
    if plant_age <= 2:
        stage = "Young Plant (1-2 years)"
        focus = "Root development and establishment"
    elif plant_age <= 5:
        stage = "Developing Plant (3-5 years)"
        focus = "Vegetative growth"
    else:
        stage = "Mature Plant (6+ years)"
        focus = "Sustained productivity"
    
    guidance = {
        "growth_stage": stage,
        "primary_focus": focus,
        "plant_age_years": plant_age
    }
    
    # Soil-specific age recommendations
    if soil_type == "sandy_soil":
        if plant_age <= 2:
            guidance["recommendations"] = [
                "Apply compost frequently to build organic matter",
                "Use slow-release fertilizers to prevent leaching",
                "Ensure consistent moisture for root establishment"
            ]
        else:
            guidance["recommendations"] = [
                "Maintain high organic matter with annual compost application",
                "Use split fertilizer applications throughout the year",
                "Monitor for nutrient deficiencies due to leaching"
            ]
    
    elif soil_type == "laterite_soil":
        if plant_age <= 2:
            guidance["recommendations"] = [
                "Test soil pH early and correct if needed",
                "Apply phosphorus at planting for root development",
                "Add dolomite to prevent magnesium deficiency"
            ]
        else:
            guidance["recommendations"] = [
                "Regular pH monitoring and lime application as needed",
                "Continued phosphorus supplementation",
                "Monitor for micronutrient deficiencies"
            ]
    
    elif soil_type == "black_soil":
        if plant_age <= 2:
            guidance["recommendations"] = [
                "Ensure excellent drainage to prevent waterlogging",
                "Avoid over-fertilization, especially potassium",
                "Use raised beds if drainage is poor"
            ]
        else:
            guidance["recommendations"] = [
                "Maintain good soil structure with organic matter",
                "Moderate nitrogen applications to avoid immobilization",
                "Continue drainage management practices"
            ]
    
    return guidance


def generate_combined_analysis(
    leaf_analysis: Dict[str, Any],
    soil_analysis: Dict[str, Any],
    plant_age: int
) -> Dict[str, Any]:
    """
    Generate combined leaf + soil analysis with cross-validated recommendations
    
    Args:
        leaf_analysis: Results from leaf deficiency detection
        soil_analysis: Results from soil type detection
        plant_age: Plant age in years
        
    Returns:
        Comprehensive combined analysis and recommendations
    """
    try:
        logger.info("🔬 Generating combined leaf + soil analysis")
        
        detected_deficiency = leaf_analysis.get("primary_deficiency", "Unknown")
        deficiency_confidence = leaf_analysis.get("confidence", 0.0)
        soil_type = soil_analysis.get("soil_type")
        soil_confidence = soil_analysis.get("confidence", 0.0)
        
        # Handle case when soil type is not detected
        if not soil_type or soil_type == "unknown":
            logger.warning("⚠️ Soil type not available for combined analysis")
            return {
                "analysis_summary": {
                    "detected_deficiency": detected_deficiency,
                    "deficiency_confidence": round(deficiency_confidence * 100, 1),
                    "detected_soil_type": "Not detected",
                    "soil_confidence": 0.0,
                    "combined_confidence": round(deficiency_confidence * 100, 1),
                    "confidence_level": "Medium" if deficiency_confidence > 0.5 else "Low",
                    "note": "Analysis based on leaf deficiency only"
                },
                "leaf_treatment_plan": leaf_analysis.get("recommendations", {}),
                "soil_analysis_note": "Soil type detection failed or not available",
                "fertilizer_and_soil_amendment_plan": {
                    "note": "Soil-specific recommendations not available",
                    "general_advice": "Follow leaf deficiency treatment and consider professional soil testing"
                },
                "soil_lab_test_recommendation": {
                    "priority": "High",
                    "reason": "Soil type unknown - testing strongly recommended for accurate treatment",
                    "test_parameters": ["pH", "NPK levels", "Organic matter", "Calcium", "Magnesium", "Micronutrients"]
                }
            }
        
        # Calculate combined confidence
        combined_confidence = (deficiency_confidence + soil_confidence) / 2
        confidence_level = "High" if combined_confidence > 0.75 else "Medium" if combined_confidence > 0.5 else "Low"
        
        # Get cross-validation insights
        cross_validation = generate_cross_validation(soil_type, detected_deficiency)
        
        # Get soil recommendations with deficiency context
        soil_recommendations = generate_soil_recommendations(
            soil_type=soil_type,
            confidence=soil_confidence,
            detected_leaf_deficiency=detected_deficiency,
            plant_age=plant_age
        )
        
        # Build comprehensive response
        combined_analysis = {
            "analysis_summary": {
                "detected_deficiency": detected_deficiency,
                "deficiency_confidence": round(deficiency_confidence * 100, 1),
                "detected_soil_type": SOIL_TYPE_DATA.get(soil_type, {}).get("display_name", "Unknown"),
                "soil_confidence": round(soil_confidence * 100, 1),
                "combined_confidence": round(combined_confidence * 100, 1),
                "confidence_level": confidence_level
            },
            
            "cross_validation": cross_validation,
            
            "integrated_recommendations": {
                "immediate_action": f"Treat {detected_deficiency} with appropriate fertilizer as per leaf analysis",
                "soil_improvement": f"Implement {SOIL_TYPE_DATA.get(soil_type, {}).get('display_name', 'soil type')} improvement actions to enhance overall nutrient availability",
                "long_term_strategy": f"Combine {detected_deficiency} treatment with soil amendment for sustainable improvement"
            },
            
            "leaf_treatment_plan": leaf_analysis.get("recommendations", {}),
            
            "soil_improvement_plan": soil_recommendations,
            
            "fertilizer_and_soil_amendment_plan": generate_integrated_plan(
                detected_deficiency, soil_type, plant_age
            ),
            
            "soil_lab_test_recommendation": {
                "priority": "High" if confidence_level != "High" else "Medium",
                "reason": (
                    "Soil testing is strongly recommended to validate findings and optimize treatment"
                    if confidence_level != "High" else
                    "Soil testing recommended for baseline monitoring"
                ),
                "test_parameters": [
                    "pH", "NPK levels", "Organic matter", 
                    "Calcium", "Magnesium", "Micronutrients"
                ]
            }
        }
        
        return combined_analysis
        
    except Exception as e:
        logger.error(f"❌ Failed to generate combined analysis: {e}")
        import traceback
        logger.error(f"📋 Traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "message": "Failed to generate combined analysis"
        }


def generate_integrated_plan(
    deficiency: str,
    soil_type: str,
    plant_age: int
) -> Dict[str, Any]:
    """
    Generate an integrated fertilizer and soil amendment plan
    
    Args:
        deficiency: Detected nutrient deficiency
        soil_type: Detected soil type
        plant_age: Plant age in years
        
    Returns:
        Integrated treatment plan
    """
    plan = {
        "treatment_sequence": [],
        "timeline": "3-6 months",
        "expected_outcomes": []
    }
    
    # Soil type specific amendments
    if soil_type == "laterite_soil":
        plan["treatment_sequence"].append({
            "step": 1,
            "action": "Soil pH Correction",
            "details": "Apply agricultural lime (400 kg/acre if pH < 5.0)",
            "timing": "6 weeks before fertilizer application"
        })
    elif soil_type == "sandy_soil":
        plan["treatment_sequence"].append({
            "step": 1,
            "action": "Improve Soil Retention",
            "details": "Apply compost and mulch to improve water and nutrient retention",
            "timing": "Before fertilizer application"
        })
    
    # Deficiency-specific fertilizer (only add treatments for the detected deficiency)
    deficiency_lower = deficiency.lower()
    step_num = len(plan["treatment_sequence"]) + 1
    
    if "nitrogen" in deficiency_lower:
        plan["treatment_sequence"].append({
            "step": step_num,
            "action": "Nitrogen Fertilizer Application",
            "details": f"Apply Urea (46% N) based on plant age: {get_age_based_dosage(plant_age, 'N')}",
            "timing": "Apply in split doses during rainy season"
        })
        plan["expected_outcomes"].append("Improved leaf greening and overall plant vigor within 2-4 weeks")
        step_num += 1
    elif "phosphorus" in deficiency_lower or "phosphorous" in deficiency_lower:
        plan["treatment_sequence"].append({
            "step": step_num,
            "action": "Phosphorus Fertilizer Application",
            "details": f"Apply ERP (Rock Phosphate) or TSP based on plant age: {get_age_based_dosage(plant_age, 'P')}",
            "timing": "Apply early in season for slow-release effect"
        })
        plan["expected_outcomes"].append("Improved root development and stem strength within 4-6 weeks")
        step_num += 1
    elif "potassium" in deficiency_lower or "potasium" in deficiency_lower:
        plan["treatment_sequence"].append({
            "step": step_num,
            "action": "Potassium Fertilizer Application",
            "details": f"Apply MOP (Muriate of Potash) based on plant age: {get_age_based_dosage(plant_age, 'K')}",
            "timing": "Apply during moist conditions, avoid dry soil"
        })
        plan["expected_outcomes"].append("Reduced leaf scorching and improved bark quality within 3-5 weeks")
        step_num += 1
    elif "magnesium" in deficiency_lower:
        plan["treatment_sequence"].append({
            "step": step_num,
            "action": "Magnesium Correction",
            "details": f"Apply Dolomite based on plant age: {get_age_based_dosage(plant_age, 'Mg')}",
            "timing": "Apply 6 weeks before other fertilizers"
        })
        plan["expected_outcomes"].append("Resolution of interveinal chlorosis within 3-4 weeks")
        step_num += 1
    
    # Soil improvement (always recommended)
    plan["treatment_sequence"].append({
        "step": step_num,
        "action": "Organic Matter Application",
        "details": "Apply compost (5-10 kg per plant)",
        "timing": "Ongoing, every 3-6 months"
    })
    
    # Expected outcomes (add general outcomes if not already added deficiency-specific ones)
    if not plan["expected_outcomes"]:
        plan["expected_outcomes"] = [
            "Visible improvement in leaf color and size within 2-4 weeks",
            "Improved soil structure and nutrient retention within 3-6 months",
            "Enhanced plant vigor and productivity over 6-12 months"
        ]
    else:
        # Add soil improvement outcomes
        plan["expected_outcomes"].extend([
            "Improved soil structure and nutrient retention within 3-6 months",
            "Enhanced plant vigor and productivity over 6-12 months"
        ])
    
    return plan


def get_age_based_dosage(plant_age: int, nutrient: str) -> str:
    """Helper function to get age-based nutrient dosage"""
    dosages = {
        "N": {1: "17g", 2: "34g", "3+": "50g"},
        "P": {1: "8g", 2: "17g", "3+": "25g"},
        "K": {1: "8g", 2: "17g", "3+": "25g"},
        "Mg": {1: "50g", 2: "75g", "3+": "100g"}
    }
    
    if nutrient not in dosages:
        return "consult guidelines"
    
    if plant_age <= 1:
        return dosages[nutrient][1]
    elif plant_age == 2:
        return dosages[nutrient][2]
    else:
        return dosages[nutrient]["3+"]
