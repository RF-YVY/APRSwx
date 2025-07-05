"""
APRS-IS Connection Service
Handles background connection to APRS-IS when requested by WebSocket
"""
import threading
import socket
import json
import logging
from datetime import datetime
from django.utils import timezone
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from packets.models import APRSPacket
from stations.models import Station
from weather.models import WeatherObservation

logger = logging.getLogger(__name__)


class APRSISConnectionService:
    """Service to handle APRS-IS connections"""
    
    def __init__(self):
        self.connection_thread = None
        self.is_connected = False
        self.should_disconnect = False
        self.current_settings = None
        self.socket = None
        
    def connect(self, user_settings):
        """Start APRS-IS connection with user settings"""
        if self.is_connected:
            logger.info("APRS-IS already connected")
            return
            
        self.current_settings = user_settings
        self.should_disconnect = False
        
        # Start connection in background thread
        self.connection_thread = threading.Thread(
            target=self._connection_worker,
            daemon=True
        )
        self.connection_thread.start()
        
    def disconnect(self):
        """Disconnect from APRS-IS"""
        logger.info("Disconnecting from APRS-IS")
        self.should_disconnect = True
        
        if self.socket:
            try:
                self.socket.close()
            except:
                pass
        
        if self.connection_thread and self.connection_thread.is_alive():
            self.connection_thread.join(timeout=5)
            
        self.is_connected = False
        self.current_settings = None
        
    def _connection_worker(self):
        """Background worker for APRS-IS connection"""
        try:
            # APRS-IS server configuration
            server = getattr(settings, 'APRSIS_SERVER', 'rotate.aprs.net')
            port = getattr(settings, 'APRSIS_PORT', 14580)
            
            callsign = self.current_settings['callsign']
            passcode = self.current_settings['passcode']
            location = self.current_settings['location']
            filters = self.current_settings.get('aprsIsFilters', {})
            
            # Validate callsign and passcode
            if not callsign or callsign.upper() == 'NOCALL' or not isinstance(passcode, int) or passcode <= 0:
                logger.error(f"Invalid callsign or passcode for APRS-IS: callsign={callsign}, passcode={passcode}")
                self._broadcast_connection_status(False, "Invalid callsign or passcode. Please set your real callsign and passcode in User Settings.")
                return
            # Build filter string
            filter_str = self._build_filter_string(location, filters)
            
            logger.info(f"Connecting to APRS-IS: {server}:{port} with callsign {callsign}")
            
            # Connect to APRS-IS
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(30)
            self.socket.connect((server, port))
            
            # Send login
            login_string = f"user {callsign} pass {passcode} vers APRSwx 1.0"
            if filter_str:
                login_string += f" filter {filter_str}"
            login_string += "\r\n"
            
            self.socket.send(login_string.encode())
            
            # Read server responses (there might be multiple lines)
            login_successful = False
            response_lines = []
            
            # Read initial responses
            for _ in range(5):  # Try to read up to 5 lines
                try:
                    self.socket.settimeout(3)
                    response = self.socket.recv(1024).decode()
                    response_lines.append(response.strip())
                    logger.info(f"APRS-IS server response: {response.strip()}")
                    
                    # Check for login success indicators
                    if "verified" in response.lower() or "unverified" in response.lower():
                        login_successful = True
                        break
                    elif "logresp" in response.lower() or "# logresp" in response.lower():
                        login_successful = True
                        break
                    elif response.strip() == "":
                        break
                except socket.timeout:
                    break
                except Exception as e:
                    logger.warning(f"Error reading response: {e}")
                    break
            
            # If we got responses without explicit success, assume it worked
            if not login_successful and response_lines:
                login_successful = True
                logger.info("Assuming login successful based on server response")
                
            if login_successful:
                self.is_connected = True
                logger.info("Successfully connected to APRS-IS")
                
                # Notify frontend of successful connection
                self._broadcast_connection_status(True)
                
                # Start receiving packets
                self._packet_loop()
            else:
                logger.error(f"APRS-IS login failed: {' | '.join(response_lines)}")
                self._broadcast_connection_status(False, f"Login failed: {' | '.join(response_lines)}")
                
        except Exception as e:
            logger.error(f"APRS-IS connection error: {e}")
            self._broadcast_connection_status(False, str(e))
        finally:
            self.is_connected = False
            if self.socket:
                self.socket.close()
                
    def _packet_loop(self):
        """Main packet receiving loop"""
        buffer = ""
        
        while not self.should_disconnect:
            try:
                # Set socket timeout for periodic checks
                self.socket.settimeout(1.0)
                
                try:
                    data = self.socket.recv(1024).decode('utf-8', errors='ignore')
                    if not data:
                        break
                except socket.timeout:
                    continue
                    
                buffer += data
                
                # Process complete lines
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    line = line.strip()
                    
                    if line and not line.startswith('#'):
                        self._process_packet(line)
                        
            except Exception as e:
                logger.error(f"Error in packet loop: {e}")
                break
                
        logger.info("APRS-IS packet loop ended")
        
    def _process_packet(self, raw_packet):
        """Process a received APRS packet"""
        try:
            from packets.management.commands.aprs_listener import APRSParser
            
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
            
            # Broadcast packet via WebSocket
            channel_layer = get_channel_layer()
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
            
            # Update station if position packet
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
                        'station_type': 'mobile' if parsed.get('symbol_code') == '>' else 'fixed',
                        'is_active': True
                    }
                )
                
                # Broadcast station update
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        'stations',
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
                                'emoji_symbol': station.emoji_symbol,
                            }
                        }
                    )
            
            logger.debug(f"Processed packet from {parsed['source_callsign']}")
            
        except Exception as e:
            logger.error(f"Error processing packet: {e}")
            
    def _build_filter_string(self, location, filters):
        """Build APRS-IS filter string from user settings"""
        filter_parts = []
        
        if location and filters.get('distanceRange'):
            lat = location['latitude']
            lon = location['longitude']
            distance = filters['distanceRange']
            filter_parts.append(f"r/{lat}/{lon}/{distance}")
            
        # Add other filters as needed
        return ' '.join(filter_parts)
        
    def _broadcast_connection_status(self, connected, error=None):
        """Broadcast connection status to WebSocket clients"""
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'aprs_packets',
                {
                    'type': 'connection_status',
                    'connected': connected,
                    'error': error,
                    'timestamp': timezone.now().isoformat()
                }
            )


# Global service instance
aprs_service = APRSISConnectionService()
