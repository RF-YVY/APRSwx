import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { APRSPacket } from '../types/aprs';

interface PacketStatistics {
  totalPackets: number;
  packetsLastHour: number;
  packetsLastDay: number;
  uniqueStations: number;
  messageCount: number;
  positionCount: number;
  weatherCount: number;
  statusCount: number;
  averagePacketsPerMinute: number;
  topStations: Array<{ callsign: string; count: number }>;
}

interface PacketStatsProps {
  className?: string;
}

const PacketStats: React.FC<PacketStatsProps> = ({ className }) => {
  const { packets, isConnected } = useWebSocket();
  const [stats, setStats] = useState<PacketStatistics>({
    totalPackets: 0,
    packetsLastHour: 0,
    packetsLastDay: 0,
    uniqueStations: 0,
    messageCount: 0,
    positionCount: 0,
    weatherCount: 0,
    statusCount: 0,
    averagePacketsPerMinute: 0,
    topStations: []
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!packets || packets.length === 0) return;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Calculate statistics
    const totalPackets = packets.length;
    const packetsLastHour = packets.filter(p => new Date(p.timestamp) >= oneHourAgo).length;
    const packetsLastDay = packets.filter(p => new Date(p.timestamp) >= oneDayAgo).length;
    
    const uniqueStations = new Set(packets.map(p => p.source_callsign)).size;
    
    const messageCount = packets.filter(p => p.packet_type === 'message').length;
    const positionCount = packets.filter(p => p.packet_type === 'position').length;
    const weatherCount = packets.filter(p => p.packet_type === 'weather').length;
    const statusCount = packets.filter(p => p.packet_type === 'status').length;

    // Calculate packets per minute over last hour
    const averagePacketsPerMinute = packetsLastHour > 0 ? packetsLastHour / 60 : 0;

    // Get top stations by packet count
    const stationCounts = new Map<string, number>();
    packets.forEach(packet => {
      const count = stationCounts.get(packet.source_callsign) || 0;
      stationCounts.set(packet.source_callsign, count + 1);
    });

    const topStations = Array.from(stationCounts.entries())
      .map(([callsign, count]) => ({ callsign, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setStats({
      totalPackets,
      packetsLastHour,
      packetsLastDay,
      uniqueStations,
      messageCount,
      positionCount,
      weatherCount,
      statusCount,
      averagePacketsPerMinute,
      topStations
    });
  }, [packets]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className={`packet-stats ${className || ''}`}>
      <div className="packet-stats-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="packet-stats-title">
          <span className="packet-stats-icon">📊</span>
          <span>Packet Statistics</span>
          {isConnected && (
            <span className="connection-indicator connected">●</span>
          )}
        </div>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="packet-stats-content">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.totalPackets)}</div>
              <div className="stat-label">Total Packets</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.packetsLastHour)}</div>
              <div className="stat-label">Last Hour</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.packetsLastDay)}</div>
              <div className="stat-label">Last 24h</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatNumber(stats.uniqueStations)}</div>
              <div className="stat-label">Unique Stations</div>
            </div>
          </div>

          <div className="packet-types">
            <h4>Packet Types</h4>
            <div className="type-stats">
              <div className="type-stat">
                <span className="type-icon">📍</span>
                <span className="type-label">Position:</span>
                <span className="type-count">{formatNumber(stats.positionCount)}</span>
              </div>
              <div className="type-stat">
                <span className="type-icon">💬</span>
                <span className="type-label">Messages:</span>
                <span className="type-count">{formatNumber(stats.messageCount)}</span>
              </div>
              <div className="type-stat">
                <span className="type-icon">🌤️</span>
                <span className="type-label">Weather:</span>
                <span className="type-count">{formatNumber(stats.weatherCount)}</span>
              </div>
              <div className="type-stat">
                <span className="type-icon">📄</span>
                <span className="type-label">Status:</span>
                <span className="type-count">{formatNumber(stats.statusCount)}</span>
              </div>
            </div>
          </div>

          <div className="traffic-info">
            <div className="traffic-rate">
              <span className="traffic-label">Average Rate:</span>
              <span className="traffic-value">
                {stats.averagePacketsPerMinute.toFixed(1)} packets/min
              </span>
            </div>
          </div>

          <div className="top-stations">
            <h4>Top Stations</h4>
            <div className="station-list">
              {stats.topStations.map(station => (
                <div key={station.callsign} className="station-item">
                  <span className="station-callsign">{station.callsign}</span>
                  <span className="station-count">{formatNumber(station.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PacketStats;
