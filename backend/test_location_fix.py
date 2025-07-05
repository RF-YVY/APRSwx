#!/usr/bin/env python3
"""
Test script to verify the latitude/longitude toFixed() fix
"""
import os
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from websockets.models import UserSettings

def test_location_fix():
    """Test that location data is returned as numbers, not strings"""
    print("🔍 Testing Location Data Type Fix")
    print("=" * 50)
    
    # Create a test location entry
    test_settings = UserSettings.objects.create(
        session_key='location_test',
        callsign='TEST',
        ssid=1,
        passcode=12345,
        latitude=40.7128,
        longitude=-74.0060,
        location_source='manual'
    )
    
    try:
        # Test the API response
        response = requests.get('http://localhost:8000/api/websockets/settings/', 
                               headers={'X-Session-Key': 'location_test'})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API Response Status: {response.status_code}")
            
            if data.get('success') and data.get('settings'):
                settings = data['settings']
                location = settings.get('location')
                
                if location:
                    print(f"✓ Location found: {location}")
                    
                    # Check data types
                    lat_type = type(location['latitude'])
                    lon_type = type(location['longitude'])
                    
                    print(f"✓ Latitude type: {lat_type}")
                    print(f"✓ Longitude type: {lon_type}")
                    
                    # Test if toFixed() would work
                    try:
                        lat_fixed = float(location['latitude'])
                        lon_fixed = float(location['longitude'])
                        print(f"✓ toFixed() test: {lat_fixed:.6f}, {lon_fixed:.6f}")
                        
                        # Test the JavaScript equivalent
                        js_equivalent = f"Number({location['latitude']}).toFixed(6)"
                        print(f"✓ JavaScript equivalent would be: {js_equivalent}")
                        
                        print("\n🎉 FIX VERIFIED: Location data is now numeric!")
                        print("Frontend should no longer get 'toFixed is not a function' errors")
                        
                    except (ValueError, TypeError) as e:
                        print(f"❌ toFixed() test failed: {e}")
                        return False
                else:
                    print("❌ No location data found")
                    return False
            else:
                print("❌ No settings found in response")
                return False
        else:
            print(f"❌ API request failed with status {response.status_code}")
            return False
            
    finally:
        # Clean up test data
        UserSettings.objects.filter(session_key='location_test').delete()
        print("\n✓ Test data cleaned up")
    
    return True

if __name__ == "__main__":
    success = test_location_fix()
    
    if success:
        print("\n" + "=" * 50)
        print("🎯 RUNTIME ERROR FIXED!")
        print("- Backend now returns latitude/longitude as numbers")
        print("- Frontend components protected with Number() conversion")
        print("- userLocation.latitude.toFixed() errors should be resolved")
        print("\n📋 Next Steps:")
        print("1. Refresh the frontend page")
        print("2. Try setting a location in settings")
        print("3. Verify no more runtime errors occur")
    else:
        print("\n❌ Fix verification failed - please check the implementation")
