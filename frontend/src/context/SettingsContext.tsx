import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserSettings {
  callsign: string;
  ssid: number;
  passcode: number;
  location: { latitude: number; longitude: number } | null;
  distanceUnit: 'km' | 'miles';
  aprsIsConnected: boolean;
  aprsIsFilters: {
    distanceRange: number;
    stationTypes: string[];
    enableWeather: boolean;
    enableMessages: boolean;
  };
  tncSettings: {
    enabled: boolean;
    port: string;
    baudRate: number;
    audioDevice: string;
    pttMethod: string;
  };
}

const defaultSettings: UserSettings = {
  callsign: '',
  ssid: 0,
  passcode: 0,
  location: null,
  distanceUnit: 'km',
  aprsIsConnected: false,
  aprsIsFilters: {
    distanceRange: 50,
    stationTypes: ['all', 'mobile', 'fixed', 'weather'],
    enableWeather: true,
    enableMessages: true
  },
  tncSettings: {
    enabled: false,
    port: 'COM1',
    baudRate: 9600,
    audioDevice: 'default',
    pttMethod: 'VOX'
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
