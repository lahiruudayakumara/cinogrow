#!/usr/bin/env python3
"""
Comprehensive Test Suite for Yield Weather Component Endpoints
Tests all endpoints with focus on plots functionality
"""

import requests
import json
import sys
from datetime import datetime, date
from typing import Dict, Any, List
import traceback

# Base URL for the API
BASE_URL = "http://127.0.0.1:8000/api/v1"

class YieldWeatherTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_resources = {
            'farms': [],
            'plots': [],
            'planting_records': [],
            'yield_records': [],
            'trees': []
        }
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            'test_name': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """Make HTTP request and return response data"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=params)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, params=params)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, params=params)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, params=params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return {
                'status_code': response.status_code,
                'success': response.status_code < 400,
                'data': response.json() if response.content else None,
                'error': None
            }
        except Exception as e:
            return {
                'status_code': 0,
                'success': False,
                'data': None,
                'error': str(e)
            }

    def test_weather_endpoints(self):
        """Test weather-related endpoints"""
        print("🌤️  Testing Weather Endpoints")
        print("=" * 50)
        
        # Test GET /weather/health
        response = self.make_request('GET', '/weather/health')
        self.log_test(
            "Weather Health Check", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test GET /weather/current with coordinates
        response = self.make_request('GET', '/weather/current', params={
            'latitude': 7.8731,  # Kandy, Sri Lanka
            'longitude': 80.7718
        })
        self.log_test(
            "Get Current Weather by Coordinates", 
            response['success'],
            f"Status: {response['status_code']}", 
            response.get('data', response.get('error'))
        )
        
        # Test POST /weather/current
        weather_data = {
            "latitude": 7.8731,
            "longitude": 80.7718
        }
        response = self.make_request('POST', '/weather/current', data=weather_data)
        self.log_test(
            "Post Current Weather", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test GET /weather/city
        response = self.make_request('GET', '/weather/city', params={'city': 'Kandy,LK'})
        self.log_test(
            "Get Weather by City", 
            response['success'],
            f"Status: {response['status_code']}"
        )

    def test_farm_endpoints(self):
        """Test farm-related endpoints"""
        print("🏡 Testing Farm Endpoints")
        print("=" * 50)
        
        # Test GET /yield-weather/farms (should work even if empty)
        response = self.make_request('GET', '/yield-weather/farms')
        self.log_test(
            "Get All Farms", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test POST /yield-weather/farms (create farm)
        farm_data = {
            "name": "Test Farm 1",
            "owner_name": "Test Farmer",
            "location": "Kandy, Sri Lanka",
            "total_area": 5.5,
            "latitude": 7.8731,
            "longitude": 80.7718,
            "num_plots": 3
        }
        response = self.make_request('POST', '/yield-weather/farms', data=farm_data)
        if response['success'] and response['data']:
            farm_id = response['data']['id']
            self.created_resources['farms'].append(farm_id)
            
        self.log_test(
            "Create Farm", 
            response['success'],
            f"Status: {response['status_code']}, Farm ID: {response['data'].get('id') if response['data'] else 'None'}"
        )
        
        if not response['success']:
            print("❌ Cannot continue with plot tests - farm creation failed")
            return False
        
        farm_id = response['data']['id']
        
        # Test GET /yield-weather/farms/{farm_id}
        response = self.make_request('GET', f'/yield-weather/farms/{farm_id}')
        self.log_test(
            "Get Specific Farm", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test PUT /yield-weather/farms/{farm_id}
        update_data = {
            "name": "Test Farm 1 Updated",
            "owner_name": "Test Farmer",
            "location": "Kandy, Sri Lanka",
            "total_area": 6.0,
            "latitude": 7.8731,
            "longitude": 80.7718,
            "num_plots": 3
        }
        response = self.make_request('PUT', f'/yield-weather/farms/{farm_id}', data=update_data)
        self.log_test(
            "Update Farm", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        return True

    def test_plot_endpoints(self):
        """Test plot-related endpoints - the main focus"""
        print("📍 Testing Plot Endpoints (Main Focus)")
        print("=" * 50)
        
        if not self.created_resources['farms']:
            print("❌ No farms available for plot testing")
            return False
        
        farm_id = self.created_resources['farms'][0]
        
        # Test GET /yield-weather/farms/{farm_id}/plots (before creating plots)
        response = self.make_request('GET', f'/yield-weather/farms/{farm_id}/plots')
        self.log_test(
            "Get Farm Plots (Empty)", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test POST /yield-weather/plots (create multiple plots)
        plot_data_list = [
            {
                "farm_id": farm_id,
                "name": "Plot A",
                "area": 1.5,
                "status": "PREPARING",
                "crop_type": "Ceylon_Cinnamon",
                "progress_percentage": 0
            },
            {
                "farm_id": farm_id,
                "name": "Plot B", 
                "area": 2.0,
                "status": "PREPARING",
                "crop_type": "Ceylon_Cinnamon",
                "progress_percentage": 0
            },
            {
                "farm_id": farm_id,
                "name": "Plot C",
                "area": 2.0,
                "status": "PREPARING", 
                "crop_type": "Ceylon_Cinnamon",
                "progress_percentage": 0
            }
        ]
        
        for i, plot_data in enumerate(plot_data_list):
            response = self.make_request('POST', '/yield-weather/plots', data=plot_data)
            if response['success'] and response['data']:
                plot_id = response['data']['id']
                self.created_resources['plots'].append(plot_id)
                
            self.log_test(
                f"Create Plot {chr(65+i)}", 
                response['success'],
                f"Status: {response['status_code']}, Plot ID: {response['data'].get('id') if response['data'] else 'None'}"
            )
        
        if not self.created_resources['plots']:
            print("❌ No plots created - cannot continue plot testing")
            return False
        
        plot_id = self.created_resources['plots'][0]
        
        # Test GET /yield-weather/farms/{farm_id}/plots (after creating plots)
        response = self.make_request('GET', f'/yield-weather/farms/{farm_id}/plots')
        self.log_test(
            "Get Farm Plots (With Data)", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test GET /yield-weather/plots/{plot_id}
        response = self.make_request('GET', f'/yield-weather/plots/{plot_id}')
        self.log_test(
            "Get Specific Plot", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test PUT /yield-weather/plots/{plot_id}
        update_data = {
            "name": "Plot A Updated",
            "area": 1.8,
            "crop_type": "Ceylon_Cinnamon"
        }
        response = self.make_request('PUT', f'/yield-weather/plots/{plot_id}', data=update_data)
        self.log_test(
            "Update Plot", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test PUT /yield-weather/plots/{plot_id}/status
        response = self.make_request('PUT', f'/yield-weather/plots/{plot_id}/status', params={
            'status': 'PLANTED',
            'progress_percentage': 25
        })
        self.log_test(
            "Update Plot Status", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test PUT /yield-weather/farms/{farm_id}/plots/areas
        areas_data = [
            {"name": "Plot A Updated", "area": 1.9},
            {"name": "Plot B", "area": 2.1}
        ]
        response = self.make_request('PUT', f'/yield-weather/farms/{farm_id}/plots/areas', data=areas_data)
        self.log_test(
            "Update Multiple Plot Areas", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        return True

    def test_planting_records_endpoints(self):
        """Test planting records endpoints"""
        print("🌱 Testing Planting Records Endpoints")
        print("=" * 50)
        
        if not self.created_resources['plots']:
            print("❌ No plots available for planting records testing")
            return False
        
        plot_id = self.created_resources['plots'][0]
        
        # Test GET /yield-weather/planting-records (before creating records)
        response = self.make_request('GET', '/yield-weather/planting-records')
        self.log_test(
            "Get All Planting Records (Empty)", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test POST /yield-weather/planting-records
        planting_data = {
            "user_id": 1,
            "plot_id": plot_id,
            "plot_area": 1.5,
            "planted_date": "2024-01-15T00:00:00",
            "cinnamon_variety": "Ceylon_Cinnamon",
            "seedling_count": 100
        }
        response = self.make_request('POST', '/yield-weather/planting-records', data=planting_data)
        if response['success'] and response['data']:
            record_id = response['data']['record_id']
            self.created_resources['planting_records'].append(record_id)
            
        self.log_test(
            "Create Planting Record", 
            response['success'],
            f"Status: {response['status_code']}, Record ID: {response['data'].get('record_id') if response['data'] else 'None'}"
        )
        
        if not response['success']:
            return False
        
        record_id = response['data']['record_id']
        
        # Test GET /yield-weather/planting-records/{record_id}
        response = self.make_request('GET', f'/yield-weather/planting-records/{record_id}')
        self.log_test(
            "Get Specific Planting Record", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test GET /yield-weather/users/1/planting-records
        response = self.make_request('GET', '/yield-weather/users/1/planting-records')
        self.log_test(
            "Get User Planting Records", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test GET /yield-weather/plots/{plot_id}/planting-records
        response = self.make_request('GET', f'/yield-weather/plots/{plot_id}/planting-records')
        self.log_test(
            "Get Plot Planting Records", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test PUT /yield-weather/planting-records/{record_id}
        update_data = {
            "seedling_count": 120,
            "notes": "Updated seedling count"
        }
        response = self.make_request('PUT', f'/yield-weather/planting-records/{record_id}', data=update_data)
        self.log_test(
            "Update Planting Record", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        return True

    def test_yield_prediction_endpoints(self):
        """Test yield prediction endpoints"""
        print("📊 Testing Yield Prediction Endpoints")
        print("=" * 50)
        
        # Test GET /yield-weather/ml/model-info
        response = self.make_request('GET', '/yield-weather/ml/model-info')
        self.log_test(
            "Get ML Model Info", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test GET /yield-weather/ml/dataset-stats
        response = self.make_request('GET', '/yield-weather/ml/dataset-stats')
        self.log_test(
            "Get Dataset Statistics", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test GET /yield-weather/yield-dataset
        response = self.make_request('GET', '/yield-weather/yield-dataset')
        self.log_test(
            "Get Yield Dataset", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test GET /yield-weather/yield-records
        response = self.make_request('GET', '/yield-weather/yield-records')
        self.log_test(
            "Get All Yield Records", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        if self.created_resources['plots']:
            plot_id = self.created_resources['plots'][0]
            
            # Test POST /yield-weather/yield-records
            yield_data = {
                "user_id": 1,
                "plot_id": plot_id,
                "yield_amount": 250.5,
                "yield_date": "2024-06-15",
                "harvest_notes": "Good quality harvest"
            }
            response = self.make_request('POST', '/yield-weather/yield-records', data=yield_data)
            if response['success'] and response['data']:
                yield_id = response['data']['yield_id']
                self.created_resources['yield_records'].append(yield_id)
                
            self.log_test(
                "Create Yield Record", 
                response['success'],
                f"Status: {response['status_code']}, Yield ID: {response['data'].get('yield_id') if response['data'] else 'None'}"
            )
            
            # Test GET /yield-weather/users/1/predicted-yields
            response = self.make_request('GET', '/yield-weather/users/1/predicted-yields')
            self.log_test(
                "Get Predicted Yields for User", 
                response['success'],
                f"Status: {response['status_code']}"
            )
            
            # Test POST /yield-weather/ml/predict-single
            prediction_data = {
                "plot_id": plot_id,
                "area": 1.5,
                "rainfall": 150.0,
                "temperature": 28.5,
                "age_years": 3
            }
            response = self.make_request('POST', '/yield-weather/ml/predict-single', params=prediction_data)
            self.log_test(
                "Single Yield Prediction", 
                response['success'],
                f"Status: {response['status_code']}"
            )

    def test_farm_assistance_endpoints(self):
        """Test farm assistance endpoints"""
        print("🤝 Testing Farm Assistance Endpoints")
        print("=" * 50)
        
        # Test GET /yield-weather/farm-assistance/health
        response = self.make_request('GET', '/yield-weather/farm-assistance/health')
        self.log_test(
            "Farm Assistance Health Check", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test GET /yield-weather/farm-assistance/plots-with-age/1
        response = self.make_request('GET', '/yield-weather/farm-assistance/plots-with-age/1')
        self.log_test(
            "Get Plots with Age Info", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        # Test GET /yield-weather/farm-assistance/activity-records/1
        response = self.make_request('GET', '/yield-weather/farm-assistance/activity-records/1')
        self.log_test(
            "Get User Activity Records", 
            response['success'],
            f"Status: {response['status_code']}, Count: {len(response.get('data', []))}"
        )
        
        # Test GET /yield-weather/farm-assistance/activity-summary/1
        response = self.make_request('GET', '/yield-weather/farm-assistance/activity-summary/1')
        self.log_test(
            "Get Activity Summary", 
            response['success'],
            f"Status: {response['status_code']}"
        )

    def test_dashboard_endpoints(self):
        """Test dashboard and stats endpoints"""
        print("📈 Testing Dashboard Endpoints")
        print("=" * 50)
        
        # Test GET /yield-weather/stats/dashboard
        response = self.make_request('GET', '/yield-weather/stats/dashboard')
        self.log_test(
            "Get Dashboard Stats", 
            response['success'],
            f"Status: {response['status_code']}"
        )

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("🧹 Cleaning Up Test Resources")
        print("=" * 50)
        
        # Delete yield records
        for yield_id in self.created_resources['yield_records']:
            response = self.make_request('DELETE', f'/yield-weather/yield-records/{yield_id}')
            self.log_test(f"Delete Yield Record {yield_id}", response['success'], f"Status: {response['status_code']}")
        
        # Delete planting records
        for record_id in self.created_resources['planting_records']:
            response = self.make_request('DELETE', f'/yield-weather/planting-records/{record_id}')
            self.log_test(f"Delete Planting Record {record_id}", response['success'], f"Status: {response['status_code']}")
        
        # Delete plots
        for plot_id in self.created_resources['plots']:
            response = self.make_request('DELETE', f'/yield-weather/plots/{plot_id}')
            self.log_test(f"Delete Plot {plot_id}", response['success'], f"Status: {response['status_code']}")
        
        # Delete farms
        for farm_id in self.created_resources['farms']:
            response = self.make_request('DELETE', f'/yield-weather/farms/{farm_id}')
            self.log_test(f"Delete Farm {farm_id}", response['success'], f"Status: {response['status_code']}")

    def generate_report(self):
        """Generate final test report"""
        print("\n" + "=" * 80)
        print("📋 FINAL TEST REPORT")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            print("-" * 40)
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test_name']}: {result['details']}")
        
        # Focus on plot-related failures
        plot_failures = [r for r in self.test_results if not r['success'] and 'plot' in r['test_name'].lower()]
        if plot_failures:
            print("\n🔍 PLOT-SPECIFIC FAILURES:")
            print("-" * 40)
            for result in plot_failures:
                print(f"  • {result['test_name']}: {result['details']}")
                if result['response_data']:
                    print(f"    Response: {result['response_data']}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Yield Weather Endpoint Testing")
        print("=" * 80)
        
        try:
            # Test individual components
            self.test_weather_endpoints()
            
            if self.test_farm_endpoints():
                if self.test_plot_endpoints():
                    self.test_planting_records_endpoints()
                    self.test_yield_prediction_endpoints()
            
            self.test_farm_assistance_endpoints()
            self.test_dashboard_endpoints()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {e}")
            traceback.print_exc()
        
        finally:
            # Always try to clean up
            try:
                self.cleanup_resources()
            except Exception as e:
                print(f"⚠️  Warning: Cleanup failed: {e}")
            
            self.generate_report()

if __name__ == "__main__":
    print("🔧 Yield Weather API Endpoint Tester")
    print(f"Testing against: {BASE_URL}")
    print()
    
    # Check if server is running
    try:
        response = requests.get("http://127.0.0.1:8000/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ Server not responding properly (status: {response.status_code})")
            sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to server: {e}")
        sys.exit(1)
    
    print("✅ Server is running, starting tests...\n")
    
    tester = YieldWeatherTester()
    tester.run_all_tests()