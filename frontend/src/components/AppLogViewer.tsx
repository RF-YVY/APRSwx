import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../context/WebSocketContext';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  source: string;
  message: string;
}

const AppLogViewer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [maxLogs, setMaxLogs] = useState(1000);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const { isConnected, aprsIsConnected, stations, packets } = useWebSocket();

  // Add log entry function
  const addLogEntry = (level: LogEntry['level'], source: string, message: string) => {
    const newEntry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      source,
      message
    };
    
    setLogs(prev => {
      const updated = [...prev, newEntry];
      // Keep only the last maxLogs entries
      if (updated.length > maxLogs) {
        return updated.slice(-maxLogs);
      }
      return updated;
    });
  };

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Monitor connection state changes
  useEffect(() => {
    if (isConnected) {
      addLogEntry('info', 'WebSocket', 'Connected to backend server');
    } else {
      addLogEntry('warning', 'WebSocket', 'Disconnected from backend server');
    }
  }, [isConnected]);

  useEffect(() => {
    if (aprsIsConnected) {
      addLogEntry('info', 'APRS-IS', 'Connected to APRS-IS server');
    } else {
      addLogEntry('warning', 'APRS-IS', 'Disconnected from APRS-IS server');
    }
  }, [aprsIsConnected]);

  // Monitor data updates
  useEffect(() => {
    if (stations.length > 0) {
      addLogEntry('debug', 'Data', `Received ${stations.length} station updates`);
    }
  }, [stations.length]);

  useEffect(() => {
    if (packets.length > 0) {
      addLogEntry('debug', 'Data', `Received ${packets.length} packet updates`);
    }
  }, [packets.length]);

  // Initialize with startup log
  useEffect(() => {
    addLogEntry('info', 'App', 'APRSwx application started');
  }, []);

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getLevelColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      case 'info': return '#17a2b8';
      case 'debug': return '#6c757d';
      default: return '#333';
    }
  };

  const getLevelIcon = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const filteredLogs = logs.filter(log => 
    filterLevel === 'all' || log.level === filterLevel
  );

  const clearLogs = () => {
    setLogs([]);
    addLogEntry('info', 'App', 'Log cleared by user');
  };

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        className="log-viewer-toggle"
        title="Open Application Log"
      >
        📋 Log
      </button>
    );
  }

  return (
    <div className="log-viewer-overlay">
      <div className="log-viewer-modal">
        <div className="log-viewer-header">
          <h3>Application Log</h3>
          <div className="log-viewer-controls">
            <select 
              value={filterLevel} 
              onChange={(e) => setFilterLevel(e.target.value)}
              className="log-filter-select"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            <button onClick={clearLogs} className="log-clear-btn">
              Clear
            </button>
            <label className="auto-scroll-label">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button 
              onClick={() => setIsVisible(false)}
              className="log-close-btn"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="log-viewer-content" ref={logContainerRef}>
          {filteredLogs.length === 0 ? (
            <div className="log-empty">
              <p>No log entries to display</p>
            </div>
          ) : (
            <div className="log-entries">
              {filteredLogs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.level}`}>
                  <div className="log-timestamp">
                    {formatTimestamp(log.timestamp)}
                  </div>
                  <div className="log-level" style={{ color: getLevelColor(log.level) }}>
                    {getLevelIcon(log.level)} {log.level.toUpperCase()}
                  </div>
                  <div className="log-source">
                    [{log.source}]
                  </div>
                  <div className="log-message">
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="log-viewer-footer">
          <span className="log-count">
            {filteredLogs.length} entries ({logs.length} total)
          </span>
          <span className="log-status">
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AppLogViewer;
