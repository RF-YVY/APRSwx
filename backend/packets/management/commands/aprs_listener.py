import socket
import json
import logging
import asyncio
from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from packets.models import APRSPacket
from stations.models import Station
from weather.models import WeatherObservation

logger = logging.getLogger(__name__)


class APRSParser:
    """APRS packet parser"""
    
    @staticmethod
    def parse_packet(raw_packet: str) -> dict:
        """Parse raw APRS packet into structured data"""
        try:
            # Basic packet structure: SOURCE>DESTINATION,PATH:INFO
            if '>' not in raw_packet:
                return {'error': 'Invalid packet format'}
            
            header, info = raw_packet.split(':', 1)
            source = header.split('>')[0]
            
            parsed = {
                'source_callsign': source,
                'raw_packet': raw_packet,
                'info': info,
                'timestamp': timezone.now().isoformat()
            }
            
            # Determine packet type based on info field
            if info.startswith('!') or info.startswith('='):
                parsed.update(APRSParser._parse_position(info))
                parsed['packet_type'] = 'position'
            elif info.startswith('_'):
                parsed.update(APRSParser._parse_weather(info))
                parsed['packet_type'] = 'weather'
            elif info.startswith('>'):
                parsed['packet_type'] = 'status'
                parsed['status'] = info[1:]
            elif info.startswith(':'):
                parsed.update(APRSParser._parse_message(info))
                parsed['packet_type'] = 'message'
            else:
                parsed['packet_type'] = 'other'
            
            return parsed
            
        except Exception as e:
            logger.error(f"Error parsing packet: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def _parse_position(info: str) -> dict:
        """Parse position information"""
        try:
            # Remove position indicator
            data = info[1:] if info.startswith(('!', '=')) else info
            
            # Basic position format: lat/lon with symbol
            if len(data) < 19:
                return {}
            
            # Extract coordinates (simplified - real APRS parsing is more complex)
            lat_str = data[0:8]
            lon_str = data[9:18]
            
            # Convert to decimal degrees (this is simplified)
            lat = float(lat_str[:2]) + float(lat_str[2:7]) / 60.0
            if lat_str[7] == 'S':
                lat = -lat
            
            lon = float(lon_str[:3]) + float(lon_str[3:8]) / 60.0
            if lon_str[8] == 'W':
                lon = -lon
            
            result = {
                'latitude': lat,
                'longitude': lon,
                'symbol_table': data[8],
                'symbol_code': data[18] if len(data) > 18 else '/'
            }
            
            # Extract comment if present
            if len(data) > 19:
                result['comment'] = data[19:]
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing position: {e}")
            return {}
    
    @staticmethod
    def _parse_weather(info: str) -> dict:
        """Parse weather information"""
        try:
            # Weather format: _timestamp/wind_dir/wind_speedgust.../temp/rain/pressure/humidity/...
            data = info[1:]  # Remove weather indicator
            
            # This is a simplified parser - real APRS weather parsing is complex
            parts = data.split('/')
            weather_data = {}
            
            if len(parts) >= 3:
                # Extract basic weather parameters
                if parts[1].isdigit():
                    weather_data['wind_direction'] = int(parts[1])
                
                if 'g' in parts[2]:
                    speed_gust = parts[2].split('g')
                    if speed_gust[0].isdigit():
                        weather_data['wind_speed'] = int(speed_gust[0])
                    if speed_gust[1].isdigit():
                        weather_data['wind_gust'] = int(speed_gust[1])
                
                # Temperature (usually in Fahrenheit)
                if len(parts) >= 4 and parts[3].isdigit():
                    weather_data['temperature'] = int(parts[3])
                
                # Rainfall (1 hour)
                if len(parts) >= 5 and parts[4].isdigit():
                    weather_data['rainfall_1h'] = int(parts[4]) / 100.0
                
                # Pressure (tenths of mbar)
                if len(parts) >= 6 and parts[5].isdigit():
                    weather_data['pressure'] = int(parts[5]) / 10.0
                
                # Humidity
                if len(parts) >= 7 and parts[6].isdigit():
                    weather_data['humidity'] = int(parts[6])
            
            return weather_data
            
        except Exception as e:
            logger.error(f"Error parsing weather: {e}")
            return {}
    
    @staticmethod
    def _parse_message(info: str) -> dict:
        """Parse message information"""
        try:
            # Message format: :ADDRESSEE:message{msgno}
            data = info[1:]  # Remove message indicator
            
            if ':' not in data:
                return {}
            
            addressee, message_part = data.split(':', 1)
            
            # Extract message number if present
            message_no = None
            if '{' in message_part:
                message_text, msg_no_part = message_part.split('{', 1)
                if '}' in msg_no_part:
                    message_no = msg_no_part.split('}')[0]
            else:
                message_text = message_part
            
            return {
                'addressee': addressee.strip(),
                'message': message_text.strip(),
                'message_number': message_no,
                'is_ack': message_text.strip().lower() == 'ack'
            }
            
        except Exception as e:
            logger.error(f"Error parsing message: {e}")
            return {}


class Command(BaseCommand):
    help = 'Connect to APRS-IS and process packets'

    def add_arguments(self, parser):
        parser.add_argument(
            '--host',
            default='rotate.aprs2.net',
            help='APRS-IS server hostname'
        )
        parser.add_argument(
            '--port',
            type=int,
            default=14580,
            help='APRS-IS server port'
        )
        parser.add_argument(
            '--callsign',
            default='N0CALL',
            help='Your callsign for APRS-IS login'
        )
        parser.add_argument(
            '--passcode',
            default='-1',
            help='APRS-IS passcode (use -1 for receive-only)'
        )
        parser.add_argument(
            '--filter',
            default='',
            help='APRS-IS filter string (e.g., "r/39.7/-104.9/100")'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting APRS-IS connection...'))
        
        host = options['host']
        port = options['port']
        callsign = options['callsign']
        passcode = options['passcode']
        filter_str = options['filter']
        
        # Setup channel layer for WebSocket broadcasts
        channel_layer = get_channel_layer()
        
        try:
            # Connect to APRS-IS
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((host, port))
            
            # Login to APRS-IS
            login_string = f"user {callsign} pass {passcode} vers APRSwx 1.0"
            if filter_str:
                login_string += f" filter {filter_str}"
            login_string += "\r\n"
            
            sock.send(login_string.encode())
            
            # Read server response
            response = sock.recv(1024).decode()
            self.stdout.write(f"Server response: {response.strip()}")
            
            # Process packets
            buffer = ""
            while True:
                try:
                    data = sock.recv(1024).decode('utf-8', errors='ignore')
                    if not data:
                        break
                    
                    buffer += data
                    
                    # Process complete lines
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        
                        if line and not line.startswith('#'):
                            self.process_packet(line, channel_layer)
                            
                except KeyboardInterrupt:
                    self.stdout.write(self.style.SUCCESS('Shutting down...'))
                    break
                except Exception as e:
                    logger.error(f"Error processing data: {e}")
                    continue
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Connection error: {e}'))
        finally:
            sock.close()

    def process_packet(self, raw_packet: str, channel_layer):
        """Process a single APRS packet"""
        try:
            # Parse the packet
            parsed = APRSParser.parse_packet(raw_packet)
            
            if 'error' in parsed:
                logger.warning(f"Failed to parse packet: {parsed['error']}")
                return
            
            # Save packet to database
            packet = APRSPacket.objects.create(
                source_callsign=parsed['source_callsign'],
                packet_type=parsed['packet_type'],
                timestamp=timezone.now(),
                raw_packet=raw_packet,
                parsed_data=parsed
            )
            
            # Update or create station if position packet
            if parsed['packet_type'] == 'position' and 'latitude' in parsed and 'longitude' in parsed:
                station, created = Station.objects.update_or_create(
                    callsign=parsed['source_callsign'],
                    defaults={
                        'latitude': parsed['latitude'],
                        'longitude': parsed['longitude'],
                        'symbol_table': parsed.get('symbol_table', '/'),
                        'symbol_code': parsed.get('symbol_code', '/'),
                        'last_heard': timezone.now(),
                        'last_comment': parsed.get('comment', ''),
                        'station_type': 'mobile' if parsed.get('symbol_code') == '>' else 'fixed'
                    }
                )
                
                # Broadcast station update via WebSocket
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        'aprs_stations',
                        {
                            'type': 'station_update',
                            'station': {
                                'id': station.id,
                                'callsign': station.callsign,
                                'latitude': station.latitude,
                                'longitude': station.longitude,
                                'symbol_table': station.symbol_table,
                                'symbol_code': station.symbol_code,
                                'last_heard': station.last_heard.isoformat(),
                                'last_comment': station.last_comment,
                                'station_type': station.station_type,
                            }
                        }
                    )
            
            # Process weather data
            if parsed['packet_type'] == 'weather':
                weather_data = {
                    'station_callsign': parsed['source_callsign'],
                    'observation_time': timezone.now(),
                    'temperature': parsed.get('temperature'),
                    'humidity': parsed.get('humidity'),
                    'pressure': parsed.get('pressure'),
                    'wind_speed': parsed.get('wind_speed'),
                    'wind_direction': parsed.get('wind_direction'),
                    'wind_gust': parsed.get('wind_gust'),
                    'rainfall_1h': parsed.get('rainfall_1h'),
                }
                
                # Remove None values
                weather_data = {k: v for k, v in weather_data.items() if v is not None}
                
                if len(weather_data) > 2:  # More than just station and time
                    weather_obs = WeatherObservation.objects.create(**weather_data)
                    
                    # Broadcast weather update via WebSocket
                    if channel_layer:
                        async_to_sync(channel_layer.group_send)(
                            'aprs_weather',
                            {
                                'type': 'weather_update',
                                'weather': {
                                    'id': weather_obs.id,
                                    'station_callsign': weather_obs.station_callsign,
                                    'observation_time': weather_obs.observation_time.isoformat(),
                                    'temperature': weather_obs.temperature,
                                    'humidity': weather_obs.humidity,
                                    'pressure': weather_obs.pressure,
                                    'wind_speed': weather_obs.wind_speed,
                                    'wind_direction': weather_obs.wind_direction,
                                }
                            }
                        )
            
            # Broadcast packet update via WebSocket
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'aprs_packets',
                    {
                        'type': 'packet_update',
                        'packet': {
                            'id': packet.id,
                            'source_callsign': packet.source_callsign,
                            'packet_type': packet.packet_type,
                            'timestamp': packet.timestamp.isoformat(),
                            'raw_packet': packet.raw_packet,
                            'parsed_data': packet.parsed_data,
                        }
                    }
                )
            
            # Log packet processing
            if parsed['packet_type'] in ['position', 'weather']:
                self.stdout.write(f"Processed {parsed['packet_type']} from {parsed['source_callsign']}")
                
        except Exception as e:
            logger.error(f"Error processing packet: {e}")
            self.stdout.write(self.style.ERROR(f'Error processing packet: {e}'))
