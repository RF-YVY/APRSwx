import { RadarSite, RadarOverlay } from '../types/radar';

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8000/api'
  : '/api';

export class RadarService {
  private static instance: RadarService;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  public static getInstance(): RadarService {
    if (!RadarService.instance) {
      RadarService.instance = new RadarService();
    }
    return RadarService.instance;
  }

  private constructor() {}

  /**
   * Get available MRMS radar products for a location
   */
  async getRadarSites(lat: number, lon: number, maxDistance: number = 300): Promise<RadarSite[]> {
    const cacheKey = `products_${lat}_${lon}_${maxDistance}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/weather/radar-sites/?lat=${lat}&lon=${lon}&max_distance=${maxDistance}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const products = data.radar_products || [];
      
      this.setCachedData(cacheKey, products);
      return products;
    } catch (error) {
      console.error('Error fetching MRMS products:', error);
      throw error;
    }
  }

  /**
   * Get MRMS radar data for a specific product
   */
  async getRadarData(productId: string, bounds?: [number, number, number, number]): Promise<any> {
    const cacheKey = `data_${productId}_${bounds ? bounds.join('_') : 'default'}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      let url = `${API_BASE_URL}/weather/radar-data/${productId}/`;
      
      if (bounds) {
        const [south, west, north, east] = bounds;
        url += `?south=${south}&west=${west}&north=${north}&east=${east}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.setCachedData(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch MRMS data');
      }
    } catch (error) {
      console.error('Error fetching MRMS data:', error);
      throw error;
    }
  }

  /**
   * Get nearest radar site (now returns default reflectivity product)
   */
  async getNearestRadarSite(lat: number, lon: number): Promise<RadarSite | null> {
    try {
      const products = await this.getRadarSites(lat, lon);
      // Return the reflectivity product as the default
      return products.find(p => p.product_id === 'reflectivity') || products[0] || null;
    } catch (error) {
      console.error('Error getting nearest radar site:', error);
      return null;
    }
  }

  /**
   * Get MRMS radar overlay image for map display
   */
  async getRadarOverlay(
    productId: string,
    bounds: [number, number, number, number],
    size: [number, number] = [512, 512]
  ): Promise<RadarOverlay | null> {
    const [south, west, north, east] = bounds;
    const [width, height] = size;
    
    const cacheKey = `overlay_${productId}_${bounds.join('_')}_${size.join('_')}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/weather/radar-overlay/${productId}/?south=${south}&west=${west}&north=${north}&east=${east}&width=${width}&height=${height}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        let overlay: RadarOverlay;
        
        if (data.overlay_url) {
          // Direct MRMS WMS URL
          overlay = {
            imageUrl: data.overlay_url,
            bounds: data.bounds,
            format: data.format,
            timestamp: data.timestamp,
            source: 'MRMS'
          };
        } else if (data.image_data) {
          // Base64 encoded image
          overlay = {
            imageData: data.image_data,
            bounds: data.bounds,
            format: data.format,
            encoding: data.encoding,
            timestamp: data.timestamp,
            source: 'MRMS'
          };
        } else {
          throw new Error('No overlay data received');
        }
        
        this.setCachedData(cacheKey, overlay);
        return overlay;
      } else {
        console.warn('No MRMS overlay available:', data.message);
        return null;
      }
    } catch (error) {
      console.error('Error fetching MRMS overlay:', error);
      return null;
    }
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const radarService = RadarService.getInstance();
