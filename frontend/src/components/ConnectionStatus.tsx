import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { useSettings } from '../context/SettingsContext';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
  const { isConnected, aprsIsConnected, stations, packets } = useWebSocket();
  const { settings } = useSettings();

  const getAPRSISStatusMessage = () => {
    if (!isConnected) {
      return 'APRS-IS Disconnected';
    }

    if (!aprsIsConnected) {
      return 'APRS-IS Disconnected';
    }

    const stationCount = stations?.length || 0;
    const packetCount = packets?.length || 0;
    
    if (stationCount === 0 && packetCount === 0) {
      return 'APRS-IS Connected, waiting for data...';
    }

    return `APRS-IS Connected • ${stationCount} stations • ${packetCount} packets`;
  };

  const getTNCStatusMessage = () => {
    // For now, TNC is always disconnected since we don't have TNC implementation
    return 'TNC Disconnected';
  };

  const getAPRSISStatusColor = () => {
    if (!isConnected) {
      return '#dc3545'; // Red - WebSocket disconnected
    }

    if (!aprsIsConnected) {
      return '#ffc107'; // Yellow - APRS-IS disconnected
    }
    
    const stationCount = stations?.length || 0;
    const packetCount = packets?.length || 0;
    
    if (stationCount === 0 && packetCount === 0) {
      return '#17a2b8'; // Blue - Connected but no data
    }
    
    return '#28a745'; // Green - Connected with data
  };

  const getTNCStatusColor = () => {
    return '#dc3545'; // Red - TNC disconnected (not implemented)
  };

  return (
    <div className={`connection-status ${className || ''}`}>
      {/* APRS-IS Status */}
      <div className="connection-item">
        <div 
          className="status-indicator"
          style={{ backgroundColor: getAPRSISStatusColor() }}
        >
          <div className="status-pulse"></div>
        </div>
        <span className="status-message">{getAPRSISStatusMessage()}</span>
      </div>
      
      {/* TNC Status - Stacked below APRS-IS */}
      <div className="connection-item">
        <div 
          className="status-indicator"
          style={{ backgroundColor: getTNCStatusColor() }}
        >
          <div className="status-pulse"></div>
        </div>
        <span className="status-message">{getTNCStatusMessage()}</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
