"""
Complete System Integration Test

This test verifies the complete APRSwx system integration:
- Backend API endpoints
- Live APRS data ingestion
- WebSocket real-time updates
- Frontend data presentation
"""

import requests
import json
import time
import threading
import websocket
from datetime import datetime, timedelta


class APRSSystemTest:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.ws_url = "ws://localhost:8000/ws/aprs/"
        self.frontend_url = "http://localhost:3000"
        self.test_results = []
        
    def log_result(self, test_name, success, message=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test': test_name,
            'status': status,
            'message': message,
            'timestamp': datetime.now().isoformat()
        })
        print(f"{status} {test_name}: {message}")
    
    def test_api_endpoints(self):
        """Test all API endpoints"""
        print("\n🔍 Testing API Endpoints...")
        
        # Test stations endpoint
        try:
            response = requests.get(f"{self.base_url}/api/stations/")
            if response.status_code == 200:
                data = response.json()
                stations = data.get('results', [])
                self.log_result("Stations API", True, f"{len(stations)} stations available")
                
                # Check data quality
                if stations:
                    station = stations[0]
                    required_fields = ['id', 'callsign', 'latitude', 'longitude', 'last_heard']
                    missing = [f for f in required_fields if f not in station or station[f] is None]
                    if missing:
                        self.log_result("Station Data Quality", False, f"Missing fields: {missing}")
                    else:
                        self.log_result("Station Data Quality", True, "All required fields present")
            else:
                self.log_result("Stations API", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Stations API", False, str(e))
        
        # Test packets endpoint
        try:
            response = requests.get(f"{self.base_url}/api/packets/packets/")
            if response.status_code == 200:
                data = response.json()
                packets = data.get('results', [])
                self.log_result("Packets API", True, f"{len(packets)} packets available")
            else:
                self.log_result("Packets API", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Packets API", False, str(e))
    
    def test_websocket_connection(self):
        """Test WebSocket real-time connection"""
        print("\n🔌 Testing WebSocket Connection...")
        
        self.ws_messages = []
        self.ws_connected = False
        
        def on_message(ws, message):
            self.ws_messages.append(json.loads(message))
            
        def on_error(ws, error):
            self.log_result("WebSocket Error", False, str(error))
            
        def on_close(ws, close_status_code, close_msg):
            pass
            
        def on_open(ws):
            self.ws_connected = True
            # Subscribe to all data types
            ws.send(json.dumps({
                "type": "subscribe",
                "subscription_type": "stations",
                "filters": {}
            }))
            ws.send(json.dumps({
                "type": "subscribe", 
                "subscription_type": "packets",
                "filters": {}
            }))
        
        try:
            ws = websocket.WebSocketApp(self.ws_url,
                                      on_open=on_open,
                                      on_message=on_message,
                                      on_error=on_error,
                                      on_close=on_close)
            
            # Run WebSocket in background
            wst = threading.Thread(target=ws.run_forever)
            wst.daemon = True
            wst.start()
            
            # Wait for connection and messages
            time.sleep(5)
            
            if self.ws_connected:
                self.log_result("WebSocket Connection", True, "Connected successfully")
                
                if self.ws_messages:
                    message_types = [msg.get('type') for msg in self.ws_messages]
                    self.log_result("WebSocket Messages", True, f"Received {len(self.ws_messages)} messages: {set(message_types)}")
                else:
                    self.log_result("WebSocket Messages", False, "No messages received")
            else:
                self.log_result("WebSocket Connection", False, "Failed to connect")
                
            ws.close()
            
        except Exception as e:
            self.log_result("WebSocket Connection", False, str(e))
    
    def test_live_data_flow(self):
        """Test that live data is flowing through the system"""
        print("\n📡 Testing Live Data Flow...")
        
        try:
            # Get initial packet count
            response = requests.get(f"{self.base_url}/api/packets/packets/")
            if response.status_code == 200:
                initial_count = response.json().get('count', 0)
                
                # Wait a bit for new data
                time.sleep(30)
                
                # Check for new packets
                response = requests.get(f"{self.base_url}/api/packets/packets/")
                if response.status_code == 200:
                    new_count = response.json().get('count', 0)
                    
                    if new_count > initial_count:
                        self.log_result("Live Data Ingestion", True, f"New packets: {new_count - initial_count}")
                    else:
                        self.log_result("Live Data Ingestion", False, "No new packets received")
                        
        except Exception as e:
            self.log_result("Live Data Flow", False, str(e))
    
    def test_frontend_accessibility(self):
        """Test that frontend is accessible"""
        print("\n🌐 Testing Frontend Accessibility...")
        
        try:
            response = requests.get(self.frontend_url)
            if response.status_code == 200:
                self.log_result("Frontend Accessibility", True, "Frontend is accessible")
                
                # Check if it's the React app
                if "APRSwx" in response.text or "react" in response.text.lower():
                    self.log_result("Frontend Content", True, "React app content detected")
                else:
                    self.log_result("Frontend Content", False, "React app content not detected")
            else:
                self.log_result("Frontend Accessibility", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Frontend Accessibility", False, str(e))
    
    def run_all_tests(self):
        """Run all system tests"""
        print("🚀 APRSwx Complete System Integration Test")
        print("=" * 50)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.test_api_endpoints()
        self.test_websocket_connection()
        self.test_live_data_flow()
        self.test_frontend_accessibility()
        
        print("\n📊 Test Summary")
        print("=" * 30)
        
        passed = sum(1 for r in self.test_results if "✅" in r['status'])
        total = len(self.test_results)
        
        print(f"Tests passed: {passed}/{total}")
        print(f"Success rate: {passed/total*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! System is fully operational.")
        else:
            print("⚠️  Some tests failed. Check the results above.")
            
        return passed == total


if __name__ == "__main__":
    test = APRSSystemTest()
    test.run_all_tests()
