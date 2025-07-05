// Weather Radar Types

export interface RadarSite {
  site_id?: string; // Legacy NEXRAD site ID
  product_id?: string; // MRMS product ID
  site_name?: string; // Legacy site name
  name?: string; // MRMS product name
  product_name?: string; // MRMS product full name
  latitude?: number; // Legacy coordinates
  longitude?: number; // Legacy coordinates
  elevation?: number; // Legacy elevation
  distance_km?: number; // Legacy distance
  state?: string; // Legacy state
  country?: string; // Legacy country
  timezone?: string; // Legacy timezone
  available_products?: string[]; // Legacy products
  last_updated?: string; // Legacy update time
  coverage?: string; // MRMS coverage area
  resolution?: string; // MRMS resolution
  update_frequency?: string; // MRMS update frequency
}

export interface RadarOverlay {
  siteId?: string; // Legacy site ID
  productId?: string; // MRMS product ID
  timestamp: string;
  bounds: [number, number, number, number]; // [south, west, north, east]
  size?: [number, number]; // [width, height]
  imageData?: string; // base64 encoded image
  imageUrl?: string; // Direct URL to MRMS WMS
  format: string; // 'png', 'jpeg', etc.
  encoding?: string; // 'base64'
  source?: string; // 'MRMS', 'NEXRAD', etc.
}

export interface RadarData {
  site_id?: string; // Legacy site ID
  product?: string; // Legacy product name
  product_id?: string; // MRMS product ID
  product_name?: string; // MRMS product name
  timestamp: string;
  elevation_angle?: number; // Legacy elevation
  bounds?: [number, number, number, number]; // MRMS bounds
  data?: any; // Raw radar data
  reflectivity?: number[][]; // Legacy reflectivity data
  latitude?: number[][]; // Legacy latitude grid
  longitude?: number[][]; // Legacy longitude grid
  metadata?: {
    range_km?: number; // Legacy range
    azimuth_resolution?: number; // Legacy azimuth
    range_resolution?: number; // Legacy range resolution
    nyquist_velocity?: number; // Legacy velocity
    unambiguous_range?: number; // Legacy range
    resolution_km?: number; // MRMS resolution
    coverage?: string; // MRMS coverage
    update_frequency?: string; // MRMS update frequency
    data_source?: string; // MRMS data source
  };
}

export interface RadarProduct {
  code: string;
  name: string;
  description: string;
  unit: string;
  color_map: string;
  min_value: number;
  max_value: number;
}

export interface RadarAnimation {
  site_id: string;
  product: string;
  frames: RadarOverlay[];
  interval: number; // milliseconds between frames
  loop: boolean;
}

export interface RadarSettings {
  opacity: number;
  colorMap: string;
  showGrid: boolean;
  showRange: boolean;
  smoothing: boolean;
  product: string;
  animationSpeed: number;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

export interface RadarLayer {
  id: string;
  siteId: string;
  product: string;
  visible: boolean;
  opacity: number;
  overlay: RadarOverlay | null;
  lastUpdated: string;
  error: string | null;
}

// Radar product constants - only working products
export const RADAR_PRODUCTS = {
  REFLECTIVITY: 'reflectivity',
  PRECIPITATION: 'precipitation',
  ACCUMULATION: 'accumulation',
  ECHO_TOPS: 'echo_tops',
  VIL: 'vil',
  HAIL: 'hail'
} as const;

export type RadarProductType = typeof RADAR_PRODUCTS[keyof typeof RADAR_PRODUCTS];

// Color map constants - only for working products
export const RADAR_COLOR_MAPS = {
  REFLECTIVITY: 'pyart_NWSRef',
  PRECIPITATION: 'pyart_Precipitation',
  ACCUMULATION: 'pyart_Accumulation',
  ECHO_TOPS: 'pyart_EchoTop',
  VIL: 'pyart_VIL',
  HAIL: 'pyart_Hail'
} as const;

export type RadarColorMap = typeof RADAR_COLOR_MAPS[keyof typeof RADAR_COLOR_MAPS];

// Default radar settings
export const DEFAULT_RADAR_SETTINGS: RadarSettings = {
  opacity: 0.6,
  colorMap: RADAR_COLOR_MAPS.REFLECTIVITY,
  showGrid: false,
  showRange: false,
  smoothing: true,
  product: RADAR_PRODUCTS.REFLECTIVITY,
  animationSpeed: 1000,
  autoRefresh: true,
  refreshInterval: 300 // 5 minutes
};
