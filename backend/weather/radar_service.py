"""
Weather Radar Service

This module handles MRMS (Multi-Radar Multi-Sensor) radar data fetching and overlay generation
from NOAA's NCEP MRMS system.
"""

import os
import tempfile
import numpy as np
import matplotlib.pyplot as plt
import cartopy.crs as ccrs
import cartopy.feature as cfeature
from datetime import datetime, timedelta
import requests
import json
import base64
from io import BytesIO
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class WeatherRadarService:
    """Service for fetching and processing MRMS weather radar data"""
    
    def __init__(self):
        self.mrms_base_url = 'https://mrms.ncep.noaa.gov/data'
        self.cache_timeout = 300  # 5 minutes
        
        # MRMS product types
        self.mrms_products = {
            'reflectivity': 'MergedReflectivityQComposite',
            'velocity': 'MergedAzShear',
            'precipitation': 'PrecipRate',
            'accumulation': 'RadarOnly_QPE_01H',
            'echo_tops': 'EchoTop',
            'vil': 'VIL',
            'hail': 'MergedMHailIndex'
        }
        
    def get_available_radars(self, lat=39.7392, lon=-104.9847, max_distance_km=300):
        """
        Get available MRMS radar products for a location
        
        Args:
            lat: Latitude of center point
            lon: Longitude of center point
            max_distance_km: Maximum distance in kilometers (not used for MRMS)
            
        Returns:
            List of MRMS products available
        """
        # MRMS provides national coverage, so we return all available products
        available_products = []
        for product_key, product_name in self.mrms_products.items():
            available_products.append({
                'product_id': product_key,
                'product_name': product_name,
                'name': product_key.replace('_', ' ').title(),
                'coverage': 'National (CONUS)',
                'resolution': '1 km',
                'update_frequency': '2-5 minutes'
            })
                
        return available_products
    
    def get_latest_radar_data(self, product='reflectivity', bounds=None):
        """
        Fetch the latest MRMS radar data for a given product
        
        Args:
            product: MRMS product type ('reflectivity', 'velocity', etc.)
            bounds: Optional bounds [south, west, north, east]
            
        Returns:
            Radar data object or None if not available
        """
        # For development/testing, return mock data
        use_mock = getattr(settings, 'RADAR_USE_MOCK_DATA', True)
        if use_mock:
            logger.info(f"Using mock MRMS data for {product}")
            return self._get_mock_radar_data(product, bounds)
            
        cache_key = f"mrms_data_{product}_{bounds or 'full'}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            logger.info(f"Using cached MRMS data for {product}")
            return cached_data
            
        try:
            # Get the most recent MRMS data
            mrms_product = self.mrms_products.get(product, 'MergedReflectivityQComposite')
            
            # For now, use mock data as MRMS requires specific authentication
            # In production, you would implement proper MRMS data fetching
            mock_data = self._get_mock_radar_data(product, bounds)
            
            if mock_data:
                cache.set(cache_key, mock_data, self.cache_timeout)
                
            return mock_data
            
        except Exception as e:
            logger.error(f"Error fetching MRMS data for {product}: {e}")
            return None
    
    def _get_mrms_overlay_url(self, product='reflectivity', bounds=None):
        """
        Get NOAA radar overlay URL for map display
        
        Args:
            product: Radar product type
            bounds: Optional bounds [south, west, north, east]
            
        Returns:
            NOAA radar overlay URL or None
        """
        try:
            # Use NWS Ridge II radar images - these are reliable and working
            ridge_base = "https://radar.weather.gov/ridge/standard"
            
            # If bounds are provided, try to get a more specific regional image
            if bounds:
                south, west, north, east = bounds
                center_lat = (south + north) / 2
                center_lon = (west + east) / 2
                
                # Use NOAA WMS service for bounded radar data
                wms_url = self._get_wms_radar_url(product, bounds, center_lat, center_lon)
                if wms_url:
                    return wms_url
            
            # Use a working national radar composite
            # This is a direct link to the latest national radar composite
            radar_url = "https://radar.weather.gov/ridge/standard/CONUS_0.gif"
            
            logger.info(f"Using NWS Ridge radar URL: {radar_url}")
            return radar_url
            
        except Exception as e:
            logger.error(f"Error generating NWS Ridge radar URL: {e}")
            return None
    
    def _get_wms_radar_url(self, product, bounds, center_lat, center_lon):
        """
        Get WMS radar URL for specific bounds
        
        Args:
            product: Radar product type
            bounds: Map bounds [south, west, north, east]
            center_lat: Center latitude
            center_lon: Center longitude
            
        Returns:
            WMS radar URL or None
        """
        try:
            # Use a working WMS service - Iowa Environmental Mesonet
            wms_base = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi"
            
            south, west, north, east = bounds
            
            # Build WMS parameters
            params = {
                'SERVICE': 'WMS',
                'VERSION': '1.1.1',
                'REQUEST': 'GetMap',
                'LAYERS': 'nexrad-n0r',
                'STYLES': '',
                'SRS': 'EPSG:4326',
                'BBOX': f'{west},{south},{east},{north}',
                'WIDTH': '512',
                'HEIGHT': '512',
                'FORMAT': 'image/png',
                'TRANSPARENT': 'true'
            }
            
            # Convert params to query string
            param_string = '&'.join([f'{k}={v}' for k, v in params.items()])
            wms_url = f"{wms_base}?{param_string}"
            
            logger.info(f"Generated Iowa Mesonet WMS radar URL: {wms_url}")
            return wms_url
            
        except Exception as e:
            logger.error(f"Error generating WMS radar URL: {e}")
            return None
    
    def generate_radar_overlay(self, radar_data, bounds=None, size=(512, 512)):
        """
        Generate a radar overlay image for map display
        
        Args:
            radar_data: Processed radar data dictionary
            bounds: Map bounds [south, west, north, east]
            size: Output image size (width, height)
            
        Returns:
            Base64 encoded PNG image data
        """
        try:
            # Create figure
            fig, ax = plt.subplots(1, 1, figsize=(size[0]/100, size[1]/100), 
                                 subplot_kw={'projection': ccrs.PlateCarree()})
            
            # Set map bounds if provided
            if bounds:
                ax.set_extent(bounds, crs=ccrs.PlateCarree())
            
            # Plot reflectivity data
            reflectivity = np.array(radar_data['reflectivity'])
            lat = np.array(radar_data['latitude'])
            lon = np.array(radar_data['longitude'])
            
            # Create color map for reflectivity
            levels = np.arange(-10, 70, 5)  # dBZ levels
            colors = plt.cm.nipy_spectral(np.linspace(0, 1, len(levels)))
            
            # Plot radar data
            cs = ax.contourf(lon, lat, reflectivity, levels=levels, 
                           colors=colors, alpha=0.7, transform=ccrs.PlateCarree())
            
            # Remove axes and make transparent
            ax.set_xticks([])
            ax.set_yticks([])
            # Remove spines instead of outline
            for spine in ax.spines.values():
                spine.set_visible(False)
            
            # Save to base64 string
            buffer = BytesIO()
            plt.savefig(buffer, format='png', transparent=True, 
                       bbox_inches='tight', pad_inches=0, dpi=100)
            buffer.seek(0)
            
            # Encode as base64
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            plt.close(fig)
            buffer.close()
            
            return image_base64
            
        except Exception as e:
            logger.error(f"Error generating radar overlay: {e}")
            return None
    
    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate distance between two points in kilometers"""
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        r = 6371  # Earth's radius in kilometers
        
        return c * r
    
    def _get_mock_radar_data(self, product='reflectivity', bounds=None, size=50):
        """
        Generate mock MRMS radar data for testing
        
        Args:
            product: MRMS product type
            bounds: Optional bounds [south, west, north, east]
            size: Grid size for mock data
            
        Returns:
            Mock radar data dictionary
        """
        try:
            # Default bounds (CONUS)
            if not bounds:
                bounds = [25.0, -125.0, 50.0, -65.0]  # [south, west, north, east]
            
            south, west, north, east = bounds
            
            # Generate mock data
            np.random.seed(42)  # For consistent results
            
            # Create coordinate arrays
            lat_range = np.linspace(south, north, size)
            lon_range = np.linspace(west, east, size)
            lon_grid, lat_grid = np.meshgrid(lon_range, lat_range)
            
            # Generate mock data based on product type
            if product == 'reflectivity':
                # Create storm-like patterns
                data = np.zeros((size, size))
                for i in range(3):  # 3 "storm cells"
                    center_lat = south + np.random.uniform(0.2, 0.8) * (north - south)
                    center_lon = west + np.random.uniform(0.2, 0.8) * (east - west)
                    
                    # Create distance from center
                    dist = np.sqrt((lat_grid - center_lat)**2 + (lon_grid - center_lon)**2)
                    
                    # Create reflectivity pattern (0-70 dBZ)
                    storm_data = 35 * np.exp(-dist * 10) + np.random.normal(0, 3, (size, size))
                    storm_data[storm_data < 0] = 0
                    storm_data[storm_data > 70] = 70
                    data = np.maximum(data, storm_data)
            
            elif product == 'velocity':
                # Create velocity pattern (-30 to 30 m/s)
                data = 15 * np.sin(lat_grid * 5) * np.cos(lon_grid * 5) + np.random.normal(0, 3, (size, size))
                data = np.clip(data, -30, 30)
            
            elif product == 'precipitation':
                # Create precipitation rate pattern (0-50 mm/hr)
                data = np.zeros((size, size))
                for i in range(2):  # 2 precipitation areas
                    center_lat = south + np.random.uniform(0.3, 0.7) * (north - south)
                    center_lon = west + np.random.uniform(0.3, 0.7) * (east - west)
                    
                    dist = np.sqrt((lat_grid - center_lat)**2 + (lon_grid - center_lon)**2)
                    precip_data = 10 * np.exp(-dist * 15) + np.random.exponential(2, (size, size))
                    precip_data[precip_data > 50] = 50
                    data = np.maximum(data, precip_data)
            
            else:
                # Default pattern
                data = np.random.uniform(0, 20, (size, size))
            
            return {
                'product': product,
                'product_name': self.mrms_products.get(product, product),
                'timestamp': datetime.now().isoformat(),
                'bounds': bounds,
                'latitude': lat_grid.tolist(),
                'longitude': lon_grid.tolist(),
                'data': data.tolist(),
                'reflectivity': data.tolist() if product == 'reflectivity' else None,
                'metadata': {
                    'resolution_km': 1.0,
                    'coverage': 'CONUS',
                    'update_frequency': '2-5 minutes',
                    'data_source': 'MRMS Mock Data'
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating mock MRMS data: {e}")
            return None

# Global service instance
radar_service = WeatherRadarService()
