import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useWebSocket } from '../context/WebSocketContext';
import { APRSStation, WeatherData } from '../types/aprs';
import { RADAR_PRODUCTS, RadarProductType } from '../types/radar';
import { alternativeWeatherService, WeatherAlert } from '../services/alternativeWeatherService';
import LightningOverlay from './LightningOverlay';
import DirectMRMSRadar from './DirectMRMSRadar';
import 'leaflet/dist/leaflet.css';

// Emoji markers for different station types
const getStationEmoji = (symbolTable: string, symbolCode: string): string => {
  const symbolKey = `${symbolTable}${symbolCode}`;
  
  // Common APRS symbols to emoji mapping
  const symbolMap: { [key: string]: string } = {
    '/>': '🚗', // Car
    '/k': '🚚', // Truck
    '/j': '🚓', // Police car
    '/f': '🚒', // Fire truck
    '/a': '🚑', // Ambulance
    '/s': '🚢', // Ship
    '/Y': '⛵', // Sailing yacht
    '/^': '✈️', // Aircraft
    '/g': '🚁', // Helicopter
    '/-': '🏠', // House
    '/r': '📻', // Radio station
    '/&': '🏔️', // Mountain
    '/;': '🏥', // Hospital
    '/h': '🏨', // Hotel
    '/K': '🏫', // School
    '/U': '🚌', // Bus
    '/u': '🚐', // Van
    '/=': '🚂', // Train
    '/O': '🎈', // Balloon
    '/w': '🌊', // Water station
    '/W': '⛽', // Weather station
    '/_': '🌡️', // Weather station
    '/I': '🏭', // Industry
    '/R': '🍴', // Restaurant
    '/L': '💡', // Lighthouse
    '/M': '📱', // Mobile
    '/P': '👮', // Police
    '/F': '🚒', // Fire department
    '/H': '🏥', // Hospital
    '/S': '🏪', // Store
    '/T': '☎️', // Telephone
    '/X': '❌', // X symbol
    '/!': '❗', // Emergency
    '/?': '❓', // Question
    '/+': '➕', // Plus
    '/0': '⭕', // Circle
    '/1': '1️⃣', // Number 1
    '/2': '2️⃣', // Number 2
    '/3': '3️⃣', // Number 3
    '/4': '4️⃣', // Number 4
    '/5': '5️⃣', // Number 5
    '/6': '6️⃣', // Number 6
    '/7': '7️⃣', // Number 7
    '/8': '8️⃣', // Number 8
    '/9': '9️⃣', // Number 9
  };
  
  return symbolMap[symbolKey] || '📍'; // Default to pin emoji
};

const createEmojiIcon = (emoji: string): DivIcon => {
  return new DivIcon({
    html: `<div style="font-size: 24px; text-align: center; line-height: 1;">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: 'emoji-marker'
  });
};

interface RadarOverlayProps {
  radarData: any[];
  visible: boolean;
  opacity?: number;
  product?: string;
}

// RadarOverlay component - currently unused
/* 
const RadarOverlay: React.FC<RadarOverlayProps> = ({ 
  radarData, 
  visible, 
  opacity = 0.6,
  product = 'reflectivity' 
}) => {
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

    // Create radar overlay with direct approach
    const createRadarOverlay = async () => {
      try {
        // Remove existing layer
        if (radarLayerRef.current) {
          map.removeLayer(radarLayerRef.current);
          radarLayerRef.current = null;
        }

        const L = (window as any).L;
        
        // Try multiple radar sources in order
        const radarSources = [
          {
            name: 'RainViewer',
            type: 'dynamic',
            getUrl: async () => {
              try {
                const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
                const data = await response.json();
                const recentTime = data.radar.past[data.radar.past.length - 1].time;
                return `https://tilecache.rainviewer.com/v2/radar/${recentTime}/{z}/{x}/{y}/256/1_1.png`;
              } catch (error) {
                throw new Error('RainViewer API failed');
              }
            }
          },
          {
            name: 'OpenWeatherMap',
            type: 'static',
            getUrl: async () => 'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png'
          },
          {
            name: 'NOAA Radar',
            type: 'wms',
            getUrl: async () => 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows'
          }
        ];

        let radarCreated = false;

        for (const source of radarSources) {
          try {
            console.log(`Trying ${source.name} radar...`);
            
            const url = await source.getUrl();
            
            if (source.type === 'wms') {
              radarLayerRef.current = L.tileLayer.wms(url, {
                layers: 'conus_bref_qcd',
                format: 'image/png',
                transparent: true,
                attribution: '&copy; NOAA',
                opacity: opacity,
                version: '1.3.0',
                crs: L.CRS.EPSG4326
              });
            } else {
              radarLayerRef.current = L.tileLayer(url, {
                attribution: source.name === 'RainViewer' ? '&copy; RainViewer' : '&copy; OpenWeatherMap',
                opacity: opacity,
                maxZoom: 18,
                minZoom: 1,
                updateWhenIdle: false,
                updateWhenZooming: false,
                keepBuffer: 2
              });
            }

            // Test if the layer works by adding it
            radarLayerRef.current.addTo(map);
            
            // Add event listeners
            radarLayerRef.current.on('loading', () => {
              console.log(`${source.name} radar tiles loading...`);
            });
            
            radarLayerRef.current.on('load', () => {
              console.log(`${source.name} radar tiles loaded successfully`);
            });
            
            radarLayerRef.current.on('tileerror', (e: any) => {
              console.warn(`${source.name} radar tile error:`, e);
            });

            console.log(`${source.name} radar overlay created successfully`);
            radarCreated = true;
            break;
            
          } catch (error) {
            console.warn(`${source.name} radar failed:`, error);
            if (radarLayerRef.current) {
              map.removeLayer(radarLayerRef.current);
              radarLayerRef.current = null;
            }
          }
        }

        if (!radarCreated) {
          console.error('All radar sources failed');
          // Create a test overlay to show the system is working
          radarLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Test Overlay',
            opacity: 0.3,
            maxZoom: 18,
            minZoom: 1
          });
          radarLayerRef.current.addTo(map);
          console.log('Test overlay added to verify layer system works');
        }

      } catch (error) {
        console.error('Error creating radar overlay:', error);
      }
    };

    createRadarOverlay();

    // Cleanup
    return () => {
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }
    };
  }, [map, visible, opacity]);

  // Update radar opacity when opacity state changes
  useEffect(() => {
    if (radarLayerRef.current && visible) {
      radarLayerRef.current.setOpacity(opacity);
    }
  }, [opacity, visible]);

  return null;
};
*/

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface APRSMapProps {
  className?: string;
  userLocation?: UserLocation | null;
  onMapClick?: (lat: number, lng: number) => void;
  mapClickEnabled?: boolean;
  focusStation?: APRSStation | null;
}

const APRSMap: React.FC<APRSMapProps> = ({ 
  className, 
  userLocation, 
  onMapClick, 
  mapClickEnabled,
  focusStation 
}) => {
  const { stations, weatherData, radarData } = useWebSocket();
  const [showRadar, setShowRadar] = useState(false);
  const [radarOpacity, setRadarOpacity] = useState(0.6);
  const [radarProduct, setRadarProduct] = useState<RadarProductType>(RADAR_PRODUCTS.REFLECTIVITY);
  const [selectedStation, setSelectedStation] = useState<APRSStation | null>(null);
  const [radarLoading] = useState(false);
  const [showWeatherPolygons, setShowWeatherPolygons] = useState(true);
  const [showLightning, setShowLightning] = useState(true);
  const [weatherPolygons, setWeatherPolygons] = useState<WeatherAlert[]>([]);
  // Lightning data is now handled by LightningOverlay component
  const mapRef = useRef<any>(null);

  // Default map center (can be configured)
  const defaultCenter: [number, number] = userLocation ? 
    [userLocation.latitude, userLocation.longitude] : 
    [39.8283, -98.5795]; // Geographic center of US
  const defaultZoom = userLocation ? 10 : 6;

  const handleStationClick = (station: APRSStation) => {
    setSelectedStation(station);
  };

  const formatLastSeen = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Handle focusing on a specific station
  useEffect(() => {
    if (focusStation && focusStation.latitude && focusStation.longitude && mapRef.current) {
      mapRef.current.setView([focusStation.latitude, focusStation.longitude], 12);
      setSelectedStation(focusStation);
    }
  }, [focusStation]);

  // Map click handler component
  const MapClickHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      if (mapClickEnabled && onMapClick) {
        const handleClick = (e: any) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        };
        
        map.on('click', handleClick);
        
        return () => {
          map.off('click', handleClick);
        };
      }
    }, [map]);
    
    return null;
  };

  // User location marker component
  const UserLocationMarker = () => {
    if (!userLocation) return null;
    
    const userIcon = new DivIcon({
      html: `<div style="
        width: 20px; 
        height: 20px; 
        background: #4285f4; 
        border: 3px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      className: 'user-location-marker'
    });
    
    return (
      <Marker
        position={[userLocation.latitude, userLocation.longitude]}
        icon={userIcon}
      >
        <Popup>
          <div className="user-location-popup">
            <h4>📍 Your Location</h4>
            <p>{userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</p>
          </div>
        </Popup>
      </Marker>
    );
  };

  // Load weather overlays on component mount
  useEffect(() => {
    const loadWeatherOverlays = async () => {
      try {
        await alternativeWeatherService.initialize();
        setWeatherPolygons(alternativeWeatherService.getWeatherAlerts());
        // Remove old lightning data - now using LightningOverlay component
      } catch (error) {
        console.error('Error loading weather overlays:', error);
      }
    };

    loadWeatherOverlays();

    // Update weather overlays every 2 minutes
    const intervalId = setInterval(() => {
      setWeatherPolygons(alternativeWeatherService.getWeatherAlerts());
      // Remove old lightning data - now using LightningOverlay component
    }, 2 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={`aprs-map ${className || ''} ${mapClickEnabled ? 'map-click-enabled' : ''}`}>
      <div className="map-controls">
        <div className="control-group">
          <h4>Weather Overlays</h4>
          <label className="control-label">
            <input
              type="checkbox"
              checked={showWeatherPolygons}
              onChange={(e) => setShowWeatherPolygons(e.target.checked)}
            />
            Warning Polygons ({weatherPolygons.length})
          </label>
          <label className="control-label">
            <input
              type="checkbox"
              checked={showLightning}
              onChange={(e) => setShowLightning(e.target.checked)}
            />
            Lightning (Real-time)
          </label>
        </div>
        <div className="control-group">
          <h4>Radar</h4>
          <label className="control-label">
            <input
              type="checkbox"
              checked={showRadar}
              onChange={(e) => setShowRadar(e.target.checked)}
            />
            Show Radar
          </label>
          {showRadar && (
            <div className="radar-controls">
              <div className="radar-opacity-control">
                <label>Opacity: {Math.round(radarOpacity * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={radarOpacity}
                  onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <DirectMRMSRadar 
          visible={showRadar} 
          opacity={radarOpacity}
        />
        
        <LightningOverlay 
          visible={showLightning}
          opacity={0.8}
          maxAge={60}
          showStrength={true}
        />
        
        <MapClickHandler />
        <UserLocationMarker />
        
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
        >
          {stations.filter(station => station.latitude !== null && station.longitude !== null).map((station) => (
            <Marker
              key={station.id}
              position={[station.latitude!, station.longitude!]}
              icon={createEmojiIcon(getStationEmoji(station.symbol_table, station.symbol_code))}
              eventHandlers={{
                click: () => handleStationClick(station),
              }}
            >
              {/* Remove Leaflet popup to avoid duplicate with station detail panel */}
            </Marker>
          ))}
        </MarkerClusterGroup>
        
        {/* Weather Warning Polygons */}
        {showWeatherPolygons && weatherPolygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.coordinates.map((coord: any) => [coord.lat, coord.lng])}
            pathOptions={{
              color: polygon.color,
              fillColor: polygon.color,
              fillOpacity: 0.3,
              weight: 2,
              opacity: 0.8
            }}
          >
            <Popup>
              <div className="weather-polygon-popup">
                <h4>{polygon.title}</h4>
                <p>{polygon.headline}</p>
                <p>{polygon.description}</p>
                <p><strong>Severity:</strong> {polygon.severity.toUpperCase()}</p>
                <p><strong>Areas:</strong> {polygon.areas.join(', ')}</p>
                <p><strong>Expires:</strong> {polygon.expires.toLocaleString()}</p>
              </div>
            </Popup>
          </Polygon>
        ))}
        
        <MapClickHandler />
        <UserLocationMarker />
      </MapContainer>
      
      {/* Weather Overlay Legend */}
      {(showRadar || showLightning) && (
        <div className="weather-legend">
          <h4>Weather Overlays</h4>
          {showRadar && (
            <div className="legend-item radar">
              <div className="legend-color"></div>
              <span>Radar Reflectivity</span>
            </div>
          )}
          {showLightning && (
            <div className="legend-item lightning">
              <div className="legend-color"></div>
              <span>Lightning Strikes</span>
            </div>
          )}
          <div style={{ fontSize: '10px', marginTop: '5px', color: 'var(--text-secondary)' }}>
            Lightning: 🟠 Positive CG, 🔵 Negative CG, 🟣 IC, 🩷 CC
          </div>
        </div>
      )}

      {/* Radar Controls */}
      {showRadar && (
        <div className="radar-controls">
          <label>
            Radar Opacity: {Math.round(radarOpacity * 100)}%
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={radarOpacity}
              onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
            />
          </label>
          <button onClick={() => setShowRadar(false)}>
            Hide Radar
          </button>
        </div>
      )}

      {selectedStation && (
        <div className="station-detail-panel">
          <div className="panel-header">
            <h3>{selectedStation.callsign}</h3>
            <button 
              className="close-btn"
              onClick={() => setSelectedStation(null)}
            >
              ×
            </button>
          </div>
          <div className="panel-content">
            <div className="station-details">
              <p><strong>Position:</strong> {selectedStation.latitude!.toFixed(6)}, {selectedStation.longitude!.toFixed(6)}</p>
              <p><strong>Symbol:</strong> {getStationEmoji(selectedStation.symbol_table, selectedStation.symbol_code)} ({selectedStation.symbol_table}{selectedStation.symbol_code})</p>
              <p><strong>Last Seen:</strong> {formatLastSeen(selectedStation.last_heard)}</p>
              <p><strong>Packet Count:</strong> {selectedStation.packet_count}</p>
              {selectedStation.comment && <p><strong>Comment:</strong> {selectedStation.comment}</p>}
              {selectedStation.course !== null && selectedStation.speed !== null && (
                <p><strong>Course/Speed:</strong> {selectedStation.course}° / {selectedStation.speed} mph</p>
              )}
              {selectedStation.altitude !== null && (
                <p><strong>Altitude:</strong> {selectedStation.altitude} ft</p>
              )}
              
              {/* Show weather data if available */}
              {weatherData.find((w: WeatherData) => w.station_id === selectedStation.id.toString()) && (
                <div className="weather-info">
                  <h4>Weather Data</h4>
                  {(() => {
                    const weather = weatherData.find((w: WeatherData) => w.station_id === selectedStation.id.toString());
                    return weather ? (
                      <div>
                        {weather.temperature !== null && <p>🌡️ Temperature: {weather.temperature}°F</p>}
                        {weather.humidity !== null && <p>💧 Humidity: {weather.humidity}%</p>}
                        {weather.pressure !== null && <p>📊 Pressure: {weather.pressure} hPa</p>}
                        {weather.wind_speed !== null && <p>💨 Wind Speed: {weather.wind_speed} mph</p>}
                        {weather.wind_direction !== null && <p>🧭 Wind Direction: {weather.wind_direction}°</p>}
                        {weather.rainfall !== null && <p>🌧️ Rainfall: {weather.rainfall}"</p>}
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APRSMap;
