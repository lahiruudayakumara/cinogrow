#!/usr/bin/env python3
"""
Test script to simulate the mobile app farm update flow.
This tests the scenario where a user changes the number of plots when updating farm details.
"""

import requests
import json
import time

API_BASE_URL = "http://127.0.0.1:8000/api/v1"

def get_farm_state():
    """Get current farm and plots state"""
    print("\n=== Current State ===")
    
    # Get farm
    response = requests.get(f"{API_BASE_URL}/farms/3")
    if response.status_code == 200:
        farm = response.json()
        print(f"Farm ID {farm['id']}: {farm['name']}")
        print(f"  num_plots in farm record: {farm['num_plots']}")
        print(f"  total_area: {farm['total_area']} ha")
    else:
        print(f"Error getting farm: {response.text}")
        return None, None
    
    # Get plots
    response = requests.get(f"{API_BASE_URL}/farms/3/plots")
    if response.status_code == 200:
        plots = response.json()
        print(f"  actual plots in database: {len(plots)}")
        for plot in plots:
            print(f"    - {plot['name']}: {plot['area']} ha, {plot['status']}")
    else:
        print(f"Error getting plots: {response.text}")
        return farm, None
    
    return farm, plots

def test_backend_connection():
    """Test if backend is available"""
    try:
        response = requests.get(f"http://127.0.0.1:8000/health")
        return response.status_code == 200
    except:
        return False

def update_farm_details(new_num_plots, new_area=None):
    """Simulate the mobile app updating farm details with new number of plots"""
    print(f"\n=== Testing Farm Update: {new_num_plots} plots ===")
    
    # Get current farm data
    farm, plots = get_farm_state()
    if not farm or plots is None:
        print("Could not get current state")
        return False
    
    current_plot_count = len(plots)
    
    # Step 1: Update farm record (this is what the mobile app does first)
    farm_data = {
        'name': farm['name'],
        'owner_name': farm['owner_name'], 
        'total_area': new_area or farm['total_area'],
        'num_plots': new_num_plots,  # This is the key change
        'location': farm['location'],
        'latitude': farm['latitude'],
        'longitude': farm['longitude']
    }
    
    print(f"Step 1: Updating farm record from {current_plot_count} to {new_num_plots} plots...")
    response = requests.put(f"{API_BASE_URL}/farms/3", json=farm_data)
    if response.status_code == 200:
        updated_farm = response.json()
        print(f"✅ Farm record updated successfully")
        print(f"   num_plots in database: {updated_farm['num_plots']}")
    else:
        print(f"❌ Failed to update farm: {response.text}")
        return False
    
    # Step 2: Check intermediate state (farm updated but plots not yet changed)
    print(f"\nStep 2: Checking intermediate state...")
    farm_after_update, plots_after_update = get_farm_state()
    
    if farm_after_update['num_plots'] != current_plot_count:
        print(f"✅ Farm num_plots successfully updated to {farm_after_update['num_plots']}")
    else:
        print(f"❌ Farm num_plots was not updated properly")
        return False
    
    # Step 3: Handle plots change (this is what happens in handlePlotsChange)
    if new_num_plots != current_plot_count:
        print(f"\nStep 3: Handling plots change ({current_plot_count} -> {new_num_plots})...")
        
        # Delete all existing plots
        print("  Deleting existing plots...")
        for plot in plots_after_update:
            response = requests.delete(f"{API_BASE_URL}/plots/{plot['id']}")
            if response.status_code == 200:
                print(f"    ✅ Deleted {plot['name']}")
            else:
                print(f"    ❌ Failed to delete {plot['name']}: {response.text}")
                return False
        
        # Create new plots
        print("  Creating new plots...")
        area_per_plot = (new_area or farm['total_area']) / new_num_plots
        plot_names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
        
        for i in range(new_num_plots):
            plot_data = {
                'farm_id': 3,
                'name': f'Plot {plot_names[i]}',
                'area': round(area_per_plot, 1),
                'status': 'PREPARING',
                'crop_type': 'Cinnamon',
                'progress_percentage': 0
            }
            
            response = requests.post(f"{API_BASE_URL}/plots", json=plot_data)
            if response.status_code == 200:
                new_plot = response.json()
                print(f"    ✅ Created {new_plot['name']} ({new_plot['area']} ha)")
            else:
                print(f"    ❌ Failed to create plot {i+1}: {response.text}")
                return False
    
    # Step 4: Final state check
    print(f"\nStep 4: Final state check...")
    final_farm, final_plots = get_farm_state()
    
    success = (
        final_farm['num_plots'] == new_num_plots and 
        len(final_plots) == new_num_plots
    )
    
    if success:
        print(f"✅ SUCCESS: Farm and plots are now consistent!")
        print(f"   Farm record: {final_farm['num_plots']} plots")
        print(f"   Actual plots: {len(final_plots)} plots")
    else:
        print(f"❌ FAILED: Inconsistent state!")
        print(f"   Farm record: {final_farm['num_plots']} plots")
        print(f"   Actual plots: {len(final_plots)} plots")
    
    return success

def main():
    print("🧪 Testing Farm Update Logic")
    print("=" * 50)
    
    # Check backend
    if not test_backend_connection():
        print("❌ Backend is not running. Please start the backend server.")
        return
    
    print("✅ Backend is running")
    
    # Show initial state
    get_farm_state()
    
    # Test 1: Update from 2 plots to 3 plots
    success1 = update_farm_details(3, 30.0)
    
    # Wait a moment
    time.sleep(1)
    
    # Test 2: Update from 3 plots back to 2 plots
    success2 = update_farm_details(2, 30.0)
    
    # Summary
    print(f"\n{'='*50}")
    print("🏁 Test Summary:")
    print(f"  Test 1 (2->3 plots): {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"  Test 2 (3->2 plots): {'✅ PASS' if success2 else '❌ FAIL'}")
    
    if success1 and success2:
        print("🎉 All tests passed! The farm update logic is working correctly.")
    else:
        print("❌ Some tests failed. There may be issues with the update logic.")

if __name__ == "__main__":
    main()