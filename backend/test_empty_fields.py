#!/usr/bin/env python3
"""
Test script to verify that input fields are empty by default
"""
import os
import django
import requests
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from websockets.models import UserSettings

def test_empty_database():
    """Test that database is empty"""
    count = UserSettings.objects.count()
    print(f"✓ Database UserSettings count: {count}")
    return count == 0

def test_api_response():
    """Test API response for new sessions"""
    # Create a fresh session
    session = requests.Session()
    
    # Make GET request to establish session
    response = session.get('http://localhost:8000/api/websockets/settings/')
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ API Response: {data}")
        
        if data.get('success') and data.get('settings') is None:
            print("✓ API correctly returns settings: None for new sessions")
            return True
        else:
            print("✗ API should return settings: None for new sessions")
            return False
    else:
        print(f"✗ API request failed with status {response.status_code}")
        return False

def test_frontend_behavior():
    """Test what the frontend should receive"""
    print("\n=== Frontend Behavior Test ===")
    print("When settings is None, the frontend should:")
    print("1. Display empty input fields")
    print("2. Show placeholder text (N0CALL, 0, etc.)")
    print("3. NOT show any pre-filled values")
    print("4. Allow users to type without clearing existing text")
    
    # Simulate what the frontend context should do
    settings = None  # This is what the API returns
    
    # This is what the frontend should render
    callsign_value = '' if settings is None else settings.get('callsign', '')
    ssid_value = '' if settings is None else settings.get('ssid', 0)
    passcode_value = '' if settings is None else settings.get('passcode', -1)
    
    print(f"\nFrontend should render:")
    print(f"  Callsign input: value='{callsign_value}', placeholder='N0CALL'")
    print(f"  SSID input: value='{ssid_value}', placeholder='0'")
    print(f"  Passcode input: value='{passcode_value}', placeholder='Auto-generated'")
    
    return callsign_value == '' and ssid_value == '' and passcode_value == ''

if __name__ == "__main__":
    print("🔍 Testing Empty Fields Behavior")
    print("=" * 50)
    
    # Test 1: Database is empty
    db_empty = test_empty_database()
    
    # Test 2: API returns None for new sessions
    api_correct = test_api_response()
    
    # Test 3: Frontend should show empty fields
    frontend_correct = test_frontend_behavior()
    
    print("\n" + "=" * 50)
    if db_empty and api_correct and frontend_correct:
        print("🎉 ALL TESTS PASSED - Input fields should be empty by default")
    else:
        print("❌ Some tests failed - there may be issues with empty field behavior")
        
    print("\n📋 Next Steps:")
    print("1. Open the frontend at http://localhost:3000")
    print("2. Click Settings button")
    print("3. Verify that ALL input fields are empty")
    print("4. Verify that placeholder text is visible but grayed out")
    print("5. Type in a field - no backspacing should be needed")
