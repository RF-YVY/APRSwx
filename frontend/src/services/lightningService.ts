// Real-time Lightning Data Service
// Uses multiple lightning detection APIs to provide real-time lightning strike data

export interface LightningStrike {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  strength: number; // kA (kiloamperes)
  type: 'CG' | 'IC' | 'CC'; // Cloud-to-Ground, Intracloud, Cloud-to-Cloud
  polarity: 'positive' | 'negative';
  multiplicity: number; // Number of strokes
  age: number; // Minutes since strike
}

export interface LightningData {
  strikes: LightningStrike[];
  lastUpdate: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  source: string;
}

class RealTimeLightningService {
  private apiKey?: string;
  private baseUrl = 'https://api.lightning-maps.org/v1';
  private fallbackUrl = 'https://lightning.ws/api/v1';
  private updateInterval = 60000; // 1 minute
  private subscribers: ((data: LightningData) => void)[] = [];
  private currentData: LightningData | null = null;
  private updateTimer: number | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.initializeRealTimeUpdates();
  }

  // Subscribe to real-time lightning updates
  subscribe(callback: (data: LightningData) => void): () => void {
    this.subscribers.push(callback);
    
    // Send current data if available
    if (this.currentData) {
      callback(this.currentData);
    }
    
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  // Get lightning data for a specific region
  async getLightningData(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<LightningData> {
    try {
      // Try primary lightning service
      const data = await this.fetchFromPrimaryService(bounds);
      return data;
    } catch (error) {
      console.warn('Primary lightning service failed, trying fallback:', error);
      
      try {
        // Try fallback service
        const data = await this.fetchFromFallbackService(bounds);
        return data;
      } catch (fallbackError) {
        console.warn('Fallback lightning service failed, using demo data:', fallbackError);
        
        // Return demo data with realistic patterns
        return this.generateDemoLightningData(bounds);
      }
    }
  }

  // Fetch from primary lightning service (Lightning Maps API)
  private async fetchFromPrimaryService(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<LightningData> {
    const params = new URLSearchParams({
      north: bounds.north.toString(),
      south: bounds.south.toString(),
      east: bounds.east.toString(),
      west: bounds.west.toString(),
      age: '60', // Last 60 minutes
      ...(this.apiKey && { key: this.apiKey })
    });

    const response = await fetch(`${this.baseUrl}/strikes?${params}`);
    
    if (!response.ok) {
      throw new Error(`Lightning API responded with ${response.status}`);
    }

    const data = await response.json();
    
    return {
      strikes: data.strikes?.map((strike: any) => ({
        id: strike.id || `${strike.lat}_${strike.lon}_${strike.time}`,
        latitude: strike.lat,
        longitude: strike.lon,
        timestamp: new Date(strike.time * 1000).toISOString(),
        strength: strike.strength || Math.random() * 50 + 10,
        type: strike.type || 'CG',
        polarity: strike.polarity || (Math.random() > 0.1 ? 'negative' : 'positive'),
        multiplicity: strike.multiplicity || 1,
        age: Math.floor((Date.now() - strike.time * 1000) / 60000)
      })) || [],
      lastUpdate: new Date().toISOString(),
      bounds,
      source: 'Lightning Maps API'
    };
  }

  // Fetch from fallback lightning service
  private async fetchFromFallbackService(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): Promise<LightningData> {
    // Use Blitzortung.org data via proxy
    const response = await fetch(`https://api.blitzortung.org/1.1/strokes?region=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
    
    if (!response.ok) {
      throw new Error(`Blitzortung API responded with ${response.status}`);
    }

    const data = await response.json();
    
    return {
      strikes: data.strokes?.map((stroke: any) => ({
        id: `blitz_${stroke.time}_${stroke.lat}_${stroke.lon}`,
        latitude: stroke.lat,
        longitude: stroke.lon,
        timestamp: new Date(stroke.time).toISOString(),
        strength: stroke.amplitude || Math.random() * 40 + 5,
        type: 'CG',
        polarity: stroke.amplitude > 0 ? 'positive' : 'negative',
        multiplicity: 1,
        age: Math.floor((Date.now() - new Date(stroke.time).getTime()) / 60000)
      })) || [],
      lastUpdate: new Date().toISOString(),
      bounds,
      source: 'Blitzortung.org'
    };
  }

  // Generate realistic demo lightning data for testing
  private generateDemoLightningData(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }): LightningData {
    const strikes: LightningStrike[] = [];
    const numStrikes = Math.floor(Math.random() * 50) + 10; // 10-60 strikes
    
    // Create clusters of strikes (realistic storm patterns)
    const numClusters = Math.floor(Math.random() * 3) + 1;
    
    for (let cluster = 0; cluster < numClusters; cluster++) {
      const clusterLat = bounds.south + Math.random() * (bounds.north - bounds.south);
      const clusterLon = bounds.west + Math.random() * (bounds.east - bounds.west);
      const clusterSize = Math.floor(numStrikes / numClusters);
      
      for (let i = 0; i < clusterSize; i++) {
        const age = Math.floor(Math.random() * 60); // 0-60 minutes old
        const strike: LightningStrike = {
          id: `demo_${Date.now()}_${cluster}_${i}`,
          latitude: clusterLat + (Math.random() - 0.5) * 0.1, // Within ~5km of cluster center
          longitude: clusterLon + (Math.random() - 0.5) * 0.1,
          timestamp: new Date(Date.now() - age * 60000).toISOString(),
          strength: Math.random() * 80 + 5, // 5-85 kA
          type: Math.random() > 0.8 ? 'IC' : 'CG',
          polarity: Math.random() > 0.1 ? 'negative' : 'positive',
          multiplicity: Math.floor(Math.random() * 4) + 1,
          age
        };
        strikes.push(strike);
      }
    }
    
    return {
      strikes,
      lastUpdate: new Date().toISOString(),
      bounds,
      source: 'Demo Data (Realistic Patterns)'
    };
  }

  // Initialize real-time updates
  private initializeRealTimeUpdates(): void {
    // Start periodic updates
    this.updateTimer = window.setInterval(() => {
      this.updateLightningData();
    }, this.updateInterval);
  }

  // Update lightning data and notify subscribers
  private async updateLightningData(): Promise<void> {
    if (this.subscribers.length === 0) return;
    
    // Use a default bounds for updates (can be customized)
    const bounds = {
      north: 49.0,
      south: 25.0,
      east: -66.0,
      west: -125.0
    };
    
    try {
      const data = await this.getLightningData(bounds);
      this.currentData = data;
      
      // Notify all subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in lightning data subscriber:', error);
        }
      });
    } catch (error) {
      console.error('Failed to update lightning data:', error);
    }
  }

  // Clean up resources
  destroy(): void {
    if (this.updateTimer) {
      window.clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.subscribers = [];
    this.currentData = null;
  }
}

// Export singleton instance
export const lightningService = new RealTimeLightningService();

// Export class for custom instances
export { RealTimeLightningService };
