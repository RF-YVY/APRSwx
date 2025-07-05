from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import APRSPacket
from .serializers import APRSPacketSerializer, APRSPacketListSerializer

# Create your views here.

class PacketListView(generics.ListCreateAPIView):
    """List all packets or create a new packet"""
    queryset = APRSPacket.objects.all()
    serializer_class = APRSPacketListSerializer
    
    def get_queryset(self):
        queryset = APRSPacket.objects.all()
        
        # Filter by packet type
        packet_type = self.request.query_params.get('packet_type', None)
        if packet_type:
            queryset = queryset.filter(packet_type=packet_type)
        
        # Filter by callsign
        callsign = self.request.query_params.get('callsign', None)
        if callsign:
            queryset = queryset.filter(source_callsign__icontains=callsign)
        
        # Filter by time range
        since = self.request.query_params.get('since', None)
        if since:
            try:
                since_date = timezone.datetime.fromisoformat(since)
                queryset = queryset.filter(timestamp__gte=since_date)
            except ValueError:
                pass
        
        return queryset.order_by('-timestamp')


class PacketDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a packet"""
    queryset = APRSPacket.objects.all()
    serializer_class = APRSPacketSerializer


class RecentPacketsView(generics.ListAPIView):
    """Get recent packets (last 24 hours)"""
    serializer_class = APRSPacketListSerializer
    
    def get_queryset(self):
        last_24h = timezone.now() - timedelta(hours=24)
        return APRSPacket.objects.filter(
            timestamp__gte=last_24h
        ).order_by('-timestamp')


class PacketsByCallsignView(generics.ListAPIView):
    """Get packets by specific callsign"""
    serializer_class = APRSPacketSerializer
    
    def get_queryset(self):
        callsign = self.kwargs['callsign'].upper()
        return APRSPacket.objects.filter(
            source_callsign=callsign
        ).order_by('-timestamp')


@api_view(['GET'])
def packet_stats(request):
    """Get packet statistics"""
    total_packets = APRSPacket.objects.count()
    last_24h = timezone.now() - timedelta(hours=24)
    recent_packets = APRSPacket.objects.filter(timestamp__gte=last_24h).count()
    
    # Get packet types distribution
    packet_types = APRSPacket.objects.values('packet_type').distinct()
    type_counts = {}
    for ptype in packet_types:
        count = APRSPacket.objects.filter(packet_type=ptype['packet_type']).count()
        type_counts[ptype['packet_type']] = count
    
    return Response({
        'total_packets': total_packets,
        'recent_packets': recent_packets,
        'packet_types': type_counts,
        'timestamp': timezone.now().isoformat()
    })
