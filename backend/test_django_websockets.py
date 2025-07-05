"""
Django Channels WebSocket test using Django's test client
Tests real-time communication without external websockets library
"""

import json
import asyncio
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.urls import re_path
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from websockets.consumers import APRSConsumer, StationConsumer

async def test_websocket_consumers():
    """Test WebSocket consumers using Django Channels testing"""
    print("🚀 Testing WebSocket consumers...")
    
    # Test APRS consumer
    print("\n📡 Testing APRS WebSocket consumer...")
    
    try:
        communicator = WebsocketCommunicator(APRSConsumer.as_asgi(), "/ws/aprs/")
        connected, subprotocol = await communicator.connect()
        
        if connected:
            print("✅ Connected to APRS WebSocket")
            
            # Send a subscription message
            await communicator.send_json_to({
                "type": "subscribe",
                "filters": {"callsign_prefix": "K"}
            })
            print("📤 Sent subscription message")
            
            # Try to receive a message (with timeout)
            try:
                response = await asyncio.wait_for(communicator.receive_json_from(), timeout=2.0)
                print(f"📥 Received: {response}")
            except asyncio.TimeoutError:
                print("⏰ No immediate response (normal for subscription)")
            
            await communicator.disconnect()
            print("🔌 Disconnected from APRS WebSocket")
        else:
            print("❌ Failed to connect to APRS WebSocket")
            
    except Exception as e:
        print(f"❌ Error testing APRS WebSocket: {e}")
    
    # Test Station consumer
    print("\n🏠 Testing Station WebSocket consumer...")
    
    try:
        communicator = WebsocketCommunicator(StationConsumer.as_asgi(), "/ws/stations/")
        connected, subprotocol = await communicator.connect()
        
        if connected:
            print("✅ Connected to Station WebSocket")
            
            # Send a subscription message
            await communicator.send_json_to({
                "type": "subscribe",
                "filters": {"area": "denver"}
            })
            print("📤 Sent station subscription")
            
            await communicator.disconnect()
            print("🔌 Disconnected from Station WebSocket")
        else:
            print("❌ Failed to connect to Station WebSocket")
            
    except Exception as e:
        print(f"❌ Error testing Station WebSocket: {e}")

if __name__ == "__main__":
    print("🎯 Starting Django Channels WebSocket tests...")
    asyncio.run(test_websocket_consumers())
    print("\n✨ WebSocket tests completed!")
