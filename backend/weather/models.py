"""
Weather Models

This module defines the database models for weather data integration,
including radar data, weather alerts, and meteorological information.
"""

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import json


class RadarSite(models.Model):
    """Model for NEXRAD radar sites"""
    
    site_id = models.CharField(max_length=4, unique=True, help_text="4-character radar site ID (e.g., KOKX)")
    name = models.CharField(max_length=100, help_text="Full name of radar site")
    latitude = models.FloatField(help_text="Radar site latitude")
    longitude = models.FloatField(help_text="Radar site longitude")
    elevation = models.FloatField(help_text="Radar elevation in meters")
    
    # Radar specifications
    frequency = models.FloatField(help_text="Radar frequency in MHz")
    beam_width = models.FloatField(default=0.95, help_text="Beam width in degrees")
    max_range = models.FloatField(default=460, help_text="Maximum range in km")
    
    # Status
    is_active = models.BooleanField(default=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['site_id']
    
    def __str__(self):
        return f"{self.site_id} - {self.name}"


class RadarProduct(models.Model):
    """Model for radar products and data types"""
    
    PRODUCT_TYPES = [
        ('N0R', 'Base Reflectivity'),
        ('N0V', 'Base Velocity'),
        ('N0Z', 'Base Reflectivity (248 nm)'),
        ('N1R', 'Base Reflectivity (124 nm)'),
        ('N2R', 'Base Reflectivity (248 nm)'),
        ('N3R', 'Base Reflectivity (124 nm)'),
        ('NCR', 'Composite Reflectivity'),
        ('NTP', 'Storm Total Precipitation'),
        ('N1P', 'One-Hour Precipitation'),
        ('NVW', 'Velocity Azimuth Display'),
        ('NST', 'Storm Tracking'),
        ('NHI', 'Hail Index'),
        ('NMD', 'Mesocyclone Detection'),
        ('NTD', 'Tornado Detection'),
    ]
    
    product_code = models.CharField(max_length=3, choices=PRODUCT_TYPES, unique=True)
    description = models.CharField(max_length=200)
    units = models.CharField(max_length=50, help_text="Data units (e.g., dBZ, m/s)")
    
    # Display properties
    color_scale = models.JSONField(default=dict, help_text="Color scale for visualization")
    min_value = models.FloatField(help_text="Minimum data value")
    max_value = models.FloatField(help_text="Maximum data value")
    
    # Update frequency
    update_interval = models.IntegerField(default=300, help_text="Update interval in seconds")
    
    class Meta:
        ordering = ['product_code']
    
    def __str__(self):
        return f"{self.product_code} - {self.description}"


class RadarSweep(models.Model):
    """Model for individual radar sweeps"""
    
    site = models.ForeignKey(RadarSite, on_delete=models.CASCADE, related_name='sweeps')
    product = models.ForeignKey(RadarProduct, on_delete=models.CASCADE, related_name='sweeps')
    
    # Sweep metadata
    sweep_time = models.DateTimeField(db_index=True)
    elevation_angle = models.FloatField(help_text="Elevation angle in degrees")
    azimuth_start = models.FloatField(help_text="Starting azimuth in degrees")
    azimuth_end = models.FloatField(help_text="Ending azimuth in degrees")
    
    # Data storage
    data_file = models.FileField(upload_to='radar_data/', null=True, blank=True)
    data_url = models.URLField(blank=True, help_text="URL to external radar data")
    
    # Processing status
    is_processed = models.BooleanField(default=False)
    processing_time = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    file_size = models.IntegerField(default=0, help_text="File size in bytes")
    
    class Meta:
        ordering = ['-sweep_time']
        indexes = [
            models.Index(fields=['site', 'product', 'sweep_time']),
        ]
        unique_together = ['site', 'product', 'sweep_time', 'elevation_angle']
    
    def __str__(self):
        return f"{self.site.site_id} {self.product.product_code} - {self.sweep_time}"


class RadarComposite(models.Model):
    """Model for composite radar images"""
    
    product = models.ForeignKey(RadarProduct, on_delete=models.CASCADE, related_name='composites')
    
    # Composite metadata
    composite_time = models.DateTimeField(db_index=True)
    sites_included = models.ManyToManyField(RadarSite, related_name='composites')
    
    # Geographic coverage
    # Coverage area is simplified for now
    coverage_description = models.TextField(blank=True, help_text="Text description of coverage area")
    
    # Data storage
    image_file = models.FileField(upload_to='radar_composites/', null=True, blank=True)
    data_file = models.FileField(upload_to='radar_composites/data/', null=True, blank=True)
    
    # Processing information
    created_at = models.DateTimeField(auto_now_add=True)
    processing_time = models.FloatField(help_text="Processing time in seconds")
    
    class Meta:
        ordering = ['-composite_time']
        indexes = [
            models.Index(fields=['product', 'composite_time']),
        ]
    
    def __str__(self):
        return f"Composite {self.product.product_code} - {self.composite_time}"


class WeatherAlert(models.Model):
    """Model for weather alerts and warnings"""
    
    ALERT_TYPES = [
        ('warning', 'Warning'),
        ('watch', 'Watch'),
        ('advisory', 'Advisory'),
        ('statement', 'Statement'),
        ('emergency', 'Emergency'),
    ]
    
    SEVERITY_LEVELS = [
        ('minor', 'Minor'),
        ('moderate', 'Moderate'),
        ('severe', 'Severe'),
        ('extreme', 'Extreme'),
    ]
    
    # Alert identification
    alert_id = models.CharField(max_length=100, unique=True, help_text="Unique alert identifier")
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    event_type = models.CharField(max_length=100, help_text="Type of weather event")
    
    # Alert content
    title = models.CharField(max_length=200)
    description = models.TextField()
    instruction = models.TextField(blank=True)
    
    # Severity and urgency
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    urgency = models.CharField(max_length=20, default='unknown')
    certainty = models.CharField(max_length=20, default='unknown')
    
    # Geographic coverage
    # Affected area is simplified for now  
    affected_description = models.TextField(blank=True, help_text="Text description of affected area")
    
    # Timing
    issued_at = models.DateTimeField()
    effective_at = models.DateTimeField()
    expires_at = models.DateTimeField()
    updated_at = models.DateTimeField(auto_now=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_cancelled = models.BooleanField(default=False)
    
    # Source information
    issuing_office = models.CharField(max_length=100)
    source_url = models.URLField(blank=True)
    
    class Meta:
        ordering = ['-issued_at']
        indexes = [
            models.Index(fields=['alert_type', 'is_active']),
            models.Index(fields=['effective_at', 'expires_at']),
        ]
    
    def __str__(self):
        return f"{self.event_type} {self.alert_type} - {self.title}"
    
    def is_current(self):
        """Check if alert is currently active"""
        now = timezone.now()
        return (self.is_active and 
                not self.is_cancelled and 
                self.effective_at <= now <= self.expires_at)


class WeatherStation(models.Model):
    """Model for weather observation stations"""
    
    STATION_TYPES = [
        ('metar', 'METAR Station'),
        ('mesonet', 'Mesonet Station'),
        ('aprs', 'APRS Weather Station'),
        ('cwop', 'CWOP Station'),
        ('personal', 'Personal Weather Station'),
    ]
    
    # Station identification
    station_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    station_type = models.CharField(max_length=20, choices=STATION_TYPES)
    
    # Location
    latitude = models.FloatField()
    longitude = models.FloatField()
    elevation = models.FloatField(help_text="Elevation in meters")
    
    # Station information
    operator = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    last_observation = models.DateTimeField(null=True, blank=True)
    
    # Data quality
    data_quality_score = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text="Data quality score (0.0 to 1.0)"
    )
    
    class Meta:
        ordering = ['station_id']
    
    def __str__(self):
        return f"{self.station_id} - {self.name}"
    
    @property
    def latitude(self):
        return self.location.y if self.location else None
    
    @property
    def longitude(self):
        return self.location.x if self.location else None


class WeatherObservation(models.Model):
    """Model for weather observations"""
    
    station = models.ForeignKey(WeatherStation, on_delete=models.CASCADE, related_name='observations')
    observation_time = models.DateTimeField(db_index=True)
    
    # Temperature (in Celsius)
    temperature = models.FloatField(null=True, blank=True)
    temperature_dewpoint = models.FloatField(null=True, blank=True)
    temperature_windchill = models.FloatField(null=True, blank=True)
    temperature_heatindex = models.FloatField(null=True, blank=True)
    
    # Atmospheric pressure (in hPa)
    pressure = models.FloatField(null=True, blank=True)
    pressure_tendency = models.FloatField(null=True, blank=True)
    
    # Humidity (percentage)
    humidity = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Wind (speed in m/s, direction in degrees)
    wind_speed = models.FloatField(null=True, blank=True)
    wind_direction = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(360)]
    )
    wind_gust = models.FloatField(null=True, blank=True)
    
    # Precipitation (in mm)
    precipitation_1h = models.FloatField(null=True, blank=True)
    precipitation_6h = models.FloatField(null=True, blank=True)
    precipitation_24h = models.FloatField(null=True, blank=True)
    
    # Visibility (in meters)
    visibility = models.FloatField(null=True, blank=True)
    
    # Cloud coverage
    cloud_coverage = models.CharField(max_length=20, blank=True)
    cloud_base = models.FloatField(null=True, blank=True, help_text="Cloud base in meters")
    
    # Weather conditions
    present_weather = models.CharField(max_length=100, blank=True)
    weather_code = models.CharField(max_length=20, blank=True)
    
    # Solar radiation
    solar_radiation = models.FloatField(null=True, blank=True, help_text="Solar radiation in W/m²")
    uv_index = models.FloatField(null=True, blank=True)
    
    # Quality control
    quality_flags = models.JSONField(default=dict, blank=True)
    is_quality_controlled = models.BooleanField(default=False)
    
    # Raw data
    raw_data = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-observation_time']
        indexes = [
            models.Index(fields=['station', 'observation_time']),
        ]
        unique_together = ['station', 'observation_time']
    
    def __str__(self):
        return f"{self.station.station_id} - {self.observation_time}"


class RadarAnimation(models.Model):
    """Model for radar animation sequences"""
    
    product = models.ForeignKey(RadarProduct, on_delete=models.CASCADE, related_name='animations')
    
    # Animation metadata
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    frame_count = models.IntegerField()
    duration = models.FloatField(help_text="Animation duration in seconds")
    
    # Geographic coverage
    # Coverage area is simplified for now
    coverage_description = models.TextField(blank=True, help_text="Text description of coverage area")
    
    # File storage
    animation_file = models.FileField(upload_to='radar_animations/', null=True, blank=True)
    thumbnail = models.ImageField(upload_to='radar_thumbnails/', null=True, blank=True)
    
    # Animation settings
    frame_rate = models.FloatField(default=10.0, help_text="Frames per second")
    loop_count = models.IntegerField(default=0, help_text="Loop count (0 = infinite)")
    
    # Processing information
    created_at = models.DateTimeField(auto_now_add=True)
    processing_time = models.FloatField(help_text="Processing time in seconds")
    
    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['product', 'start_time']),
        ]
    
    def __str__(self):
        return f"Animation {self.product.product_code} - {self.start_time} to {self.end_time}"
