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
  aprsIsConnected: boolean;
  aprsIsFilters: {
    distanceRange: number; // in km
    stationTypes: string[];
    enableWeather: boolean;
    enableMessages: boolean;
  };
  tncSettings: {
    enabled: boolean;
    port: string;
    baudRate: number;
    audioInput: string;
    audioOutput: string;
    pttMethod: 'vox' | 'cat' | 'rts' | 'dtr';
    pttPin: string;
  };
}

interface UserSettingsComponentProps {
  settings?: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onLocationClick: () => void;
  mapClickEnabled: boolean;
  onFocusLocation?: (location: UserLocation) => void;
}

const UserSettingsComponent: React.FC<UserSettingsComponentProps> = ({
  settings: providedSettings,
  onSettingsChange,
  onLocationClick,
  mapClickEnabled,
  onFocusLocation
}) => {
  const defaultSettings: UserSettings = {
    callsign: '',
    ssid: 0,
    passcode: -1,
    location: null,
    autoGeneratePasscode: true,
    distanceUnit: 'km',
    darkTheme: false,
    aprsIsConnected: false,
    aprsIsFilters: {
      distanceRange: 100, // 100km default
      stationTypes: ['mobile', 'fixed', 'weather', 'digipeater', 'igate'], // All selected by default
      enableWeather: true,
      enableMessages: true
    },
    tncSettings: {
      enabled: false,
      port: 'COM1',
      baudRate: 9600,
      audioInput: 'default',
      audioOutput: 'default',
      pttMethod: 'vox',
      pttPin: 'RTS'
    }
  };

  const settings = providedSettings || defaultSettings;
  
  const updateSettings = (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    onSettingsChange(newSettings);
  };
  
  const [showSettings, setShowSettings] = useState(false);
  const [callsignError, setCallsignError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

  // Auto-generate passcode when callsign changes
  useEffect(() => {
    if (settings.autoGeneratePasscode && settings.callsign) {
      const passcode = APRSPasscodeGenerator.generatePasscode(settings.callsign);
      if (passcode !== settings.passcode) {
        updateSettings({ passcode });
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
    
    updateSettings({ callsign: cleanCallsign });
  };

  const handleSSIDChange = (value: number) => {
    if (value >= 0 && value <= 15) {
      updateSettings({ ssid: value });
    }
  };

  const handlePasscodeChange = (value: number) => {
    updateSettings({ 
      passcode: value,
      autoGeneratePasscode: false
    });
  };

  const handleAutoGenerateToggle = () => {
    updateSettings({ 
      autoGeneratePasscode: !settings.autoGeneratePasscode
    });
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
    
    updateSettings({ location: newLocation });
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
    updateSettings({ location: null });
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
        darkTheme: false,
        aprsIsConnected: false,          aprsIsFilters: {
            distanceRange: 100,
            stationTypes: ['mobile', 'fixed', 'weather', 'digipeater', 'igate'], // All selected by default
            enableWeather: true,
            enableMessages: true
          },
        tncSettings: {
          enabled: false,
          port: 'COM1',
          baudRate: 9600,
          audioInput: 'default',
          audioOutput: 'default',
          pttMethod: 'vox',
          pttPin: 'RTS'
        }
      };
      updateSettings(resetSettings);
      setIsEditingLocation(false);
      setManualLatitude('');
      setManualLongitude('');
      setLocationError('');
      setCallsignError('');
    }
  };

  const handleDistanceUnitChange = (unit: 'km' | 'miles') => {
    updateSettings({ distanceUnit: unit });
  };

  const handleDarkThemeToggle = () => {
    updateSettings({ darkTheme: !settings.darkTheme });
  };

  const handleAprsIsConnection = () => {
    updateSettings({ aprsIsConnected: !settings.aprsIsConnected });
  };

  const handleDistanceRangeChange = (value: number) => {
    updateSettings({
      aprsIsFilters: {
        ...settings.aprsIsFilters,
        distanceRange: value
      }
    });
  };

  const handleStationTypeToggle = (stationType: string) => {
    updateSettings({
      aprsIsFilters: {
        ...settings.aprsIsFilters,
        stationTypes: settings.aprsIsFilters.stationTypes.includes(stationType)
          ? settings.aprsIsFilters.stationTypes.filter((t: string) => t !== stationType)
          : [...settings.aprsIsFilters.stationTypes, stationType]
      }
    });
  };

  const handleFilterToggle = (filterType: 'enableWeather' | 'enableMessages') => {
    updateSettings({
      aprsIsFilters: {
        ...settings.aprsIsFilters,
        [filterType]: !settings.aprsIsFilters[filterType]
      }
    });
  };

  const handleTncToggle = () => {
    updateSettings({
      tncSettings: {
        ...settings.tncSettings,
        enabled: !settings.tncSettings.enabled
      }
    });
  };

  const handleTncSettingChange = (field: keyof UserSettings['tncSettings'], value: string | number) => {
    updateSettings({
      tncSettings: {
        ...settings.tncSettings,
        [field]: value
      }
    });
  };

  const formatCallsign = () => {
    return APRSPasscodeGenerator.formatCallsignWithSSID(settings.callsign, settings.ssid);
  };

  const isValidConfiguration = () => {
    return settings.callsign && 
           APRSPasscodeGenerator.isValidCallsign(settings.callsign) &&
           settings.passcode > 0 &&
           settings.location &&
           settings.aprsIsFilters.distanceRange > 0;
  };

  const isSetupComplete = () => {
    return isValidConfiguration();
  };

  const canConnectToAprsIs = () => {
    return isSetupComplete() && !settings.aprsIsConnected;
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
              <label>Callsign Configuration:</label>
              <div className="callsign-container">
                <div className="callsign-row">
                  <div className="callsign-input-group">
                    <label className="sub-label">Callsign:</label>
                    <input
                      type="text"
                      value={settings.callsign}
                      onChange={(e) => handleCallsignChange(e.target.value)}
                      placeholder="Enter your callsign"
                      className={`setting-input ${callsignError ? 'error' : ''}`}
                      maxLength={6}
                    />
                  </div>
                  <div className="ssid-separator">-</div>
                  <div className="ssid-input-group">
                    <label className="sub-label">SSID:</label>
                    <input
                      type="number"
                      value={settings.ssid}
                      onChange={(e) => handleSSIDChange(parseInt(e.target.value) || 0)}
                      min={0}
                      max={15}
                      className="setting-input ssid-input"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="callsign-preview">
                  Full callsign: <strong>{formatCallsign()}</strong>
                </div>
              </div>
              {callsignError && (
                <div className="error-text">{callsignError}</div>
              )}
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
              
              {/* DEBUG: This should be visible */}
              <div style={{
                backgroundColor: 'red',
                color: 'white',
                padding: '10px',
                marginBottom: '10px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                DEBUG: GPS BUTTON SECTION - YOU SHOULD SEE THIS
              </div>
              
              {/* PROMINENT GPS BUTTON */}
              <div style={{ 
                display: 'block', 
                marginBottom: '15px', 
                padding: '10px',
                backgroundColor: '#e8f5e8',
                border: '2px solid #28a745',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <button
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  style={{
                    width: '100%',
                    padding: '15px 20px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isGettingLocation ? 'not-allowed' : 'pointer',
                    opacity: isGettingLocation ? 0.7 : 1,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  title="Use your device's GPS to automatically set your location"
                >
                  {isGettingLocation ? '🔄 Getting GPS Location...' : '📍 Use GPS Location'}
                </button>
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '14px', 
                  color: '#2d5a2d', 
                  fontWeight: '500'
                }}>
                  Automatically detect your location using GPS
                </div>
                {!('geolocation' in navigator) && (
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '14px', 
                    color: '#dc3545', 
                    fontWeight: 'bold'
                  }}>
                    ⚠️ GPS/Geolocation not supported by your browser
                  </div>
                )}
              </div>

              {/* Other location options */}
              <div className="location-buttons">
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

            {/* APRS-IS Connection Settings */}
            <div className="setting-group aprs-connection-section">
              <h4>APRS-IS Connection</h4>
              <p className="setting-description">
                {isSetupComplete() 
                  ? "Manual connection to APRS-IS network. Station list will populate when packets are received within your filter range."
                  : "Complete the setup above (callsign, location, filters) before connecting to APRS-IS."
                }
              </p>
              
              <div className="connection-status-display">
                <div className="connection-info">
                  <span className={`status-badge ${settings.aprsIsConnected ? 'connected' : 'disconnected'}`}>
                    {settings.aprsIsConnected ? '🟢 Connected to APRS-IS' : '🔴 Not Connected'}
                  </span>
                  {!settings.aprsIsConnected && (
                    <span className="connection-note">
                      Station list will be empty until connected and receiving data
                    </span>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={handleAprsIsConnection}
                  className={`settings-btn ${settings.aprsIsConnected ? 'danger' : 'primary'}`}
                  title={!canConnectToAprsIs() && !settings.aprsIsConnected ? "Complete setup first" : ""}
                  disabled={!canConnectToAprsIs() && !settings.aprsIsConnected}
                >
                  {settings.aprsIsConnected ? 'Disconnect from APRS-IS' : 'Connect to APRS-IS'}
                </button>
              </div>
            </div>

            {/* APRS-IS Filter Settings */}
            <div className="setting-group">
              <h4>APRS-IS Filters</h4>
              <p className="setting-description">
                Configure filters for APRS-IS data. A distance range is required.
              </p>
              
              <div className="filter-setting">
                <label>Distance Range:</label>
                <div className="distance-input-group">
                  <input
                    type="number"
                    value={settings.aprsIsFilters.distanceRange}
                    onChange={(e) => handleDistanceRangeChange(parseInt(e.target.value) || 0)}
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

              <div className="filter-setting">
                <label>Station Types:</label>
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
                        onChange={() => handleStationTypeToggle(type.value)}
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-setting">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.aprsIsFilters.enableWeather}
                    onChange={() => handleFilterToggle('enableWeather')}
                  />
                  Enable Weather Data
                </label>
              </div>

              <div className="filter-setting">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.aprsIsFilters.enableMessages}
                    onChange={() => handleFilterToggle('enableMessages')}
                  />
                  Enable Messages
                </label>
              </div>
            </div>

            {/* TNC Settings */}
            <div className="setting-group">
              <h4>TNC/Radio Settings</h4>
              <p className="setting-description">
                Configure TNC (Terminal Node Controller) or radio interface settings for direct RF communication.
              </p>
              
              <div className="setting-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.tncSettings.enabled}
                    onChange={handleTncToggle}
                  />
                  Enable TNC/Radio Interface
                </label>
              </div>

              {settings.tncSettings.enabled && (
                <div className="tnc-settings-expanded">
                  <div className="setting-row">
                    <label>Serial Port:</label>
                    <select
                      value={settings.tncSettings.port}
                      onChange={(e) => handleTncSettingChange('port', e.target.value)}
                      className="setting-select"
                    >
                      <option value="COM1">COM1</option>
                      <option value="COM2">COM2</option>
                      <option value="COM3">COM3</option>
                      <option value="COM4">COM4</option>
                      <option value="COM5">COM5</option>
                      <option value="COM6">COM6</option>
                      <option value="COM7">COM7</option>
                      <option value="COM8">COM8</option>
                      <option value="/dev/ttyUSB0">/dev/ttyUSB0</option>
                      <option value="/dev/ttyACM0">/dev/ttyACM0</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <label>Baud Rate:</label>
                    <select
                      value={settings.tncSettings.baudRate}
                      onChange={(e) => handleTncSettingChange('baudRate', parseInt(e.target.value))}
                      className="setting-select"
                    >
                      <option value={1200}>1200</option>
                      <option value={2400}>2400</option>
                      <option value={4800}>4800</option>
                      <option value={9600}>9600</option>
                      <option value={19200}>19200</option>
                      <option value={38400}>38400</option>
                      <option value={57600}>57600</option>
                      <option value={115200}>115200</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <label>Audio Input Device:</label>
                    <input
                      type="text"
                      value={settings.tncSettings.audioInput}
                      onChange={(e) => handleTncSettingChange('audioInput', e.target.value)}
                      placeholder="default, or specific device name"
                      className="setting-input"
                    />
                  </div>

                  <div className="setting-row">
                    <label>Audio Output Device:</label>
                    <input
                      type="text"
                      value={settings.tncSettings.audioOutput}
                      onChange={(e) => handleTncSettingChange('audioOutput', e.target.value)}
                      placeholder="default, or specific device name"
                      className="setting-input"
                    />
                  </div>

                  <div className="setting-row">
                    <label>PTT Method:</label>
                    <select
                      value={settings.tncSettings.pttMethod}
                      onChange={(e) => handleTncSettingChange('pttMethod', e.target.value as 'vox' | 'cat' | 'rts' | 'dtr')}
                      className="setting-select"
                    >
                      <option value="vox">VOX (Voice Operated)</option>
                      <option value="cat">CAT Control</option>
                      <option value="rts">RTS Pin</option>
                      <option value="dtr">DTR Pin</option>
                    </select>
                  </div>

                  <div className="setting-row">
                    <label>PTT Pin/Port:</label>
                    <input
                      type="text"
                      value={settings.tncSettings.pttPin}
                      onChange={(e) => handleTncSettingChange('pttPin', e.target.value)}
                      placeholder="RTS, DTR, or CAT command"
                      className="setting-input"
                    />
                  </div>

                  <div className="tnc-info">
                    <p><strong>Status:</strong> {settings.tncSettings.enabled ? '🟢 Enabled' : '🔴 Disabled'}</p>
                    <p><strong>Interface:</strong> {settings.tncSettings.port} @ {settings.tncSettings.baudRate} baud</p>
                    <p><strong>PTT:</strong> {settings.tncSettings.pttMethod.toUpperCase()}</p>
                  </div>
                </div>
              )}
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
