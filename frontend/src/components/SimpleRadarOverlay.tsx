// MRMS Radar Overlay Component
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { mrmsRadarService } from '../services/mrmsRadarService';

interface SimpleRadarOverlayProps {
  visible: boolean;
  opacity: number;
}

const SimpleRadarOverlay: React.FC<SimpleRadarOverlayProps> = ({ visible, opacity }) => {
  const map = useMap();
  const radarLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }
      return;
    }

    // Create NOAA MRMS radar reflectivity overlay
    const createRadarOverlay = async () => {
      const L = (window as any).L;
      
      // Remove existing layer
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }

      try {
        // First try to get NOAA MRMS radar reflectivity data
        console.log('Fetching NOAA MRMS radar reflectivity data...');
        
        const mrmsData = await mrmsRadarService.getLatestReflectivity();
        
        if (mrmsData) {
          console.log('MRMS data found:', mrmsData);
          
          radarLayerRef.current = mrmsRadarService.createMRMSLayer(mrmsData, L, opacity);
          
          radarLayerRef.current.on('load', () => {
            console.log('NOAA MRMS radar reflectivity loaded successfully');
          });

          radarLayerRef.current.on('error', (e: any) => {
            console.warn('NOAA MRMS radar image error:', e);
            createWMSFallback();
          });

          await radarLayerRef.current.addTo(map);
          console.log('NOAA MRMS radar overlay added successfully');
          return;
        } else {
          console.log('No MRMS data available, trying WMS service...');
          createWMSFallback();
        }
        
      } catch (error) {
        console.warn('NOAA MRMS radar failed:', error);
        createWMSFallback();
      }
    };

    // Fallback to NOAA WMS service
    const createWMSFallback = async () => {
      const L = (window as any).L;
      
      try {
        console.log('Creating NOAA WMS radar service...');
        
        radarLayerRef.current = mrmsRadarService.createWMSLayer(L, opacity);
        
        radarLayerRef.current.on('loading', () => {
          console.log('NOAA WMS radar loading...');
        });

        radarLayerRef.current.on('load', () => {
          console.log('NOAA WMS radar loaded successfully');
        });

        radarLayerRef.current.on('tileerror', (e: any) => {
          console.warn('NOAA WMS radar tile error:', e);
          createRainViewerFallback();
        });

        await radarLayerRef.current.addTo(map);
        console.log('NOAA WMS radar overlay added successfully');
        
      } catch (error) {
        console.warn('NOAA WMS radar failed:', error);
        createRainViewerFallback();
      }
    };

    // Final fallback to RainViewer
    const createRainViewerFallback = async () => {
      const L = (window as any).L;
      
      try {
        console.log('Creating RainViewer radar fallback...');
        
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        
        if (data.radar && data.radar.past && data.radar.past.length > 0) {
          const recentTime = data.radar.past[data.radar.past.length - 1].time;
          const radarUrl = `https://tilecache.rainviewer.com/v2/radar/${recentTime}/{z}/{x}/{y}/256/1_1.png`;
          
          radarLayerRef.current = L.tileLayer(radarUrl, {
            attribution: '&copy; RainViewer',
            opacity: opacity,
            maxZoom: 18,
            minZoom: 1,
            crossOrigin: true
          });

          await radarLayerRef.current.addTo(map);
          console.log('RainViewer radar overlay added as final fallback');
        }
      } catch (error) {
        console.error('All radar sources failed:', error);
      }
    };

    createRadarOverlay();

    return () => {
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }
    };
  }, [map, visible, opacity]);

  return null;
};

export default SimpleRadarOverlay;
