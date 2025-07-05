#!/usr/bin/env python
"""
Test APRS-IS connection functionality
"""
import os
import sys
import django
import threading
import time
from django.conf import settings

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from websockets.aprs_service import APRSISConnectionService

def test_aprs_connection():
    """Test APRS-IS connection service"""
    print("🔍 Testing APRS-IS connection functionality...")
    
    # Test user settings (use a test callsign)
    test_settings = {
        'callsign': 'N0CALL',
        'passcode': -1,  # Receive-only mode
        'location': {
            'latitude': 39.7392,
            'longitude': -104.9847
        },
        'aprsIsFilters': {
            'distanceRange': 100,
            'stationTypes': ['all'],
            'enableWeather': True,
            'enableMessages': True
        }
    }
    
    service = APRSISConnectionService()
    
    print("\n1. Testing connection with test settings...")
    try:
        # Start connection in background
        print("   Starting APRS-IS connection...")
        service.connect(test_settings)
        
        # Wait a moment for connection to establish
        time.sleep(3)
        
        if service.is_connected:
            print("✅ APRS-IS connection established!")
            
            # Let it run for a few seconds to receive some data
            print("   Waiting for data...")
            time.sleep(10)
            
            # Disconnect
            print("   Disconnecting...")
            service.disconnect()
            print("✅ APRS-IS disconnected successfully")
        else:
            print("❌ Failed to establish APRS-IS connection")
            
    except Exception as e:
        print(f"❌ Error testing APRS-IS connection: {e}")
        
    print("\n🎉 APRS-IS connection test completed!")

if __name__ == "__main__":
    test_aprs_connection()
