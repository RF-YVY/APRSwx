import { useState, useEffect } from 'react';

export interface UserSettings {
  callsign: string;
  passcode: number;
  location: { latitude: number; longitude: number } | null;
  distanceUnit: 'km' | 'mi';
  darkMode: boolean;
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

const DEFAULT_SETTINGS: UserSettings = {
  callsign: '',
  passcode: 0,
  location: null,
  distanceUnit: 'km',
  darkMode: false,
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

const STORAGE_KEY = 'aprswx_user_settings';

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // Merge with defaults to ensure all fields exist
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('Error saving user settings:', error);
      }
    }
  }, [settings, isLoaded]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded
  };
}

export default useUserSettings;
