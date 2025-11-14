"""
Intelligent Fertilizer Recommendation System
Advanced recommendation engine with seasonal timing, cost optimization, and local availability
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from enum import Enum
import math
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeficiencyType(Enum):
    """Enumeration of cinnamon leaf deficiency types"""
    HEALTHY = "healthy"
    NITROGEN_DEFICIENCY = "nitrogen_deficiency"
    PHOSPHORUS_DEFICIENCY = "phosphorus_deficiency"
    potasium_deficiency = "potassium_deficiency"
    MAGNESIUM_DEFICIENCY = "magnesium_deficiency"
    CALCIUM_DEFICIENCY = "calcium_deficiency"


class SeverityLevel(Enum):
    """Severity levels for deficiencies"""
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


class ApplicationMethod(Enum):
    """Fertilizer application methods"""
    SOIL_APPLICATION = "soil_application"
    FOLIAR_SPRAY = "foliar_spray"
    ROOT_ZONE_INJECTION = "root_zone_injection"
    BROADCASTING = "broadcasting"
    BAND_PLACEMENT = "band_placement"


@dataclass
class SeasonalTiming:
    """Seasonal timing information for fertilizer application"""
    optimal_months: List[str]
    monsoon_dependent: bool
    avoid_months: List[str]
    rainfall_requirements: str
    temperature_range: Tuple[int, int]


@dataclass
class FertilizerProduct:
    """Fertilizer product information"""
    name: str
    nutrient_composition: Dict[str, float]  # NPK percentages
    application_rate: float  # kg per hectare or g per plant
    cost_per_kg: float  # USD per kg
    availability_score: float  # 0-1 scale for local availability
    organic: bool
    manufacturer: str
    shelf_life_months: int
    application_methods: List[ApplicationMethod]
    special_instructions: str


@dataclass
class RecommendationResult:
    """Complete fertilizer recommendation result"""
    deficiency_type: DeficiencyType
    severity: SeverityLevel
    confidence_score: float
    
    # Primary recommendation
    primary_fertilizer: FertilizerProduct
    application_schedule: List[Dict[str, Any]]
    expected_improvement_days: int
    
    # Alternative recommendations
    alternative_fertilizers: List[FertilizerProduct]
    organic_alternatives: List[FertilizerProduct]
    
    # Economic analysis
    cost_analysis: Dict[str, Any]
    roi_projection: Dict[str, Any]
    
    # Application guidance
    application_instructions: str
    monitoring_guidelines: str
    warning_notes: List[str]
    
    # Seasonal considerations
    seasonal_timing: SeasonalTiming
    
    # Follow-up recommendations
    follow_up_analysis_date: datetime
    preventive_measures: List[str]


class IntelligentFertilizerRecommendationEngine:
    """
    Advanced fertilizer recommendation system for cinnamon cultivation
    Considers multiple factors: deficiency type, severity, seasonal timing, 
    cost optimization, local availability, and farmer preferences
    """
    
    def __init__(self):
        self.data_path = Path("backend/data/fertilizer_recommendations")
        self.data_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize fertilizer database
        self._initialize_fertilizer_database()
        
        # Initialize seasonal calendar
        self._initialize_seasonal_calendar()
        
        # Initialize cost database
        self._initialize_cost_database()
        
        # Initialize regional preferences
        self._initialize_regional_data()

    def _initialize_fertilizer_database(self):
        """Initialize comprehensive fertilizer product database"""
        self.fertilizer_database = {
            'nitrogen_fertilizers': [
                FertilizerProduct(
                    name="Urea (46% N)",
                    nutrient_composition={"N": 46.0, "P": 0.0, "K": 0.0},
                    application_rate=100.0,  # g per plant
                    cost_per_kg=1.2,
                    availability_score=0.95,
                    organic=False,
                    manufacturer="Various",
                    shelf_life_months=36,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION, ApplicationMethod.BROADCASTING],
                    special_instructions="Apply in split doses during rainy season. Keep 30cm from trunk."
                ),
                FertilizerProduct(
                    name="Ammonium Sulfate (21% N)",
                    nutrient_composition={"N": 21.0, "P": 0.0, "K": 0.0, "S": 24.0},
                    application_rate=200.0,
                    cost_per_kg=0.8,
                    availability_score=0.85,
                    organic=False,
                    manufacturer="Various",
                    shelf_life_months=24,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION],
                    special_instructions="Acidifies soil - good for alkaline soils. Apply with adequate moisture."
                ),
                FertilizerProduct(
                    name="Organic Poultry Manure",
                    nutrient_composition={"N": 3.5, "P": 2.5, "K": 1.8},
                    application_rate=2000.0,  # g per plant
                    cost_per_kg=0.3,
                    availability_score=0.8,
                    organic=True,
                    manufacturer="Local suppliers",
                    shelf_life_months=6,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION],
                    special_instructions="Well-composted manure only. Apply during dry season for decomposition."
                ),
                FertilizerProduct(
                    name="Neem Cake (Organic N)",
                    nutrient_composition={"N": 5.2, "P": 1.0, "K": 1.4},
                    application_rate=1500.0,
                    cost_per_kg=0.5,
                    availability_score=0.9,
                    organic=True,
                    manufacturer="Local oil mills",
                    shelf_life_months=12,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION],
                    special_instructions="Slow-release organic nitrogen. Also provides pest control benefits."
                )
            ],
            
            'phosphorus_fertilizers': [
                FertilizerProduct(
                    name="Triple Super Phosphate (TSP)",
                    nutrient_composition={"N": 0.0, "P": 46.0, "K": 0.0},
                    application_rate=75.0,
                    cost_per_kg=1.5,
                    availability_score=0.9,
                    organic=False,
                    manufacturer="Various",
                    shelf_life_months=60,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION, ApplicationMethod.BAND_PLACEMENT],
                    special_instructions="Apply once yearly during early monsoon. Mix with soil thoroughly."
                ),
                FertilizerProduct(
                    name="Rock Phosphate (Organic P)",
                    nutrient_composition={"N": 0.0, "P": 32.0, "K": 0.0, "Ca": 35.0},
                    application_rate=150.0,
                    cost_per_kg=0.7,
                    availability_score=0.7,
                    organic=True,
                    manufacturer="Mining companies",
                    shelf_life_months=120,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION],
                    special_instructions="Slow-release. Apply 6 months before expected benefit. Works best in acidic soils."
                ),
                FertilizerProduct(
                    name="Bone Meal (Organic P)",
                    nutrient_composition={"N": 4.0, "P": 22.0, "K": 0.0, "Ca": 25.0},
                    application_rate=200.0,
                    cost_per_kg=0.9,
                    availability_score=0.6,
                    organic=True,
                    manufacturer="Local processors",
                    shelf_life_months=24,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION],
                    special_instructions="Steam-treated bone meal only. Provides slow-release phosphorus."
                )
            ],
            
            'potassium_fertilizers': [
                FertilizerProduct(
                    name="Muriate of Potash (KCl)",
                    nutrient_composition={"N": 0.0, "P": 0.0, "K": 60.0},
                    application_rate=80.0,
                    cost_per_kg=1.1,
                    availability_score=0.95,
                    organic=False,
                    manufacturer="Various",
                    shelf_life_months=120,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION, ApplicationMethod.FOLIAR_SPRAY],
                    special_instructions="Apply during dry periods. Avoid application during flowering."
                ),
                FertilizerProduct(
                    name="Wood Ash (Organic K)",
                    nutrient_composition={"N": 0.0, "P": 2.0, "K": 8.0, "Ca": 25.0},
                    application_rate=500.0,
                    cost_per_kg=0.1,
                    availability_score=0.9,
                    organic=True,
                    manufacturer="Local sources",
                    shelf_life_months=6,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION],
                    special_instructions="Use hardwood ash only. Do not exceed recommended rates - can raise soil pH."
                )
            ],
            
            'compound_fertilizers': [
                FertilizerProduct(
                    name="NPK 15:15:15 Compound",
                    nutrient_composition={"N": 15.0, "P": 15.0, "K": 15.0},
                    application_rate=200.0,
                    cost_per_kg=1.8,
                    availability_score=0.9,
                    organic=False,
                    manufacturer="Various",
                    shelf_life_months=48,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION, ApplicationMethod.BROADCASTING],
                    special_instructions="Balanced nutrition. Apply quarterly during growing season."
                ),
                FertilizerProduct(
                    name="Cinnamon Special Mix (20:10:10)",
                    nutrient_composition={"N": 20.0, "P": 10.0, "K": 10.0, "Mg": 2.0, "S": 3.0},
                    application_rate=180.0,
                    cost_per_kg=2.2,
                    availability_score=0.7,
                    organic=False,
                    manufacturer="Specialty producers",
                    shelf_life_months=36,
                    application_methods=[ApplicationMethod.SOIL_APPLICATION],
                    special_instructions="Formulated specifically for cinnamon. High nitrogen for leaf development."
                )
            ]
        }

    def _initialize_seasonal_calendar(self):
        """Initialize seasonal timing calendar for Sri Lankan climate"""
        self.seasonal_calendar = {
            'optimal_application_periods': {
                'yala_season': {  # May - September
                    'months': ['May', 'June', 'July', 'August', 'September'],
                    'rainfall': 'Monsoon period',
                    'temperature_range': (24, 30),
                    'fertilizer_types': ['nitrogen', 'compound'],
                    'notes': 'Best for nitrogen and compound fertilizers due to adequate moisture'
                },
                'maha_season': {  # December - February
                    'months': ['December', 'January', 'February'],
                    'rainfall': 'Secondary monsoon',
                    'temperature_range': (22, 28),
                    'fertilizer_types': ['phosphorus', 'potassium', 'compound'],
                    'notes': 'Good for phosphorus application and root development'
                },
                'inter_monsoon': {  # March, April, October, November
                    'months': ['March', 'April', 'October', 'November'],
                    'rainfall': 'Limited rainfall',
                    'temperature_range': (26, 32),
                    'fertilizer_types': ['organic', 'foliar'],
                    'notes': 'Limited fertilizer application. Focus on organic and foliar feeding'
                }
            },
            
            'fertilizer_specific_timing': {
                'nitrogen_fertilizers': {
                    'optimal_months': ['May', 'June', 'July', 'December', 'January'],
                    'avoid_months': ['March', 'April', 'October'],
                    'split_applications': True,
                    'frequency': 'Every 3 months during growing season'
                },
                'phosphorus_fertilizers': {
                    'optimal_months': ['December', 'January', 'February', 'May'],
                    'avoid_months': ['September', 'October', 'November'],
                    'split_applications': False,
                    'frequency': 'Once yearly before main growing season'
                },
                'potassium_fertilizers': {
                    'optimal_months': ['January', 'February', 'August', 'September'],
                    'avoid_months': ['March', 'April'],
                    'split_applications': True,
                    'frequency': 'Twice yearly'
                }
            }
        }

    def _initialize_cost_database(self):
        """Initialize cost analysis and ROI calculation parameters"""
        self.cost_database = {
            'application_costs': {
                'labor_cost_per_hectare': 50.0,  # USD
                'transportation_cost_per_km': 0.5,  # USD per km
                'storage_cost_per_month': 2.0,  # USD per 50kg bag
                'equipment_rental': 10.0  # USD per day
            },
            
            'yield_improvement_factors': {
                'nitrogen_deficiency': {
                    'mild': 0.15,      # 15% yield improvement
                    'moderate': 0.25,  # 25% yield improvement
                    'severe': 0.40     # 40% yield improvement
                },
                'phosphorus_deficiency': {
                    'mild': 0.12,
                    'moderate': 0.20,
                    'severe': 0.35
                },
                'potassium_deficiency': {
                    'mild': 0.10,
                    'moderate': 0.18,
                    'severe': 0.30
                }
            },
            
            'cinnamon_economics': {
                'average_yield_per_hectare': 300.0,  # kg per hectare
                'current_market_price_per_kg': 15.0,  # USD per kg
                'processing_cost_ratio': 0.3,  # 30% of market price
                'quality_premium_factor': 1.2  # 20% premium for high quality
            }
        }

    def _initialize_regional_data(self):
        """Initialize regional-specific data for Sri Lankan cinnamon growing areas"""
        self.regional_data = {
            'matale': {
                'soil_ph_range': (5.5, 6.5),
                'common_deficiencies': ['nitrogen', 'phosphorus'],
                'preferred_fertilizers': ['urea', 'tsp', 'organic_manure'],
                'local_suppliers': ['Matale Agro Center', 'CIC Fertilizer'],
                'transport_distance_km': 5,
                'organic_availability': 0.8
            },
            'kandy': {
                'soil_ph_range': (5.8, 6.8),
                'common_deficiencies': ['potassium', 'magnesium'],
                'preferred_fertilizers': ['kcl', 'dolomite', 'compound'],
                'local_suppliers': ['Kandy Agriculture Office', 'Highland Fertilizers'],
                'transport_distance_km': 8,
                'organic_availability': 0.7
            },
            'kegalle': {
                'soil_ph_range': (5.2, 6.2),
                'common_deficiencies': ['nitrogen', 'calcium'],
                'preferred_fertilizers': ['ammonium_sulfate', 'lime', 'rock_phosphate'],
                'local_suppliers': ['Kegalle Coop', 'Rural Agriculture Center'],
                'transport_distance_km': 12,
                'organic_availability': 0.9
            }
        }

    def generate_recommendation(
        self,
        deficiency_type: DeficiencyType,
        severity: SeverityLevel,
        confidence_score: float,
        farm_location: str = "matale",
        farm_size_hectares: float = 1.0,
        farmer_budget_usd: float = 500.0,
        organic_preference: bool = False,
        current_month: str = None
    ) -> RecommendationResult:
        """
        Generate comprehensive fertilizer recommendation based on analysis
        
        Args:
            deficiency_type: Type of nutrient deficiency detected
            severity: Severity level of the deficiency
            confidence_score: Confidence in the deficiency detection
            farm_location: Farm location (matale, kandy, kegalle)
            farm_size_hectares: Size of farm in hectares
            farmer_budget_usd: Available budget in USD
            organic_preference: Preference for organic fertilizers
            current_month: Current month for seasonal timing
        """
        
        if current_month is None:
            current_month = datetime.now().strftime("%B")
        
        logger.info(f"Generating recommendation for {deficiency_type.value} ({severity.value})")
        
        # Get regional data
        region_data = self.regional_data.get(farm_location, self.regional_data['matale'])
        
        # Select appropriate fertilizers
        primary_fertilizer = self._select_primary_fertilizer(
            deficiency_type, severity, organic_preference, region_data
        )
        
        alternative_fertilizers = self._select_alternative_fertilizers(
            deficiency_type, organic_preference, region_data
        )
        
        organic_alternatives = self._select_organic_alternatives(deficiency_type)
        
        # Create application schedule
        application_schedule = self._create_application_schedule(
            primary_fertilizer, deficiency_type, severity, farm_size_hectares, current_month
        )
        
        # Calculate costs and ROI
        cost_analysis = self._calculate_cost_analysis(
            primary_fertilizer, application_schedule, farm_size_hectares, region_data
        )
        
        roi_projection = self._calculate_roi_projection(
            deficiency_type, severity, farm_size_hectares, cost_analysis
        )
        
        # Determine seasonal timing
        seasonal_timing = self._determine_seasonal_timing(deficiency_type, current_month)
        
        # Generate instructions and guidelines
        application_instructions = self._generate_application_instructions(
            primary_fertilizer, deficiency_type, severity
        )
        
        monitoring_guidelines = self._generate_monitoring_guidelines(deficiency_type, severity)
        
        warning_notes = self._generate_warning_notes(
            primary_fertilizer, deficiency_type, farm_location
        )
        
        # Calculate expected improvement timeline
        expected_improvement_days = self._calculate_improvement_timeline(
            deficiency_type, severity, primary_fertilizer
        )
        
        # Set follow-up date
        follow_up_date = datetime.now() + timedelta(days=expected_improvement_days + 7)
        
        # Generate preventive measures
        preventive_measures = self._generate_preventive_measures(deficiency_type, region_data)
        
        # Create recommendation result
        recommendation = RecommendationResult(
            deficiency_type=deficiency_type,
            severity=severity,
            confidence_score=confidence_score,
            primary_fertilizer=primary_fertilizer,
            application_schedule=application_schedule,
            expected_improvement_days=expected_improvement_days,
            alternative_fertilizers=alternative_fertilizers,
            organic_alternatives=organic_alternatives,
            cost_analysis=cost_analysis,
            roi_projection=roi_projection,
            application_instructions=application_instructions,
            monitoring_guidelines=monitoring_guidelines,
            warning_notes=warning_notes,
            seasonal_timing=seasonal_timing,
            follow_up_analysis_date=follow_up_date,
            preventive_measures=preventive_measures
        )
        
        # Save recommendation for future reference
        self._save_recommendation(recommendation, farm_location)
        
        return recommendation

    def _select_primary_fertilizer(
        self,
        deficiency_type: DeficiencyType,
        severity: SeverityLevel,
        organic_preference: bool,
        region_data: Dict
    ) -> FertilizerProduct:
        """Select the most appropriate primary fertilizer"""
        
        # Determine fertilizer category based on deficiency
        category_mapping = {
            DeficiencyType.NITROGEN_DEFICIENCY: 'nitrogen_fertilizers',
            DeficiencyType.PHOSPHORUS_DEFICIENCY: 'phosphorus_fertilizers',
            DeficiencyType.POTASSIUM_DEFICIENCY: 'potassium_fertilizers'
        }
        
        category = category_mapping.get(deficiency_type, 'compound_fertilizers')
        available_fertilizers = self.fertilizer_database[category]
        
        # Score fertilizers based on multiple criteria
        scored_fertilizers = []
        
        for fertilizer in available_fertilizers:
            score = 0
            
            # Organic preference
            if organic_preference and fertilizer.organic:
                score += 30
            elif not organic_preference and not fertilizer.organic:
                score += 20
            
            # Availability score
            score += fertilizer.availability_score * 25
            
            # Cost effectiveness (inverse relationship)
            cost_effectiveness = 1 / (fertilizer.cost_per_kg + 0.1)
            score += cost_effectiveness * 20
            
            # Severity-based effectiveness
            if severity == SeverityLevel.SEVERE:
                # Prefer quick-acting fertilizers for severe cases
                if not fertilizer.organic:
                    score += 15
            elif severity == SeverityLevel.MILD:
                # Prefer organic for mild cases
                if fertilizer.organic:
                    score += 15
            
            # Regional preference
            if fertilizer.name.lower() in [pref.lower() for pref in region_data['preferred_fertilizers']]:
                score += 10
            
            scored_fertilizers.append((fertilizer, score))
        
        # Return highest scored fertilizer
        scored_fertilizers.sort(key=lambda x: x[1], reverse=True)
        return scored_fertilizers[0][0]

    def _select_alternative_fertilizers(
        self,
        deficiency_type: DeficiencyType,
        organic_preference: bool,
        region_data: Dict
    ) -> List[FertilizerProduct]:
        """Select alternative fertilizer options"""
        
        category_mapping = {
            DeficiencyType.NITROGEN_DEFICIENCY: 'nitrogen_fertilizers',
            DeficiencyType.PHOSPHORUS_DEFICIENCY: 'phosphorus_fertilizers',
            DeficiencyType.POTASSIUM_DEFICIENCY: 'potassium_fertilizers'
        }
        
        category = category_mapping.get(deficiency_type, 'compound_fertilizers')
        available_fertilizers = self.fertilizer_database[category]
        
        # Also consider compound fertilizers as alternatives
        compound_options = self.fertilizer_database['compound_fertilizers']
        
        all_alternatives = available_fertilizers + compound_options
        
        # Remove duplicates and sort by availability and cost
        unique_alternatives = list({f.name: f for f in all_alternatives}.values())
        unique_alternatives.sort(key=lambda x: (x.availability_score, -x.cost_per_kg), reverse=True)
        
        return unique_alternatives[:3]  # Return top 3 alternatives

    def _select_organic_alternatives(self, deficiency_type: DeficiencyType) -> List[FertilizerProduct]:
        """Select organic alternatives for the deficiency"""
        organic_options = []
        
        for category in self.fertilizer_database.values():
            for fertilizer in category:
                if fertilizer.organic:
                    # Check if this organic fertilizer addresses the deficiency
                    if deficiency_type == DeficiencyType.NITROGEN_DEFICIENCY and fertilizer.nutrient_composition.get("N", 0) > 3:
                        organic_options.append(fertilizer)
                    elif deficiency_type == DeficiencyType.PHOSPHORUS_DEFICIENCY and fertilizer.nutrient_composition.get("P", 0) > 2:
                        organic_options.append(fertilizer)
                    elif deficiency_type == DeficiencyType.potasium_deficiency and fertilizer.nutrient_composition.get("K", 0) > 5:
                        organic_options.append(fertilizer)
        
        return organic_options

    def _create_application_schedule(
        self,
        fertilizer: FertilizerProduct,
        deficiency_type: DeficiencyType,
        severity: SeverityLevel,
        farm_size_hectares: float,
        current_month: str
    ) -> List[Dict[str, Any]]:
        """Create detailed application schedule"""
        
        # Get timing information
        timing_info = self.seasonal_calendar['fertilizer_specific_timing']
        fertilizer_type = deficiency_type.value.split('_')[0]  # Get 'nitrogen', 'phosphorus', etc.
        
        type_timing = timing_info.get(f"{fertilizer_type}_fertilizers", timing_info['nitrogen_fertilizers'])
        
        schedule = []
        
        # Calculate total fertilizer needed
        plants_per_hectare = 1000  # Typical cinnamon planting density
        total_plants = farm_size_hectares * plants_per_hectare
        fertilizer_per_plant = fertilizer.application_rate
        total_fertilizer_needed = total_plants * fertilizer_per_plant / 1000  # Convert g to kg
        
        # Determine number of applications based on severity and fertilizer type
        if severity == SeverityLevel.SEVERE:
            applications = 3 if type_timing['split_applications'] else 1
        elif severity == SeverityLevel.MODERATE:
            applications = 2 if type_timing['split_applications'] else 1
        else:
            applications = 1
        
        fertilizer_per_application = total_fertilizer_needed / applications
        
        # Create schedule entries
        months_list = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
        
        current_month_index = months_list.index(current_month)
        optimal_months = type_timing['optimal_months']
        
        # Find next optimal months
        for i in range(applications):
            # Find next optimal month
            next_month_index = current_month_index
            for _ in range(12):  # Search for next 12 months
                next_month = months_list[next_month_index % 12]
                if next_month in optimal_months:
                    break
                next_month_index += 1
            
            application_date = self._calculate_application_date(
                current_month, next_month_index - current_month_index
            )
            
            schedule.append({
                'application_number': i + 1,
                'application_date': application_date.isoformat(),
                'month': next_month,
                'fertilizer_amount_kg': round(fertilizer_per_application, 2),
                'method': fertilizer.application_methods[0].value,
                'weather_requirements': 'Apply during dry weather, irrigate after application',
                'special_notes': fertilizer.special_instructions
            })
            
            # Move to next application window (typically 2-3 months later)
            current_month_index = next_month_index + 2
        
        return schedule

    def _calculate_application_date(self, current_month: str, months_ahead: int) -> datetime:
        """Calculate specific application date"""
        current_date = datetime.now()
        target_date = current_date + timedelta(days=months_ahead * 30)
        return target_date

    def _calculate_cost_analysis(
        self,
        fertilizer: FertilizerProduct,
        schedule: List[Dict[str, Any]],
        farm_size_hectares: float,
        region_data: Dict
    ) -> Dict[str, Any]:
        """Calculate comprehensive cost analysis"""
        
        # Calculate fertilizer costs
        total_fertilizer_cost = sum(
            app['fertilizer_amount_kg'] * fertilizer.cost_per_kg
            for app in schedule
        )
        
        # Calculate application costs
        labor_cost = len(schedule) * self.cost_database['application_costs']['labor_cost_per_hectare'] * farm_size_hectares
        
        transport_cost = (
            self.cost_database['application_costs']['transportation_cost_per_km'] * 
            region_data['transport_distance_km'] * 
            len(schedule)
        )
        
        storage_cost = (
            self.cost_database['application_costs']['storage_cost_per_month'] * 
            sum(app['fertilizer_amount_kg'] for app in schedule) / 50  # Assuming 50kg bags
        )
        
        total_cost = total_fertilizer_cost + labor_cost + transport_cost + storage_cost
        
        return {
            'fertilizer_cost_usd': round(total_fertilizer_cost, 2),
            'labor_cost_usd': round(labor_cost, 2),
            'transport_cost_usd': round(transport_cost, 2),
            'storage_cost_usd': round(storage_cost, 2),
            'total_cost_usd': round(total_cost, 2),
            'cost_per_hectare': round(total_cost / farm_size_hectares, 2),
            'cost_breakdown_percentage': {
                'fertilizer': round(total_fertilizer_cost / total_cost * 100, 1),
                'labor': round(labor_cost / total_cost * 100, 1),
                'transport': round(transport_cost / total_cost * 100, 1),
                'storage': round(storage_cost / total_cost * 100, 1)
            }
        }

    def _calculate_roi_projection(
        self,
        deficiency_type: DeficiencyType,
        severity: SeverityLevel,
        farm_size_hectares: float,
        cost_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate return on investment projection"""
        
        # Get yield improvement factors
        deficiency_key = deficiency_type.value
        if deficiency_key not in self.cost_database['yield_improvement_factors']:
            deficiency_key = 'nitrogen_deficiency'  # Default
        
        improvement_factor = self.cost_database['yield_improvement_factors'][deficiency_key][severity.value]
        
        # Calculate current and projected yields
        base_yield_kg = self.cost_database['cinnamon_economics']['average_yield_per_hectare'] * farm_size_hectares
        improved_yield_kg = base_yield_kg * (1 + improvement_factor)
        yield_increase_kg = improved_yield_kg - base_yield_kg
        
        # Calculate revenue
        price_per_kg = self.cost_database['cinnamon_economics']['current_market_price_per_kg']
        quality_premium = self.cost_database['cinnamon_economics']['quality_premium_factor']
        
        additional_revenue = yield_increase_kg * price_per_kg * quality_premium
        processing_cost = additional_revenue * self.cost_database['cinnamon_economics']['processing_cost_ratio']
        net_additional_revenue = additional_revenue - processing_cost
        
        # Calculate ROI
        total_investment = cost_analysis['total_cost_usd']
        net_profit = net_additional_revenue - total_investment
        roi_percentage = (net_profit / total_investment * 100) if total_investment > 0 else 0
        payback_months = (total_investment / (net_additional_revenue / 12)) if net_additional_revenue > 0 else float('inf')
        
        return {
            'base_yield_kg': round(base_yield_kg, 2),
            'projected_yield_kg': round(improved_yield_kg, 2),
            'yield_increase_kg': round(yield_increase_kg, 2),
            'yield_improvement_percentage': round(improvement_factor * 100, 1),
            'additional_revenue_usd': round(additional_revenue, 2),
            'processing_cost_usd': round(processing_cost, 2),
            'net_additional_revenue_usd': round(net_additional_revenue, 2),
            'total_investment_usd': round(total_investment, 2),
            'net_profit_usd': round(net_profit, 2),
            'roi_percentage': round(roi_percentage, 1),
            'payback_period_months': round(payback_months, 1) if payback_months != float('inf') else 'N/A',
            'profitability_assessment': self._assess_profitability(roi_percentage)
        }

    def _assess_profitability(self, roi_percentage: float) -> str:
        """Assess the profitability of the recommendation"""
        if roi_percentage >= 200:
            return "Excellent - Very high return expected"
        elif roi_percentage >= 100:
            return "Very Good - Strong positive return"
        elif roi_percentage >= 50:
            return "Good - Positive return likely"
        elif roi_percentage >= 0:
            return "Fair - Break-even to modest return"
        else:
            return "Poor - Consider alternative approaches"

    def _determine_seasonal_timing(self, deficiency_type: DeficiencyType, current_month: str) -> SeasonalTiming:
        """Determine optimal seasonal timing for application"""
        
        fertilizer_type = deficiency_type.value.split('_')[0]
        timing_info = self.seasonal_calendar['fertilizer_specific_timing']
        type_timing = timing_info.get(f"{fertilizer_type}_fertilizers", timing_info['nitrogen_fertilizers'])
        
        # Determine optimal season
        current_season = self._get_current_season(current_month)
        season_data = self.seasonal_calendar['optimal_application_periods'][current_season]
        
        return SeasonalTiming(
            optimal_months=type_timing['optimal_months'],
            monsoon_dependent=fertilizer_type in ['nitrogen', 'compound'],
            avoid_months=type_timing['avoid_months'],
            rainfall_requirements=season_data['rainfall'],
            temperature_range=season_data['temperature_range']
        )

    def _get_current_season(self, current_month: str) -> str:
        """Determine current season based on month"""
        yala_months = ['May', 'June', 'July', 'August', 'September']
        maha_months = ['December', 'January', 'February']
        
        if current_month in yala_months:
            return 'yala_season'
        elif current_month in maha_months:
            return 'maha_season'
        else:
            return 'inter_monsoon'

    def _generate_application_instructions(
        self,
        fertilizer: FertilizerProduct,
        deficiency_type: DeficiencyType,
        severity: SeverityLevel
    ) -> str:
        """Generate detailed application instructions"""
        
        base_instructions = f"""
APPLICATION INSTRUCTIONS FOR {fertilizer.name}:

1. PREPARATION:
   - Test soil moisture before application
   - Clear weeds around plants (30cm radius)
   - Prepare application tools (spreader or hand application)

2. APPLICATION METHOD:
   - {fertilizer.special_instructions}
   - Apply in ring pattern 30cm from tree trunk
   - Do not apply directly against bark
   - Mix with top 5cm of soil using light cultivation

3. TIMING:
   - Apply during early morning or late afternoon
   - Ensure soil is moist but not waterlogged
   - Irrigate lightly after application if no rain expected

4. SAFETY PRECAUTIONS:
   - Wear protective gloves and clothing
   - Avoid application during windy conditions
   - Store unused fertilizer in cool, dry place

5. POST-APPLICATION:
   - Monitor for visible improvement in {self._get_improvement_timeline(deficiency_type)} days
   - Maintain regular irrigation schedule
   - Avoid disturbance of application area for 48 hours
        """
        
        if severity == SeverityLevel.SEVERE:
            base_instructions += "\n6. SEVERE DEFICIENCY NOTES:\n   - Consider foliar application for faster results\n   - Monitor daily for stress signs\n   - Consult expert if no improvement in 2 weeks"
        
        return base_instructions.strip()

    def _generate_monitoring_guidelines(self, deficiency_type: DeficiencyType, severity: SeverityLevel) -> str:
        """Generate monitoring guidelines"""
        
        deficiency_symptoms = {
            DeficiencyType.NITROGEN_DEFICIENCY: "yellowing leaves, reduced growth, pale coloration",
            DeficiencyType.PHOSPHORUS_DEFICIENCY: "purple/red leaf edges, poor root development, stunted growth",
            DeficiencyType.POTASSIUM_DEFICIENCY: "brown leaf edges, poor disease resistance, weak stems"
        }
        
        improvement_signs = {
            DeficiencyType.NITROGEN_DEFICIENCY: "new green growth, improved leaf color, increased vigor",
            DeficiencyType.PHOSPHORUS_DEFICIENCY: "better root development, normal leaf color, improved flowering",
            DeficiencyType.POTASSIUM_DEFICIENCY: "stronger stems, disease resistance, normal leaf edges"
        }
        
        return f"""
MONITORING GUIDELINES:

1. BASELINE ASSESSMENT:
   - Document current symptoms: {deficiency_symptoms.get(deficiency_type, 'general deficiency symptoms')}
   - Take reference photos of affected plants
   - Record growth measurements

2. WEEKLY MONITORING:
   - Check for signs of improvement: {improvement_signs.get(deficiency_type, 'general improvement')}
   - Monitor new leaf growth
   - Assess overall plant vigor

3. WARNING SIGNS:
   - Worsening symptoms after 2 weeks
   - Appearance of new deficiency symptoms
   - Leaf burn or fertilizer damage

4. SUCCESS INDICATORS:
   - Visible improvement within {self._get_improvement_timeline(deficiency_type)} days
   - New healthy growth
   - Recovery of normal plant coloration

5. DOCUMENTATION:
   - Weekly photo documentation
   - Growth measurements every 2 weeks
   - Record rainfall and irrigation
        """

    def _generate_warning_notes(
        self,
        fertilizer: FertilizerProduct,
        deficiency_type: DeficiencyType,
        farm_location: str
    ) -> List[str]:
        """Generate warning notes and precautions"""
        
        warnings = []
        
        # Fertilizer-specific warnings
        if "Urea" in fertilizer.name:
            warnings.append("CAUTION: Urea can burn leaves if applied during hot, dry conditions")
            warnings.append("Apply only during cooler parts of the day")
        
        if "Sulfate" in fertilizer.name:
            warnings.append("NOTE: Ammonium sulfate acidifies soil - monitor pH regularly")
        
        # Deficiency-specific warnings
        if deficiency_type == DeficiencyType.PHOSPHORUS_DEFICIENCY:
            warnings.append("IMPORTANT: Phosphorus deficiency may indicate soil pH problems")
            warnings.append("Consider soil testing and pH adjustment")
        
        # Seasonal warnings
        current_month = datetime.now().strftime("%B")
        if current_month in ['March', 'April', 'October']:
            warnings.append("WARNING: Dry season application - ensure adequate irrigation")
        
        # Regional warnings
        region_data = self.regional_data.get(farm_location, {})
        if region_data.get('soil_ph_range', [6.0, 7.0])[0] < 5.5:
            warnings.append("SOIL ALERT: Acidic soil conditions may affect nutrient uptake")
        
        # General warnings
        warnings.extend([
            "Always read and follow fertilizer label instructions",
            "Do not exceed recommended application rates",
            "Contact agricultural extension officer for severe deficiencies",
            "Keep fertilizers away from children and animals"
        ])
        
        return warnings

    def _calculate_improvement_timeline(
        self,
        deficiency_type: DeficiencyType,
        severity: SeverityLevel,
        fertilizer: FertilizerProduct
    ) -> int:
        """Calculate expected improvement timeline in days"""
        
        base_timeline = {
            DeficiencyType.NITROGEN_DEFICIENCY: 14,  # Fast response
            DeficiencyType.PHOSPHORUS_DEFICIENCY: 28,  # Slower response
            DeficiencyType.POTASSIUM_DEFICIENCY: 21   # Medium response
        }
        
        days = base_timeline.get(deficiency_type, 21)
        
        # Adjust for severity
        if severity == SeverityLevel.SEVERE:
            days += 7
        elif severity == SeverityLevel.MILD:
            days -= 3
        
        # Adjust for fertilizer type
        if fertilizer.organic:
            days += 7  # Organic fertilizers work slower
        
        return max(7, days)  # Minimum 7 days

    def _get_improvement_timeline(self, deficiency_type: DeficiencyType) -> int:
        """Get improvement timeline for monitoring guidelines"""
        return {
            DeficiencyType.NITROGEN_DEFICIENCY: 14,
            DeficiencyType.PHOSPHORUS_DEFICIENCY: 28,
            DeficiencyType.POTASSIUM_DEFICIENCY: 21
        }.get(deficiency_type, 21)

    def _generate_preventive_measures(self, deficiency_type: DeficiencyType, region_data: Dict) -> List[str]:
        """Generate preventive measures to avoid future deficiencies"""
        
        measures = []
        
        # General preventive measures
        measures.extend([
            "Maintain regular soil testing (annually)",
            "Follow balanced NPK fertilization schedule",
            "Ensure proper drainage to prevent nutrient loss",
            "Use organic matter to improve soil structure",
            "Monitor plant health regularly for early detection"
        ])
        
        # Deficiency-specific measures
        if deficiency_type == DeficiencyType.NITROGEN_DEFICIENCY:
            measures.extend([
                "Apply organic mulch to retain nitrogen",
                "Avoid over-watering which leaches nitrogen",
                "Consider green manure crops in inter-cropping"
            ])
        elif deficiency_type == DeficiencyType.PHOSPHORUS_DEFICIENCY:
            measures.extend([
                "Maintain soil pH between 6.0-6.5 for optimal P availability",
                "Add organic matter to improve P cycling",
                "Avoid excessive calcium applications"
            ])
        elif deficiency_type == DeficiencyType.POTASSIUM_DEFICIENCY:
            measures.extend([
                "Use potassium-rich organic amendments",
                "Avoid excessive nitrogen which can interfere with K uptake",
                "Maintain adequate soil moisture"
            ])
        
        # Regional considerations
        if region_data.get('soil_ph_range', [6.0, 7.0])[0] < 5.5:
            measures.append("Apply agricultural lime to raise soil pH")
        
        return measures

    def _save_recommendation(self, recommendation: RecommendationResult, farm_location: str):
        """Save recommendation for future reference and analysis"""
        
        # Create recommendation record
        record = {
            'timestamp': datetime.now().isoformat(),
            'farm_location': farm_location,
            'deficiency_type': recommendation.deficiency_type.value,
            'severity': recommendation.severity.value,
            'confidence_score': recommendation.confidence_score,
            'primary_fertilizer': recommendation.primary_fertilizer.name,
            'total_cost': recommendation.cost_analysis['total_cost_usd'],
            'projected_roi': recommendation.roi_projection['roi_percentage'],
            'expected_improvement_days': recommendation.expected_improvement_days
        }
        
        # Save to file
        recommendations_file = self.data_path / "recommendation_history.json"
        
        # Load existing records
        if recommendations_file.exists():
            with open(recommendations_file, 'r') as f:
                history = json.load(f)
        else:
            history = []
        
        # Add new record
        history.append(record)
        
        # Keep only last 1000 records
        history = history[-1000:]
        
        # Save updated history
        with open(recommendations_file, 'w') as f:
            json.dump(history, f, indent=2)

    def get_recommendation_history(self, farm_location: str = None) -> List[Dict]:
        """Get recommendation history for analysis"""
        
        recommendations_file = self.data_path / "recommendation_history.json"
        
        if not recommendations_file.exists():
            return []
        
        with open(recommendations_file, 'r') as f:
            history = json.load(f)
        
        if farm_location:
            history = [r for r in history if r['farm_location'] == farm_location]
        
        return history

    def analyze_recommendation_effectiveness(self) -> Dict[str, Any]:
        """Analyze the effectiveness of past recommendations"""
        
        history = self.get_recommendation_history()
        
        if not history:
            return {"analysis": "No recommendation history available"}
        
        # Calculate statistics
        total_recommendations = len(history)
        avg_cost = sum(r['total_cost'] for r in history) / total_recommendations
        avg_roi = sum(r['projected_roi'] for r in history) / total_recommendations
        
        # Deficiency type distribution
        deficiency_counts = {}
        for record in history:
            deficiency_type = record['deficiency_type']
            deficiency_counts[deficiency_type] = deficiency_counts.get(deficiency_type, 0) + 1
        
        return {
            'total_recommendations': total_recommendations,
            'average_cost_usd': round(avg_cost, 2),
            'average_projected_roi_percentage': round(avg_roi, 1),
            'deficiency_distribution': deficiency_counts,
            'most_common_deficiency': max(deficiency_counts, key=deficiency_counts.get),
            'analysis_date': datetime.now().isoformat()
        }


# Example usage
if __name__ == "__main__":
    # Initialize recommendation engine
    engine = IntelligentFertilizerRecommendationEngine()
    
    # Generate sample recommendation
    recommendation = engine.generate_recommendation(
        deficiency_type=DeficiencyType.NITROGEN_DEFICIENCY,
        severity=SeverityLevel.MODERATE,
        confidence_score=0.85,
        farm_location="matale",
        farm_size_hectares=2.0,
        farmer_budget_usd=300.0,
        organic_preference=False
    )
    
    print("Fertilizer Recommendation Generated:")
    print(f"Primary fertilizer: {recommendation.primary_fertilizer.name}")
    print(f"Expected improvement: {recommendation.expected_improvement_days} days")
    print(f"Total cost: ${recommendation.cost_analysis['total_cost_usd']}")
    print(f"Projected ROI: {recommendation.roi_projection['roi_percentage']}%")
