#!/usr/bin/env python3
"""
Simple Hybrid Yield API Test
"""

import requests
import json

BASE_URL = 'http://localhost:8000/api/v1'

def test_hybrid_yield_flow():
    print('🤖 Testing Complete Hybrid Yield API Flow')
    print('=' * 60)
    
    # Step 1: Create a test farm
    print('Step 1: Creating test farm...')
    farm_data = {
        'name': 'Test Hybrid Farm',
        'owner_name': 'Test Farmer',
        'location': 'Kandy, Sri Lanka',
        'total_area': 5.0,
        'latitude': 7.8731,
        'longitude': 80.7718,
        'num_plots': 2
    }
    
    try:
        resp = requests.post(f'{BASE_URL}/yield-weather/farms', json=farm_data)
        if resp.status_code == 201:
            farm_id = resp.json()['id']
            print(f'✅ Farm created successfully (ID: {farm_id})')
        else:
            print(f'❌ Farm creation failed: {resp.status_code} - {resp.text}')
            return
    except Exception as e:
        print(f'❌ Farm creation error: {e}')
        return
    
    # Step 2: Create a test plot
    print('Step 2: Creating test plot...')
    plot_data = {
        'farm_id': farm_id,
        'name': 'Test Hybrid Plot',
        'area': 2.5,
        'status': 'PLANTED',
        'crop_type': 'Ceylon_Cinnamon',
        'progress_percentage': 60
    }
    
    try:
        resp = requests.post(f'{BASE_URL}/yield-weather/plots', json=plot_data)
        if resp.status_code == 201:
            plot_id = resp.json()['id']
            print(f'✅ Plot created successfully (ID: {plot_id})')
        else:
            print(f'❌ Plot creation failed: {resp.status_code} - {resp.text}')
            return
    except Exception as e:
        print(f'❌ Plot creation error: {e}')
        return
    
    # Step 3: Test hybrid yield prediction
    print('Step 3: Testing hybrid yield prediction...')
    prediction_request = {
        'plot_id': plot_id,
        'total_trees': 75,
        'environmental_factors': {
            'rainfall': 2200,
            'temperature': 26.5
        },
        'force_recalculate': True
    }
    
    try:
        resp = requests.post(f'{BASE_URL}/hybrid-yield/predict', json=prediction_request)
        print(f'Prediction response status: {resp.status_code}')
        
        if resp.status_code == 200:
            result = resp.json()
            print('✅ Hybrid yield prediction successful!')
            print(f'   Final Hybrid Yield: {result.get("final_hybrid_yield")} kg')
            print(f'   Confidence Score: {result.get("confidence_score")}')
            print(f'   Tree Model Yield: {result.get("ml_yield_tree_level")} kg')
            print(f'   Farm Model Yield: {result.get("ml_yield_farm_level")} kg')
            print(f'   Tree Model Weight: {result.get("blending_weight_tree")}')
            print(f'   Farm Model Weight: {result.get("blending_weight_farm")}')
        else:
            print(f'❌ Prediction failed: {resp.status_code} - {resp.text}')
    except Exception as e:
        print(f'❌ Prediction error: {e}')
    
    # Step 4: Test get latest prediction
    print('\nStep 4: Testing get latest prediction...')
    try:
        resp = requests.get(f'{BASE_URL}/hybrid-yield/plot/{plot_id}/latest')
        if resp.status_code == 200:
            print('✅ Latest prediction retrieved successfully')
        else:
            print(f'❌ Latest prediction failed: {resp.status_code}')
    except Exception as e:
        print(f'❌ Latest prediction error: {e}')
    
    # Step 5: Test prediction history
    print('Step 5: Testing prediction history...')
    try:
        resp = requests.get(f'{BASE_URL}/hybrid-yield/plot/{plot_id}/history')
        if resp.status_code == 200:
            history = resp.json()
            print(f'✅ History retrieved: {len(history)} predictions')
        else:
            print(f'❌ History failed: {resp.status_code}')
    except Exception as e:
        print(f'❌ History error: {e}')
    
    # Step 6: Test farm statistics
    print('Step 6: Testing farm yield statistics...')
    try:
        resp = requests.get(f'{BASE_URL}/hybrid-yield/statistics/farm/{farm_id}')
        if resp.status_code == 200:
            stats = resp.json()
            print('✅ Farm statistics retrieved')
            print(f'   Total plots: {stats.get("total_plots")}')
            print(f'   Plots with predictions: {stats.get("plots_with_predictions")}')
            total_yield = stats.get("total_estimated_yield")
            if total_yield:
                print(f'   Total estimated yield: {total_yield:.2f} kg')
        else:
            print(f'❌ Farm stats failed: {resp.status_code}')
    except Exception as e:
        print(f'❌ Farm stats error: {e}')
    
    # Step 7: Test bulk prediction
    print('Step 7: Testing bulk prediction...')
    bulk_data = {
        'plot_ids': [plot_id],
        'environmental_factors': {
            'rainfall': 2500,
            'temperature': 27.0
        },
        'force_recalculate': True
    }
    
    try:
        resp = requests.post(f'{BASE_URL}/hybrid-yield/bulk-predict', json=bulk_data)
        if resp.status_code == 200:
            bulk_result = resp.json()
            print('✅ Bulk prediction successful')
            print(f'   Successful predictions: {bulk_result.get("successful_predictions", 0)}')
            print(f'   Failed predictions: {bulk_result.get("failed_predictions", 0)}')
        else:
            print(f'❌ Bulk prediction failed: {resp.status_code}')
    except Exception as e:
        print(f'❌ Bulk prediction error: {e}')
    
    # Cleanup
    print('\nCleaning up test data...')
    try:
        requests.delete(f'{BASE_URL}/yield-weather/plots/{plot_id}')
        requests.delete(f'{BASE_URL}/yield-weather/farms/{farm_id}')
        print('✅ Cleanup completed')
    except Exception as e:
        print(f'⚠️ Cleanup error: {e}')
    
    print('\n🎉 Hybrid Yield API testing completed!')

if __name__ == "__main__":
    test_hybrid_yield_flow()