"""
WebSocket URL routing for real-time APRS data
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/aprs/$', consumers.APRSConsumer.as_asgi()),
    re_path(r'ws/stations/$', consumers.StationConsumer.as_asgi()),
    re_path(r'ws/weather/$', consumers.WeatherConsumer.as_asgi()),
    re_path(r'ws/radar/$', consumers.RadarConsumer.as_asgi()),
    re_path(r'ws/messages/$', consumers.MessageConsumer.as_asgi()),
]
