import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { APRSStation, APRSPacket } from '../types/aprs';

interface StationHistoryEntry {
  timestamp: string;
  position?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  status?: string;
  comment?: string;
  course?: number;
  speed?: number;
  altitude?: number;
  packet_type: string;
  raw_packet: string;
}

interface StationHistoryProps {
  selectedStation: APRSStation | null;
  className?: string;
}

const StationHistory: React.FC<StationHistoryProps> = ({ selectedStation, className }) => {
  const { packets } = useWebSocket();
  const [history, setHistory] = useState<StationHistoryEntry[]>([]);
  const [viewMode, setViewMode] = useState<'recent' | 'positions' | 'all'>('recent');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!selectedStation || !packets) {
      setHistory([]);
      return;
    }

    // Filter packets for the selected station
    const stationPackets = packets.filter(
      packet => packet.source_callsign === selectedStation.callsign
    );

    // Convert packets to history entries
    const historyEntries: StationHistoryEntry[] = stationPackets.map(packet => {
      const entry: StationHistoryEntry = {
        timestamp: packet.timestamp,
        packet_type: packet.packet_type,
        raw_packet: packet.raw_packet
      };

      // Parse position data if available
      if (packet.parsed_data) {
        if (packet.parsed_data.latitude && packet.parsed_data.longitude) {
          entry.position = {
            latitude: packet.parsed_data.latitude,
            longitude: packet.parsed_data.longitude,
            accuracy: packet.parsed_data.accuracy
          };
        }
        
        if (packet.parsed_data.comment) {
          entry.comment = packet.parsed_data.comment;
        }
        
        if (packet.parsed_data.status) {
          entry.status = packet.parsed_data.status;
        }
        
        if (packet.parsed_data.course) {
          entry.course = packet.parsed_data.course;
        }
        
        if (packet.parsed_data.speed) {
          entry.speed = packet.parsed_data.speed;
        }
        
        if (packet.parsed_data.altitude) {
          entry.altitude = packet.parsed_data.altitude;
        }
      }

      return entry;
    });

    // Sort by timestamp (newest first)
    historyEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setHistory(historyEntries);
  }, [selectedStation, packets]);

  const getFilteredHistory = () => {
    switch (viewMode) {
      case 'positions':
        return history.filter(entry => entry.position);
      case 'recent':
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return history.filter(entry => new Date(entry.timestamp) >= last24Hours);
      default:
        return history;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatPosition = (position: { latitude: number; longitude: number }) => {
    const latStr = Math.abs(position.latitude).toFixed(4) + (position.latitude >= 0 ? '°N' : '°S');
    const lonStr = Math.abs(position.longitude).toFixed(4) + (position.longitude >= 0 ? '°E' : '°W');
    return `${latStr}, ${lonStr}`;
  };

  const formatSpeed = (speed: number) => {
    return `${speed.toFixed(1)} mph`;
  };

  const formatCourse = (course: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(course / 22.5) % 16;
    return `${course}° (${directions[index]})`;
  };

  const getPacketTypeIcon = (type: string) => {
    switch (type) {
      case 'position':
        return '📍';
      case 'weather':
        return '🌤️';
      case 'message':
        return '💬';
      case 'status':
        return '📄';
      default:
        return '📡';
    }
  };

  const filteredHistory = getFilteredHistory();

  if (!selectedStation) {
    return (
      <div className={`station-history ${className || ''}`}>
        <div className="station-history-header">
          <div className="station-history-title">
            <span className="station-history-icon">🕐</span>
            <span>Station History</span>
          </div>
        </div>
        <div className="station-history-empty">
          <p>Select a station to view its history</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`station-history ${className || ''}`}>
      <div className="station-history-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="station-history-title">
          <span className="station-history-icon">🕐</span>
          <span>History: {selectedStation.callsign}</span>
          <span className="history-count">({filteredHistory.length})</span>
        </div>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="station-history-content">
          <div className="view-mode-tabs">
            <button 
              className={`view-mode-tab ${viewMode === 'recent' ? 'active' : ''}`}
              onClick={() => setViewMode('recent')}
            >
              Recent (24h)
            </button>
            <button 
              className={`view-mode-tab ${viewMode === 'positions' ? 'active' : ''}`}
              onClick={() => setViewMode('positions')}
            >
              Positions
            </button>
            <button 
              className={`view-mode-tab ${viewMode === 'all' ? 'active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              All
            </button>
          </div>

          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div className="history-empty">
                <p>No history entries found for this view</p>
              </div>
            ) : (
              filteredHistory.map((entry, index) => (
                <div key={index} className="history-entry">
                  <div className="history-entry-header">
                    <div className="history-entry-type">
                      <span className="packet-type-icon">{getPacketTypeIcon(entry.packet_type)}</span>
                      <span className="packet-type-label">{entry.packet_type}</span>
                    </div>
                    <div className="history-entry-time">
                      {formatTimestamp(entry.timestamp)}
                    </div>
                  </div>
                  
                  <div className="history-entry-details">
                    {entry.position && (
                      <div className="history-detail">
                        <span className="detail-label">Position:</span>
                        <span className="detail-value">{formatPosition(entry.position)}</span>
                      </div>
                    )}
                    
                    {entry.speed !== undefined && entry.speed > 0 && (
                      <div className="history-detail">
                        <span className="detail-label">Speed:</span>
                        <span className="detail-value">{formatSpeed(entry.speed)}</span>
                      </div>
                    )}
                    
                    {entry.course !== undefined && (
                      <div className="history-detail">
                        <span className="detail-label">Course:</span>
                        <span className="detail-value">{formatCourse(entry.course)}</span>
                      </div>
                    )}
                    
                    {entry.altitude !== undefined && (
                      <div className="history-detail">
                        <span className="detail-label">Altitude:</span>
                        <span className="detail-value">{entry.altitude.toFixed(0)} ft</span>
                      </div>
                    )}
                    
                    {entry.comment && (
                      <div className="history-detail">
                        <span className="detail-label">Comment:</span>
                        <span className="detail-value">{entry.comment}</span>
                      </div>
                    )}
                    
                    {entry.status && (
                      <div className="history-detail">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value">{entry.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StationHistory;
