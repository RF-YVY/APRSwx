import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'gps' | 'manual' | 'map';
}

interface UserSettings {
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

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('aprswx_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('aprswx_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
