#!/usr/bin/env python3
import requests
import json

# Test creating and deleting a simple plot
plot_data = {
    'farm_id': 3,
    'name': 'Test Plot',
    'area': 5.0,
    'status': 'PREPARING',
    'crop_type': 'Cinnamon',
    'progress_percentage': 0
}

try:
    # Create test plot
    response = requests.post('http://127.0.0.1:8000/api/v1/plots', json=plot_data)
    print(f'Create plot response: {response.status_code}')
    if response.status_code == 200:
        new_plot = response.json()
        plot_id = new_plot['id']
        print(f'Created plot {plot_id}: {new_plot["name"]}')
        
        # Now try to delete it
        delete_url = f'http://127.0.0.1:8000/api/v1/plots/{plot_id}'
        delete_response = requests.delete(delete_url)
        print(f'Delete plot response: {delete_response.status_code}')
        if delete_response.status_code == 200:
            result = delete_response.json()
            print(f'Delete success: {result["message"]}')
        else:
            print(f'Delete error: {delete_response.text}')
    else:
        print(f'Create error: {response.text}')
except Exception as e:
    print(f'Error: {e}')