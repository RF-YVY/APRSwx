"""
WebSocket test client for APRSwx
Tests real-time communication between frontend and backend
"""

import asyncio
import websockets
import json
import sys

async def test_websocket_connection():
    """Test WebSocket connection to APRSwx backend"""
    
    # Test different WebSocket endpoints
    endpoints = [
        "ws://127.0.0.1:8000/ws/aprs/",
        "ws://127.0.0.1:8000/ws/stations/",
        "ws://127.0.0.1:8000/ws/weather/"
    ]
    
    for endpoint in endpoints:
        print(f"\nTesting WebSocket connection to: {endpoint}")
        try:
            async with websockets.connect(endpoint) as websocket:
                print(f"✅ Connected to {endpoint}")
                
                # Send a test subscription message
                test_message = {
                    "type": "subscribe",
                    "filters": {
                        "callsign": "TEST"
                    }
                }
                
                await websocket.send(json.dumps(test_message))
                print(f"📤 Sent subscription message")
                
                # Wait for a response (with timeout)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    print(f"📥 Received: {response}")
                except asyncio.TimeoutError:
                    print("⏰ No response received within 5 seconds")
                    
        except Exception as e:
            print(f"❌ Failed to connect to {endpoint}: {e}")

if __name__ == "__main__":
    print("🚀 Starting WebSocket connection tests...")
    asyncio.run(test_websocket_connection())
    print("\n✨ WebSocket tests completed!")
