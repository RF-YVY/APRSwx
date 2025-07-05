// APRS Data Types

export interface Station {
  id: number;
  callsign: string;
  station_type: string;
  symbol_table: string;
  symbol_code: string;
  emoji_symbol?: string;
  last_heard: string | null;
  latitude: number | null;
  longitude: number | null;
  last_comment: string;
  comment?: string;
  course?: number | null;
  speed?: number | null;
  altitude?: number | null;
  packet_count: number;
}

// Alias for backward compatibility
export type APRSStation = Station;

export interface APRSPacket {
  id: number;
  source_callsign: string;
  packet_type: string;
  timestamp: string;
  raw_packet: string;
  parsed_data: Record<string, any>;
}

export interface WeatherObservation {
  id: number;
  station_id: string;
  observation_time: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  precipitation_1h: number | null;
  rainfall?: number | null;
}

// Alias for backward compatibility
export type WeatherData = WeatherObservation;

export interface WeatherAlert {
  id: number;
  alert_id: string;
  alert_type: string;
  event_type: string;
  title: string;
  description: string;
  severity: string;
  effective_at: string;
  expires_at: string;
}

export interface APRSMessage {
  id: number;
  source_callsign: string;
  addressee: string;
  message_text: string;
  timestamp: string;
  is_ack: boolean;
  message_number: string;
}

export interface RadarSweep {
  id: number;
  site_id: string;
  product_code: string;
  sweep_time: string;
  elevation_angle: number;
  data_url: string;
}

// WebSocket Message Types

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  [key: string]: any;
}

export interface InitialPacketsMessage extends WebSocketMessage {
  type: 'initial_packets';
  packets: APRSPacket[];
}

export interface PacketUpdateMessage extends WebSocketMessage {
  type: 'packet_update';
  packet: APRSPacket;
}

export interface InitialStationsMessage extends WebSocketMessage {
  type: 'initial_stations';
  stations: Station[];
}

export interface StationUpdateMessage extends WebSocketMessage {
  type: 'station_update';
  station: Station;
}

export interface InitialWeatherMessage extends WebSocketMessage {
  type: 'initial_weather';
  observations: WeatherObservation[];
  alerts: WeatherAlert[];
}

export interface WeatherUpdateMessage extends WebSocketMessage {
  type: 'weather_update';
  data: WeatherObservation;
}

export interface WeatherAlertMessage extends WebSocketMessage {
  type: 'weather_alert';
  alert: WeatherAlert;
}

export interface InitialRadarMessage extends WebSocketMessage {
  type: 'initial_radar';
  sweeps: RadarSweep[];
}

export interface RadarUpdateMessage extends WebSocketMessage {
  type: 'radar_update';
  sweep: RadarSweep;
}

export interface InitialMessagesMessage extends WebSocketMessage {
  type: 'initial_messages';
  messages: APRSMessage[];
}

export interface MessageUpdateMessage extends WebSocketMessage {
  type: 'message_update';
  message: APRSMessage;
}

// Map related types

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

// Connection status

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Filter types

export interface StationFilter {
  station_types?: string[];
  callsigns?: string[];
  within_km?: number;
  active_only?: boolean;
}

export interface PacketFilter {
  packet_types?: string[];
  callsigns?: string[];
  since?: string;
}

export interface WeatherFilter {
  products?: string[];
  alert_types?: string[];
  severity?: string[];
}

// Component Props

export interface APRSMapProps {
  stations?: Station[];
  onStationClick?: (station: Station) => void;
  center?: MapCenter;
  zoom?: number;
}

export interface StationListProps {
  stations?: Station[];
  onStationSelect?: (station: Station) => void;
  filter?: StationFilter;
}

export interface WeatherPanelProps {
  observations?: WeatherObservation[];
  alerts?: WeatherAlert[];
}

export interface MessagePanelProps {
  messages?: APRSMessage[];
  onSendMessage?: (addressee: string, message: string) => void;
}

// WebSocket Context Types

export interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  aprsIsConnected: boolean;
  stations: Station[];
  packets: APRSPacket[];
  weather: {
    observations: WeatherObservation[];
    alerts: WeatherAlert[];
  };
  weatherData: WeatherObservation[];
  radar: RadarSweep[];
  radarData: RadarSweep[];
  messages: APRSMessage[];
  subscribe: (type: string, filters?: Record<string, any>) => void;
  unsubscribe: (type: string) => void;
  sendMessage: (message: Record<string, any>) => void;
  sendAPRSISConnect: () => void;
  sendAPRSISDisconnect: () => void;
}

// Utility Types

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DistanceResult {
  distance: number; // in kilometers
  bearing: number; // in degrees
}

// Error Types

export interface APRSError {
  message: string;
  code?: string;
  timestamp: string;
}
