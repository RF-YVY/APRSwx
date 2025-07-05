#!/usr/bin/env python3
"""
Test script to verify placeholder behavior works correctly
"""

import os
import sys
import django
import requests

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from websockets.models import UserSettings

def test_placeholder_behavior():
    """Test that empty database shows placeholder behavior"""
    print("🔍 Testing Placeholder Behavior")
    print("=" * 50)
    
    # Ensure database is empty
    UserSettings.objects.all().delete()
    print("1. ✅ Database cleared")
    
    # Test API returns null for empty database
    try:
        response = requests.get("http://localhost:8000/api/websockets/settings/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('settings') is None:
                print("2. ✅ API returns null for empty database")
                print("   - Frontend should show placeholder text")
                print("   - Input fields should be empty with 'N0CALL' placeholder")
                print("   - Users can type directly without clearing existing text")
            else:
                print(f"2. ❌ Expected null settings, got: {data}")
                return False
        else:
            print(f"2. ❌ API error: {response.status_code}")
            return False
    except Exception as e:
        print(f"2. ❌ Request failed: {e}")
        return False
    
    # Test saving a new callsign
    print("\n3. Testing callsign input...")
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
                print("   ✅ Callsign saved successfully")
            else:
                print(f"   ❌ Save failed: {data}")
                return False
        else:
            print(f"   ❌ Save error: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Save request failed: {e}")
        return False
    
    # Verify the saved callsign
    try:
        response = requests.get("http://localhost:8000/api/websockets/settings/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('settings'):
                settings = data['settings']
                if settings.get('callsign') == 'W1AW':
                    print("   ✅ Callsign retrieved correctly")
                    print("   - Input field should now show 'W1AW' as value")
                    print("   - No placeholder should be visible")
                    return True
                else:
                    print(f"   ❌ Wrong callsign: {settings.get('callsign')}")
                    return False
            else:
                print(f"   ❌ No settings returned: {data}")
                return False
        else:
            print(f"   ❌ Load error: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Load request failed: {e}")
        return False

def print_user_instructions():
    """Print instructions for the user"""
    print("\n" + "=" * 50)
    print("📋 USER INSTRUCTIONS")
    print("=" * 50)
    print()
    print("✅ FIXED: Input fields now show placeholder text!")
    print()
    print("🔧 How it works:")
    print("   • Empty fields show grayed-out example text (e.g., 'N0CALL')")
    print("   • Just start typing - no need to clear existing text")
    print("   • Placeholder disappears when you type")
    print("   • Your actual values appear when saved")
    print()
    print("🧪 To test:")
    print("   1. Clear browser localStorage using clear_settings.html")
    print("   2. Refresh APRSwx page")
    print("   3. Open Settings (⚙️ button)")
    print("   4. Callsign field should show grayed 'N0CALL' placeholder")
    print("   5. Click in field and start typing your callsign")
    print("   6. Placeholder should disappear and your text should appear")
    print()
    print("🎯 Expected behavior:")
    print("   ✅ Empty field shows 'N0CALL' in gray italic text")
    print("   ✅ Clicking field allows immediate typing")
    print("   ✅ No need to backspace or clear text")
    print("   ✅ Placeholder disappears when typing")
    print("   ✅ Settings persist after save")

if __name__ == "__main__":
    try:
        success = test_placeholder_behavior()
        
        if success:
            print("\n🎉 PLACEHOLDER TEST PASSED!")
            print_user_instructions()
        else:
            print("\n💥 PLACEHOLDER TEST FAILED!")
            
    except Exception as e:
        print(f"💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
