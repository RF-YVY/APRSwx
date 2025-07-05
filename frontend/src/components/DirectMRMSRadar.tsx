// Direct NOAA MRMS Radar Component
import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

interface DirectMRMSRadarProps {
  visible: boolean;
  opacity: number;
}

const DirectMRMSRadar: React.FC<DirectMRMSRadarProps> = ({ visible, opacity }) => {
  const map = useMap();
  const radarLayerRef = useRef<any>(null);
  const [radarStatus, setRadarStatus] = useState<string>('Loading...');

  useEffect(() => {
    if (!visible) {
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }
      setRadarStatus('Hidden');
      return;
    }

    const createDirectMRMSRadar = async () => {
      const L = (window as any).L;
      
      // Remove existing layer
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }

      setRadarStatus('Loading MRMS radar...');

      try {
        // Direct approach to NOAA MRMS - using their WMS service
        console.log('Creating direct NOAA MRMS WMS radar overlay...');
        
        // NOAA nowCOAST provides MRMS radar via WMS
        const wmsUrl = 'https://nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer';
        
        radarLayerRef.current = L.tileLayer.wms(wmsUrl, {
          layers: '1', // MRMS Reflectivity
          format: 'image/png',
          transparent: true,
          attribution: '&copy; NOAA MRMS',
          opacity: opacity,
          version: '1.3.0',
          crs: L.CRS.EPSG3857,
          time: new Date().toISOString(), // Request current time
          styles: '', // Default style
          width: 256,
          height: 256
        });

        radarLayerRef.current.on('loading', () => {
          console.log('MRMS WMS tiles loading...');
          setRadarStatus('Loading tiles...');
        });

        radarLayerRef.current.on('load', () => {
          console.log('MRMS WMS tiles loaded successfully');
          setRadarStatus('MRMS radar active');
        });

        radarLayerRef.current.on('tileerror', (e: any) => {
          console.warn('MRMS WMS tile error:', e);
          setRadarStatus('Tile error, trying fallback...');
          createFallbackRadar();
        });

        await radarLayerRef.current.addTo(map);
        console.log('NOAA MRMS WMS radar overlay added successfully');
        
      } catch (error) {
        console.error('MRMS WMS failed:', error);
        setRadarStatus('MRMS failed, trying fallback...');
        createFallbackRadar();
      }
    };

    const createFallbackRadar = async () => {
      const L = (window as any).L;
      
      try {
        // Fallback to Ridge Radar (NEXRAD)
        console.log('Creating NEXRAD Ridge radar fallback...');
        
        const ridgeUrl = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi';
        
        radarLayerRef.current = L.tileLayer.wms(ridgeUrl, {
          layers: 'nexrad-n0r-900913',
          format: 'image/png',
          transparent: true,
          attribution: '&copy; Iowa Environmental Mesonet',
          opacity: opacity,
          version: '1.1.1'
        });

        radarLayerRef.current.on('load', () => {
          console.log('NEXRAD Ridge radar loaded successfully');
          setRadarStatus('NEXRAD radar active');
        });

        radarLayerRef.current.on('tileerror', (e: any) => {
          console.warn('NEXRAD Ridge radar error:', e);
          setRadarStatus('NEXRAD failed, trying RainViewer...');
          createRainViewerFallback();
        });

        await radarLayerRef.current.addTo(map);
        console.log('NEXRAD Ridge radar overlay added as fallback');
        
      } catch (error) {
        console.error('NEXRAD Ridge radar failed:', error);
        createRainViewerFallback();
      }
    };

    const createRainViewerFallback = async () => {
      const L = (window as any).L;
      
      try {
        console.log('Creating RainViewer fallback...');
        setRadarStatus('Loading RainViewer...');
        
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();
        
        if (data.radar && data.radar.past && data.radar.past.length > 0) {
          const recentTime = data.radar.past[data.radar.past.length - 1].time;
          const radarUrl = `https://tilecache.rainviewer.com/v2/radar/${recentTime}/{z}/{x}/{y}/256/1_1.png`;
          
          radarLayerRef.current = L.tileLayer(radarUrl, {
            attribution: '&copy; RainViewer',
            opacity: opacity,
            maxZoom: 18,
            minZoom: 1
          });

          radarLayerRef.current.on('load', () => {
            setRadarStatus('RainViewer radar active');
          });

          await radarLayerRef.current.addTo(map);
          console.log('RainViewer radar overlay added as final fallback');
        } else {
          setRadarStatus('No radar data available');
        }
        
      } catch (error) {
        console.error('All radar sources failed:', error);
        setRadarStatus('All radar sources failed');
      }
    };

    createDirectMRMSRadar();

    return () => {
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }
    };
  }, [map, visible, opacity]);

  // Update opacity
  useEffect(() => {
    if (radarLayerRef.current && visible) {
      radarLayerRef.current.setOpacity(opacity);
    }
  }, [opacity, visible]);

  return (
    <div className="radar-status" style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 1000,
      display: visible ? 'block' : 'none'
    }}>
      Radar: {radarStatus}
    </div>
  );
};

export default DirectMRMSRadar;
