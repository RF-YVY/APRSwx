"""
WebSocket Models

This module defines the database models for WebSocket connections,
real-time subscriptions, and message handling.
"""

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
import json


class WebSocketConnection(models.Model):
    """Model for tracking WebSocket connections"""
    
    CONNECTION_TYPES = [
        ('web', 'Web Browser'),
        ('mobile', 'Mobile App'),
        ('api', 'API Client'),
        ('service', 'Service Connection'),
    ]
    
    # Connection identification
    connection_id = models.CharField(max_length=100, unique=True)
    channel_name = models.CharField(max_length=100, unique=True)
    connection_type = models.CharField(max_length=20, choices=CONNECTION_TYPES, default='web')
    
    # User association
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_key = models.CharField(max_length=100, blank=True)
    
    # Connection metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Geographic filtering
    filter_bounds = models.JSONField(default=dict, blank=True, help_text="Geographic bounds for filtering")
    max_distance_km = models.FloatField(null=True, blank=True, help_text="Maximum distance for filtering")
    
    # Connection status
    is_active = models.BooleanField(default=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    disconnected_at = models.DateTimeField(null=True, blank=True)
    
    # Statistics
    messages_sent = models.IntegerField(default=0)
    messages_received = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['-connected_at']
        indexes = [
            models.Index(fields=['connection_id']),
            models.Index(fields=['channel_name']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"Connection {self.connection_id} ({self.connection_type})"
    
    def disconnect(self):
        """Mark connection as disconnected"""
        self.is_active = False
        self.disconnected_at = timezone.now()
        self.save()
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])


class Subscription(models.Model):
    """Model for client subscriptions to data streams"""
    
    SUBSCRIPTION_TYPES = [
        ('packets', 'APRS Packets'),
        ('stations', 'Station Updates'),
        ('weather', 'Weather Data'),
        ('radar', 'Radar Data'),
        ('alerts', 'Weather Alerts'),
        ('messages', 'APRS Messages'),
    ]
    
    connection = models.ForeignKey(WebSocketConnection, on_delete=models.CASCADE, related_name='subscriptions')
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_TYPES)
    
    # Subscription filters
    filters = models.JSONField(default=dict, blank=True, help_text="Subscription filters")
    
    # Examples of filters:
    # - For packets: {"callsigns": ["N0CALL", "N1CALL"], "packet_types": ["position", "weather"]}
    # - For stations: {"station_types": ["mobile", "weather"], "within_km": 50}
    # - For weather: {"products": ["N0R", "N0V"], "alert_types": ["warning", "watch"]}
    
    # Subscription settings
    is_active = models.BooleanField(default=True)
    rate_limit = models.IntegerField(default=0, help_text="Rate limit in messages per second (0 = no limit)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Statistics
    messages_sent = models.IntegerField(default=0)
    last_message_sent = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['connection', 'subscription_type']),
            models.Index(fields=['subscription_type', 'is_active']),
        ]
        unique_together = ['connection', 'subscription_type']
    
    def __str__(self):
        return f"{self.connection.connection_id} -> {self.subscription_type}"
    
    def matches_filter(self, data):
        """Check if data matches subscription filters"""
        if not self.filters:
            return True
        
        # This would contain the actual filtering logic
        # For now, return True (no filtering)
        return True


class MessageQueue(models.Model):
    """Model for queuing messages to be sent to clients"""
    
    MESSAGE_TYPES = [
        ('packet', 'APRS Packet'),
        ('station_update', 'Station Update'),
        ('weather_data', 'Weather Data'),
        ('radar_update', 'Radar Update'),
        ('alert', 'Weather Alert'),
        ('system', 'System Message'),
    ]
    
    PRIORITIES = [
        (1, 'Critical'),
        (2, 'High'),
        (3, 'Normal'),
        (4, 'Low'),
    ]
    
    # Message identification
    message_id = models.CharField(max_length=100, unique=True)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    priority = models.IntegerField(choices=PRIORITIES, default=3)
    
    # Message content
    content = models.JSONField(help_text="Message content")
    
    # Targeting
    target_connections = models.ManyToManyField(WebSocketConnection, blank=True)
    target_all = models.BooleanField(default=False, help_text="Send to all active connections")
    
    # Filtering criteria
    filter_criteria = models.JSONField(default=dict, blank=True)
    
    # Status
    is_sent = models.BooleanField(default=False)
    sent_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['priority', '-created_at']
        indexes = [
            models.Index(fields=['message_type', 'is_sent']),
            models.Index(fields=['priority', 'created_at']),
            models.Index(fields=['scheduled_at']),
        ]
    
    def __str__(self):
        return f"{self.message_type} message {self.message_id}"
    
    def mark_sent(self):
        """Mark message as sent"""
        self.is_sent = True
        self.sent_at = timezone.now()
        self.save()


class ConnectionStats(models.Model):
    """Model for connection statistics"""
    
    connection = models.OneToOneField(WebSocketConnection, on_delete=models.CASCADE, related_name='stats')
    
    # Activity statistics
    total_connect_time = models.DurationField(default=timezone.timedelta(0))
    average_session_duration = models.DurationField(default=timezone.timedelta(0))
    session_count = models.IntegerField(default=0)
    
    # Message statistics
    total_messages_sent = models.IntegerField(default=0)
    total_messages_received = models.IntegerField(default=0)
    average_messages_per_minute = models.FloatField(default=0.0)
    
    # Data transfer statistics
    bytes_sent = models.BigIntegerField(default=0)
    bytes_received = models.BigIntegerField(default=0)
    
    # Error statistics
    connection_errors = models.IntegerField(default=0)
    message_errors = models.IntegerField(default=0)
    
    # Last updated
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Stats for {self.connection.connection_id}"
    
    def update_stats(self):
        """Update statistics from connection data"""
        # This would calculate and update statistics
        pass


class SystemMessage(models.Model):
    """Model for system-wide messages and notifications"""
    
    MESSAGE_TYPES = [
        ('maintenance', 'Maintenance'),
        ('alert', 'System Alert'),
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    title = models.CharField(max_length=200)
    content = models.TextField()
    
    # Display settings
    is_popup = models.BooleanField(default=False, help_text="Show as popup notification")
    is_persistent = models.BooleanField(default=False, help_text="Keep visible until dismissed")
    
    # Timing
    starts_at = models.DateTimeField(default=timezone.now)
    ends_at = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.message_type}: {self.title}"
    
    def is_current(self):
        """Check if message is currently active"""
        now = timezone.now()
        if not self.is_active:
            return False
        if self.starts_at > now:
            return False
        if self.ends_at and self.ends_at < now:
            return False
        return True
