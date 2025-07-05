"""
APRS Station Models

This module defines the database models for APRS stations, including
their information, capabilities, and status tracking.
"""

from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator
import json


class Station(models.Model):
    """Model for APRS stations"""
    
    STATION_TYPES = [
        ('fixed', 'Fixed Station'),
        ('mobile', 'Mobile Station'),
        ('portable', 'Portable Station'),
        ('maritime', 'Maritime Mobile'),
        ('aeronautical', 'Aeronautical Mobile'),
        ('weather', 'Weather Station'),
        ('digipeater', 'Digipeater'),
        ('igate', 'Internet Gateway'),
        ('object', 'Object'),
        ('item', 'Item'),
        ('unknown', 'Unknown'),
    ]
    
    # Station identification
    callsign = models.CharField(
        max_length=10, 
        unique=True, 
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9]{1,6}(-[0-9]{1,2})?$',
                message='Invalid callsign format'
            )
        ]
    )
    ssid = models.CharField(max_length=2, blank=True, help_text="SSID (Secondary Station ID)")
    
    # Station information
    station_type = models.CharField(max_length=20, choices=STATION_TYPES, default='unknown')
    symbol_table = models.CharField(max_length=1, default='/')
    symbol_code = models.CharField(max_length=1, default='&')
    
    # Current position and status
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    last_altitude = models.FloatField(null=True, blank=True, help_text="Last known altitude in meters")
    last_heard = models.DateTimeField(null=True, blank=True)
    last_comment = models.TextField(blank=True)
    
    # Station metadata
    first_heard = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    packet_count = models.IntegerField(default=0)
    
    # Tracking information
    track_history = models.BooleanField(default=True, help_text="Keep position history for this station")
    max_history_age = models.IntegerField(default=24, help_text="Maximum age of position history in hours")
    
    # Station capabilities
    capabilities = models.JSONField(default=dict, blank=True, help_text="Station capabilities and features")
    
    # Contact information
    operator_name = models.CharField(max_length=100, blank=True)
    operator_email = models.EmailField(blank=True)
    qth = models.CharField(max_length=200, blank=True, help_text="Station location description")
    
    # Equipment information
    equipment_info = models.TextField(blank=True, help_text="Radio and equipment information")
    
    class Meta:
        ordering = ['-last_heard']
        indexes = [
            models.Index(fields=['callsign']),
            models.Index(fields=['last_heard']),
            models.Index(fields=['station_type']),
        ]
    
    def __str__(self):
        return self.callsign
    
    @property
    def full_callsign(self):
        """Return callsign with SSID if present"""
        if self.ssid:
            return f"{self.callsign}-{self.ssid}"
        return self.callsign
    
    @property
    def emoji_symbol(self):
        """Return emoji representation of station symbol"""
        symbol_map = {
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
            ('/', '_'): '🌡️',  # Weather station
        }
        
        key = (self.symbol_table, self.symbol_code)
        return symbol_map.get(key, '📍')  # Default to pin emoji
    
    def update_position(self, position, altitude=None, comment=''):
        """Update station position and related information"""
        self.last_position = position
        if altitude is not None:
            self.last_altitude = altitude
        self.last_heard = timezone.now()
        self.last_comment = comment
        self.packet_count += 1
        self.save()
    
    def is_heard_recently(self, hours=1):
        """Check if station was heard within the specified time period"""
        if not self.last_heard:
            return False
        cutoff = timezone.now() - timezone.timedelta(hours=hours)
        return self.last_heard >= cutoff
    
    def cleanup_old_positions(self):
        """Remove old position reports beyond max_history_age"""
        cutoff = timezone.now() - timezone.timedelta(hours=self.max_history_age)
        self.positions.filter(packet__timestamp__lt=cutoff).delete()


class StationAlias(models.Model):
    """Model for station aliases and alternate callsigns"""
    
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='aliases')
    alias = models.CharField(max_length=20, unique=True)
    alias_type = models.CharField(
        max_length=20,
        choices=[
            ('tactical', 'Tactical Call'),
            ('object', 'Object Name'),
            ('item', 'Item Name'),
            ('alternate', 'Alternate Call'),
        ],
        default='tactical'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['station', 'alias']
    
    def __str__(self):
        return f"{self.alias} -> {self.station.callsign}"


class StationGroup(models.Model):
    """Model for grouping stations (e.g., events, organizations)"""
    
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    stations = models.ManyToManyField(Station, related_name='groups', blank=True)
    
    # Group settings
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default='#FF0000', help_text="Hex color code for map display")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class StationNote(models.Model):
    """Model for notes about stations"""
    
    station = models.ForeignKey(Station, on_delete=models.CASCADE, related_name='notes')
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=50, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Note for {self.station.callsign}"


class StationStats(models.Model):
    """Model for station statistics"""
    
    station = models.OneToOneField(Station, on_delete=models.CASCADE, related_name='stats')
    
    # Packet statistics
    total_packets = models.IntegerField(default=0)
    position_packets = models.IntegerField(default=0)
    weather_packets = models.IntegerField(default=0)
    message_packets = models.IntegerField(default=0)
    telemetry_packets = models.IntegerField(default=0)
    
    # Activity statistics
    first_packet = models.DateTimeField(null=True, blank=True)
    last_packet = models.DateTimeField(null=True, blank=True)
    active_days = models.IntegerField(default=0)
    
    # Geographic statistics
    max_distance_km = models.FloatField(default=0.0, help_text="Maximum distance traveled in km")
    total_distance_km = models.FloatField(default=0.0, help_text="Total distance traveled in km")
    
    # Time statistics
    avg_beacon_interval = models.IntegerField(default=0, help_text="Average beacon interval in seconds")
    
    # Last updated
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Stats for {self.station.callsign}"
    
    def update_stats(self):
        """Update statistics based on current packets"""
        from packets.models import APRSPacket
        
        packets = APRSPacket.objects.filter(source_callsign=self.station.callsign)
        
        self.total_packets = packets.count()
        self.position_packets = packets.filter(packet_type='position').count()
        self.weather_packets = packets.filter(packet_type='weather').count()
        self.message_packets = packets.filter(packet_type='message').count()
        self.telemetry_packets = packets.filter(packet_type='telemetry').count()
        
        if packets.exists():
            self.first_packet = packets.order_by('timestamp').first().timestamp
            self.last_packet = packets.order_by('-timestamp').first().timestamp
        
        self.save()
