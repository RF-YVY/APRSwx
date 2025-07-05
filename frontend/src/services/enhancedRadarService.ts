// Enhanced Radar Service with multiple data sources
// Provides real-time weather radar data from multiple APIs

export interface RadarLayer {
  id: string;
  name: string;
  url: string;
  attribution: string;
  opacity: number;
  visible: boolean;
  type: 'tile' | 'wms';
  timestamp?: number;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface RadarData {
  layers: RadarLayer[];
  lastUpdate: string;
  source: string;
  available: boolean;
}

class EnhancedRadarService {
  private baseUrls = {
    rainviewer: 'https://api.rainviewer.com/public/weather-maps.json',
    openweather: 'https://tile.openweathermap.org/map',
    noaa: 'https://mapservices.weather.noaa.gov/eventdriven/services/radar',
    weatherapi: 'https://api.weatherapi.com/v1'
  };

  private apiKeys = {
    openweather: process.env.REACT_APP_OPENWEATHER_API_KEY,
    weatherapi: process.env.REACT_APP_WEATHER_API_KEY
  };

  private currentRadarData: RadarData | null = null;
  private updateInterval = 300000; // 5 minutes
  private updateTimer: number | null = null;

  constructor() {
    this.initializeRadarData();
  }

  // Get current radar data
  async getRadarData(): Promise<RadarData> {
    if (this.currentRadarData) {
      return this.currentRadarData;
    }

    return this.fetchRadarData();
  }

  // Fetch radar data from multiple sources
  private async fetchRadarData(): Promise<RadarData> {
    const layers: RadarLayer[] = [];

    try {
      // Try RainViewer first (most reliable)
      const rainviewerLayers = await this.fetchRainViewerData();
      layers.push(...rainviewerLayers);
    } catch (error) {
      console.warn('RainViewer radar failed:', error);
    }

    try {
      // Add OpenWeatherMap layers
      const openweatherLayers = await this.fetchOpenWeatherData();
      layers.push(...openweatherLayers);
    } catch (error) {
      console.warn('OpenWeatherMap radar failed:', error);
    }

    try {
      // Add NOAA layers as fallback
      const noaaLayers = await this.fetchNOAAData();
      layers.push(...noaaLayers);
    } catch (error) {
      console.warn('NOAA radar failed:', error);
    }

    const radarData: RadarData = {
      layers,
      lastUpdate: new Date().toISOString(),
      source: 'Multiple Sources',
      available: layers.length > 0
    };

    this.currentRadarData = radarData;
    return radarData;
  }

  // Fetch RainViewer radar data
  private async fetchRainViewerData(): Promise<RadarLayer[]> {
    const response = await fetch(this.baseUrls.rainviewer);
    if (!response.ok) {
      throw new Error(`RainViewer API failed: ${response.status}`);
    }

    const data = await response.json();
    const layers: RadarLayer[] = [];

    // Current radar
    if (data.radar && data.radar.past && data.radar.past.length > 0) {
      const recentTime = data.radar.past[data.radar.past.length - 1].time;
      layers.push({
        id: 'rainviewer-current',
        name: 'Current Radar (RainViewer)',
        url: `https://tilecache.rainviewer.com/v2/radar/${recentTime}/{z}/{x}/{y}/256/1_1.png`,
        attribution: '&copy; RainViewer',
        opacity: 0.6,
        visible: true,
        type: 'tile',
        timestamp: recentTime
      });
    }

    // Future radar (if available)
    if (data.radar && data.radar.nowcast && data.radar.nowcast.length > 0) {
      const futureTime = data.radar.nowcast[data.radar.nowcast.length - 1].time;
      layers.push({
        id: 'rainviewer-forecast',
        name: 'Radar Forecast (RainViewer)',
        url: `https://tilecache.rainviewer.com/v2/radar/${futureTime}/{z}/{x}/{y}/256/1_1.png`,
        attribution: '&copy; RainViewer',
        opacity: 0.4,
        visible: false,
        type: 'tile',
        timestamp: futureTime
      });
    }

    return layers;
  }

  // Fetch OpenWeatherMap radar data
  private async fetchOpenWeatherData(): Promise<RadarLayer[]> {
    const layers: RadarLayer[] = [];

    // Precipitation layer
    layers.push({
      id: 'openweather-precipitation',
      name: 'Precipitation (OpenWeatherMap)',
      url: `${this.baseUrls.openweather}/precipitation_new/{z}/{x}/{y}.png${this.apiKeys.openweather ? `?appid=${this.apiKeys.openweather}` : ''}`,
      attribution: '&copy; OpenWeatherMap',
      opacity: 0.6,
      visible: true,
      type: 'tile'
    });

    // Clouds layer
    layers.push({
      id: 'openweather-clouds',
      name: 'Clouds (OpenWeatherMap)',
      url: `${this.baseUrls.openweather}/clouds_new/{z}/{x}/{y}.png${this.apiKeys.openweather ? `?appid=${this.apiKeys.openweather}` : ''}`,
      attribution: '&copy; OpenWeatherMap',
      opacity: 0.4,
      visible: false,
      type: 'tile'
    });

    // Pressure layer
    layers.push({
      id: 'openweather-pressure',
      name: 'Pressure (OpenWeatherMap)',
      url: `${this.baseUrls.openweather}/pressure_new/{z}/{x}/{y}.png${this.apiKeys.openweather ? `?appid=${this.apiKeys.openweather}` : ''}`,
      attribution: '&copy; OpenWeatherMap',
      opacity: 0.4,
      visible: false,
      type: 'tile'
    });

    return layers;
  }

  // Fetch NOAA radar data
  private async fetchNOAAData(): Promise<RadarLayer[]> {
    const layers: RadarLayer[] = [];

    // NOAA Base Reflectivity
    layers.push({
      id: 'noaa-base-reflectivity',
      name: 'Base Reflectivity (NOAA)',
      url: `${this.baseUrls.noaa}/radar_base_reflectivity/MapServer/WMSServer`,
      attribution: '&copy; NOAA NWS',
      opacity: 0.6,
      visible: true,
      type: 'wms'
    });

    // NOAA Composite Reflectivity
    layers.push({
      id: 'noaa-composite-reflectivity',
      name: 'Composite Reflectivity (NOAA)',
      url: `${this.baseUrls.noaa}/radar_composite_reflectivity/MapServer/WMSServer`,
      attribution: '&copy; NOAA NWS',
      opacity: 0.6,
      visible: false,
      type: 'wms'
    });

    return layers;
  }

  // Initialize radar data updates
  private initializeRadarData(): void {
    // Fetch initial data
    this.fetchRadarData().catch(error => {
      console.error('Failed to initialize radar data:', error);
    });

    // Start periodic updates
    this.updateTimer = window.setInterval(() => {
      this.fetchRadarData().catch(error => {
        console.error('Failed to update radar data:', error);
      });
    }, this.updateInterval);
  }

  // Get best available radar layer
  async getBestRadarLayer(): Promise<RadarLayer | null> {
    const data = await this.getRadarData();
    
    if (!data.available || data.layers.length === 0) {
      return null;
    }

    // Prefer RainViewer current radar
    const rainviewerCurrent = data.layers.find(layer => layer.id === 'rainviewer-current');
    if (rainviewerCurrent) {
      return rainviewerCurrent;
    }

    // Fall back to OpenWeatherMap precipitation
    const openweatherPrecip = data.layers.find(layer => layer.id === 'openweather-precipitation');
    if (openweatherPrecip) {
      return openweatherPrecip;
    }

    // Fall back to NOAA base reflectivity
    const noaaBase = data.layers.find(layer => layer.id === 'noaa-base-reflectivity');
    if (noaaBase) {
      return noaaBase;
    }

    // Return first available layer
    return data.layers[0];
  }

  // Create Leaflet layer from radar layer config
  createLeafletLayer(radarLayer: RadarLayer, L: any): any {
    if (radarLayer.type === 'tile') {
      return L.tileLayer(radarLayer.url, {
        attribution: radarLayer.attribution,
        opacity: radarLayer.opacity,
        maxZoom: 18,
        minZoom: 1,
        updateWhenIdle: false,
        updateWhenZooming: false,
        keepBuffer: 2
      });
    } else if (radarLayer.type === 'wms') {
      return L.tileLayer.wms(radarLayer.url, {
        layers: '0',
        format: 'image/png',
        transparent: true,
        attribution: radarLayer.attribution,
        opacity: radarLayer.opacity,
        version: '1.3.0',
        crs: L.CRS.EPSG3857
      });
    }
    
    return null;
  }

  // Clean up resources
  destroy(): void {
    if (this.updateTimer) {
      window.clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.currentRadarData = null;
  }
}

// Export singleton instance
export const enhancedRadarService = new EnhancedRadarService();

// Export class for custom instances
export { EnhancedRadarService };
