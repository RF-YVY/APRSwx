#!/usr/bin/env python3
"""
Test script to verify the settings API works correctly.
"""

import os
import sys
import django
import json

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from django.test import Client

def test_settings_api():
    """Test the settings API endpoints."""
    print("Testing Settings API...")
    
    client = Client()
    
    # Test GET request (should return empty settings initially)
    print("\n1. Testing GET request:")
    response = client.get('/api/websockets/settings/')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test POST request (save settings)
    print("\n2. Testing POST request:")
    test_settings = {
        'callsign': 'TEST123',
        'ssid': 7,
        'passcode': 12345,
        'location': {
            'latitude': 40.7128,
            'longitude': -74.0060,
            'source': 'manual'
        },
        'distanceUnit': 'miles',
        'darkTheme': True,
        'aprsIsConnected': False,
        'aprsIsFilters': {
            'distanceRange': 150,
            'stationTypes': ['mobile', 'fixed'],
            'enableWeather': True,
            'enableMessages': False
        },
        'tncSettings': {
            'enabled': True,
            'connectionType': 'serial',
            'port': 'COM3',
            'baudRate': 9600,
            'audioInput': 'default',
            'audioOutput': 'default',
            'audioInputGain': 75,
            'audioOutputGain': 75,
            'pttMethod': 'cat',
            'pttPin': 'RTS',
            'radioControl': {
                'enabled': True,
                'type': 'rigctl',
                'frequency': 144390000,
                'mode': 'FM'
            },
            'kissMode': True,
            'txDelay': 40,
            'persistence': 50,
            'slotTime': 15,
            'txTail': 8,
            'fullDuplex': False,
            'maxFrameLength': 512,
            'retries': 5,
            'respTime': 2000
        }
    }
    
    response = client.post('/api/websockets/settings/', 
                          data=json.dumps({'settings': test_settings}),
                          content_type='application/json')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Test GET request again (should return saved settings)
    print("\n3. Testing GET request after save:")
    response = client.get('/api/websockets/settings/')
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response: {data}")
    
    # Verify settings were saved correctly
    if data.get('success') and data.get('settings'):
        saved_settings = data['settings']
        print(f"\nVerification:")
        print(f"Callsign: {saved_settings.get('callsign')} (expected: TEST123)")
        print(f"SSID: {saved_settings.get('ssid')} (expected: 7)")
        print(f"Distance Unit: {saved_settings.get('distanceUnit')} (expected: miles)")
        print(f"TNC Enabled: {saved_settings.get('tncSettings', {}).get('enabled')} (expected: True)")
        print(f"Audio Input Gain: {saved_settings.get('tncSettings', {}).get('audioInputGain')} (expected: 75)")
        
        # Check if settings match
        if (saved_settings.get('callsign') == 'TEST123' and 
            saved_settings.get('ssid') == 7 and
            saved_settings.get('distanceUnit') == 'miles'):
            print("\n✅ Settings API test PASSED!")
            return True
        else:
            print("\n❌ Settings API test FAILED - Settings don't match!")
            return False
    else:
        print("\n❌ Settings API test FAILED - No settings returned!")
        return False

if __name__ == "__main__":
    try:
        success = test_settings_api()
        if success:
            print("\n🎉 All tests passed! Settings API is working correctly.")
        else:
            print("\n💥 Tests failed! Please check the API implementation.")
    except Exception as e:
        print(f"\n💥 Error running tests: {e}")
        import traceback
        traceback.print_exc()
