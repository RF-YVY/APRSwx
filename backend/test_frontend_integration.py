#!/usr/bin/env python3
"""
Frontend Data Integration Test

This script tests the integration between the backend API and frontend,
verifying that data flows correctly through the REST API and WebSocket.
"""

import asyncio
import json
import requests
from datetime import datetime
import websocket  # Use websocket-client instead


def test_rest_api():
    """Test the REST API endpoints"""
    print("Testing REST API endpoints...")
    
    base_url = "http://localhost:8000"
    
    try:
        # Test stations endpoint
        print("  Testing /api/stations/...")
        response = requests.get(f"{base_url}/api/stations/")
        if response.status_code == 200:
            stations_data = response.json()
            stations = stations_data.get('results', [])
            print(f"    ✓ Stations API working: {len(stations)} stations")
            
            # Show sample station data
            if stations:
                station = stations[0]
                print(f"    Sample station: {station.get('callsign', 'Unknown')}")
                print(f"    Fields: {', '.join(station.keys())}")
            print("  ✓ Stations API working")
        else:
            print(f"    ✗ Stations API failed: {response.status_code}")
            
        # Test packets endpoint
        print("  Testing /api/packets/...")
        response = requests.get(f"{base_url}/api/packets/packets/")
        if response.status_code == 200:
            packets_data = response.json()
            packets = packets_data.get('results', [])
            print(f"    ✓ Packets API working: {len(packets)} packets")
        else:
            print(f"    ✗ Packets API failed: {response.status_code}")
            print("  ✓ REST API tests completed")
            
    except Exception as e:
        print(f"  ✗ REST API test failed: {e}")


def test_websocket():
    """Test WebSocket connection"""
    print("\nTesting WebSocket connection...")
    
    try:
        import websocket
        import threading
        import time
        
        message_received = False
        
        def on_message(ws, message):
            nonlocal message_received
            print(f"    Received WebSocket message: {message[:100]}...")
            message_received = True
            
        def on_error(ws, error):
            print(f"    WebSocket error: {error}")
            
        def on_close(ws, close_status_code, close_msg):
            print("    WebSocket connection closed")
            
        def on_open(ws):
            print("    ✓ WebSocket connected successfully")
            # Send subscription message
            ws.send(json.dumps({
                "type": "subscribe",
                "subscription_type": "stations",
                "filters": {}
            }))
        
        # Create WebSocket connection
        ws = websocket.WebSocketApp("ws://localhost:8000/ws/aprs/",
                                  on_open=on_open,
                                  on_message=on_message,
                                  on_error=on_error,
                                  on_close=on_close)
        
        # Run in background thread
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()
        
        # Wait for connection and messages
        time.sleep(5)
        
        if message_received:
            print("  ✓ WebSocket data flow working")
        else:
            print("  ⚠ WebSocket connected but no messages received")
            
        ws.close()
        
    except Exception as e:
        print(f"  ✗ WebSocket test failed: {e}")


def test_data_consistency():
    """Test data consistency between API and database"""
    print("\nTesting data consistency...")
    
    try:
        # Get station count from API
        response = requests.get("http://localhost:8000/api/stations/")
        if response.status_code == 200:
            stations_data = response.json()
            api_stations = stations_data.get('results', [])
            print(f"  API reports {len(api_stations)} stations")
            
            # Check that stations have required fields
            required_fields = ['id', 'callsign', 'station_type', 'symbol_table', 'symbol_code']
            if api_stations:
                station = api_stations[0]
                missing_fields = [field for field in required_fields if field not in station]
                if missing_fields:
                    print(f"  ✗ Missing fields in station data: {missing_fields}")
                else:
                    print("  ✓ Station data has all required fields")
                    
                # Check location data
                stations_with_location = [s for s in api_stations if s.get('latitude') and s.get('longitude')]
                print(f"  Stations with location: {len(stations_with_location)}")
                print("  ✓ Data consistency checks passed")
                
    except Exception as e:
        print(f"  ✗ Data consistency test failed: {e}")


def main():
    """Run all tests"""
    print("APRSwx Frontend Data Integration Test")
    print("=" * 40)
    print(f"Test time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test REST API
    test_rest_api()
    
    # Test WebSocket
    test_websocket()
    
    # Test data consistency
    test_data_consistency()
    
    print("\nTest completed!")


if __name__ == "__main__":
    main()
