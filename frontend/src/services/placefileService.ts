// Service for handling NWS placefiles and weather overlays
import { LatLng } from 'leaflet';

export interface WeatherPolygon {
  id: string;
  type: 'tornado_warning' | 'severe_thunderstorm_warning' | 'flash_flood_warning' | 'winter_storm_warning' | 'other';
  coordinates: LatLng[];
  title: string;
  description: string;
  expires: Date;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  color: string;
}

export interface LightningStrike {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  intensity: number;
  polarity: 'positive' | 'negative';
}

class PlacefileService {
  private weatherPolygons: WeatherPolygon[] = [];
  private lightningStrikes: LightningStrike[] = [];
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoUpdate();
  }

  // Start automatic updates every 5 minutes
  private startAutoUpdate() {
    this.updateInterval = setInterval(() => {
      this.updateWeatherPolygons();
      this.updateLightningData();
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Stop automatic updates
  public stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Parse NWS polygon placefile
  private parsePolygonPlacefile(content: string): WeatherPolygon[] {
    const polygons: WeatherPolygon[] = [];
    const lines = content.split('\n');
    
    let currentPolygon: Partial<WeatherPolygon> | null = null;
    let coordinates: LatLng[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('Title:')) {
        if (currentPolygon && coordinates.length > 0) {
          polygons.push({
            ...currentPolygon,
            coordinates
          } as WeatherPolygon);
        }
        
        currentPolygon = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: trimmed.replace('Title:', '').trim(),
          coordinates: [],
          description: '',
          expires: new Date(Date.now() + 6 * 60 * 60 * 1000), // Default 6 hours
          severity: 'moderate',
          type: 'other',
          color: '#FFA500'
        };
        coordinates = [];
      } else if (trimmed.startsWith('Line:')) {
        // Parse line format: Line: width,color,lat1,lon1,lat2,lon2,...
        const parts = trimmed.replace('Line:', '').split(',');
        if (parts.length >= 6) {
          const color = parts[1];
          currentPolygon!.color = color;
          
          // Extract coordinates
          for (let i = 2; i < parts.length - 1; i += 2) {
            const lat = parseFloat(parts[i]);
            const lon = parseFloat(parts[i + 1]);
            if (!isNaN(lat) && !isNaN(lon)) {
              coordinates.push(new LatLng(lat, lon));
            }
          }
        }
      } else if (trimmed.startsWith('Polygon:')) {
        // Parse polygon format: Polygon: color,lat1,lon1,lat2,lon2,...
        const parts = trimmed.replace('Polygon:', '').split(',');
        if (parts.length >= 7) {
          const color = parts[0];
          currentPolygon!.color = color;
          
          // Extract coordinates
          for (let i = 1; i < parts.length - 1; i += 2) {
            const lat = parseFloat(parts[i]);
            const lon = parseFloat(parts[i + 1]);
            if (!isNaN(lat) && !isNaN(lon)) {
              coordinates.push(new LatLng(lat, lon));
            }
          }
        }
      }
    }
    
    // Add the last polygon
    if (currentPolygon && coordinates.length > 0) {
      polygons.push({
        ...currentPolygon,
        coordinates
      } as WeatherPolygon);
    }
    
    return polygons;
  }

  // Parse lightning placefile
  private parseLightningPlacefile(content: string): LightningStrike[] {
    const strikes: LightningStrike[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('Object:')) {
        // Parse object format: Object: lat,lon,symbol
        const parts = trimmed.replace('Object:', '').split(',');
        if (parts.length >= 3) {
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          const symbol = parts[2];
          
          if (!isNaN(lat) && !isNaN(lon)) {
            strikes.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              latitude: lat,
              longitude: lon,
              timestamp: new Date(),
              intensity: symbol.includes('+') ? 10 : 5,
              polarity: symbol.includes('+') ? 'positive' : 'negative'
            });
          }
        }
      }
    }
    
    return strikes;
  }

  // Fetch and update weather polygons
  public async updateWeatherPolygons(): Promise<void> {
    try {
      const response = await fetch('https://placefilenation.com/Placefiles/nws_polygons.php', {
        mode: 'cors',
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      this.weatherPolygons = this.parsePolygonPlacefile(content);
      
      console.log(`Updated ${this.weatherPolygons.length} weather polygons`);
    } catch (error) {
      console.error('Error fetching weather polygons:', error);
      // Don't fallback to mock data - keep existing data or use empty array
      this.weatherPolygons = this.weatherPolygons || [];
    }
  }

  // Fetch and update lightning data
  public async updateLightningData(): Promise<void> {
    try {
      const response = await fetch('https://placefilenation.com/Placefiles/60lightning.php', {
        mode: 'cors',
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      this.lightningStrikes = this.parseLightningPlacefile(content);
      
      console.log(`Updated ${this.lightningStrikes.length} lightning strikes`);
    } catch (error) {
      console.error('Error fetching lightning data:', error);
      // Don't fallback to mock data - keep existing data or use empty array
      this.lightningStrikes = this.lightningStrikes || [];
    }
  }

  // Get current weather polygons
  public getWeatherPolygons(): WeatherPolygon[] {
    // Filter out expired polygons
    const now = new Date();
    return this.weatherPolygons.filter(polygon => polygon.expires > now);
  }

  // Get current lightning strikes (last 60 minutes)
  public getLightningStrikes(): LightningStrike[] {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.lightningStrikes.filter(strike => strike.timestamp > oneHourAgo);
  }

  // Initialize the service
  public async initialize(): Promise<void> {
    await Promise.all([
      this.updateWeatherPolygons(),
      this.updateLightningData()
    ]);
  }
}

export const placefileService = new PlacefileService();
