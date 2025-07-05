import React, { useState, useMemo, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useSettings } from '../context/SettingsContext';
import { weatherAlertsService, WeatherAlert } from '../services/weatherAlertsService';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'manual' | 'map';
}

interface WeatherPanelProps {
  className?: string;
  onFocusLocation?: (location: UserLocation) => void;
}

const WeatherPanel: React.FC<WeatherPanelProps> = ({ className, onFocusLocation }) => {
  const { weatherData } = useWebSocket();
  const { settings } = useSettings();
  const [selectedTab, setSelectedTab] = useState<'observations' | 'alerts'>('observations');
  const [sortBy, setSortBy] = useState<'station' | 'time' | 'temperature'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [alertTypeFilters, setAlertTypeFilters] = useState<{[type: string]: boolean}>({});
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const toggleAlertExpansion = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  // Load weather alerts when component mounts or location changes
  useEffect(() => {
    const loadWeatherAlerts = async () => {
      if (settings?.location) {
        setAlertsLoading(true);
        try {
          const alerts = await weatherAlertsService.getAlertsForLocation(
            settings.location.latitude,
            settings.location.longitude
          );
          setWeatherAlerts(alerts);
        } catch (error) {
          console.error('Error loading weather alerts:', error);
        } finally {
          setAlertsLoading(false);
        }
      } else {
        // Load national severe alerts if no location is set
        setAlertsLoading(true);
        try {
          const alerts = await weatherAlertsService.getNationalAlerts();
          setWeatherAlerts(alerts);
        } catch (error) {
          console.error('Error loading national alerts:', error);
        } finally {
          setAlertsLoading(false);
        }
      }
    };

    loadWeatherAlerts();
  }, [settings?.location]);

  const formatTemperature = (temp: number | null): string => {
    if (temp === null) return 'N/A';
    return `${temp.toFixed(1)}°F`;
  };

  const formatPressure = (pressure: number | null): string => {
    if (pressure === null) return 'N/A';
    return `${pressure.toFixed(1)} hPa`;
  };

  const formatWindSpeed = (speed: number | null): string => {
    if (speed === null) return 'N/A';
    return `${speed.toFixed(1)} mph`;
  };

  const formatWindDirection = (direction: number | null): string => {
    if (direction === null) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(direction / 22.5) % 16;
    return `${directions[index]} (${direction}°)`;
  };

  const formatHumidity = (humidity: number | null): string => {
    if (humidity === null) return 'N/A';
    return `${humidity.toFixed(0)}%`;
  };

  const formatRainfall = (rainfall: number | null): string => {
    if (rainfall === null) return 'N/A';
    return `${rainfall.toFixed(2)}"`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'minor': return '#ffd700';
      case 'moderate': return '#ffa500';
      case 'severe': return '#ff4500';
      case 'extreme': return '#ff0000';
      default: return '#888';
    }
  };

  const getSeverityEmoji = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'minor': return '⚠️';
      case 'moderate': return '⚠️';
      case 'severe': return '🚨';
      case 'extreme': return '🚨';
      default: return '📢';
    }
  };

  // Sort weather observations
  const sortedObservations = useMemo(() => {
    const sorted = [...weatherData].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'station':
          comparison = a.station_id.localeCompare(b.station_id);
          break;
        case 'time':
          comparison = new Date(b.observation_time).getTime() - new Date(a.observation_time).getTime();
          break;
        case 'temperature':
          const tempA = a.temperature || -999;
          const tempB = b.temperature || -999;
          comparison = tempB - tempA;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [weatherData, sortBy, sortOrder]);


  // Get all unique alert types for filter UI
  const allAlertTypes = useMemo(() => {
    const types = new Set<string>();
    weatherAlerts.forEach(a => types.add(a.event_type));
    return Array.from(types).sort();
  }, [weatherAlerts]);

  // Update filters when new alert types appear
  useEffect(() => {
    setAlertTypeFilters(prev => {
      const updated = { ...prev };
      allAlertTypes.forEach(type => {
        if (!(type in updated)) updated[type] = true;
      });
      // Remove types that no longer exist
      Object.keys(updated).forEach(type => {
        if (!allAlertTypes.includes(type)) delete updated[type];
      });
      return updated;
    });
  }, [allAlertTypes]);

  // Filter and sort alerts
  const filteredSortedAlerts = useMemo(() => {
    const filtered = weatherAlerts.filter(a => alertTypeFilters[a.event_type]);
    return filtered.sort((a, b) => {
      const timeA = new Date(a.effective_at).getTime();
      const timeB = new Date(b.effective_at).getTime();
      return timeB - timeA;
    });
  }, [weatherAlerts, alertTypeFilters]);

  const handleSort = (field: 'station' | 'time' | 'temperature') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: 'station' | 'time' | 'temperature') => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleAlertClick = async (alert: WeatherAlert) => {
    // Check if alert is being expanded (not collapsed)
    const isExpanding = !expandedAlerts.has(alert.id);
    
    // Toggle expansion
    toggleAlertExpansion(alert.id);
    
    // Focus map on alert location only when expanding (not collapsing)
    if (isExpanding && onFocusLocation && alert.areas.length > 0) {
      try {
        // Use the first area for geocoding
        const area = alert.areas[0];
        
        // Simple geocoding using Nominatim (OpenStreetMap)
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(area)}&countrycodes=us&limit=1`;
        
        const response = await fetch(geocodeUrl);
        const data = await response.json();
        
        if (data.length > 0) {
          const location: UserLocation = {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
            source: 'map'
          };
          onFocusLocation(location);
        }
      } catch (error) {
        console.error('Error geocoding alert location:', error);
      }
    }
  };

  return (
    <div className={`weather-panel ${className || ''}`}>
      <div className="weather-panel-header">
        <h3>Weather</h3>
        <div className="weather-tabs">
          <button
            className={`tab-btn ${selectedTab === 'observations' ? 'active' : ''}`}
            onClick={() => setSelectedTab('observations')}
          >
            🌡️ Observations ({weatherData.length})
          </button>
          <button
            className={`tab-btn ${selectedTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setSelectedTab('alerts')}
          >
            🚨 Alerts ({weatherAlerts.length})
          </button>
        </div>
      </div>

      <div className="weather-panel-content">
        {selectedTab === 'observations' && (
          <div className="weather-observations">
            {weatherData.length === 0 ? (
              <div className="no-data">
                <p>No weather observations available</p>
              </div>
            ) : (
              <>
                <div className="sort-controls">
                  <span>Sort by:</span>
                  <button 
                    className={`sort-btn ${sortBy === 'station' ? 'active' : ''}`}
                    onClick={() => handleSort('station')}
                  >
                    Station {getSortIcon('station')}
                  </button>
                  <button 
                    className={`sort-btn ${sortBy === 'time' ? 'active' : ''}`}
                    onClick={() => handleSort('time')}
                  >
                    Time {getSortIcon('time')}
                  </button>
                  <button 
                    className={`sort-btn ${sortBy === 'temperature' ? 'active' : ''}`}
                    onClick={() => handleSort('temperature')}
                  >
                    Temperature {getSortIcon('temperature')}
                  </button>
                </div>

                <div className="observation-list">
                  {sortedObservations.map((obs) => (
                    <div key={obs.id} className="observation-item">
                      <div className="observation-header">
                        <div className="station-info">
                          <span className="station-id">📍 {obs.station_id}</span>
                          <span className="observation-time">
                            {getTimeAgo(obs.observation_time)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="observation-data">
                        <div className="weather-grid">
                          <div className="weather-item">
                            <span className="weather-icon">🌡️</span>
                            <span className="weather-label">Temp:</span>
                            <span className="weather-value">{formatTemperature(obs.temperature)}</span>
                          </div>
                          
                          <div className="weather-item">
                            <span className="weather-icon">💧</span>
                            <span className="weather-label">Humidity:</span>
                            <span className="weather-value">{formatHumidity(obs.humidity)}</span>
                          </div>
                          
                          <div className="weather-item">
                            <span className="weather-icon">📊</span>
                            <span className="weather-label">Pressure:</span>
                            <span className="weather-value">{formatPressure(obs.pressure)}</span>
                          </div>
                          
                          <div className="weather-item">
                            <span className="weather-icon">💨</span>
                            <span className="weather-label">Wind:</span>
                            <span className="weather-value">{formatWindSpeed(obs.wind_speed)}</span>
                          </div>
                          
                          <div className="weather-item">
                            <span className="weather-icon">🧭</span>
                            <span className="weather-label">Direction:</span>
                            <span className="weather-value">{formatWindDirection(obs.wind_direction)}</span>
                          </div>
                          
                          <div className="weather-item">
                            <span className="weather-icon">🌧️</span>
                            <span className="weather-label">Rain:</span>
                            <span className="weather-value">{formatRainfall(obs.rainfall || obs.precipitation_1h)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="weather-alerts">
            {alertsLoading ? (
              <div className="loading">
                <p>Loading weather alerts...</p>
              </div>
            ) : weatherAlerts.length === 0 ? (
              <div className="no-data">
                <p>No active weather alerts</p>
                <p className="sub-text">
                  {settings?.location 
                    ? 'No alerts for your location' 
                    : 'Set your location to see local alerts'}
                </p>
              </div>
            ) : (
              <>
                <div className="alert-filter-bar">
                  <span>Filter alerts:</span>
                  {allAlertTypes.map(type => (
                    <label key={type} style={{ marginRight: 10 }}>
                      <input
                        type="checkbox"
                        checked={alertTypeFilters[type] ?? true}
                        onChange={e => setAlertTypeFilters(f => ({ ...f, [type]: e.target.checked }))}
                      />
                      {type}
                    </label>
                  ))}
                </div>
                <div className="alert-list-container">
                  <div className="alert-list">
                    {filteredSortedAlerts.length === 0 ? (
                      <div className="no-data"><p>No alerts match your filter</p></div>
                    ) : (
                      filteredSortedAlerts.map((alert) => (
                        <div key={alert.id} className="alert-item">
                          <div 
                            className="alert-header clickable"
                            onClick={() => handleAlertClick(alert)}
                          >
                            <div className="alert-summary">
                              <div className="alert-type" style={{ color: getSeverityColor(alert.severity) }}>
                                {getSeverityEmoji(alert.severity)} {alert.event_type}
                              </div>
                              <div className="alert-location">
                                {alert.areas.length > 0 ? alert.areas.join(', ') : 'Multiple Areas'}
                              </div>
                              <div className="alert-severity">
                                {alert.severity.toUpperCase()}
                              </div>
                            </div>
                            <div className="alert-expand-icon">
                              {expandedAlerts.has(alert.id) ? '▼' : '▶'}
                            </div>
                          </div>
                          {expandedAlerts.has(alert.id) && (
                            <div className="alert-content">
                              <h4>{alert.title}</h4>
                              <p>{alert.description}</p>
                              {alert.areas.length > 0 && (
                                <div className="alert-areas">
                                  <strong>Areas:</strong> {alert.areas.join(', ')}
                                </div>
                              )}
                              <div className="alert-times">
                                <div className="alert-time">
                                  <strong>Effective:</strong> {formatTimestamp(alert.effective_at)}
                                </div>
                                <div className="alert-time">
                                  <strong>Expires:</strong> {formatTimestamp(alert.expires_at)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherPanel;
