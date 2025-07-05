#!/usr/bin/env python
"""
Test radar overlay functionality
"""
import os
import sys
import django
from django.conf import settings

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from weather.radar_service import WeatherRadarService
import requests

def test_radar_overlay():
    """Test radar overlay URL generation and access"""
    print("🔍 Testing radar overlay functionality...")
    
    service = WeatherRadarService()
    
    # Test 1: Get available radars
    print("\n1. Testing available radars...")
    try:
        radars = service.get_available_radars()
        print(f"✅ Found {len(radars)} available radar products")
        for radar in radars:
            print(f"   - {radar['name']}: {radar['product_id']}")
    except Exception as e:
        print(f"❌ Error getting available radars: {e}")
    
    # Test 2: Get radar overlay URL
    print("\n2. Testing radar overlay URL generation...")
    try:
        # Test with bounds (Denver area)
        bounds = [39.5, -105.5, 40.0, -104.5]
        overlay_url = service._get_mrms_overlay_url('reflectivity', bounds)
        
        if overlay_url:
            print(f"✅ Generated radar overlay URL: {overlay_url}")
            
            # Test 3: Check if URL is accessible
            print("\n3. Testing URL accessibility...")
            try:
                response = requests.head(overlay_url, timeout=10)
                if response.status_code == 200:
                    print(f"✅ Radar URL is accessible (status: {response.status_code})")
                else:
                    print(f"⚠️ Radar URL returned status: {response.status_code}")
            except Exception as e:
                print(f"❌ Error accessing radar URL: {e}")
        else:
            print("❌ Failed to generate radar overlay URL")
            
    except Exception as e:
        print(f"❌ Error testing radar overlay: {e}")
    
    # Test 4: Test fallback national radar
    print("\n4. Testing fallback national radar...")
    try:
        fallback_url = "https://radar.weather.gov/ridge/standard/CONUS_0.gif"
        response = requests.head(fallback_url, timeout=10)
        if response.status_code == 200:
            print(f"✅ Fallback radar URL is accessible: {fallback_url}")
        else:
            print(f"⚠️ Fallback radar URL returned status: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing fallback radar: {e}")
    
    # Test 5: Test Iowa Mesonet WMS
    print("\n5. Testing Iowa Mesonet WMS...")
    try:
        wms_bounds = [39.5, -105.5, 40.0, -104.5]
        wms_url = service._get_wms_radar_url('reflectivity', wms_bounds, 39.75, -105.0)
        
        if wms_url:
            print(f"✅ Generated WMS URL: {wms_url}")
            
            # Test WMS accessibility
            try:
                response = requests.head(wms_url, timeout=10)
                if response.status_code == 200:
                    print(f"✅ WMS URL is accessible (status: {response.status_code})")
                else:
                    print(f"⚠️ WMS URL returned status: {response.status_code}")
            except Exception as e:
                print(f"❌ Error accessing WMS URL: {e}")
        else:
            print("❌ Failed to generate WMS URL")
            
    except Exception as e:
        print(f"❌ Error testing WMS: {e}")
        
    print("\n🎉 Radar overlay test completed!")

if __name__ == "__main__":
    test_radar_overlay()
