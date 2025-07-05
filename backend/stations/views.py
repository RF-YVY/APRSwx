from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q
from .models import Station
from .serializers import StationSerializer, StationListSerializer


class StationListView(generics.ListCreateAPIView):
    """List all stations or create a new station"""
    queryset = Station.objects.all()
    serializer_class = StationListSerializer
    
    def get_queryset(self):
        queryset = Station.objects.all()
        
        # Filter by station type
        station_type = self.request.query_params.get('station_type', None)
        if station_type:
            queryset = queryset.filter(station_type=station_type)
        
        # Filter by callsign
        callsign = self.request.query_params.get('callsign', None)
        if callsign:
            queryset = queryset.filter(callsign__icontains=callsign)
        
        # Filter by active stations (heard within last 24 hours)
        active_only = self.request.query_params.get('active_only', 'false').lower() == 'true'
        if active_only:
            last_24h = timezone.now() - timedelta(hours=24)
            queryset = queryset.filter(last_heard__gte=last_24h)
        
        # Filter by distance from point (simplified calculation for now)
        lat = self.request.query_params.get('lat')
        lon = self.request.query_params.get('lon')
        radius_km = self.request.query_params.get('radius_km')
        
        # For now, skip distance filtering without GeoDjango
        # TODO: Implement simple distance calculation or re-enable GeoDjango
        
        return queryset.order_by('-last_heard')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Add user location for distance calculation
        context['user_lat'] = self.request.query_params.get('user_lat')
        context['user_lon'] = self.request.query_params.get('user_lon')
        return context


class StationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a station"""
    queryset = Station.objects.all()
    serializer_class = StationSerializer


class ActiveStationsView(generics.ListAPIView):
    """Get active stations (heard within last 24 hours)"""
    serializer_class = StationListSerializer
    
    def get_queryset(self):
        last_24h = timezone.now() - timedelta(hours=24)
        return Station.objects.filter(
            last_heard__gte=last_24h
        ).order_by('-last_heard')


class StationByCallsignView(generics.RetrieveAPIView):
    """Get station by callsign"""
    serializer_class = StationSerializer
    lookup_field = 'callsign'
    
    def get_object(self):
        callsign = self.kwargs['callsign'].upper()
        return Station.objects.get(callsign=callsign)


class NearbyStationsView(generics.ListAPIView):
    """Get stations within a radius of a given point"""
    serializer_class = StationListSerializer
    
    def get_queryset(self):
        lat = self.request.query_params.get('lat')
        lon = self.request.query_params.get('lon')
        radius_km = self.request.query_params.get('radius_km', '50')  # Default 50km
        
        if not lat or not lon:
            return Station.objects.none()
        
        # For now, return all stations without distance filtering
        # TODO: Implement simple distance calculation or re-enable GeoDjango
        return Station.objects.filter(
            latitude__isnull=False,
            longitude__isnull=False
        ).order_by('-last_heard')


@api_view(['GET'])
def station_stats(request):
    """Get station statistics"""
    total_stations = Station.objects.count()
    last_24h = timezone.now() - timedelta(hours=24)
    active_stations = Station.objects.filter(last_heard__gte=last_24h).count()
    
    # Get station types distribution
    station_types = Station.objects.values('station_type').distinct()
    type_counts = {}
    for stype in station_types:
        count = Station.objects.filter(station_type=stype['station_type']).count()
        type_counts[stype['station_type']] = count
    
    return Response({
        'total_stations': total_stations,
        'active_stations': active_stations,
        'station_types': type_counts,
        'timestamp': timezone.now().isoformat()
    })
