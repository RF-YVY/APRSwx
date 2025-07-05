from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Q
from .models import WeatherObservation, WeatherAlert, RadarSweep
from .serializers import (
    WeatherObservationSerializer, WeatherObservationListSerializer,
    WeatherAlertSerializer, RadarSweepSerializer
)
# Radar service imports
from .radar_service import radar_service
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
import logging

logger = logging.getLogger(__name__)


class WeatherObservationListView(generics.ListCreateAPIView):
    """List all weather observations or create a new observation"""
    queryset = WeatherObservation.objects.all()
    serializer_class = WeatherObservationListSerializer
    
    def get_queryset(self):
        queryset = WeatherObservation.objects.all()
        
        # Filter by station callsign
        station = self.request.query_params.get('station', None)
        if station:
            queryset = queryset.filter(station_callsign__icontains=station)
        
        # Filter by time range
        since = self.request.query_params.get('since', None)
        if since:
            try:
                since_date = timezone.datetime.fromisoformat(since)
                queryset = queryset.filter(observation_time__gte=since_date)
            except ValueError:
                pass
        
        # Filter recent observations only
        recent_only = self.request.query_params.get('recent_only', 'false').lower() == 'true'
        if recent_only:
            last_24h = timezone.now() - timedelta(hours=24)
            queryset = queryset.filter(observation_time__gte=last_24h)
        
        return queryset.order_by('-observation_time')


class WeatherObservationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a weather observation"""
    queryset = WeatherObservation.objects.all()
    serializer_class = WeatherObservationSerializer


class WeatherAlertListView(generics.ListCreateAPIView):
    """List all weather alerts or create a new alert"""
    queryset = WeatherAlert.objects.all()
    serializer_class = WeatherAlertSerializer
    
    def get_queryset(self):
        queryset = WeatherAlert.objects.all()
        
        # Filter by alert type
        alert_type = self.request.query_params.get('alert_type', None)
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        
        # Filter by severity
        severity = self.request.query_params.get('severity', None)
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter active alerts only
        active_only = self.request.query_params.get('active_only', 'false').lower() == 'true'
        if active_only:
            now = timezone.now()
            queryset = queryset.filter(
                effective_time__lte=now,
                expires_time__gte=now
            )
        
        return queryset.order_by('-effective_time')


class WeatherAlertDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a weather alert"""
    queryset = WeatherAlert.objects.all()
    serializer_class = WeatherAlertSerializer


class RadarDataListView(generics.ListCreateAPIView):
    """List all radar data or create new radar data"""
    queryset = RadarSweep.objects.all()
    serializer_class = RadarSweepSerializer
    
    def get_queryset(self):
        queryset = RadarSweep.objects.all()
        
        # Filter by site
        site = self.request.query_params.get('site', None)
        if site:
            queryset = queryset.filter(site__site_id=site)
        
        # Filter by product type
        product = self.request.query_params.get('product', None)
        if product:
            queryset = queryset.filter(product__code=product)
        
        # Filter by time range
        since = self.request.query_params.get('since', None)
        if since:
            try:
                since_date = timezone.datetime.fromisoformat(since)
                queryset = queryset.filter(scan_time__gte=since_date)
            except ValueError:
                pass
        
        return queryset.order_by('-scan_time')


class RadarDataDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete radar data"""
    queryset = RadarSweep.objects.all()
    serializer_class = RadarSweepSerializer


@api_view(['GET'])
def weather_stats(request):
    """Get weather statistics"""
    total_observations = WeatherObservation.objects.count()
    active_alerts = WeatherAlert.objects.filter(
        effective_time__lte=timezone.now(),
        expires_time__gte=timezone.now()
    ).count()
    
    # Get recent observations (last 24 hours)
    last_24h = timezone.now() - timedelta(hours=24)
    recent_observations = WeatherObservation.objects.filter(
        observation_time__gte=last_24h
    ).count()
    
    # Get radar data count
    radar_count = RadarSweep.objects.count()
    
    return Response({
        'total_observations': total_observations,
        'recent_observations': recent_observations,
        'active_alerts': active_alerts,
        'radar_data_count': radar_count,
        'timestamp': timezone.now().isoformat()
    })


class RadarSitesView(APIView):
    """Get available MRMS radar products for a location"""
    
    def get(self, request):
        try:
            lat = float(request.GET.get('lat', 39.7392))  # Default to Denver
            lon = float(request.GET.get('lon', -104.9847))
            max_distance = float(request.GET.get('max_distance', 300))
            
            products = radar_service.get_available_radars(lat, lon, max_distance)
            
            return Response({
                'radar_products': products,
                'center_lat': lat,
                'center_lon': lon,
                'coverage': 'CONUS (National)',
                'data_source': 'MRMS (Multi-Radar Multi-Sensor)'
            })
            
        except Exception as e:
            logger.error(f"Error fetching MRMS products: {e}")
            return Response(
                {'error': 'Failed to fetch MRMS products'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(cache_page(300), name='dispatch')  # Cache for 5 minutes
class RadarDataView(APIView):
    """Get MRMS radar data for a specific product"""
    
    def get(self, request, product_id):
        try:
            # Get bounds from request
            south = float(request.GET.get('south', 25.0))
            west = float(request.GET.get('west', -125.0))
            north = float(request.GET.get('north', 50.0))
            east = float(request.GET.get('east', -65.0))
            bounds = [south, west, north, east] if any([
                request.GET.get('south'), request.GET.get('west'), 
                request.GET.get('north'), request.GET.get('east')
            ]) else None
            
            logger.info(f"Fetching MRMS data for product: {product_id}")
            
            radar_data = radar_service.get_latest_radar_data(product_id, bounds)
            
            if radar_data:
                return Response({
                    'success': True,
                    'product_id': product_id,
                    'product_name': radar_data.get('product_name', product_id),
                    'data': radar_data
                })
            else:
                return Response({
                    'success': False,
                    'message': f'No MRMS data available for {product_id}'
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Error fetching MRMS data for {product_id}: {e}")
            return Response(
                {'error': f'Failed to fetch MRMS data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(cache_page(300), name='dispatch')  # Cache for 5 minutes
class RadarOverlayView(APIView):
    """Generate MRMS radar overlay image for map display"""
    
    def get(self, request, product_id):
        try:
            # Get bounds from request
            south = float(request.GET.get('south', 25.0))
            west = float(request.GET.get('west', -125.0))
            north = float(request.GET.get('north', 50.0))
            east = float(request.GET.get('east', -65.0))
            bounds = [south, west, north, east]
            
            # Get image size
            width = int(request.GET.get('width', 512))
            height = int(request.GET.get('height', 512))
            size = (width, height)
            
            logger.info(f"Generating NOAA WMS overlay for product: {product_id}")
            
            # Get NOAA WMS URL directly
            overlay_url = radar_service._get_mrms_overlay_url(product_id, bounds)
            
            if overlay_url:
                return Response({
                    'success': True,
                    'product_id': product_id,
                    'timestamp': datetime.now().isoformat(),
                    'bounds': bounds,
                    'size': size,
                    'overlay_url': overlay_url,
                    'format': 'png',
                    'source': 'NOAA WMS',
                    'wms_service': 'mapservices.weather.noaa.gov'
                })
            else:
                # Fall back to generating overlay from mock data
                radar_data = radar_service.get_latest_radar_data(product_id, bounds)
                
                if not radar_data:
                    return Response({
                        'success': False,
                        'message': f'No MRMS data available for {product_id}'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                # Generate overlay
                overlay_image = radar_service.generate_radar_overlay(radar_data, bounds, size)
                
                if overlay_image:
                    return Response({
                        'success': True,
                        'product_id': product_id,
                        'timestamp': radar_data['timestamp'],
                        'bounds': bounds,
                        'size': size,
                        'image_data': overlay_image,
                        'format': 'png',
                        'encoding': 'base64'
                    })
                else:
                    return Response({
                        'success': False,
                        'message': 'Failed to generate MRMS overlay'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error generating MRMS overlay for {product_id}: {e}")
            return Response(
                {'error': f'Failed to generate MRMS overlay: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
