// Settings service for database persistence
import type { UserSettings } from '../context/SettingsContext';

// Re-export UserSettings type for convenience
export type { UserSettings };

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8000'
  : '';

export class SettingsService {
  /**
   * Load settings from database
   */
  static async loadSettings(): Promise<UserSettings | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/websockets/settings/`, {
        method: 'GET',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.settings) {
        console.log('Settings loaded from database:', data.settings);
        return data.settings;
      }
      
      console.log('No settings found in database');
      return null;
    } catch (error) {
      console.error('Failed to load settings from database:', error);
      console.warn('Database connection failed, using localStorage fallback');
      
      // Only use localStorage fallback if database is completely unreachable
      try {
        const saved = localStorage.getItem('aprswx_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          console.log('Fallback to localStorage settings:', parsed);
          return parsed;
        }
      } catch (localError) {
        console.error('Failed to load from localStorage:', localError);
      }
      
      return null;
    }
  }

  /**
   * Save settings to database
   */
  static async saveSettings(settings: UserSettings): Promise<boolean> {
    try {
      // Always save to localStorage as backup
      localStorage.setItem('aprswx_settings', JSON.stringify(settings));

      const response = await fetch(`${API_BASE_URL}/api/websockets/settings/`, {
        method: 'POST',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('Settings saved to database successfully');
        return true;
      } else {
        console.error('Failed to save settings:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to save settings to database:', error);
      // At least we have localStorage backup
      return false;
    }
  }

  /**
   * Clear all settings
   */
  static async clearSettings(): Promise<void> {
    try {
      localStorage.removeItem('aprswx_settings');
      
      // Could add API call to clear database settings here if needed
      console.log('Settings cleared');
    } catch (error) {
      console.error('Failed to clear settings:', error);
    }
  }
}
