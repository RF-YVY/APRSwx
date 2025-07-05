#!/usr/bin/env python
"""
Simple APRS-IS test connection
Tests direct connection to APRS-IS server with range filter
"""

import socket
import time

def test_aprs_connection():
    """Test APRS-IS connection with range filter"""
    print("🚀 Testing APRS-IS connection...")
    
    # APRS-IS server details
    host = 'rotate.aprs.net'
    port = 14580
    callsign = 'NOCALL'
    passcode = '-1'
    
    # Try different filters for active areas
    filters = [
        'r/39.7392/-104.9903/200',  # Denver, CO - 200km radius
        'r/34.0522/-118.2437/200',  # Los Angeles, CA - 200km radius
        'r/40.7128/-74.0060/200',   # New York, NY - 200km radius
    ]
    
    for filter_str in filters:
        print(f"\nTesting filter: {filter_str}")
        try:
            # Connect to APRS-IS
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((host, port))
            print(f"✅ Connected to {host}:{port}")
            
            # Login with filter
            login_string = f"user {callsign} pass {passcode} vers APRSwx-Test 1.0 filter {filter_str}\r\n"
            sock.send(login_string.encode())
            print(f"📤 Sent login: {login_string.strip()}")
            
            # Read server response
            response = sock.recv(1024).decode()
            print(f"📥 Server response: {response.strip()}")
            
            # Listen for packets for 30 seconds
            print("🎧 Listening for packets (30 seconds)...")
            start_time = time.time()
            packet_count = 0
            
            sock.settimeout(5)
            while time.time() - start_time < 30:
                try:
                    data = sock.recv(1024).decode('utf-8', errors='ignore')
                    if data:
                        lines = data.strip().split('\n')
                        for line in lines:
                            if line and not line.startswith('#'):
                                packet_count += 1
                                print(f"📦 Packet {packet_count}: {line[:100]}...")
                                if packet_count >= 5:  # Show first 5 packets
                                    break
                        if packet_count >= 5:
                            break
                except socket.timeout:
                    print("⏰ Waiting for packets...")
                    continue
                except Exception as e:
                    print(f"❌ Error receiving data: {e}")
                    break
            
            print(f"📊 Total packets received: {packet_count}")
            sock.close()
            
            if packet_count > 0:
                print(f"✅ Filter {filter_str} is working!")
                return True
            else:
                print(f"⚠️ No packets received with filter {filter_str}")
                
        except Exception as e:
            print(f"❌ Failed to test filter {filter_str}: {e}")
    
    return False

if __name__ == "__main__":
    success = test_aprs_connection()
    if success:
        print("\n🎉 APRS-IS connection test successful!")
    else:
        print("\n😞 No packets received from any filter. Check network connectivity.")
