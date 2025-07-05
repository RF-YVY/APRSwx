#!/usr/bin/env python
"""
Test WebSocket APRS-IS connection functionality
"""
import asyncio
import websockets.asyncio.client as ws
import json
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_websocket_aprsis():
    """Test WebSocket APRS-IS connection"""
    print("🔍 Testing WebSocket APRS-IS connection...")
    
    try:
        # Connect to WebSocket
        uri = "ws://localhost:8000/ws/aprs/"
        print(f"Connecting to {uri}...")
        
        async with ws.connect(uri) as websocket:
            print("✅ WebSocket connected!")
            
            # Send APRS-IS connection request
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
            
            connect_message = {
                'type': 'connect_aprsis',
                'user_settings': test_settings
            }
            
            print("📤 Sending APRS-IS connection request...")
            await websocket.send(json.dumps(connect_message))
            
            # Listen for responses
            print("👂 Listening for responses...")
            timeout_count = 0
            max_timeout = 30  # 30 seconds
            
            while timeout_count < max_timeout:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    print(f"📨 Received: {data.get('type', 'unknown')} - {data}")
                    
                    if data.get('type') == 'aprsis_status' and data.get('connected'):
                        print("✅ APRS-IS connected via WebSocket!")
                        
                        # Wait for station data
                        print("⏳ Waiting for station data...")
                        station_timeout = 0
                        while station_timeout < 15:
                            try:
                                message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                                data = json.loads(message)
                                if data.get('type') == 'station_update':
                                    print(f"🎉 Received station update: {data.get('station', {}).get('callsign', 'unknown')}")
                                elif data.get('type') == 'packet_update':
                                    print(f"📦 Received packet: {data.get('packet', {}).get('source_callsign', 'unknown')}")
                                print(f"📨 Message: {data.get('type', 'unknown')}")
                            except asyncio.TimeoutError:
                                station_timeout += 1
                                continue
                        break
                        
                except asyncio.TimeoutError:
                    timeout_count += 1
                    continue
                except Exception as e:
                    print(f"❌ Error receiving message: {e}")
                    break
            
            if timeout_count >= max_timeout:
                print("⏰ Timeout waiting for APRS-IS connection")
                
            # Disconnect
            disconnect_message = {'type': 'disconnect_aprsis'}
            await websocket.send(json.dumps(disconnect_message))
            print("📤 Sent disconnect request")
            
    except Exception as e:
        print(f"❌ WebSocket test error: {e}")
    
    print("🎉 WebSocket APRS-IS test completed!")

if __name__ == "__main__":
    asyncio.run(test_websocket_aprsis())
