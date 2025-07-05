"""
WebSocket consumers for real-time APRS data streaming
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import WebSocketConnection, Subscription
from packets.models import APRSPacket
from stations.models import Station
from weather.models import WeatherObservation, RadarSweep, WeatherAlert

logger = logging.getLogger('aprs')


class BaseAPRSConsumer(AsyncWebsocketConsumer):
    """Base consumer with common functionality"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.connection_record = None
        self.group_name = None
        self.user = None
    
    async def connect(self):
        """Handle WebSocket connection"""
        await self.accept()
        
        # Create connection record
        self.connection_record = await self.create_connection_record()
        
        # Join group for broadcasting
        if self.group_name:
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        logger.info(f"WebSocket connected: {self.connection_record.connection_id}")
        
        # Send initial data
        await self.send_initial_data()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if self.connection_record:
            await self.disconnect_connection_record()
        
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        
        logger.info(f"WebSocket disconnected: {close_code}")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'subscribe':
                await self.handle_subscribe(data)
            elif message_type == 'unsubscribe':
                await self.handle_unsubscribe(data)
            elif message_type == 'filter':
                await self.handle_filter(data)
            elif message_type == 'ping':
                await self.send_pong()
            else:
                await self.handle_custom_message(data)
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_error("Internal server error")
    
    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def send_pong(self):
        """Send pong response"""
        await self.send(text_data=json.dumps({
            'type': 'pong',
            'timestamp': timezone.now().isoformat()
        }))
    
    async def handle_subscribe(self, data):
        """Handle subscription requests"""
        subscription_type = data.get('subscription_type')
        filters = data.get('filters', {})
        
        if subscription_type:
            await self.create_subscription(subscription_type, filters)
            await self.send(text_data=json.dumps({
                'type': 'subscribed',
                'subscription_type': subscription_type,
                'filters': filters
            }))
    
    async def handle_unsubscribe(self, data):
        """Handle unsubscription requests"""
        subscription_type = data.get('subscription_type')
        
        if subscription_type:
            await self.remove_subscription(subscription_type)
            await self.send(text_data=json.dumps({
                'type': 'unsubscribed',
                'subscription_type': subscription_type
            }))
    
    async def handle_filter(self, data):
        """Handle filter updates"""
        filters = data.get('filters', {})
        await self.update_filters(filters)
        await self.send(text_data=json.dumps({
            'type': 'filter_updated',
            'filters': filters
        }))
    
    async def handle_custom_message(self, data):
        """Handle custom messages (override in subclasses)"""
        pass
    
    async def send_initial_data(self):
        """Send initial data to client (override in subclasses)"""
        pass
    
    @database_sync_to_async
    def create_connection_record(self):
        """Create database record for connection"""
        user = self.scope.get('user')
        authenticated_user = user if user and hasattr(user, 'is_authenticated') and user.is_authenticated else None
        
        return WebSocketConnection.objects.create(
            connection_id=self.channel_name,
            channel_name=self.channel_name,
            connection_type='web',
            user=authenticated_user,
            ip_address=self.get_client_ip(),
            user_agent=self.get_user_agent()
        )
    
    @database_sync_to_async
    def disconnect_connection_record(self):
        """Mark connection as disconnected"""
        if self.connection_record:
            self.connection_record.disconnect()
    
    @database_sync_to_async
    def create_subscription(self, subscription_type, filters):
        """Create subscription record"""
        if self.connection_record:
            subscription, created = Subscription.objects.get_or_create(
                connection=self.connection_record,
                subscription_type=subscription_type,
                defaults={'filters': filters}
            )
            if not created:
                subscription.filters = filters
                subscription.save()
            return subscription
    
    @database_sync_to_async
    def remove_subscription(self, subscription_type):
        """Remove subscription record"""
        if self.connection_record:
            Subscription.objects.filter(
                connection=self.connection_record,
                subscription_type=subscription_type
            ).delete()
    
    @database_sync_to_async
    def update_filters(self, filters):
        """Update connection filters"""
        if self.connection_record:
            self.connection_record.filter_bounds = filters
            self.connection_record.save()
    
    def get_client_ip(self):
        """Get client IP address"""
        headers = dict(self.scope.get('headers', []))
        x_forwarded_for = headers.get(b'x-forwarded-for')
        if x_forwarded_for:
            return x_forwarded_for.decode('utf-8').split(',')[0]
        client = self.scope.get('client', ['unknown', None])
        return client[0] if client else 'unknown'
    
    def get_user_agent(self):
        """Get client user agent"""
        headers = dict(self.scope.get('headers', []))
        user_agent = headers.get(b'user-agent')
        if user_agent:
            return user_agent.decode('utf-8')
        return 'unknown'


class APRSConsumer(BaseAPRSConsumer):
    """Consumer for APRS packet data"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.group_name = 'aprs_packets'
    
    async def handle_custom_message(self, data):
        """Handle APRS-IS connection requests"""
        message_type = data.get('type')
        
        if message_type == 'connect_aprsis':
            await self.handle_aprsis_connect(data)
        elif message_type == 'disconnect_aprsis':
            await self.handle_aprsis_disconnect(data)
    
    async def handle_aprsis_connect(self, data):
        """Handle APRS-IS connection request"""
        try:
            user_settings = data.get('user_settings', {})
            
            # Validate required settings
            required_fields = ['callsign', 'passcode', 'location']
            for field in required_fields:
                if not user_settings.get(field):
                    await self.send_error(f"Missing required field: {field}")
                    return
            
            # Import and start APRS-IS connection
            from .aprs_service import aprs_service
            await self.run_in_thread(aprs_service.connect, user_settings)
            
            await self.send(text_data=json.dumps({
                'type': 'aprsis_connecting',
                'message': 'Connecting to APRS-IS...',
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"Error handling APRS-IS connect: {e}")
            await self.send_error(f"Failed to connect to APRS-IS: {str(e)}")
    
    async def handle_aprsis_disconnect(self, data):
        """Handle APRS-IS disconnection request"""
        try:
            from .aprs_service import aprs_service
            await self.run_in_thread(aprs_service.disconnect)
            
            await self.send(text_data=json.dumps({
                'type': 'aprsis_disconnected',
                'message': 'Disconnected from APRS-IS',
                'timestamp': timezone.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"Error handling APRS-IS disconnect: {e}")
            await self.send_error(f"Failed to disconnect from APRS-IS: {str(e)}")
    
    async def run_in_thread(self, func, *args, **kwargs):
        """Run a blocking function in a thread"""
        import asyncio
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)
    
    async def connection_status(self, event):
        """Handle connection status broadcast"""
        await self.send(text_data=json.dumps({
            'type': 'aprsis_status',
            'connected': event['connected'],
            'error': event.get('error'),
            'timestamp': event.get('timestamp', timezone.now().isoformat())
        }))
        
    async def send_initial_data(self):
        """Send recent APRS packets"""
        packets = await self.get_recent_packets()
        await self.send(text_data=json.dumps({
            'type': 'initial_packets',
            'packets': packets,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def packet_update(self, event):
        """Handle packet update broadcast"""
        await self.send(text_data=json.dumps({
            'type': 'packet_update',
            'packet': event['packet'],
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_recent_packets(self, limit=100):
        """Get recent APRS packets"""
        packets = APRSPacket.objects.select_related().order_by('-timestamp')[:limit]
        return [self.serialize_packet(packet) for packet in packets]
    
    def serialize_packet(self, packet):
        """Serialize packet for JSON transmission"""
        return {
            'id': packet.id,
            'source_callsign': packet.source_callsign,
            'packet_type': packet.packet_type,
            'timestamp': packet.timestamp.isoformat(),
            'raw_packet': packet.raw_packet,
            'parsed_data': packet.parsed_data,
        }


class StationConsumer(BaseAPRSConsumer):
    """Consumer for station data"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.group_name = 'stations'
    
    async def send_initial_data(self):
        """Send current station list"""
        stations = await self.get_active_stations()
        await self.send(text_data=json.dumps({
            'type': 'initial_stations',
            'stations': stations,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def station_update(self, event):
        """Handle station update broadcast"""
        await self.send(text_data=json.dumps({
            'type': 'station_update',
            'station': event['station'],
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_active_stations(self):
        """Get active stations"""
        stations = Station.objects.filter(is_active=True).order_by('-last_heard')
        return [self.serialize_station(station) for station in stations]
    
    def serialize_station(self, station):
        """Serialize station for JSON transmission"""
        return {
            'id': station.id,
            'callsign': station.callsign,
            'station_type': station.station_type,
            'symbol_table': station.symbol_table,
            'symbol_code': station.symbol_code,
            'emoji_symbol': station.emoji_symbol,
            'last_heard': station.last_heard.isoformat() if station.last_heard else None,
            'latitude': station.latitude,
            'longitude': station.longitude,
            'last_comment': station.last_comment,
        }


class WeatherConsumer(BaseAPRSConsumer):
    """Consumer for weather data"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.group_name = 'weather'
    
    async def send_initial_data(self):
        """Send current weather data"""
        observations = await self.get_recent_observations()
        alerts = await self.get_active_alerts()
        
        await self.send(text_data=json.dumps({
            'type': 'initial_weather',
            'observations': observations,
            'alerts': alerts,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def weather_update(self, event):
        """Handle weather update broadcast"""
        await self.send(text_data=json.dumps({
            'type': 'weather_update',
            'data': event['data'],
            'timestamp': timezone.now().isoformat()
        }))
    
    async def weather_alert(self, event):
        """Handle weather alert broadcast"""
        await self.send(text_data=json.dumps({
            'type': 'weather_alert',
            'alert': event['alert'],
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_recent_observations(self, limit=50):
        """Get recent weather observations"""
        observations = WeatherObservation.objects.select_related('station').order_by('-observation_time')[:limit]
        return [self.serialize_observation(obs) for obs in observations]
    
    @database_sync_to_async
    def get_active_alerts(self):
        """Get active weather alerts"""
        alerts = WeatherAlert.objects.filter(is_active=True, is_cancelled=False)
        return [self.serialize_alert(alert) for alert in alerts]
    
    def serialize_observation(self, observation):
        """Serialize weather observation for JSON transmission"""
        return {
            'id': observation.id,
            'station_id': observation.station.station_id,
            'observation_time': observation.observation_time.isoformat(),
            'temperature': observation.temperature,
            'humidity': observation.humidity,
            'pressure': observation.pressure,
            'wind_speed': observation.wind_speed,
            'wind_direction': observation.wind_direction,
            'precipitation_1h': observation.precipitation_1h,
        }
    
    def serialize_alert(self, alert):
        """Serialize weather alert for JSON transmission"""
        return {
            'id': alert.id,
            'alert_id': alert.alert_id,
            'alert_type': alert.alert_type,
            'event_type': alert.event_type,
            'title': alert.title,
            'description': alert.description,
            'severity': alert.severity,
            'effective_at': alert.effective_at.isoformat(),
            'expires_at': alert.expires_at.isoformat(),
        }


class RadarConsumer(BaseAPRSConsumer):
    """Consumer for radar data"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.group_name = 'radar'
    
    async def send_initial_data(self):
        """Send current radar data"""
        sweeps = await self.get_latest_sweeps()
        await self.send(text_data=json.dumps({
            'type': 'initial_radar',
            'sweeps': sweeps,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def radar_update(self, event):
        """Handle radar update broadcast"""
        await self.send(text_data=json.dumps({
            'type': 'radar_update',
            'sweep': event['sweep'],
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_latest_sweeps(self, limit=10):
        """Get latest radar sweeps"""
        sweeps = RadarSweep.objects.select_related('site', 'product').order_by('-sweep_time')[:limit]
        return [self.serialize_sweep(sweep) for sweep in sweeps]
    
    def serialize_sweep(self, sweep):
        """Serialize radar sweep for JSON transmission"""
        return {
            'id': sweep.id,
            'site_id': sweep.site.site_id,
            'product_code': sweep.product.product_code,
            'sweep_time': sweep.sweep_time.isoformat(),
            'elevation_angle': sweep.elevation_angle,
            'data_url': sweep.data_url,
        }


class MessageConsumer(BaseAPRSConsumer):
    """Consumer for APRS messages"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.group_name = 'messages'
    
    async def send_initial_data(self):
        """Send recent messages"""
        messages = await self.get_recent_messages()
        await self.send(text_data=json.dumps({
            'type': 'initial_messages',
            'messages': messages,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def message_update(self, event):
        """Handle message update broadcast"""
        await self.send(text_data=json.dumps({
            'type': 'message_update',
            'message': event['message'],
            'timestamp': timezone.now().isoformat()
        }))
    
    async def handle_custom_message(self, data):
        """Handle custom message sending"""
        if data.get('type') == 'send_message':
            await self.send_aprs_message(data)
    
    async def send_aprs_message(self, data):
        """Send APRS message"""
        # This would integrate with the APRS message sending system
        await self.send(text_data=json.dumps({
            'type': 'message_sent',
            'message_id': data.get('message_id'),
            'status': 'sent',
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_recent_messages(self, limit=100):
        """Get recent APRS messages"""
        from packets.models import MessagePacket
        messages = MessagePacket.objects.select_related('packet').order_by('-packet__timestamp')[:limit]
        return [self.serialize_message(msg) for msg in messages]
    
    def serialize_message(self, message):
        """Serialize message for JSON transmission"""
        return {
            'id': message.id,
            'source_callsign': message.packet.source_callsign,
            'addressee': message.addressee,
            'message_text': message.message_text,
            'timestamp': message.packet.timestamp.isoformat(),
            'is_ack': message.is_ack,
            'message_number': message.message_number,
        }
