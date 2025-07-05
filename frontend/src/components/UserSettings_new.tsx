import React, { useState, useEffect } from 'react';
import { APRSPasscodeGenerator } from '../utils/aprsUtils';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'manual' | 'map';
}

interface UserSettings {
  callsign: string;
  ssid: number;
  passcode: number;
  location: UserLocation | null;
  autoGeneratePasscode: boolean;
  distanceUnit: 'km' | 'miles';
  darkTheme: boolean;
}

interface UserSettingsComponentProps {
  onSettingsChange: (settings: UserSettings) => void;
  onLocationClick: () => void;
  mapClickEnabled: boolean;
  onFocusLocation?: (location: UserLocation) => void;
}

const UserSettingsComponent: React.FC<UserSettingsComponentProps> = ({
  onSettingsChange,
  onLocationClick,
  mapClickEnabled,
  onFocusLocation
}) => {
  const [settings, setSettings] = useState<UserSettings>({
    callsign: '',
    ssid: 0,
    passcode: -1,
    location: null,
    autoGeneratePasscode: true,
    distanceUnit: 'km',
    darkTheme: false
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [callsignError, setCallsignError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('aprswx_user_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Ensure new properties have defaults
        const settingsWithDefaults = {
          distanceUnit: 'km',
          darkTheme: false,
          ...parsed
        };
        setSettings(settingsWithDefaults);
      } catch (e) {
        console.error('Error loading user settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem('aprswx_user_settings', JSON.stringify(settings));
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  // Auto-generate passcode when callsign changes
  useEffect(() => {
    if (settings.autoGeneratePasscode && settings.callsign) {
      const passcode = APRSPasscodeGenerator.generatePasscode(settings.callsign);
      if (passcode !== settings.passcode) {
        setSettings(prev => ({ ...prev, passcode }));
      }
    }
  }, [settings.callsign, settings.autoGeneratePasscode, settings.passcode]);

  const handleCallsignChange = (value: string) => {
    const cleanCallsign = value.toUpperCase().trim();
    
    // Validate callsign
    if (cleanCallsign && !APRSPasscodeGenerator.isValidCallsign(cleanCallsign)) {
      setCallsignError('Invalid callsign format');
    } else {
      setCallsignError('');
    }
    
    setSettings(prev => ({ ...prev, callsign: cleanCallsign }));
  };

  const handleSSIDChange = (value: number) => {
    if (value >= 0 && value <= 15) {
      setSettings(prev => ({ ...prev, ssid: value }));
    }
  };

  const handlePasscodeChange = (value: number) => {
    setSettings(prev => ({ 
      ...prev, 
      passcode: value,
      autoGeneratePasscode: false
    }));
  };

  const handleAutoGenerateToggle = () => {
    setSettings(prev => ({ 
      ...prev, 
      autoGeneratePasscode: !prev.autoGeneratePasscode
    }));
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
        
        setSettings(prev => ({ ...prev, location }));
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

  const handleManualLocationSave = () => {
    const lat = parseFloat(manualLatitude);
    const lon = parseFloat(manualLongitude);
    
    if (isNaN(lat) || isNaN(lon)) {
      setLocationError('Please enter valid latitude and longitude values');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      setLocationError('Latitude must be between -90 and 90 degrees');
      return;
    }
    
    if (lon < -180 || lon > 180) {
      setLocationError('Longitude must be between -180 and 180 degrees');
      return;
    }
    
    const newLocation: UserLocation = {
      latitude: lat,
      longitude: lon,
      source: 'manual'
    };
    
    setSettings(prev => ({ ...prev, location: newLocation }));
    setLocationError('');
    setIsEditingLocation(false);
    setManualLatitude('');
    setManualLongitude('');
    
    // Focus map on the new location
    if (onFocusLocation) {
      onFocusLocation(newLocation);
    }
  };

  const handleLocationEdit = () => {
    setIsEditingLocation(true);
    if (settings.location) {
      setManualLatitude(settings.location.latitude.toFixed(6));
      setManualLongitude(settings.location.longitude.toFixed(6));
    }
  };

  const handleLocationReset = () => {
    setSettings(prev => ({ ...prev, location: null }));
    setIsEditingLocation(false);
    setManualLatitude('');
    setManualLongitude('');
    setLocationError('');
  };

  const handleSettingsReset = () => {
    if (window.confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
      const resetSettings: UserSettings = {
        callsign: '',
        ssid: 0,
        passcode: -1,
        location: null,
        autoGeneratePasscode: true,
        distanceUnit: 'km',
        darkTheme: false
      };
      setSettings(resetSettings);
      setIsEditingLocation(false);
      setManualLatitude('');
      setManualLongitude('');
      setLocationError('');
      setCallsignError('');
    }
  };

  const handleDistanceUnitChange = (unit: 'km' | 'miles') => {
    setSettings(prev => ({ ...prev, distanceUnit: unit }));
  };

  const handleDarkThemeToggle = () => {
    setSettings(prev => ({ ...prev, darkTheme: !prev.darkTheme }));
  };

  const formatCallsign = () => {
    return APRSPasscodeGenerator.formatCallsignWithSSID(settings.callsign, settings.ssid);
  };

  const isValidConfiguration = () => {
    return settings.callsign && 
           APRSPasscodeGenerator.isValidCallsign(settings.callsign) &&
           settings.passcode > 0 &&
           settings.location;
  };

  return (
    <div className="user-settings">
      <div className="settings-header">
        <button 
          className={`settings-toggle ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="User Settings"
        >
          👤 {settings.callsign || 'Setup'}
          {isValidConfiguration() && <span className="valid-indicator">✓</span>}
        </button>
        
        <div className="settings-status">
          {settings.callsign && (
            <span className="formatted-callsign">
              {formatCallsign()}
            </span>
          )}
          {settings.location && (
            <span className="location-indicator">
              📍 {settings.location.source === 'gps' ? 'GPS' : 
                  settings.location.source === 'map' ? 'Map' : 'Manual'}
            </span>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-content">
            {/* Callsign and SSID */}
            <div className="setting-group">
              <label>Callsign:</label>
              <input
                type="text"
                value={settings.callsign}
                onChange={(e) => handleCallsignChange(e.target.value)}
                placeholder="Enter your callsign"
                className={`setting-input ${callsignError ? 'error' : ''}`}
                maxLength={6}
              />
              {callsignError && (
                <div className="error-text">{callsignError}</div>
              )}
            </div>

            <div className="setting-group">
              <label>SSID:</label>
              <input
                type="number"
                value={settings.ssid}
                onChange={(e) => handleSSIDChange(parseInt(e.target.value))}
                min={0}
                max={15}
                className="setting-input"
              />
            </div>

            {/* Passcode */}
            <div className="setting-group">
              <label>APRS-IS Passcode:</label>
              <div className="passcode-group">
                <input
                  type="number"
                  value={settings.passcode}
                  onChange={(e) => handlePasscodeChange(parseInt(e.target.value))}
                  placeholder="Enter or generate passcode"
                  className="setting-input"
                  disabled={settings.autoGeneratePasscode}
                />
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.autoGeneratePasscode}
                    onChange={handleAutoGenerateToggle}
                  />
                  Auto-generate
                </label>
              </div>
              {settings.autoGeneratePasscode && settings.callsign && (
                <div className="passcode-info">
                  Generated passcode: {APRSPasscodeGenerator.generatePasscode(settings.callsign)}
                </div>
              )}
            </div>

            {/* Location Settings */}
            <div className="setting-group">
              <label>Location:</label>
              
              <div className="location-buttons">
                <button
                  className="location-btn"
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? '📍 Getting...' : '📍 Use GPS'}
                </button>
                
                <button
                  className={`location-btn ${mapClickEnabled ? 'active' : ''}`}
                  onClick={onLocationClick}
                >
                  🗺️ Click on Map
                </button>

                <button
                  className="location-btn"
                  onClick={() => setIsEditingLocation(true)}
                >
                  ✏️ Enter Manually
                </button>
              </div>

              {locationError && (
                <div className="error-text">{locationError}</div>
              )}

              {/* Manual Location Input */}
              {isEditingLocation && (
                <div className="manual-location-input">
                  <div className="coord-group">
                    <label>Latitude:</label>
                    <input
                      type="number"
                      value={manualLatitude}
                      onChange={(e) => setManualLatitude(e.target.value)}
                      step="0.000001"
                      placeholder="e.g., 40.7128"
                      className="coord-input"
                    />
                  </div>
                  <div className="coord-group">
                    <label>Longitude:</label>
                    <input
                      type="number"
                      value={manualLongitude}
                      onChange={(e) => setManualLongitude(e.target.value)}
                      step="0.000001"
                      placeholder="e.g., -74.0060"
                      className="coord-input"
                    />
                  </div>
                  <div className="location-actions">
                    <button
                      className="settings-btn primary"
                      onClick={handleManualLocationSave}
                    >
                      Save Location
                    </button>
                    <button
                      className="settings-btn secondary"
                      onClick={() => setIsEditingLocation(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {settings.location && !isEditingLocation && (
                <div className="location-display">
                  <div className="location-coords">
                    <div className="coord-display">
                      <strong>Latitude:</strong> {settings.location.latitude.toFixed(6)}
                    </div>
                    <div className="coord-display">
                      <strong>Longitude:</strong> {settings.location.longitude.toFixed(6)}
                    </div>
                  </div>
                  
                  <div className="location-info">
                    <span className="location-source">
                      📍 {settings.location.source === 'gps' ? 'GPS' : 
                          settings.location.source === 'map' ? 'Map' : 'Manual'}
                    </span>
                    {settings.location && settings.location.accuracy && (
                      <span className="location-accuracy">
                        ±{Math.round(settings.location.accuracy)}m
                      </span>
                    )}
                  </div>
                  
                  <div className="location-actions">
                    <button
                      className="settings-btn secondary"
                      onClick={handleLocationEdit}
                    >
                      Edit Location
                    </button>
                    <button
                      className="settings-btn secondary"
                      onClick={handleLocationReset}
                    >
                      Reset Location
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Distance Unit Settings */}
            <div className="setting-group">
              <label>Distance Unit:</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="distanceUnit"
                    value="km"
                    checked={settings.distanceUnit === 'km'}
                    onChange={(e) => handleDistanceUnitChange(e.target.value as 'km' | 'miles')}
                  />
                  Kilometers
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="distanceUnit"
                    value="miles"
                    checked={settings.distanceUnit === 'miles'}
                    onChange={(e) => handleDistanceUnitChange(e.target.value as 'km' | 'miles')}
                  />
                  Miles
                </label>
              </div>
            </div>

            {/* Dark Theme Settings */}
            <div className="setting-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.darkTheme}
                  onChange={handleDarkThemeToggle}
                />
                Dark Theme
              </label>
            </div>

            {/* Actions */}
            <div className="settings-actions">
              <button
                className="settings-btn primary"
                onClick={() => setShowSettings(false)}
              >
                {isValidConfiguration() ? 'Save Settings' : 'Complete Setup'}
              </button>
              
              <button
                className="settings-btn danger"
                onClick={handleSettingsReset}
              >
                Reset All Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettingsComponent;
