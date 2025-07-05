import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsService } from '../services/settingsService';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'manual' | 'map';
}

export interface UserSettings {
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
  tncSettings: {
    enabled: boolean;
    // Connection Settings
    port: string;
    baudRate: number;
    connectionType: 'serial' | 'network' | 'usb';
    networkHost?: string;
    networkPort?: number;
    
    // Audio Settings
    audioInput: string;
    audioOutput: string;
    audioInputGain: number;
    audioOutputGain: number;
    
    // PTT Settings
    pttMethod: 'vox' | 'cat' | 'rts' | 'dtr' | 'gpio' | 'rigctl' | 'omnirig' | 'hamlib';
    pttPin: string;
    
    // Radio Control Integration
    radioControl: {
      enabled: boolean;
      type: 'rigctl' | 'omnirig' | 'hamlib' | 'none';
      rigctlPath?: string;
      rigctlArgs?: string;
      omnirigPort?: number;
      hamlibRigModel?: string;
      hamlibDevice?: string;
      frequency?: number;
      mode?: string;
    };
    
    // TNC Protocol Settings
    kissMode: boolean;
    txDelay: number;
    persistence: number;
    slotTime: number;
    txTail: number;
    fullDuplex: boolean;
    
    // Packet Settings
    maxFrameLength: number;
    retries: number;
    respTime: number;
  };
}

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
    distanceRange: 100,
    stationTypes: ['mobile', 'fixed', 'weather', 'digipeater', 'igate'],
    enableWeather: true,
    enableMessages: true
  },
  tncSettings: {
    enabled: false,
    connectionType: 'serial',
    port: 'COM1',
    baudRate: 9600,
    audioInput: 'default',
    audioOutput: 'default',
    audioInputGain: 50,
    audioOutputGain: 50,
    pttMethod: 'vox',
    pttPin: 'RTS',
    radioControl: {
      enabled: false,
      type: 'none'
    },
    kissMode: true,
    txDelay: 30,
    persistence: 63,
    slotTime: 10,
    txTail: 5,
    fullDuplex: false,
    maxFrameLength: 256,
    retries: 3,
    respTime: 3000
  }
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
  saveError: string | null;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load settings from backend API on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const loadedSettings = await SettingsService.loadSettings();
        
        if (loadedSettings) {
          console.log('Loaded settings from service:', loadedSettings);
          // Always set aprsIsConnected to false on app start to prevent auto-connection
          setSettings({ 
            ...defaultSettings, 
            ...loadedSettings, 
            aprsIsConnected: false 
          });
        } else {
          console.log('No settings found, using empty defaults');
          // Use default settings if none found, but ensure truly empty fields
          setSettings({
            ...defaultSettings, 
            callsign: '',          // Ensure empty callsign
            ssid: 0,               // Default SSID but will show as empty in UI
            passcode: -1,          // Ensure default passcode (will show as empty)
            aprsIsConnected: false 
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSaveError('Failed to load settings from server');
        // Use default settings on error
        setSettings(prev => ({ ...prev, aprsIsConnected: false }));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setSaveError(null);
    
    // Save to backend API
    try {
      const success = await SettingsService.saveSettings(newSettings);
      if (!success) {
        setSaveError('Failed to save settings to server');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Failed to save settings to server');
    }
  };

  const resetSettings = async () => {
    setSettings(defaultSettings);
    setSaveError(null);
    
    // Save reset settings to backend API
    try {
      const success = await SettingsService.saveSettings(defaultSettings);
      if (!success) {
        setSaveError('Failed to save settings to server');
      }
    } catch (error) {
      console.error('Error saving reset settings:', error);
      setSaveError('Failed to save settings to server');
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      updateSettings, 
      resetSettings, 
      isLoading, 
      saveError 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
