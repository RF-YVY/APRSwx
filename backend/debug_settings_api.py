#!/usr/bin/env python3
"""
Debug script to check what settings are being returned from the API
"""

import requests
import json

def debug_settings_api():
    """Debug the settings API responses"""
    print("🔍 Debugging Settings API")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    try:
        # Test GET request
        print("1. Testing GET request:")
        response = requests.get(f"{base_url}/api/websockets/settings/", timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            if data.get('success') and data.get('settings'):
                settings = data['settings']
                print(f"\n   🔍 Key Settings Values:")
                print(f"   - callsign: '{settings.get('callsign')}' (type: {type(settings.get('callsign'))})")
                print(f"   - ssid: {settings.get('ssid')} (type: {type(settings.get('ssid'))})")
                print(f"   - passcode: {settings.get('passcode')} (type: {type(settings.get('passcode'))})")
                print(f"   - distanceUnit: '{settings.get('distanceUnit')}' (type: {type(settings.get('distanceUnit'))})")
                print(f"   - darkTheme: {settings.get('darkTheme')} (type: {type(settings.get('darkTheme'))})")
                print(f"   - aprsIsConnected: {settings.get('aprsIsConnected')} (type: {type(settings.get('aprsIsConnected'))})")
                
                location = settings.get('location')
                if location:
                    print(f"   - location: {location} (type: {type(location)})")
                    print(f"     - latitude: {location.get('latitude')} (type: {type(location.get('latitude'))})")
                    print(f"     - longitude: {location.get('longitude')} (type: {type(location.get('longitude'))})")
                
                aprs_filters = settings.get('aprsIsFilters', {})
                print(f"   - aprsIsFilters: {aprs_filters} (type: {type(aprs_filters)})")
                
                tnc_settings = settings.get('tncSettings', {})
                print(f"   - tncSettings: {tnc_settings} (type: {type(tnc_settings)})")
                
            else:
                print(f"   No settings found or error: {data}")
        else:
            print(f"   Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    debug_settings_api()
