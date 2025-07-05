import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useWebSocket } from '../context/WebSocketContext';
import { APRSPasscodeGenerator } from '../utils/aprsUtils';
import { notificationService } from '../services/notificationService';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'manual' | 'map';
}

interface UserSettingsSimpleProps {
  onLocationClick: () => void;
  mapClickEnabled: boolean;
  onFocusLocation?: (location: UserLocation) => void;
}

const UserSettingsSimple: React.FC<UserSettingsSimpleProps> = ({
  onLocationClick,
  mapClickEnabled,
  onFocusLocation
}) => {
  const { settings, updateSettings } = useSettings();
  const { aprsIsConnected, sendAPRSISConnect, sendAPRSISDisconnect } = useWebSocket();
  const [showSettings, setShowSettings] = useState(false);
  const [manualLocation, setManualLocation] = useState({ lat: '', lng: '' });
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Sync settings with actual APRS-IS connection state
  useEffect(() => {
    if (settings.aprsIsConnected !== aprsIsConnected) {
      updateSettings({ aprsIsConnected });
    }
  }, [aprsIsConnected, settings.aprsIsConnected, updateSettings]);

  const handleCallsignChange = (value: string) => {
    const cleanCallsign = value.toUpperCase().trim();
    updateSettings({ callsign: cleanCallsign });
    
    if (cleanCallsign) {
      const passcode = APRSPasscodeGenerator.generatePasscode(cleanCallsign);
      updateSettings({ passcode });
    }
  };

  const handleSSIDChange = (value: number) => {
    if (value >= 0 && value <= 15) {
      updateSettings({ ssid: value });
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps'
        };
        
        updateSettings({ location });
        setIsGettingLocation(false);
        
        // Focus map on the new location
        if (onFocusLocation) {
          onFocusLocation(location);
        }
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied by user');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out');
            break;
          default:
            setLocationError('An unknown error occurred');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleToggleAPRSIS = async () => {
    if (aprsIsConnected) {
      // Disconnect from APRS-IS
      sendAPRSISDisconnect();
      updateSettings({ aprsIsConnected: false });
    } else {
      // Try to connect to APRS-IS
      try {
        await sendAPRSISConnect();
        updateSettings({ aprsIsConnected: true });
      } catch (error) {
        console.error('Failed to connect to APRS-IS:', error);
        // Settings will remain disconnected
      }
    }
  };

  const handleDistanceChange = (distance: number) => {
    updateSettings({
      aprsIsFilters: {
        ...settings.aprsIsFilters,
        distanceRange: distance
      }
    });
  };

  const handleManualLocationSet = () => {
    const lat = parseFloat(manualLocation.lat);
    const lng = parseFloat(manualLocation.lng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid latitude and longitude values');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      alert('Latitude must be between -90 and 90 degrees');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      alert('Longitude must be between -180 and 180 degrees');
      return;
    }
    
    const location: UserLocation = {
      latitude: lat,
      longitude: lng,
      source: 'manual'
    };
    
    updateSettings({ location });
    setShowManualLocation(false);
    setManualLocation({ lat: '', lng: '' });
  };

  const toggleStationType = (type: string) => {
    const currentTypes = settings.aprsIsFilters.stationTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t: string) => t !== type)
      : [...currentTypes, type];
    
    updateSettings({
      aprsIsFilters: {
        ...settings.aprsIsFilters,
        stationTypes: newTypes
      }
    });
  };

  if (!showSettings) {
    return (
      <div className="user-settings-simple">
        <button 
          onClick={() => setShowSettings(true)}
          className="settings-toggle-btn"
          title="Open Settings"
        >
          ⚙️ Settings
        </button>
      </div>
    );
  }

  return (
    <div className="user-settings-simple">
      <div 
        className="settings-overlay" 
        onClick={() => setShowSettings(false)} 
      />
      <div 
        className="settings-popup" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-header">
          <h3>Settings</h3>
          <button 
            onClick={() => setShowSettings(false)}
            className="close-btn"
          >
            ✕
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-form">
            {/* Callsign and SSID Row */}
            <div className="setting-group">
              <label>Station Identity:</label>
              <small>Your amateur radio callsign and SSID (0-15)</small>
              <div className="callsign-ssid-row">
                <div className="callsign-group">
                  <label>Callsign:</label>
                  <input
                    type="text"
                    value={settings.callsign}
                    onChange={(e) => handleCallsignChange(e.target.value)}
                    placeholder="Enter your callsign"
                    className="setting-input"
                    maxLength={6}
                  />
                </div>
                <div className="ssid-separator">-</div>
                <div className="ssid-group">
                  <label>SSID:</label>
                  <input
                    type="number"
                    value={settings.ssid}
                    onChange={(e) => handleSSIDChange(parseInt(e.target.value) || 0)}
                    min={0}
                    max={15}
                    className="setting-input"
                    placeholder="0"
                  />
                </div>
              </div>
              {settings.callsign && (
                <div className="callsign-preview">
                  Complete Callsign: {settings.callsign}{settings.ssid > 0 ? `-${settings.ssid}` : ''}
                </div>
              )}
            </div>

            {/* Passcode */}
            <div className="setting-group">
              <label>Passcode:</label>
              <small>Auto-generated verification code based on your callsign</small>
              <input
                type="number"
                value={settings.passcode}
                readOnly
                className="setting-input"
                placeholder="Auto-generated"
              />
            </div>

            {/* Location */}
            <div className="setting-group">
              <label>Location:</label>
              <small>Set your station location for APRS positioning</small>
              
              {/* GPS Button - Compact modern style */}
              <div className="gps-button-container">
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="gps-button"
                  title="Use your device's GPS to automatically set your location"
                >
                  {isGettingLocation ? '🔄 Getting GPS Location...' : '📍 Use GPS Location'}
                </button>
                {!('geolocation' in navigator) && (
                  <div className="gps-error">
                    ⚠️ GPS/Geolocation not supported by your browser
                  </div>
                )}
              </div>

              {locationError && (
                <div className="location-error">
                  {locationError}
                </div>
              )}
              
              {settings.location ? (
                <div className="location-display">
                  <span>📍 {settings.location.latitude.toFixed(4)}, {settings.location.longitude.toFixed(4)}</span>
                  <button onClick={() => updateSettings({ location: null })}>Clear</button>
                </div>
              ) : (
                <div className="location-options">
                  <button 
                    onClick={onLocationClick}
                    className={`location-btn ${mapClickEnabled ? 'active' : ''}`}
                  >
                    {mapClickEnabled ? 'Click on map' : 'Set from Map'}
                  </button>
                  <button 
                    onClick={() => setShowManualLocation(!showManualLocation)}
                    className="location-btn"
                  >
                    Manual Entry
                  </button>
                </div>
              )}
              
              {showManualLocation && (
                <div className="manual-location">
                  <div className="location-inputs">
                    <input
                      type="number"
                      placeholder="Latitude"
                      value={manualLocation.lat}
                      onChange={(e) => setManualLocation({ ...manualLocation, lat: e.target.value })}
                      className="setting-input"
                      step="0.0001"
                    />
                    <input
                      type="number"
                      placeholder="Longitude"
                      value={manualLocation.lng}
                      onChange={(e) => setManualLocation({ ...manualLocation, lng: e.target.value })}
                      className="setting-input"
                      step="0.0001"
                    />
                  </div>
                  <button onClick={handleManualLocationSet} className="set-location-btn">
                    Set Location
                  </button>
                </div>
              )}
            </div>

            {/* Distance Filter */}
            <div className="setting-group">
              <label>Distance Range:</label>
              <small>Maximum distance for receiving APRS stations (km)</small>
              <div className="distance-input-group">
                <input
                  type="number"
                  value={settings.aprsIsFilters.distanceRange}
                  onChange={(e) => handleDistanceChange(parseInt(e.target.value) || 0)}
                  min="1"
                  max="9999"
                  className="setting-input distance-input"
                  placeholder="Enter distance"
                />
                <span className="distance-unit">km</span>
              </div>
              <div className="distance-conversion">
                {settings.aprsIsFilters.distanceRange > 0 && (
                  <span className="conversion-display">
                    {settings.aprsIsFilters.distanceRange} km = {Math.round(settings.aprsIsFilters.distanceRange * 0.621371)} miles
                  </span>
                )}
              </div>
            </div>

            {/* Station Types */}
            <div className="setting-group">
              <label>Station Types:</label>
              <small>Choose which types of stations to display on the map</small>
              <div className="station-type-filters">
                {[
                  { value: 'mobile', label: '🚗 Mobile' },
                  { value: 'fixed', label: '🏠 Fixed' },
                  { value: 'weather', label: '🌡️ Weather' },
                  { value: 'digipeater', label: '📡 Digipeater' },
                  { value: 'igate', label: '🌐 IGate' }
                ].map(type => (
                  <label key={type.value} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.aprsIsFilters.stationTypes.includes(type.value)}
                      onChange={() => toggleStationType(type.value)}
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>

            {/* APRS-IS Connection */}
            <div className="setting-group">
              <label>APRS-IS Connection:</label>
              <small>Connect to the APRS Internet Service for real-time data</small>
              <button 
                onClick={handleToggleAPRSIS}
                className={`aprs-toggle-btn ${aprsIsConnected ? 'connected' : 'disconnected'}`}
              >
                {aprsIsConnected ? '🔌 Disconnect APRS-IS' : '🔗 Connect APRS-IS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsSimple;