import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import {
  WebSocketContextType,
  ConnectionStatus,
  Station,
  APRSPacket,
  WeatherObservation,
  WeatherAlert,
  RadarSweep,
  APRSMessage,
  WebSocketMessage
} from '../types/aprs';
import { notificationService } from '../services/notificationService';

// WebSocket state interface
interface WebSocketState {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  aprsIsConnected: boolean;
  stations: Station[];
  packets: APRSPacket[];
  weather: {
    observations: WeatherObservation[];
    alerts: WeatherAlert[];
  };
  radar: RadarSweep[];
  messages: APRSMessage[];
  error: string | null;
}

// Action types
type WebSocketAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_APRS_IS_STATUS'; payload: boolean }
  | { type: 'SET_INITIAL_STATIONS'; payload: Station[] }
  | { type: 'UPDATE_STATION'; payload: Station }
  | { type: 'SET_INITIAL_PACKETS'; payload: APRSPacket[] }
  | { type: 'ADD_PACKET'; payload: APRSPacket }
  | { type: 'SET_INITIAL_WEATHER'; payload: { observations: WeatherObservation[]; alerts: WeatherAlert[] } }
  | { type: 'UPDATE_WEATHER'; payload: WeatherObservation }
  | { type: 'ADD_WEATHER_ALERT'; payload: WeatherAlert }
  | { type: 'SET_INITIAL_RADAR'; payload: RadarSweep[] }
  | { type: 'UPDATE_RADAR'; payload: RadarSweep }
  | { type: 'SET_INITIAL_MESSAGES'; payload: APRSMessage[] }
  | { type: 'ADD_MESSAGE'; payload: APRSMessage }
  | { type: 'SET_ERROR'; payload: string | null };

// Initial state
const initialState: WebSocketState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  aprsIsConnected: false,
  stations: [], // Start with empty array - only populate when actually received
  packets: [], // Start with empty array - only populate when actually received
  weather: {
    observations: [],
    alerts: []
  },
  radar: [],
  messages: [],
  error: null
};

// Reducer
function webSocketReducer(state: WebSocketState, action: WebSocketAction): WebSocketState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
        isConnected: action.payload === 'connected'
      };
    
    case 'SET_APRS_IS_STATUS':
      return {
        ...state,
        aprsIsConnected: action.payload
      };
    
    case 'SET_INITIAL_STATIONS':
      return {
        ...state,
        stations: action.payload
      };
    
    case 'UPDATE_STATION':
      return {
        ...state,
        stations: state.stations.map(station =>
          station.id === action.payload.id ? action.payload : station
        ).concat(
          state.stations.find(s => s.id === action.payload.id) ? [] : [action.payload]
        )
      };
    
    case 'SET_INITIAL_PACKETS':
      return {
        ...state,
        packets: action.payload
      };
    
    case 'ADD_PACKET':
      return {
        ...state,
        packets: [action.payload, ...state.packets.slice(0, 99)] // Keep last 100 packets
      };
    
    case 'SET_INITIAL_WEATHER':
      return {
        ...state,
        weather: action.payload
      };
    
    case 'UPDATE_WEATHER':
      return {
        ...state,
        weather: {
          ...state.weather,
          observations: [action.payload, ...state.weather.observations.slice(0, 49)] // Keep last 50
        }
      };
    
    case 'ADD_WEATHER_ALERT':
      return {
        ...state,
        weather: {
          ...state.weather,
          alerts: state.weather.alerts.filter(alert => alert.alert_id !== action.payload.alert_id)
            .concat([action.payload])
        }
      };
    
    case 'SET_INITIAL_RADAR':
      return {
        ...state,
        radar: action.payload
      };
    
    case 'UPDATE_RADAR':
      return {
        ...state,
        radar: [action.payload, ...state.radar.slice(0, 9)] // Keep last 10 radar sweeps
      };
    
    case 'SET_INITIAL_MESSAGES':
      return {
        ...state,
        messages: action.payload
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [action.payload, ...state.messages.slice(0, 99)] // Keep last 100 messages
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    
    default:
      return state;
  }
}

// Create context
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// WebSocket provider component
interface WebSocketProviderProps {
  children: React.ReactNode;
  userSettings?: {
    aprsIsConnected: boolean;
    callsign?: string;
    ssid?: number;
    passcode?: number;
    location?: { latitude: number; longitude: number } | null;
    aprsIsFilters?: {
      distanceRange: number;
      stationTypes: string[];
      enableWeather: boolean;
      enableMessages: boolean;
    };
  } | null;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children, userSettings }) => {
  const [state, dispatch] = useReducer(webSocketReducer, initialState);
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<number | null>(null);
  const reconnectAttempts = React.useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Always establish WebSocket connection for the frontend to work properly
    // APRS-IS connection is handled separately via sendAPRSISConnect()
    
    // Clear stations when not connected to APRS-IS
    if (!userSettings?.aprsIsConnected) {
      dispatch({ type: 'SET_INITIAL_STATIONS', payload: [] });
      dispatch({ type: 'SET_INITIAL_PACKETS', payload: [] });
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
    
    try {
      // Connect to multiple WebSocket endpoints
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:8000/ws/aprs/' 
        : `ws://${window.location.host}/ws/aprs/`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connected' });
        dispatch({ type: 'SET_ERROR', payload: null });
        reconnectAttempts.current = 0;
        
        // Subscribe to all data types
        subscribe('packets');
        subscribe('stations');
        subscribe('weather');
        subscribe('radar');
        subscribe('messages');
        
        // Only send APRS-IS connection request if explicitly requested
        // (This happens when user clicks connect button via sendAPRSISConnect())
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
        
        // Attempt to reconnect unless it was a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: 'Connection error' });
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect' });
    }
  }, [userSettings]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
    // Clear all data when disconnecting
    dispatch({ type: 'SET_INITIAL_STATIONS', payload: [] });
    dispatch({ type: 'SET_INITIAL_PACKETS', payload: [] });
  }, []);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'initial_stations':
        dispatch({ type: 'SET_INITIAL_STATIONS', payload: message.stations });
        break;
      
      case 'station_update':
        dispatch({ type: 'UPDATE_STATION', payload: message.station });
        break;
      
      case 'initial_packets':
        dispatch({ type: 'SET_INITIAL_PACKETS', payload: message.packets });
        break;
      
      case 'packet_update':
        dispatch({ type: 'ADD_PACKET', payload: message.packet });
        break;
      
      case 'initial_weather':
        dispatch({ 
          type: 'SET_INITIAL_WEATHER', 
          payload: { 
            observations: message.observations, 
            alerts: message.alerts 
          } 
        });
        break;
      
      case 'weather_update':
        dispatch({ type: 'UPDATE_WEATHER', payload: message.data });
        break;
      
      case 'weather_alert':
        dispatch({ type: 'ADD_WEATHER_ALERT', payload: message.alert });
        break;
      
      case 'initial_radar':
        dispatch({ type: 'SET_INITIAL_RADAR', payload: message.sweeps });
        break;
      
      case 'radar_update':
        dispatch({ type: 'UPDATE_RADAR', payload: message.sweep });
        break;
      
      case 'initial_messages':
        dispatch({ type: 'SET_INITIAL_MESSAGES', payload: message.messages });
        break;
      
      case 'message_update':
        dispatch({ type: 'ADD_MESSAGE', payload: message.message });
        break;
      
      case 'error':
        dispatch({ type: 'SET_ERROR', payload: message.message });
        break;
      
      case 'aprsis_connecting':
        dispatch({ type: 'SET_APRS_IS_STATUS', payload: false });
        // Show connecting notification
        const connectingEvent = new CustomEvent('showNotification', {
          detail: {
            message: 'Connecting to APRS-IS...',
            type: 'info'
          }
        });
        window.dispatchEvent(connectingEvent);
        break;
      
      case 'aprsis_status':
        dispatch({ type: 'SET_APRS_IS_STATUS', payload: message.connected || false });
        if (message.connected) {
          // Show success notification
          const successEvent = new CustomEvent('showNotification', {
            detail: {
              message: 'APRS-IS connection established successfully',
              type: 'success'
            }
          });
          window.dispatchEvent(successEvent);
        } else if (message.error) {
          dispatch({ type: 'SET_ERROR', payload: message.error });
          // Show error notification
          const errorEvent = new CustomEvent('showNotification', {
            detail: {
              message: message.error || 'APRS-IS connection failed',
              type: 'error'
            }
          });
          window.dispatchEvent(errorEvent);
        }
        break;
      
      case 'aprsis_disconnected':
        dispatch({ type: 'SET_APRS_IS_STATUS', payload: false });
        dispatch({ type: 'SET_INITIAL_STATIONS', payload: [] });
        dispatch({ type: 'SET_INITIAL_PACKETS', payload: [] });
        // Show disconnect notification
        const disconnectEvent = new CustomEvent('showNotification', {
          detail: {
            message: 'APRS-IS connection lost',
            type: 'warning'
          }
        });
        window.dispatchEvent(disconnectEvent);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  const subscribe = useCallback((type: string, filters?: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        subscription_type: type,
        filters: filters || {}
      }));
    }
  }, []);

  const unsubscribe = useCallback((type: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        subscription_type: type
      }));
    }
  }, []);

  const sendMessage = useCallback((message: Record<string, any>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendAPRSISConnect = useCallback(async () => {
    if (!userSettings) {
      notificationService.error('Connection Error', 'Please configure your settings first');
      return;
    }

    // Validate all required settings are properly configured
    if (!userSettings.callsign || 
        !userSettings.passcode || 
        !userSettings.location || 
        !userSettings.aprsIsFilters?.distanceRange ||
        userSettings.callsign.trim() === '' ||
        userSettings.passcode <= 0) {
      notificationService.error('Setup Required', 'Complete APRS-IS setup required: callsign, valid passcode, location, and filters must be configured');
      return;
    }

    // Check if WebSocket is ready
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      notificationService.error('Connection Error', 'WebSocket is not connected. Please wait for connection.');
      return;
    }

    try {
      notificationService.info('Connecting...', 'Attempting to connect to APRS-IS...');
      
      // Format callsign with SSID (e.g., K5YVY-15)
      const ssid = userSettings.ssid || 0;
      const fullCallsign = ssid > 0 
        ? `${userSettings.callsign}-${ssid}`
        : userSettings.callsign || '';
        
      const message = {
        type: 'connect_aprsis',
        user_settings: {
          callsign: fullCallsign,
          passcode: userSettings.passcode,
          location: userSettings.location,
          aprsIsFilters: userSettings.aprsIsFilters
        }
      };

      console.log('Sending APRS-IS connection request:', message);
      wsRef.current.send(JSON.stringify(message));

      // Wait for connection response or timeout
      const connectionTimeout = setTimeout(() => {
        if (!state.aprsIsConnected) {
          notificationService.error('Connection Timeout', 'APRS-IS connection timed out. Please check your settings.');
        }
      }, 10000);

      // Clear timeout when connection is established
      const originalAprsIsConnected = state.aprsIsConnected;
      setTimeout(() => {
        if (state.aprsIsConnected && !originalAprsIsConnected) {
          clearTimeout(connectionTimeout);
          notificationService.success('Connected', `Successfully connected to APRS-IS as ${fullCallsign}`);
        }
      }, 1000);
    } catch (error) {
      console.error('Error connecting to APRS-IS:', error);
      notificationService.error('Connection Error', 'Failed to connect to APRS-IS');
    }
  }, [userSettings, state.aprsIsConnected]);

  const sendAPRSISDisconnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'disconnect_aprsis'
      }));
      dispatch({ type: 'SET_APRS_IS_STATUS', payload: false });
      notificationService.info('Disconnected', 'APRS-IS connection has been closed');
    }
  }, []);

  // Fetch initial data via REST API
  const fetchInitialData = useCallback(async () => {
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8000' 
        : '';
      
      // Fetch stations
      const stationsResponse = await fetch(`${baseUrl}/api/stations/`);
      if (stationsResponse.ok) {
        const stationsData = await stationsResponse.json();
        dispatch({ type: 'SET_INITIAL_STATIONS', payload: stationsData.results || stationsData });
      }
      
      // Fetch packets
      const packetsResponse = await fetch(`${baseUrl}/api/packets/packets/`);
      if (packetsResponse.ok) {
        const packetsData = await packetsResponse.json();
        dispatch({ type: 'SET_INITIAL_PACKETS', payload: packetsData.results || packetsData });
      }
      
    } catch (error) {
      console.error('Error fetching initial data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load initial data' });
    }
  }, []);

  // Always establish WebSocket connection for the frontend to work
  useEffect(() => {
    fetchInitialData();
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect, fetchInitialData]);

  // Ping to keep connection alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, []);

  const contextValue: WebSocketContextType = {
    isConnected: state.isConnected,
    connectionStatus: state.connectionStatus,
    aprsIsConnected: state.aprsIsConnected,
    stations: state.stations,
    packets: state.packets,
    weather: state.weather,
    weatherData: state.weather.observations,
    radar: state.radar,
    radarData: state.radar,
    messages: state.messages,
    subscribe,
    unsubscribe,
    sendMessage,
    sendAPRSISConnect,
    sendAPRSISDisconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Hook to use WebSocket context
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
