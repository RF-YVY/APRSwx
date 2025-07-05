import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { APRSStation, APRSPacket } from '../types/aprs';

interface ExportOptions {
  format: 'csv' | 'json' | 'kml';
  dataType: 'stations' | 'packets' | 'both';
  timeRange: 'all' | 'last24h' | 'last7d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  includeWeatherData: boolean;
  includeComments: boolean;
  includeRawPackets: boolean;
  selectedStationsOnly: boolean;
}

interface ExportPanelProps {
  selectedStations?: APRSStation[];
  className?: string;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ selectedStations, className }) => {
  const { stations, packets } = useWebSocket();
  const [isExpanded, setIsExpanded] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dataType: 'stations',
    timeRange: 'all',
    includeWeatherData: true,
    includeComments: true,
    includeRawPackets: false,
    selectedStationsOnly: false
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!stations || stations.length === 0) {
      alert('No data available to export');
      return;
    }

    setIsExporting(true);
    
    try {
      // Filter data based on options
      const filteredStations = getFilteredStations();
      const filteredPackets = getFilteredPackets();

      let exportData: any;
      let fileName: string;

      switch (exportOptions.format) {
        case 'csv':
          exportData = generateCSV(filteredStations, filteredPackets);
          fileName = `aprs_export_${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'json':
          exportData = generateJSON(filteredStations, filteredPackets);
          fileName = `aprs_export_${new Date().toISOString().split('T')[0]}.json`;
          break;
        case 'kml':
          exportData = generateKML(filteredStations);
          fileName = `aprs_export_${new Date().toISOString().split('T')[0]}.kml`;
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Create and download file
      const blob = new Blob([exportData], { 
        type: exportOptions.format === 'csv' ? 'text/csv' : 
              exportOptions.format === 'json' ? 'application/json' : 
              'application/vnd.google-earth.kml+xml' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message
      setTimeout(() => {
        alert(`Export completed successfully! Downloaded: ${fileName}`);
      }, 100);

    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getFilteredStations = (): APRSStation[] => {
    let filtered = exportOptions.selectedStationsOnly && selectedStations 
      ? selectedStations 
      : stations;

    // Apply time filter if applicable
    if (exportOptions.timeRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (exportOptions.timeRange) {
        case 'last24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (exportOptions.customStartDate) {
            cutoffDate = new Date(exportOptions.customStartDate);
          } else {
            cutoffDate = new Date(0);
          }
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(station => {
        if (!station.last_heard) return false;
        const lastHeard = new Date(station.last_heard);
        return lastHeard >= cutoffDate;
      });
    }

    return filtered;
  };

  const getFilteredPackets = (): APRSPacket[] => {
    if (exportOptions.dataType === 'stations') return [];
    
    let filtered = packets || [];

    // Apply time filter
    if (exportOptions.timeRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (exportOptions.timeRange) {
        case 'last24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'last7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (exportOptions.customStartDate) {
            cutoffDate = new Date(exportOptions.customStartDate);
          } else {
            cutoffDate = new Date(0);
          }
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(packet => {
        const packetDate = new Date(packet.timestamp);
        return packetDate >= cutoffDate;
      });
    }

    return filtered;
  };

  const generateCSV = (stations: APRSStation[], packets: APRSPacket[]): string => {
    const csvRows: string[] = [];
    
    if (exportOptions.dataType === 'stations' || exportOptions.dataType === 'both') {
      // Station data CSV
      csvRows.push('Station Data');
      csvRows.push('');
      
      const stationHeaders = [
        'Callsign',
        'Station Type',
        'Symbol',
        'Latitude',
        'Longitude',
        'Last Heard',
        'Packet Count',
        'Course',
        'Speed',
        'Altitude'
      ];
      
      if (exportOptions.includeComments) {
        stationHeaders.push('Comment');
      }
      
      csvRows.push(stationHeaders.join(','));
      
      stations.forEach(station => {
        const row = [
          station.callsign,
          station.station_type,
          `${station.symbol_table}${station.symbol_code}`,
          station.latitude || '',
          station.longitude || '',
          station.last_heard || '',
          station.packet_count,
          station.course || '',
          station.speed || '',
          station.altitude || ''
        ];
        
        if (exportOptions.includeComments) {
          row.push(station.comment || '');
        }
        
        csvRows.push(row.map(val => `"${val}"`).join(','));
      });
      
      if (exportOptions.dataType === 'both') {
        csvRows.push('');
        csvRows.push('');
      }
    }
    
    if (exportOptions.dataType === 'packets' || exportOptions.dataType === 'both') {
      // Packet data CSV
      csvRows.push('Packet Data');
      csvRows.push('');
      
      const packetHeaders = [
        'Source Callsign',
        'Packet Type',
        'Timestamp'
      ];
      
      if (exportOptions.includeRawPackets) {
        packetHeaders.push('Raw Packet');
      }
      
      csvRows.push(packetHeaders.join(','));
      
      packets.forEach(packet => {
        const row = [
          packet.source_callsign,
          packet.packet_type,
          packet.timestamp
        ];
        
        if (exportOptions.includeRawPackets) {
          row.push(packet.raw_packet || '');
        }
        
        csvRows.push(row.map(val => `"${val}"`).join(','));
      });
    }
    
    return csvRows.join('\n');
  };

  const generateJSON = (stations: APRSStation[], packets: APRSPacket[]): string => {
    const data: any = {
      export_info: {
        timestamp: new Date().toISOString(),
        export_options: exportOptions,
        total_stations: stations.length,
        total_packets: packets.length
      }
    };

    if (exportOptions.dataType === 'stations' || exportOptions.dataType === 'both') {
      data.stations = stations.map(station => ({
        callsign: station.callsign,
        station_type: station.station_type,
        symbol_table: station.symbol_table,
        symbol_code: station.symbol_code,
        latitude: station.latitude,
        longitude: station.longitude,
        last_heard: station.last_heard,
        packet_count: station.packet_count,
        course: station.course,
        speed: station.speed,
        altitude: station.altitude,
        ...(exportOptions.includeComments && { comment: station.comment })
      }));
    }

    if (exportOptions.dataType === 'packets' || exportOptions.dataType === 'both') {
      data.packets = packets.map(packet => ({
        source_callsign: packet.source_callsign,
        packet_type: packet.packet_type,
        timestamp: packet.timestamp,
        parsed_data: packet.parsed_data,
        ...(exportOptions.includeRawPackets && { raw_packet: packet.raw_packet })
      }));
    }

    return JSON.stringify(data, null, 2);
  };

  const generateKML = (stations: APRSStation[]): string => {
    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>APRS Stations Export</name>
    <description>Exported from APRSwx on ${new Date().toISOString()}</description>`;

    const kmlFooter = `
  </Document>
</kml>`;

    const placemarks = stations
      .filter(station => station.latitude && station.longitude)
      .map(station => `
    <Placemark>
      <name>${station.callsign}</name>
      <description><![CDATA[
        Station Type: ${station.station_type}<br/>
        Symbol: ${station.symbol_table}${station.symbol_code}<br/>
        Last Heard: ${station.last_heard || 'Unknown'}<br/>
        Packet Count: ${station.packet_count}<br/>
        ${station.course ? `Course: ${station.course}°<br/>` : ''}
        ${station.speed ? `Speed: ${station.speed} mph<br/>` : ''}
        ${station.altitude ? `Altitude: ${station.altitude} ft<br/>` : ''}
        ${station.comment ? `Comment: ${station.comment}<br/>` : ''}
      ]]></description>
      <Point>
        <coordinates>${station.longitude},${station.latitude},${station.altitude || 0}</coordinates>
      </Point>
    </Placemark>`);

    return kmlHeader + placemarks.join('') + kmlFooter;
  };

  const getDataCount = () => {
    if (exportOptions.dataType === 'stations') {
      return `${getFilteredStations().length} stations`;
    } else if (exportOptions.dataType === 'packets') {
      return `${getFilteredPackets().length} packets`;
    } else {
      return `${getFilteredStations().length} stations, ${getFilteredPackets().length} packets`;
    }
  };

  return (
    <div className={`export-panel ${className || ''}`}>
      <div className="export-panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="export-panel-title">
          <span className="export-panel-icon">💾</span>
          <span>Export Data</span>
        </div>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="export-panel-content">
          <div className="export-options">
            <div className="option-group">
              <label className="option-label">Format:</label>
              <select 
                value={exportOptions.format} 
                onChange={(e) => setExportOptions({...exportOptions, format: e.target.value as 'csv' | 'json' | 'kml'})}
                className="export-select"
              >
                <option value="csv">CSV (Spreadsheet)</option>
                <option value="json">JSON (Data)</option>
                <option value="kml">KML (Google Earth)</option>
              </select>
            </div>

            <div className="option-group">
              <label className="option-label">Data Type:</label>
              <select 
                value={exportOptions.dataType} 
                onChange={(e) => setExportOptions({...exportOptions, dataType: e.target.value as 'stations' | 'packets' | 'both'})}
                className="export-select"
              >
                <option value="stations">Stations Only</option>
                <option value="packets">Packets Only</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className="option-group">
              <label className="option-label">Time Range:</label>
              <select 
                value={exportOptions.timeRange} 
                onChange={(e) => setExportOptions({...exportOptions, timeRange: e.target.value as 'all' | 'last24h' | 'last7d' | 'custom'})}
                className="export-select"
              >
                <option value="all">All Time</option>
                <option value="last24h">Last 24 Hours</option>
                <option value="last7d">Last 7 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {exportOptions.timeRange === 'custom' && (
              <div className="custom-date-range">
                <div className="option-group">
                  <label className="option-label">Start Date:</label>
                  <input 
                    type="datetime-local" 
                    value={exportOptions.customStartDate || ''}
                    onChange={(e) => setExportOptions({...exportOptions, customStartDate: e.target.value})}
                    className="export-input"
                  />
                </div>
                <div className="option-group">
                  <label className="option-label">End Date:</label>
                  <input 
                    type="datetime-local" 
                    value={exportOptions.customEndDate || ''}
                    onChange={(e) => setExportOptions({...exportOptions, customEndDate: e.target.value})}
                    className="export-input"
                  />
                </div>
              </div>
            )}

            <div className="option-checkboxes">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={exportOptions.includeComments}
                  onChange={(e) => setExportOptions({...exportOptions, includeComments: e.target.checked})}
                />
                Include Comments
              </label>
              
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={exportOptions.includeRawPackets}
                  onChange={(e) => setExportOptions({...exportOptions, includeRawPackets: e.target.checked})}
                />
                Include Raw Packets
              </label>
              
              {selectedStations && selectedStations.length > 0 && (
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.selectedStationsOnly}
                    onChange={(e) => setExportOptions({...exportOptions, selectedStationsOnly: e.target.checked})}
                  />
                  Selected Stations Only ({selectedStations.length})
                </label>
              )}
            </div>
          </div>

          <div className="export-summary">
            <div className="export-summary-text">
              Ready to export: {getDataCount()}
            </div>
            <button 
              className="export-button"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPanel;
