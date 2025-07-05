// Alternative weather service using NWS API for better accuracy
import { LatLng } from 'leaflet';

export interface WeatherAlert {
  id: string;
  type: 'tornado' | 'severe_thunderstorm' | 'flash_flood' | 'winter_storm' | 'other';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  title: string;
  headline: string;
  description: string;
  instruction: string;
  areas: string[];
  coordinates: LatLng[];
  onset: Date;
  expires: Date;
  urgency: 'immediate' | 'expected' | 'future';
  certainty: 'observed' | 'likely' | 'possible';
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

class AlternativeWeatherService {
  private baseUrl = 'https://api.weather.gov';
  private weatherAlerts: WeatherAlert[] = [];
  private lightningStrikes: LightningStrike[] = [];
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startAutoUpdate();
  }

  // Start automatic updates every 2 minutes
  private startAutoUpdate() {
    this.updateInterval = setInterval(() => {
      this.updateWeatherAlerts();
      this.updateLightningData();
    }, 2 * 60 * 1000); // 2 minutes
  }

  // Stop automatic updates
  public stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Get severity color based on alert type and severity
  private getSeverityColor(type: string, severity: string): string {
    const colors = {
      tornado: '#FF0000',
      severe_thunderstorm: '#FFA500',
      flash_flood: '#00FF00',
      winter_storm: '#0000FF',
      other: '#FFFF00'
    };

    const severityMultiplier = {
      minor: 0.6,
      moderate: 0.8,
      severe: 1.0,
      extreme: 1.2
    };

    const baseColor = colors[type as keyof typeof colors] || colors.other;
    return baseColor;
  }

  // Parse NWS alert geometry
  private parseGeometry(geometry: any): LatLng[] {
    if (!geometry || !geometry.coordinates) return [];

    const coords: LatLng[] = [];
    
    try {
      if (geometry.type === 'Polygon') {
        // Polygon has coordinates as [[[lon, lat], [lon, lat], ...]]
        const polygonCoords = geometry.coordinates[0];
        for (const coord of polygonCoords) {
          coords.push(new LatLng(coord[1], coord[0])); // Note: GeoJSON is [lon, lat]
        }
      } else if (geometry.type === 'MultiPolygon') {
        // MultiPolygon has coordinates as [[[[lon, lat], [lon, lat], ...]], ...]
        for (const polygon of geometry.coordinates) {
          for (const coord of polygon[0]) {
            coords.push(new LatLng(coord[1], coord[0]));
          }
        }
      }
    } catch (error) {
      console.error('Error parsing geometry:', error);
    }

    return coords;
  }

  // Fetch weather alerts from NWS API
  public async updateWeatherAlerts(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts/active?status=actual&message_type=alert`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.weatherAlerts = [];

      if (data.features && Array.isArray(data.features)) {
        for (const feature of data.features) {
          const props = feature.properties;
          const geometry = feature.geometry;

          if (!props || !geometry) continue;

          // Map NWS event types to our types
          const event = (props.event || '').toLowerCase();
          let type: WeatherAlert['type'] = 'other';
          
          if (event.includes('tornado')) type = 'tornado';
          else if (event.includes('thunderstorm') || event.includes('severe')) type = 'severe_thunderstorm';
          else if (event.includes('flood') || event.includes('flash flood')) type = 'flash_flood';
          else if (event.includes('winter') || event.includes('snow') || event.includes('ice')) type = 'winter_storm';

          // Map NWS severity to our severity
          const nwsSeverity = (props.severity || '').toLowerCase();
          let severity: WeatherAlert['severity'] = 'moderate';
          
          if (nwsSeverity.includes('minor')) severity = 'minor';
          else if (nwsSeverity.includes('moderate')) severity = 'moderate';
          else if (nwsSeverity.includes('severe')) severity = 'severe';
          else if (nwsSeverity.includes('extreme')) severity = 'extreme';

          const alert: WeatherAlert = {
            id: props.id || `alert-${Date.now()}-${Math.random()}`,
            type,
            severity,
            title: props.event || 'Weather Alert',
            headline: props.headline || props.event || 'Weather Alert',
            description: props.description || '',
            instruction: props.instruction || '',
            areas: props.areaDesc ? props.areaDesc.split(';').map((area: string) => area.trim()) : [],
            coordinates: this.parseGeometry(geometry),
            onset: props.onset ? new Date(props.onset) : new Date(),
            expires: props.expires ? new Date(props.expires) : new Date(Date.now() + 6 * 60 * 60 * 1000),
            urgency: props.urgency || 'expected',
            certainty: props.certainty || 'likely',
            color: this.getSeverityColor(type, severity)
          };

          this.weatherAlerts.push(alert);
        }
      }

      console.log(`Updated ${this.weatherAlerts.length} weather alerts from NWS`);
    } catch (error) {
      console.error('Error fetching weather alerts from NWS:', error);
      // Don't use mock data - just use empty array
      this.weatherAlerts = [];
    }
  }

  // Parse lightning placefile from FreeLightning
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
              id: `lightning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              latitude: lat,
              longitude: lon,
              timestamp: new Date(),
              intensity: symbol.includes('+') ? 10 : 5,
              polarity: symbol.includes('+') ? 'positive' : 'negative'
            });
          }
        }
      } else if (trimmed.startsWith('Point:')) {
        // Alternative format: Point: lat,lon,symbol
        const parts = trimmed.replace('Point:', '').split(',');
        if (parts.length >= 3) {
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          const symbol = parts[2];
          
          if (!isNaN(lat) && !isNaN(lon)) {
            strikes.push({
              id: `lightning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  // Parse Saratoga Weather placefile format
  private parseSaratogaPlacefile(text: string): LightningStrike[] {
    const strikes: LightningStrike[] = [];
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
            // Generate a unique ID based on coordinates and current time with more precision
            const id = `saratoga_${lat.toFixed(6)}_${lon.toFixed(6)}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
            
            strikes.push({
              id,
              latitude: lat,
              longitude: lon,
              timestamp: now,
              intensity: Math.floor(Math.random() * 10) + 1, // Default intensity
              polarity: 'positive' // Default polarity
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
            let polarity: 'positive' | 'negative' = 'positive';
            
            // If timestamp is provided
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
            
            const id = `saratoga_${lat.toFixed(6)}_${lon.toFixed(6)}_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
            
            strikes.push({
              id,
              latitude: lat,
              longitude: lon,
              timestamp: timestamp,
              intensity,
              polarity
            });
          }
        }
      }
    }

    return strikes;
  }

  // Update lightning data - using multiple reliable sources
  public async updateLightningData(): Promise<void> {
    try {
      // Only use real data sources, no mock data
      this.lightningStrikes = [];
      
      // Try to get lightning data from Saratoga Weather placefile
      const response = await fetch('https://saratoga-weather.org/USA-blitzortung/placefile-nobCT.txt', {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const placefileText = await response.text();
        const parsedStrikes = this.parseSaratogaPlacefile(placefileText);
        this.lightningStrikes = parsedStrikes;
        console.log(`Updated ${this.lightningStrikes.length} lightning strikes from Saratoga Weather`);
      } else {
        console.log('No lightning data available from Saratoga Weather');
      }
    } catch (error) {
      console.error('Error fetching lightning data:', error);
      // Don't fallback to mock data - just use empty array
      this.lightningStrikes = [];
    }
  }

  // Get current weather alerts
  public getWeatherAlerts(): WeatherAlert[] {
    return this.weatherAlerts;
  }

  // Get current lightning strikes
  public getLightningStrikes(): LightningStrike[] {
    return this.lightningStrikes;
  }

  // Get weather alerts for a specific area
  public getWeatherAlertsForArea(latitude: number, longitude: number, radiusKm: number = 100): WeatherAlert[] {
    return this.weatherAlerts.filter(alert => {
      // Simple distance check - for more accuracy, use proper geospatial calculations
      if (alert.coordinates.length === 0) return false;
      
      const centerLat = alert.coordinates.reduce((sum, coord) => sum + coord.lat, 0) / alert.coordinates.length;
      const centerLng = alert.coordinates.reduce((sum, coord) => sum + coord.lng, 0) / alert.coordinates.length;
      
      const distance = this.calculateDistance(latitude, longitude, centerLat, centerLng);
      return distance <= radiusKm;
    });
  }

  // Calculate distance between two points in km
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Initial load of data
  public async initialize(): Promise<void> {
    await this.updateWeatherAlerts();
    await this.updateLightningData();
  }
}

export const alternativeWeatherService = new AlternativeWeatherService();
export default alternativeWeatherService;
