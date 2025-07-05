import React, { useState } from 'react';
import './App.css';
import APRSMap from './components/APRSMap';
import StationList from './components/StationList';
import WeatherPanel from './components/WeatherPanel';
import MessagePanel from './components/MessagePanel';
import UserSettingsSimple from './components/UserSettingsSimple';
import PacketStats from './components/PacketStats';
import StationHistory from './components/StationHistory';
import ExportPanel from './components/ExportPanel';
import ConnectionStatus from './components/ConnectionStatus';
import AppLogViewer from './components/AppLogViewer';
import NotificationContainer from './components/NotificationContainer';
import { NotificationProvider } from './context/NotificationContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext';
import { APRSStation } from './types/aprs';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'manual' | 'map';
}

interface UserSettingsData {
  callsign: string;
  ssid: number;
  passcode: number;
  location: UserLocation | null;
  autoGeneratePasscode: boolean;
  distanceUnit: 'km' | 'miles';
  darkTheme: boolean;
  aprsIsConnected: boolean;
  aprsIsFilters: {
    distanceRange: number;
    stationTypes: string[];
    enableWeather: boolean;
    enableMessages: boolean;
  };
}

function AppContent() {
  const [selectedStation, setSelectedStation] = useState<APRSStation | null>(null);
  const [focusStation, setFocusStation] = useState<APRSStation | null>(null);
  const [activePanel, setActivePanel] = useState<'stations' | 'weather' | 'messages'>('stations');
  const { settings: userSettings, updateSettings } = useSettings();
  const [mapClickEnabled, setMapClickEnabled] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { isConnected, stations, packets } = useWebSocket();

  const handleStationSelect = (station: APRSStation) => {
    setSelectedStation(station);
  };

  const handleStationFocus = (station: APRSStation) => {
    setFocusStation(station);
    // Clear focus after a short delay to allow map to update
    setTimeout(() => setFocusStation(null), 100);
  };

  const handleUserSettingsChange = (settings: any) => {
    updateSettings(settings);
  };

  const handleLocationClick = () => {
    setMapClickEnabled(!mapClickEnabled);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (mapClickEnabled && userSettings) {
      const newLocation = {
        latitude: lat,
        longitude: lng,
        source: 'map' as const
      };
      
      updateSettings({
        ...userSettings,
        location: newLocation
      });
      
      setMapClickEnabled(false);
    }
  };

  const handleFocusLocation = (location: UserLocation) => {
    setFocusStation(null);
    // Create a temporary station object to trigger map focus
    const tempStation = {
      latitude: location.latitude,
      longitude: location.longitude
    };
    setFocusStation(tempStation as APRSStation);
    // Clear focus after a short delay to allow map to update
    setTimeout(() => setFocusStation(null), 100);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <h1>📡 APRSwx</h1>
            <p>Real-time APRS tracking with weather radar overlays</p>
          </div>
          <div className="header-status">
            <UserSettingsSimple
              onLocationClick={handleLocationClick}
              mapClickEnabled={mapClickEnabled}
              onFocusLocation={handleFocusLocation}
            />
            <ConnectionStatus />
          </div>
        </div>
        
        <div className="header-controls">
          <div className="panel-tabs">
            <button
              className={`tab-btn ${activePanel === 'stations' ? 'active' : ''}`}
              onClick={() => setActivePanel('stations')}
            >
              📍 Stations
            </button>
            <button
              className={`tab-btn ${activePanel === 'weather' ? 'active' : ''}`}
              onClick={() => setActivePanel('weather')}
            >
              🌡️ Weather
            </button>
            <button
              className={`tab-btn ${activePanel === 'messages' ? 'active' : ''}`}
              onClick={() => setActivePanel('messages')}
            >
              💬 Messages
            </button>
          </div>
          <div className="header-actions">
            <AppLogViewer />
          </div>
        </div>
      </header>
        
        <main className={`App-main ${sidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
          <div className="map-container">
            <APRSMap 
              userLocation={userSettings?.location || null}
              onMapClick={handleMapClick}
              mapClickEnabled={mapClickEnabled}
              focusStation={focusStation}
            />
            {!sidebarVisible && (
              <button
                className="show-sidebar-btn"
                onClick={() => setSidebarVisible(true)}
                title="Show Sidebar"
              >
                ⮞ Show Sidebar
              </button>
            )}
          </div>
          
          {sidebarVisible && (
            <div className="sidebar">
              <div className="sidebar-header">
                <button
                  className="sidebar-toggle-btn"
                  onClick={() => setSidebarVisible(!sidebarVisible)}
                  title="Hide Sidebar"
                >
                  ⮜ Hide
                </button>
              </div>
              {activePanel === 'stations' && (
                <div className="panel">
                  <PacketStats />
                  <StationList
                    onStationSelect={handleStationSelect}
                    onStationFocus={handleStationFocus}
                    selectedStation={selectedStation}
                    userLocation={userSettings?.location || null}
                    distanceUnit={userSettings?.distanceUnit || 'km'}
                    maxDistance={userSettings?.aprsIsFilters?.distanceRange}
                  />
                  <StationHistory 
                    selectedStation={selectedStation}
                  />
                  <ExportPanel 
                    selectedStations={selectedStation ? [selectedStation] : []}
                  />
                </div>
              )}
              
              {activePanel === 'weather' && (
                <div className="panel">
                  <WeatherPanel onFocusLocation={handleFocusLocation} />
                </div>
              )}
              
              {activePanel === 'messages' && (
                <div className="panel">
                  <MessagePanel />
                </div>
              )}
            </div>
          )}
        </main>
        <NotificationContainer />
      </div>
    );
}

function App() {
  return (
    <SettingsProvider>
      <NotificationProvider>
        <AppWithWebSocket />
      </NotificationProvider>
    </SettingsProvider>
  );
}

function AppWithWebSocket() {
  const { settings } = useSettings();
  
  return (
    <WebSocketProvider userSettings={settings}>
      <AppContent />
    </WebSocketProvider>
  );
}

export default App;
