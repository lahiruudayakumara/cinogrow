"""
Utility functions for calculating plot status based on planting date
"""
from datetime import datetime
from typing import Dict, Any


def calculate_plot_status(planted_date: datetime) -> Dict[str, Any]:
    """
    Calculate plot status and progress based on planting date
    
    Args:
        planted_date: The date when the plot was planted
        
    Returns:
        Dictionary containing status, progress_percentage, and age_months
    """
    now = datetime.utcnow()
    
    # Calculate time difference
    time_diff = now - planted_date
    days_diff = time_diff.days
    months_diff = days_diff / 30.44  # Average month length
    years_diff = months_diff / 12
    
    # Calculate age in months (rounded to nearest integer)
    age_months = int(round(months_diff))
    
    # Status calculation logic matching mobile app
    if months_diff < 1:
        return {
            "status": "PLANTED",
            "progress_percentage": 5,
            "age_months": age_months
        }
    elif months_diff < 12:
        progress = min(20 + (months_diff * 5), 60)
        return {
            "status": "GROWING", 
            "progress_percentage": int(progress),
            "age_months": age_months
        }
    elif years_diff < 3:
        progress = min(60 + ((years_diff - 1) * 20), 85)
        return {
            "status": "GROWING",
            "progress_percentage": int(progress),
            "age_months": age_months
        }
    elif years_diff < 3.5:
        progress = min(85 + ((years_diff - 3) * 30), 95)
        return {
            "status": "MATURE",
            "progress_percentage": int(progress),
            "age_months": age_months
        }
    else:
        return {
            "status": "HARVESTING",
            "progress_percentage": 100,
            "age_months": age_months
        }


def should_update_plot_status(plot_status: str, calculated_status: str) -> bool:
    """
    Determine if plot status should be updated based on current and calculated status
    
    Args:
        plot_status: Current plot status in database
        calculated_status: Calculated status based on planting date
        
    Returns:
        Boolean indicating whether status should be updated
    """
    # Always update if current status is PREPARING and we have a planting record
    if plot_status == "PREPARING":
        return True
    
    # Status progression hierarchy
    status_hierarchy = {
        "PREPARING": 0,
        "PLANTED": 1,
        "GROWING": 2,
        "MATURE": 3,
        "HARVESTING": 4
    }
    
    current_level = status_hierarchy.get(plot_status, 0)
    calculated_level = status_hierarchy.get(calculated_status, 0)
    
    # Update if calculated status is higher in hierarchy
    return calculated_level > current_level