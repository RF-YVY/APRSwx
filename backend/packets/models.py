"""
APRS Packet Models

This module defines the database models for APRS packets, including
position reports, weather data, messages, and other packet types.
"""

from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
import json


class APRSPacket(models.Model):
    """Base model for all APRS packets"""
    
    PACKET_TYPES = [
        ('position', 'Position Report'),
        ('weather', 'Weather Data'),
        ('message', 'Message'),
        ('status', 'Status Report'),
        ('object', 'Object Report'),
        ('item', 'Item Report'),
        ('query', 'Query'),
        ('telemetry', 'Telemetry'),
        ('mic_e', 'Mic-E'),
        ('unknown', 'Unknown'),
    ]
    
    # Packet metadata
    raw_packet = models.TextField(help_text="Raw APRS packet data")
    packet_type = models.CharField(max_length=20, choices=PACKET_TYPES, default='unknown')
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    received_at = models.DateTimeField(auto_now_add=True)
    
    # Station information
    source_callsign = models.CharField(max_length=10, db_index=True)
    destination = models.CharField(max_length=10, blank=True)
    path = models.CharField(max_length=100, blank=True)
    
    # Parsed data (stored as JSON for flexibility)
    parsed_data = models.JSONField(default=dict, blank=True)
    
    # Processing status
    is_processed = models.BooleanField(default=False)
    processing_errors = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['source_callsign', 'timestamp']),
            models.Index(fields=['packet_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.source_callsign} - {self.packet_type} - {self.timestamp}"
    
    def save(self, *args, **kwargs):
        """Override save to ensure packet is processed"""
        if not self.is_processed:
            self.process_packet()
        super().save(*args, **kwargs)
    
    def process_packet(self):
        """Process the raw packet data and extract relevant information"""
        try:
            # This would contain the actual APRS parsing logic
            # For now, we'll just mark as processed
            self.is_processed = True
        except Exception as e:
            self.processing_errors = str(e)


class PositionReport(models.Model):
    """Model for APRS position reports"""
    
    SYMBOL_TABLES = [
        ('/', 'Primary Table'),
        ('\\', 'Alternate Table'),
    ]
    
    packet = models.OneToOneField(APRSPacket, on_delete=models.CASCADE, related_name='position')
    station = models.ForeignKey('stations.Station', on_delete=models.CASCADE, related_name='positions')
    
    # Geographic data
    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField(null=True, blank=True, help_text="Altitude in meters")
    
    # APRS symbol information
    symbol_table = models.CharField(max_length=1, choices=SYMBOL_TABLES, default='/')
    symbol_code = models.CharField(max_length=1)
    
    # Movement data
    course = models.IntegerField(null=True, blank=True, help_text="Course in degrees (0-360)")
    speed = models.FloatField(null=True, blank=True, help_text="Speed in knots")
    
    # Radio information
    power = models.IntegerField(null=True, blank=True, help_text="Power in watts")
    height = models.IntegerField(null=True, blank=True, help_text="Antenna height in feet")
    gain = models.IntegerField(null=True, blank=True, help_text="Antenna gain in dB")
    directivity = models.IntegerField(null=True, blank=True, help_text="Directivity in degrees")
    
    # Range information
    range_miles = models.FloatField(null=True, blank=True, help_text="Range in miles")
    
    # Comment
    comment = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-packet__timestamp']
        indexes = [
            models.Index(fields=['station']),
        ]
    
    def __str__(self):
        return f"{self.station.callsign} at {self.location}"
    
    @property
    def latitude(self):
        return self.location.y if self.location else None
    
    @property
    def longitude(self):
        return self.location.x if self.location else None
    
    @property
    def emoji_symbol(self):
        """Return emoji representation of APRS symbol"""
        symbol_map = {
            # Primary table symbols
            ('/', '!'): '🚔',  # Police car
            ('/', '#'): '🏠',  # House
            ('/', '$'): '📱',  # Phone
            ('/', '%'): '🔌',  # Power
            ('/', '&'): '📡',  # Radio Gateway
            ('/', '('): '📱',  # Mobile phone
            ('/', '*'): '❄️',  # Snow
            ('/', '+'): '🏥',  # Red Cross
            ('/', '-'): '🏠',  # House QTH
            ('/', '.'): '🔴',  # Red Dot
            ('/', '/'): '🔴',  # Red Dot
            ('/', '>'): '🚗',  # Car
            ('/', 'A'): '🚑',  # Ambulance
            ('/', 'B'): '🚲',  # Bicycle
            ('/', 'C'): '🏭',  # Canoe
            ('/', 'D'): '🔥',  # Fire dept
            ('/', 'E'): '👁️',  # Eye
            ('/', 'F'): '🚒',  # Fire truck
            ('/', 'G'): '🎯',  # Grid
            ('/', 'H'): '🏨',  # Hotel
            ('/', 'I'): '🏝️',  # Island
            ('/', 'J'): '✈️',  # Jet
            ('/', 'K'): '🏫',  # School
            ('/', 'L'): '💡',  # Lighthouse
            ('/', 'M'): '🏔️',  # Mountain
            ('/', 'N'): '🚁',  # Helicopter
            ('/', 'O'): '🎈',  # Balloon
            ('/', 'P'): '👮',  # Police
            ('/', 'Q'): '🔲',  # Square
            ('/', 'R'): '🚗',  # RV
            ('/', 'S'): '🛰️',  # Satellite
            ('/', 'T'): '📱',  # Phone
            ('/', 'U'): '🚌',  # Bus
            ('/', 'V'): '🚐',  # Van
            ('/', 'W'): '💧',  # Water
            ('/', 'X'): '❌',  # X
            ('/', 'Y'): '⛵',  # Yacht
            ('/', 'Z'): '⚡',  # Lightning
        }
        
        key = (self.symbol_table, self.symbol_code)
        return symbol_map.get(key, '📍')  # Default to pin emoji


class WeatherReport(models.Model):
    """Model for APRS weather reports"""
    
    packet = models.OneToOneField(APRSPacket, on_delete=models.CASCADE, related_name='weather')
    station = models.ForeignKey('stations.Station', on_delete=models.CASCADE, related_name='weather_reports')
    
    # Temperature (in Fahrenheit)
    temperature = models.FloatField(null=True, blank=True)
    
    # Wind data
    wind_direction = models.IntegerField(null=True, blank=True, help_text="Wind direction in degrees")
    wind_speed = models.FloatField(null=True, blank=True, help_text="Wind speed in mph")
    wind_gust = models.FloatField(null=True, blank=True, help_text="Wind gust in mph")
    
    # Precipitation
    rainfall_1h = models.FloatField(null=True, blank=True, help_text="1-hour rainfall in inches")
    rainfall_24h = models.FloatField(null=True, blank=True, help_text="24-hour rainfall in inches")
    rainfall_since_midnight = models.FloatField(null=True, blank=True, help_text="Rainfall since midnight in inches")
    
    # Atmospheric pressure
    barometric_pressure = models.FloatField(null=True, blank=True, help_text="Barometric pressure in hPa")
    
    # Humidity
    humidity = models.IntegerField(null=True, blank=True, help_text="Humidity percentage")
    
    # Visibility
    visibility = models.FloatField(null=True, blank=True, help_text="Visibility in miles")
    
    # Solar/radiation data
    solar_radiation = models.FloatField(null=True, blank=True, help_text="Solar radiation in watts/m²")
    uv_index = models.FloatField(null=True, blank=True, help_text="UV index")
    
    # Additional weather data
    snow_depth = models.FloatField(null=True, blank=True, help_text="Snow depth in inches")
    
    class Meta:
        ordering = ['-packet__timestamp']
        indexes = [
            models.Index(fields=['station']),
        ]
    
    def __str__(self):
        return f"Weather from {self.station.callsign} at {self.packet.timestamp}"


class MessagePacket(models.Model):
    """Model for APRS messages"""
    
    packet = models.OneToOneField(APRSPacket, on_delete=models.CASCADE, related_name='message')
    
    # Message details
    addressee = models.CharField(max_length=10, help_text="Message recipient callsign")
    message_text = models.TextField(help_text="Message content")
    message_number = models.CharField(max_length=10, blank=True, help_text="Message number for ACK")
    
    # Message status
    is_ack = models.BooleanField(default=False, help_text="Is this an acknowledgment?")
    is_rej = models.BooleanField(default=False, help_text="Is this a reject?")
    ack_received = models.BooleanField(default=False, help_text="Has ACK been received?")
    
    class Meta:
        ordering = ['-packet__timestamp']
        indexes = [
            models.Index(fields=['addressee']),
        ]
    
    def __str__(self):
        msg_type = "ACK" if self.is_ack else "REJ" if self.is_rej else "MSG"
        return f"{msg_type}: {self.packet.source_callsign} -> {self.addressee}"


class TelemetryData(models.Model):
    """Model for APRS telemetry data"""
    
    packet = models.OneToOneField(APRSPacket, on_delete=models.CASCADE, related_name='telemetry')
    station = models.ForeignKey('stations.Station', on_delete=models.CASCADE, related_name='telemetry_data')
    
    # Telemetry sequence number
    sequence_number = models.IntegerField()
    
    # Analog values (0-255)
    analog_1 = models.IntegerField(null=True, blank=True)
    analog_2 = models.IntegerField(null=True, blank=True)
    analog_3 = models.IntegerField(null=True, blank=True)
    analog_4 = models.IntegerField(null=True, blank=True)
    analog_5 = models.IntegerField(null=True, blank=True)
    
    # Digital values (bit flags)
    digital_bits = models.IntegerField(default=0, help_text="8-bit digital value")
    
    # Scaling parameters (if available)
    scaling_parameters = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-packet__timestamp']
        indexes = [
            models.Index(fields=['station', 'sequence_number']),
        ]
    
    def __str__(self):
        return f"Telemetry #{self.sequence_number} from {self.station.callsign}"
