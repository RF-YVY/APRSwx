import React, { useState, useMemo, useCallback } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { APRSStation, StationFilter } from '../types/aprs';
import { LocationUtils } from '../utils/aprsUtils';

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface StationListProps {
  onStationSelect?: (station: APRSStation) => void;
  onStationFocus?: (station: APRSStation) => void;
  selectedStation?: APRSStation | null;
  userLocation?: UserLocation | null;
  distanceUnit?: 'km' | 'miles';
  maxDistance?: number; // Maximum distance in km to show stations
  className?: string;
}

const StationList: React.FC<StationListProps> = ({ 
  onStationSelect, 
  onStationFocus,
  selectedStation,
  userLocation,
  distanceUnit = 'km',
  maxDistance,
  className 
}) => {
  const { stations } = useWebSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'callsign' | 'last_seen' | 'distance'>('distance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<StationFilter>({
    active_only: true,
    within_km: undefined,
    station_types: [],
    callsigns: []
  });

  // Get emoji for station type
  const getStationEmoji = (symbolTable: string, symbolCode: string): string => {
    const symbolKey = `${symbolTable}${symbolCode}`;
    
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
    
    return symbolMap[symbolKey] || '📍';
  };

  // Calculate distance from user location
  const calculateStationDistance = useCallback((station: APRSStation): number | null => {
    if (!userLocation || !station.latitude || !station.longitude) {
      return null;
    }
    
    return LocationUtils.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      station.latitude,
      station.longitude
    );
  }, [userLocation]);

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

  const isStationActive = (station: APRSStation): boolean => {
    if (!station.last_heard) return false;
    const now = new Date();
    const lastSeen = new Date(station.last_heard);
    const diffHours = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
    return diffHours < 24; // Consider active if heard within 24 hours
  };

  // Filter and sort stations
  const filteredAndSortedStations = useMemo(() => {
    let filtered = stations.filter(station => {
      // Search filter
      if (searchTerm && !station.callsign.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Active only filter
      if (filter.active_only && !isStationActive(station)) {
        return false;
      }
      
      // Station type filter
      if (filter.station_types && filter.station_types.length > 0) {
        if (!filter.station_types.includes(station.station_type)) {
          return false;
        }
      }
      
      // Callsign filter
      if (filter.callsigns && filter.callsigns.length > 0) {
        if (!filter.callsigns.includes(station.callsign)) {
          return false;
        }
      }
      
      // Distance filter
      if (userLocation && station.latitude && station.longitude) {
        const distance = calculateStationDistance(station);
        if (distance === null) {
          return false;
        }
        
        // Use maxDistance prop first, then fall back to filter setting
        const maxDistanceKm = maxDistance || filter.within_km;
        if (maxDistanceKm !== undefined && distance > maxDistanceKm) {
          return false;
        }
      }
      
      return true;
    });

    // Sort stations
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'callsign':
          comparison = a.callsign.localeCompare(b.callsign);
          break;
        case 'last_seen':
          comparison = (b.last_heard ? new Date(b.last_heard).getTime() : 0) - (a.last_heard ? new Date(a.last_heard).getTime() : 0);
          break;
        case 'distance':
          const distA = calculateStationDistance(a);
          const distB = calculateStationDistance(b);
          if (distA === null && distB === null) comparison = 0;
          else if (distA === null) comparison = 1;
          else if (distB === null) comparison = -1;
          else comparison = distA - distB;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [stations, searchTerm, sortBy, sortOrder, filter, calculateStationDistance, userLocation, maxDistance]);

  const handleStationClick = (station: APRSStation) => {
    if (onStationSelect) {
      onStationSelect(station);
    }
    if (onStationFocus) {
      onStationFocus(station);
    }
  };

  const handleSort = (field: 'callsign' | 'last_seen' | 'distance') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: 'callsign' | 'last_seen' | 'distance') => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className={`station-list ${className || ''}`}>
      <div className="station-list-header">
        <div className="header-title">
          <h3>📍 Stations</h3>
          <div className="station-count-badge">
            {filteredAndSortedStations.length}
          </div>
        </div>
        
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search callsigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filter.active_only}
              onChange={(e) => setFilter({...filter, active_only: e.target.checked})}
            />
            <span className="checkmark"></span>
            <span>Active only (24h)</span>
          </label>
        </div>
        
        <div className="sort-controls">
          <span>Sort by:</span>
          <button 
            className={`sort-btn ${sortBy === 'callsign' ? 'active' : ''}`}
            onClick={() => handleSort('callsign')}
          >
            Callsign {getSortIcon('callsign')}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'last_seen' ? 'active' : ''}`}
            onClick={() => handleSort('last_seen')}
          >
            Last Seen {getSortIcon('last_seen')}
          </button>
          <button 
            className={`sort-btn ${sortBy === 'distance' ? 'active' : ''}`}
            onClick={() => handleSort('distance')}
          >
            Distance {getSortIcon('distance')}
          </button>
        </div>
      </div>
      {!userLocation && (
        <div className="station-warning" style={{ color: '#f59e0b', fontWeight: 500, padding: '8px 0', textAlign: 'center' }}>
          ⚠️ Distances are not accurate. Set your location in User Settings.
        </div>
      )}
      <div className="station-list-content">
        {filteredAndSortedStations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📡</div>
            <div className="empty-state-text">No stations found</div>
            <div className="empty-state-subtext">
              {searchTerm ? 'Try adjusting your search terms' : 'Waiting for APRS data...'}
            </div>
          </div>
        ) : (
          filteredAndSortedStations.map((station) => (
            <div
              key={station.id}
              className={`station-item ${selectedStation?.id === station.id ? 'selected' : ''}`}
              onClick={() => handleStationClick(station)}
            >
              <div className="station-emoji">
                {getStationEmoji(station.symbol_table, station.symbol_code)}
              </div>
              
              <div className="station-info">
                <div className="station-callsign">{station.callsign}</div>
                <div className="station-details">
                  {station.latitude && station.longitude && (
                    <div>📍 {station.latitude.toFixed(3)}, {station.longitude.toFixed(3)}</div>
                  )}
                  {userLocation && station.latitude && station.longitude && (
                    <div className="station-distance">
                      📏 {LocationUtils.formatDistance(calculateStationDistance(station) || 0, distanceUnit)}
                    </div>
                  )}
                  {station.last_comment && (
                    <div>💬 {station.last_comment}</div>
                  )}
                  {station.course !== null && station.speed !== null && (
                    <div>🧭 {station.course}° / {station.speed} mph</div>
                  )}
                </div>
              </div>
              
              <div className="station-status">
                <div className={`status-badge ${isStationActive(station) ? 'active' : 'inactive'}`}>
                  {isStationActive(station) ? 'Active' : 'Inactive'}
                </div>
                <div className="last-seen">
                  {formatLastSeen(station.last_heard)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StationList;
