#!/usr/bin/env python3
"""
Test script for NOAA WMS Radar Service

This script tests the NOAA radar WMS service to verify it's working correctly.
"""

import requests
import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_noaa_wms_radar():
    """Test the NOAA WMS radar service"""
    print("🧪 Testing NOAA WMS Radar Service...")
    print("=" * 50)
    
    # NOAA WMS service URL
    wms_base = "https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer"
    
    # Test parameters for getting a radar image
    test_params = {
        'SERVICE': 'WMS',
        'VERSION': '1.3.0',
        'REQUEST': 'GetMap',
        'FORMAT': 'image/png',
        'TRANSPARENT': 'true',
        'LAYERS': '0',
        'WIDTH': '512',
        'HEIGHT': '512',
        'CRS': 'EPSG:4326',
        'BBOX': '25,-130,50,-60',  # CONUS bounds
        'TIME': 'current'
    }
    
    # Construct test URL
    url_params = '&'.join([f"{k}={v}" for k, v in test_params.items()])
    test_url = f"{wms_base}?{url_params}"
    
    print(f"📡 Testing URL: {test_url}")
    print("\n⏳ Making request...")
    
    try:
        # Make HTTP request with timeout
        response = requests.get(test_url, timeout=30)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📦 Content Type: {response.headers.get('Content-Type', 'Unknown')}")
        print(f"📏 Content Length: {len(response.content)} bytes")
        
        if response.status_code == 200:
            content_type = response.headers.get('Content-Type', '')
            
            if 'image' in content_type.lower():
                print("✅ SUCCESS: Received valid image from NOAA WMS service!")
                print(f"🖼️  Image format: {content_type}")
                
                # Save test image
                test_image_path = "test_radar_image.png"
                with open(test_image_path, 'wb') as f:
                    f.write(response.content)
                print(f"💾 Test image saved to: {test_image_path}")
                
                return True
            else:
                print("❌ ERROR: Response is not an image")
                print(f"🔍 Response content preview: {response.text[:200]}...")
                return False
        else:
            print(f"❌ ERROR: HTTP {response.status_code}")
            print(f"🔍 Response: {response.text[:500]}...")
            return False
            
    except requests.exceptions.Timeout:
        print("⏰ ERROR: Request timed out")
        return False
    except requests.exceptions.ConnectionError:
        print("🌐 ERROR: Connection failed")
        return False
    except Exception as e:
        print(f"💥 ERROR: {str(e)}")
        return False

def test_wms_capabilities():
    """Test WMS GetCapabilities request"""
    print("\n🔍 Testing WMS GetCapabilities...")
    print("-" * 30)
    
    capabilities_url = "https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer?request=GetCapabilities&service=WMS"
    
    try:
        response = requests.get(capabilities_url, timeout=15)
        
        if response.status_code == 200:
            print("✅ WMS GetCapabilities successful")
            
            # Check for key WMS elements
            content = response.text
            if 'WMS_Capabilities' in content:
                print("✅ Valid WMS Capabilities document")
            if 'Layer' in content:
                print("✅ Layer information found")
            if 'GetMap' in content:
                print("✅ GetMap operation supported")
                
            return True
        else:
            print(f"❌ GetCapabilities failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ GetCapabilities error: {str(e)}")
        return False

def test_alternative_radar_sources():
    """Test alternative radar image sources"""
    print("\n🔄 Testing alternative radar sources...")
    print("-" * 40)
    
    # Alternative sources to test
    alt_sources = [
        {
            'name': 'NWS Ridge II',
            'url': 'https://radar.weather.gov/ridge/standard/CONUS_0.gif'
        },
        {
            'name': 'NWS Mosaic',
            'url': 'https://radar.weather.gov/ridge/lite/N0R/TLX_loop.gif'
        }
    ]
    
    working_sources = []
    
    for source in alt_sources:
        print(f"\n🧪 Testing {source['name']}...")
        try:
            response = requests.head(source['url'], timeout=10)
            if response.status_code == 200:
                print(f"✅ {source['name']}: Working")
                working_sources.append(source)
            else:
                print(f"❌ {source['name']}: HTTP {response.status_code}")
        except Exception as e:
            print(f"❌ {source['name']}: {str(e)}")
    
    return working_sources

def main():
    """Main test function"""
    print("🌦️  NOAA Radar Service Test Suite")
    print("=" * 50)
    
    # Test WMS service
    wms_success = test_noaa_wms_radar()
    
    # Test capabilities
    capabilities_success = test_wms_capabilities()
    
    # Test alternatives if WMS fails
    if not wms_success:
        print("\n🔄 WMS failed, testing alternatives...")
        alt_sources = test_alternative_radar_sources()
        
        if alt_sources:
            print(f"\n💡 Found {len(alt_sources)} working alternative sources")
            for source in alt_sources:
                print(f"   - {source['name']}: {source['url']}")
        else:
            print("\n❌ No working radar sources found")
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 Test Summary:")
    print(f"   WMS Service: {'✅ PASS' if wms_success else '❌ FAIL'}")
    print(f"   WMS Capabilities: {'✅ PASS' if capabilities_success else '❌ FAIL'}")
    
    if wms_success:
        print("\n🎉 NOAA WMS radar service is working!")
        print("✅ Ready to use in APRSwx application")
    else:
        print("\n⚠️  NOAA WMS radar service has issues")
        print("💡 Consider using alternative sources or debugging further")

if __name__ == "__main__":
    main()
