// Saratoga Weather Blitzortung Placefile Service
// Converts placefile format to JSON for use in the application

export interface BlitzortungStrike {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  age: number; // minutes since strike
  intensity: number;
  polarity: 'positive' | 'negative' | 'unknown';
}

export interface BlitzortungData {
  strikes: BlitzortungStrike[];
  lastUpdate: Date;
  count: number;
}

class SaratogaBlitzortungService {
  private url: string;
  private updateInterval: number;
  private timer: number | null = null;
  private subscribers: ((data: BlitzortungData) => void)[] = [];
  private currentData: BlitzortungData | null = null;

  constructor(url: string = 'https://saratoga-weather.org/USA-blitzortung/placefile-nobCT.txt', intervalMs: number = 60000) {
    this.url = url;
    this.updateInterval = intervalMs;
  }

  // Start the service
  start(): void {
    this.fetchAndNotify();
    this.timer = window.setInterval(() => this.fetchAndNotify(), this.updateInterval);
  }

  // Stop the service
  stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Subscribe to updates
  subscribe(callback: (data: BlitzortungData) => void): () => void {
    this.subscribers.push(callback);
    // Send current data if available
    if (this.currentData) {
      callback(this.currentData);
    }
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Fetch and parse the placefile
  private async fetchAndNotify(): Promise<void> {
    try {
      const response = await fetch(this.url, {
        mode: 'cors',
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      const data = this.parsePlacefile(text);
      
      this.currentData = data;
      this.subscribers.forEach(callback => callback(data));
      
      console.log(`Updated ${data.strikes.length} lightning strikes from Saratoga Weather`);
    } catch (error) {
      console.error('Error fetching Saratoga lightning data:', error);
      
      // Return empty data on error
      const emptyData: BlitzortungData = {
        strikes: [],
        lastUpdate: new Date(),
        count: 0
      };
      
      this.currentData = emptyData;
      this.subscribers.forEach(callback => callback(emptyData));
    }
  }

  // Parse the placefile format
  private parsePlacefile(text: string): BlitzortungData {
    const strikes: BlitzortungStrike[] = [];
    const lines = text.split('\n');
    const now = new Date();

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('//')) {
        continue;
      }

      // Parse Object lines - format: Object: lat,lon
      if (trimmed.startsWith('Object:')) {
        const objectMatch = trimmed.match(/Object:\s*([^,]+),\s*([^,]+)/);
        if (objectMatch) {
          const lat = parseFloat(objectMatch[1]);
          const lon = parseFloat(objectMatch[2]);
          
          if (!isNaN(lat) && !isNaN(lon)) {
            // Generate a unique ID based on coordinates and timestamp
            const id = `blitz_${lat.toFixed(4)}_${lon.toFixed(4)}_${now.getTime()}_${strikes.length}`;
            
            strikes.push({
              id,
              latitude: lat,
              longitude: lon,
              timestamp: now,
              age: 0, // Assume recent since we don't have timestamp info
              intensity: Math.floor(Math.random() * 10) + 1, // Default intensity
              polarity: 'unknown' // Default polarity
            });
          }
        }
      }
      
      // Parse other placefile formats if needed
      // Format: lat,lon,timestamp,intensity,etc.
      else if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          
          if (!isNaN(lat) && !isNaN(lon)) {
            // Try to parse additional data if available
            let timestamp = now;
            let intensity = 5; // Default
            let polarity: 'positive' | 'negative' | 'unknown' = 'unknown';
            
            // If timestamp is provided (assuming Unix timestamp or similar)
            if (parts.length > 2 && parts[2]) {
              const timestampVal = parseInt(parts[2]);
              if (!isNaN(timestampVal)) {
                // Handle different timestamp formats
                if (timestampVal > 1000000000) { // Unix timestamp
                  timestamp = new Date(timestampVal * 1000);
                } else {
                  timestamp = new Date(timestampVal);
                }
              }
            }
            
            // If intensity is provided
            if (parts.length > 3 && parts[3]) {
              const intensityVal = parseFloat(parts[3]);
              if (!isNaN(intensityVal)) {
                intensity = Math.abs(intensityVal);
                polarity = intensityVal < 0 ? 'negative' : 'positive';
              }
            }
            
            // Calculate age in minutes
            const age = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
            
            const id = `blitz_${lat.toFixed(4)}_${lon.toFixed(4)}_${timestamp.getTime()}_${strikes.length}`;
            
            strikes.push({
              id,
              latitude: lat,
              longitude: lon,
              timestamp,
              age,
              intensity,
              polarity
            });
          }
        }
      }
    }

    return {
      strikes,
      lastUpdate: now,
      count: strikes.length
    };
  }

  // Get current data
  getCurrentData(): BlitzortungData | null {
    return this.currentData;
  }
}

// Export singleton instance
export const saratogaBlitzortungService = new SaratogaBlitzortungService();
