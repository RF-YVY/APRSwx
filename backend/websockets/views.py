from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# Create your views here.

@api_view(['GET'])
def websocket_status(request):
    """Get WebSocket connection status"""
    channel_layer = get_channel_layer()
    
    # Basic status info
    status_info = {
        'websocket_enabled': channel_layer is not None,
        'timestamp': timezone.now().isoformat(),
        'channel_layer_type': str(type(channel_layer)) if channel_layer else None,
    }
    
    return Response(status_info)
