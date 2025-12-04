#!/usr/bin/env python3
"""Check available API endpoints and help debug the 404 error"""

import requests
import json

def check_endpoints():
    try:
        # Get OpenAPI spec
        response = requests.get('http://localhost:8000/openapi.json', timeout=5)
        if response.status_code != 200:
            print(f"❌ Could not get OpenAPI spec: {response.status_code}")
            return
            
        data = response.json()
        paths = data.get('paths', {})
        
        print(f"📋 Available API endpoints ({len(paths)} total):")
        print("=" * 60)
        
        # Show yield-related endpoints
        yield_paths = [p for p in paths.keys() if 'yield' in p.lower()]
        print(f"\n🌱 Yield-related endpoints ({len(yield_paths)}):")
        for path in sorted(yield_paths):
            methods = list(paths[path].keys())
            print(f"  {path:<50} [{'/'.join(methods).upper()}]")
            
        # Show farm-related endpoints  
        farm_paths = [p for p in paths.keys() if 'farm' in p.lower()]
        print(f"\n🚜 Farm-related endpoints ({len(farm_paths)}):")
        for path in sorted(farm_paths):
            methods = list(paths[path].keys())
            print(f"  {path:<50} [{'/'.join(methods).upper()}]")
            
        # Show hybrid endpoints
        hybrid_paths = [p for p in paths.keys() if 'hybrid' in p.lower()]
        print(f"\n🔬 Hybrid-related endpoints ({len(hybrid_paths)}):")
        for path in sorted(hybrid_paths):
            methods = list(paths[path].keys())
            print(f"  {path:<50} [{'/'.join(methods).upper()}]")
            
        print(f"\n📍 Common endpoint patterns:")
        print(f"  - Health check: GET /health")
        print(f"  - API docs: GET /docs")
        print(f"  - OpenAPI spec: GET /openapi.json")
        
    except Exception as e:
        print(f"❌ Error checking endpoints: {e}")

def test_common_endpoints():
    """Test some common endpoints that might be failing"""
    print(f"\n🧪 Testing common endpoints:")
    print("=" * 60)
    
    test_urls = [
        "http://localhost:8000/health",
        "http://localhost:8000/api/v1/yield-weather/farms", 
        "http://localhost:8000/api/v1/hybrid-yield/statistics/farm/1",
        "http://localhost:8000/api/v1/hybrid-yield/plot/1/history",
    ]
    
    for url in test_urls:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {url:<60} [{response.status_code}]")
            else:
                print(f"❌ {url:<60} [{response.status_code}] {response.text[:50]}")
        except Exception as e:
            print(f"💥 {url:<60} [ERROR] {str(e)[:50]}")

if __name__ == "__main__":
    check_endpoints()
    test_common_endpoints()