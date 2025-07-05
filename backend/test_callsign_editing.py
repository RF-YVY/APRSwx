#!/usr/bin/env python3
"""
Test script to verify the callsign editing fix works correctly
"""

import os
import sys
import django
import json
import requests
import time

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from websockets.models import UserSettings

def test_callsign_editing():
    """Test that callsign editing works correctly"""
    print("🔧 Testing Callsign Editing Fix")
    print("=" * 50)
    
    # Clear all settings
    UserSettings.objects.all().delete()
    print("1. ✅ Cleared all settings from database")
    
    # Test 1: Empty database should return no settings
    try:
        response = requests.get("http://localhost:8000/api/websockets/settings/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('settings') is None:
                print("2. ✅ Empty database returns null settings")
            else:
                print(f"2. ❌ Expected null, got: {data}")
                return False
        else:
            print(f"2. ❌ API error: {response.status_code}")
            return False
    except Exception as e:
        print(f"2. ❌ Request failed: {e}")
        return False
    
    # Test 2: Save new callsign
    test_settings = {
        'callsign': 'W1AW',
        'ssid': 1,
        'passcode': 24848,
        'distanceUnit': 'km',
        'darkTheme': False,
        'aprsIsConnected': False
    }
    
    try:
        response = requests.post("http://localhost:8000/api/websockets/settings/", 
                               json={'settings': test_settings}, 
                               timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("3. ✅ Successfully saved new callsign")
            else:
                print(f"3. ❌ Save failed: {data}")
                return False
        else:
            print(f"3. ❌ Save error: {response.status_code}")
            return False
    except Exception as e:
        print(f"3. ❌ Save request failed: {e}")
        return False
    
    # Test 3: Load and verify callsign
    try:
        response = requests.get("http://localhost:8000/api/websockets/settings/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('settings'):
                settings = data['settings']
                if settings.get('callsign') == 'W1AW':
                    print("4. ✅ Callsign loaded correctly")
                else:
                    print(f"4. ❌ Wrong callsign: {settings.get('callsign')}")
                    return False
            else:
                print(f"4. ❌ No settings returned: {data}")
                return False
        else:
            print(f"4. ❌ Load error: {response.status_code}")
            return False
    except Exception as e:
        print(f"4. ❌ Load request failed: {e}")
        return False
    
    # Test 4: Update callsign
    updated_settings = {
        'callsign': 'N0CALL',
        'ssid': 2,
        'passcode': 12345,
        'distanceUnit': 'miles',
        'darkTheme': True,
        'aprsIsConnected': False
    }
    
    try:
        response = requests.post("http://localhost:8000/api/websockets/settings/", 
                               json={'settings': updated_settings}, 
                               timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("5. ✅ Successfully updated callsign")
            else:
                print(f"5. ❌ Update failed: {data}")
                return False
        else:
            print(f"5. ❌ Update error: {response.status_code}")
            return False
    except Exception as e:
        print(f"5. ❌ Update request failed: {e}")
        return False
    
    # Test 5: Verify update
    try:
        response = requests.get("http://localhost:8000/api/websockets/settings/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('settings'):
                settings = data['settings']
                if settings.get('callsign') == 'N0CALL':
                    print("6. ✅ Updated callsign loaded correctly")
                    print(f"   Final settings: {settings}")
                    return True
                else:
                    print(f"6. ❌ Wrong updated callsign: {settings.get('callsign')}")
                    return False
            else:
                print(f"6. ❌ No settings returned after update: {data}")
                return False
        else:
            print(f"6. ❌ Load error after update: {response.status_code}")
            return False
    except Exception as e:
        print(f"6. ❌ Load request failed after update: {e}")
        return False

if __name__ == "__main__":
    try:
        success = test_callsign_editing()
        
        print("\n" + "=" * 50)
        if success:
            print("🎉 CALLSIGN EDITING TEST PASSED!")
            print("✅ Settings can be saved and loaded correctly")
            print("✅ Callsign can be changed and persisted")
            print("✅ Backend API is working properly")
        else:
            print("💥 CALLSIGN EDITING TEST FAILED!")
            print("❌ There are issues with the settings API")
            
    except Exception as e:
        print(f"💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
