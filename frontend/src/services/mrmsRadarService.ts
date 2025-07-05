// NOAA MRMS Radar Service
// Multi-Radar Multi-Sensor system provides high-quality radar reflectivity data

export interface MRMSRadarData {
  url: string;
  timestamp: Date;
  bounds: [[number, number], [number, number]];
  product: string;
  resolution: string;
}

class NOAAMRMSRadarService {
  private baseUrl = 'https://mrms.ncep.noaa.gov/2D';
  private products = {
    reflectivity: 'ReflectivityAtLowestAltitude',
    composite: 'SeamlessHSR',
    velocity: 'RadialVelocity',
    precipitation: 'PrecipitationRate'
  };

  // Get latest MRMS radar reflectivity data
  async getLatestReflectivity(): Promise<MRMSRadarData | null> {
    try {
      // MRMS updates every 2 minutes
      const now = new Date();
      
      // Try the last several time intervals to find available data
      for (let minutesBack = 0; minutesBack <= 20; minutesBack += 2) {
        const radarTime = new Date(now.getTime() - minutesBack * 60000);
        
        // Round to nearest 2-minute interval
        const minutes = Math.floor(radarTime.getMinutes() / 2) * 2;
        const adjustedTime = new Date(
          radarTime.getFullYear(),
          radarTime.getMonth(),
          radarTime.getDate(),
          radarTime.getHours(),
          minutes,
          0
        );

        const timeString = this.formatMRMSTime(adjustedTime);
        const product = this.products.reflectivity;
        
        // Try different resolutions and formats
        const possibleUrls = [
          `${this.baseUrl}/${product}/MRMS_${product}_00.50_${timeString}.grib2.png`,
          `${this.baseUrl}/${product}/MRMS_${product}_01.00_${timeString}.grib2.png`,
          `${this.baseUrl}/${product}/latest.png`,
          `${this.baseUrl}/${product}/current.png`
        ];

        for (const url of possibleUrls) {
          try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
              return {
                url,
                timestamp: adjustedTime,
                bounds: [
                  [20.0, -130.0],  // Southwest corner (lat, lon)
                  [50.0, -60.0]    // Northeast corner (lat, lon)
                ],
                product: 'Reflectivity at Lowest Altitude',
                resolution: '0.5 km'
              };
            }
          } catch (error) {
            // Continue to next URL
          }
        }
      }

      console.warn('No MRMS radar data found in recent timeframes');
      return null;
    } catch (error) {
      console.error('Error fetching MRMS radar data:', error);
      return null;
    }
  }

  // Get MRMS WMS service URL (alternative approach)
  getMRMSWMSUrl(): string {
    return 'https://nowcoast.noaa.gov/arcgis/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/WMSServer';
  }

  // Format time for MRMS filename
  private formatMRMSTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}-${hour}${minute}${second}`;
  }

  // Create Leaflet layer for MRMS data
  createMRMSLayer(data: MRMSRadarData, L: any, opacity: number = 0.6): any {
    console.log('Creating MRMS layer with data:', data);
    
    return L.imageOverlay(data.url, data.bounds, {
      opacity: opacity,
      attribution: '&copy; NOAA MRMS',
      crossOrigin: true
    });
  }

  // Create WMS layer as fallback
  createWMSLayer(L: any, opacity: number = 0.6): any {
    return L.tileLayer.wms(this.getMRMSWMSUrl(), {
      layers: '1',
      format: 'image/png',
      transparent: true,
      attribution: '&copy; NOAA NowCOAST',
      opacity: opacity,
      version: '1.3.0',
      crs: L.CRS.EPSG3857,
      time: new Date().toISOString() // Current time
    });
  }
}

export const mrmsRadarService = new NOAAMRMSRadarService();
