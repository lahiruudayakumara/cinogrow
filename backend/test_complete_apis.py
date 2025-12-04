#!/usr/bin/env python3
"""
Comprehensive Test Suite for Yield Weather Component Endpoints INCLUDING Hybrid Yield APIs
Tests all endpoints with focus on plots functionality and new hybrid yield features
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
            'trees': [],
            'hybrid_predictions': []
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

    def test_farm_endpoints(self):
        """Test farm-related endpoints"""
        print("🏡 Testing Farm Endpoints")
        print("=" * 50)
        
        # Test GET /yield-weather/farms (should work even if empty)
        response = self.make_request('GET', '/yield-weather/farms')
        farms_count = len(response.get('data', [])) if response.get('data') is not None else 0
        self.log_test(
            "Get All Farms", 
            response['success'],
            f"Status: {response['status_code']}, Count: {farms_count}"
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
        
        return True

    def test_plot_endpoints(self):
        """Test plot-related endpoints - the main focus"""
        print("📍 Testing Plot Endpoints")
        print("=" * 50)
        
        if not self.created_resources['farms']:
            print("❌ No farms available for plot testing")
            return False
        
        farm_id = self.created_resources['farms'][0]
        
        # Test POST /yield-weather/plots (create multiple plots)
        plot_data_list = [
            {
                "farm_id": farm_id,
                "name": "Test Plot A",
                "area": 1.5,
                "status": "PREPARING",
                "crop_type": "Ceylon_Cinnamon",
                "progress_percentage": 0
            },
            {
                "farm_id": farm_id,
                "name": "Test Plot B", 
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
        
        # Test GET /yield-weather/plots/{plot_id}
        response = self.make_request('GET', f'/yield-weather/plots/{plot_id}')
        self.log_test(
            "Get Specific Plot", 
            response['success'],
            f"Status: {response['status_code']}"
        )
        
        return True

    def test_hybrid_yield_endpoints(self):
        """Test hybrid yield prediction endpoints - NEW FEATURE"""
        print("🤖 Testing Hybrid Yield Prediction Endpoints")
        print("=" * 50)
        
        if not self.created_resources['plots']:
            print("❌ No plots available for hybrid yield testing")
            return False
        
        plot_id = self.created_resources['plots'][0]
        
        # Test POST /hybrid-yield/predict
        prediction_request = {
            "plot_id": plot_id,
            "total_trees": 50,
            "environmental_factors": {
                "rainfall": 2200,
                "temperature": 26.5
            },
            "force_recalculate": True
        }
        response = self.make_request('POST', '/hybrid-yield/predict', data=prediction_request)
        
        prediction_id = None
        if response['success'] and response['data']:
            prediction_id = response['data'].get('id')
            self.created_resources['hybrid_predictions'].append(prediction_id)
            
        self.log_test(
            "Create Hybrid Yield Prediction", 
            response['success'],
            f"Status: {response['status_code']}, Prediction ID: {prediction_id if prediction_id else 'None'}",
            response.get('data', response.get('error'))
        )
        
        # Test GET /hybrid-yield/plot/{plot_id}/latest
        response = self.make_request('GET', f'/hybrid-yield/plot/{plot_id}/latest')
        self.log_test(
            "Get Latest Prediction", 
            response['success'],
            f"Status: {response['status_code']}",
            response.get('data', response.get('error')) if not response['success'] else None
        )
        
        # Test GET /hybrid-yield/plot/{plot_id}/history
        response = self.make_request('GET', f'/hybrid-yield/plot/{plot_id}/history')
        history_count = len(response.get('data', [])) if response.get('data') is not None else 0
        self.log_test(
            "Get Prediction History", 
            response['success'],
            f"Status: {response['status_code']}, Count: {history_count}",
            response.get('data', response.get('error')) if not response['success'] else None
        )
        
        # Test GET /hybrid-yield/plot/{plot_id}/summary
        response = self.make_request('GET', f'/hybrid-yield/plot/{plot_id}/summary')
        self.log_test(
            "Get Yield Summary", 
            response['success'],
            f"Status: {response['status_code']}",
            response.get('data', response.get('error')) if not response['success'] else None
        )
        
        # Test POST /hybrid-yield/bulk-predict
        bulk_request = {
            "plot_ids": [plot_id] if len(self.created_resources['plots']) == 1 else self.created_resources['plots'][:2],
            "environmental_factors": {
                "rainfall": 2200,
                "temperature": 26.5
            },
            "force_recalculate": True
        }
        response = self.make_request('POST', '/hybrid-yield/bulk-predict', data=bulk_request)
        self.log_test(
            "Bulk Yield Prediction", 
            response['success'],
            f"Status: {response['status_code']}, Plots processed: {response['data'].get('total_plots') if response['data'] else 0}",
            response.get('data', response.get('error')) if not response['success'] else None
        )
        
        if self.created_resources['farms']:
            farm_id = self.created_resources['farms'][0]
            
            # Test GET /hybrid-yield/statistics/farm/{farm_id}
            response = self.make_request('GET', f'/hybrid-yield/statistics/farm/{farm_id}')
            self.log_test(
                "Get Farm Yield Statistics", 
                response['success'],
                f"Status: {response['status_code']}",
                response.get('data', response.get('error')) if not response['success'] else None
            )
        
        return True

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

    def test_api_documentation(self):
        """Test API documentation availability"""
        print("📚 Testing API Documentation")
        print("=" * 50)
        
        # Test FastAPI docs endpoint
        try:
            response = requests.get("http://127.0.0.1:8000/docs", timeout=5)
            success = response.status_code == 200
            self.log_test(
                "FastAPI Documentation (/docs)", 
                success,
                f"Status: {response.status_code}"
            )
        except Exception as e:
            self.log_test(
                "FastAPI Documentation (/docs)", 
                False,
                f"Error: {e}"
            )

        # Test OpenAPI spec
        try:
            response = requests.get("http://127.0.0.1:8000/openapi.json", timeout=5)
            success = response.status_code == 200
            if success:
                openapi_spec = response.json()
                hybrid_paths = [path for path in openapi_spec.get('paths', {}) if 'hybrid-yield' in path]
                self.log_test(
                    "OpenAPI Specification", 
                    success,
                    f"Status: {response.status_code}, Hybrid yield paths found: {len(hybrid_paths)}"
                )
            else:
                self.log_test(
                    "OpenAPI Specification", 
                    success,
                    f"Status: {response.status_code}"
                )
        except Exception as e:
            self.log_test(
                "OpenAPI Specification", 
                False,
                f"Error: {e}"
            )

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("🧹 Cleaning Up Test Resources")
        print("=" * 50)
        
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
        
        # Focus on hybrid yield test results
        hybrid_tests = [r for r in self.test_results if 'hybrid' in r['test_name'].lower() or 'yield' in r['test_name'].lower()]
        if hybrid_tests:
            hybrid_passed = sum(1 for r in hybrid_tests if r['success'])
            print(f"\n🤖 HYBRID YIELD TESTS: {hybrid_passed}/{len(hybrid_tests)} passed")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            print("-" * 40)
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test_name']}: {result['details']}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Yield Weather + Hybrid Yield API Testing")
        print("=" * 80)
        
        try:
            # Test individual components
            self.test_weather_endpoints()
            self.test_api_documentation()
            
            if self.test_farm_endpoints():
                if self.test_plot_endpoints():
                    # Test the new hybrid yield functionality
                    self.test_hybrid_yield_endpoints()
            
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
    print("🔧 Comprehensive Yield Weather + Hybrid Yield API Tester")
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