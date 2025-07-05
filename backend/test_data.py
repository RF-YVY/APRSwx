#!/usr/bin/env python
"""
Test data creation script for APRSwx
Creates sample APRS packets and stations for testing frontend-backend integration
"""

import os
import sys
import django
from datetime import datetime, timezone

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'aprs_server.settings')
django.setup()

from packets.models import APRSPacket
from stations.models import Station
from weather.models import WeatherObservation, WeatherStation

def create_test_data():
    """Create test APRS data"""
    print("Creating test APRS data...")
    
    # Create test stations
    stations_data = [
        {
            'callsign': 'KD8ABC-9',
            'latitude': 40.7128,
            'longitude': -74.0060,
            'symbol_table': '/',
            'symbol_code': '>',
            'last_comment': 'Mobile station in NYC',
            'last_heard': datetime.now(timezone.utc)
        },
        {
            'callsign': 'W1XYZ-1',
            'latitude': 42.3601,
            'longitude': -71.0589,
            'symbol_table': '/',
            'symbol_code': 'k',
            'last_comment': 'Fixed station in Boston',
            'last_heard': datetime.now(timezone.utc)
        },
        {
            'callsign': 'N0WX-3',
            'latitude': 39.7392,
            'longitude': -104.9903,
            'symbol_table': '/',
            'symbol_code': '_',
            'last_comment': 'Weather station in Denver',
            'last_heard': datetime.now(timezone.utc)
        },
        {
            'callsign': 'KC9DEF-7',
            'latitude': 34.0522,
            'longitude': -118.2437,
            'symbol_table': '\\',
            'symbol_code': 'j',
            'last_comment': 'Portable station in LA',
            'last_heard': datetime.now(timezone.utc)
        }
    ]
    
    created_stations = []
    for station_data in stations_data:
        station, created = Station.objects.get_or_create(
            callsign=station_data['callsign'],
            defaults=station_data
        )
        created_stations.append(station)
        print(f"{'Created' if created else 'Updated'} station: {station.callsign}")
    
    # Create test packets
    packets_data = [
        {
            'raw_packet': 'KD8ABC-9>APZ001,WIDE1-1,WIDE2-1:=4042.77N/07400.36W>Test mobile packet',
            'source_callsign': 'KD8ABC-9',
            'destination': 'APZ001',
            'path': 'WIDE1-1,WIDE2-1',
            'packet_type': 'position',
            'timestamp': datetime.now(timezone.utc),
            'parsed_data': {
                'latitude': 40.7128,
                'longitude': -74.0060,
                'symbol_table': '/',
                'symbol_code': '>',
                'comment': 'Test mobile packet'
            }
        },
        {
            'raw_packet': 'W1XYZ-1>APZ001,WIDE2-1:!4221.60N/07103.53Wk Fixed station test',
            'source_callsign': 'W1XYZ-1',
            'destination': 'APZ001',
            'path': 'WIDE2-1',
            'packet_type': 'position',
            'timestamp': datetime.now(timezone.utc),
            'parsed_data': {
                'latitude': 42.3601,
                'longitude': -71.0589,
                'symbol_table': '/',
                'symbol_code': 'k',
                'comment': 'Fixed station test'
            }
        },
        {
            'raw_packet': 'N0WX-3>APZ001,WIDE2-1:_23844728c054s000g005t072r000p000P000b10020h50',
            'source_callsign': 'N0WX-3',
            'destination': 'APZ001',
            'path': 'WIDE2-1',
            'packet_type': 'weather',
            'timestamp': datetime.now(timezone.utc),
            'parsed_data': {
                'temperature': 72,
                'humidity': 50,
                'wind_speed': 5,
                'wind_direction': 54,
                'pressure': 1002
            }
        }
    ]
    
    for packet_data in packets_data:
        packet, created = APRSPacket.objects.get_or_create(
            raw_packet=packet_data['raw_packet'],
            defaults=packet_data
        )
        print(f"{'Created' if created else 'Updated'} packet from: {packet.source_callsign}")
    
    # Skip weather data creation for now
    # weather_station = WeatherStation.objects.create(
    #     station_id="KDEN",
    #     name="Denver Weather",
    #     latitude=39.7392,
    #     longitude=-104.9903,
    #     elevation=1655.0,
    #     station_type='aprs'
    # )
    
    # weather_data = WeatherObservation.objects.create(
    #     station=weather_station,
    #     temperature=72.0,
    #     humidity=50,
    #     pressure=1002.0,
    #     wind_speed=5.0,
    #     wind_direction=54,
    #     timestamp=datetime.now(timezone.utc)
    # )
    # print(f"Created weather data for station: {weather_station.name}")
    
    print("\nTest data creation complete!")
    print(f"Stations created: {Station.objects.count()}")
    print(f"Packets created: {APRSPacket.objects.count()}")
    print(f"Weather records created: {WeatherObservation.objects.count()}")

if __name__ == '__main__':
    create_test_data()
