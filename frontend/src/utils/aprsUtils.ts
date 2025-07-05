/**
 * APRS-IS Passcode Generator
 * 
 * Generates the correct APRS-IS passcode for a given callsign
/**
 * Based on the official APRS-IS  /**
   * Format bearing as compass direction
   * @param bearing - Bearing in degreesm
 * Generates a unique passcode for a given callsign
 */

export class APRSPasscodeGenerator {
  /**
   * Generate APRS-IS passcode for a given callsign
   * @param callsign - Amateur radio callsign (without SSID)
   * @returns The numeric passcode for APRS-IS authentication
   */
  static generatePasscode(callsign: string): number {
    if (!callsign) return -1;
    
    // Clean up callsign - remove SSID and convert to uppercase
    const cleanCallsign = callsign.split('-')[0].toUpperCase().trim();
    
    // Validate callsign format
    if (!this.isValidCallsign(cleanCallsign)) {
      return -1;
    }
    
    // APRS-IS passcode algorithm
    let hash = 0x73e2;
    
    for (let i = 0; i < cleanCallsign.length; i += 2) {
      hash ^= cleanCallsign.charCodeAt(i) << 8;
      if (i + 1 < cleanCallsign.length) {
        hash ^= cleanCallsign.charCodeAt(i + 1);
      }
    }
    
    return hash & 0x7fff;
  }
  
  /**
   * Validate if a callsign has a valid format
   * @param callsign - Callsign to validate
   * @returns True if valid format
   */
  static isValidCallsign(callsign: string): boolean {
    if (!callsign || callsign.length < 3 || callsign.length > 6) {
      return false;
    }
    
    // Basic callsign format validation
    const callsignPattern = /^[A-Z]{1,2}[0-9][A-Z]{1,3}$/;
    return callsignPattern.test(callsign);
  }
  
  /**
   * Validate APRS-IS passcode for a callsign
   * @param callsign - Callsign
   * @param passcode - Passcode to validate
   * @returns True if passcode is correct
   */
  static validatePasscode(callsign: string, passcode: number): boolean {
    return this.generatePasscode(callsign) === passcode;
  }
  
  /**
   * Format callsign with SSID
   * @param callsign - Base callsign
   * @param ssid - SSID (0-15)
   * @returns Formatted callsign with SSID
   */
  static formatCallsignWithSSID(callsign: string, ssid?: number): string {
    const cleanCallsign = callsign.split('-')[0].toUpperCase().trim();
    
    if (ssid !== undefined && ssid >= 0 && ssid <= 15) {
      return `${cleanCallsign}-${ssid}`;
    }
    
    return cleanCallsign;
  }
}

// Utility functions for distance calculation
export class LocationUtils {
  /**
   * Calculate distance between two points using Haversine formula
   * @param lat1 - Latitude of first point
   * @param lon1 - Longitude of first point
   * @param lat2 - Latitude of second point
   * @param lon2 - Longitude of second point
   * @returns Distance in kilometers
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  /**
   * Calculate bearing between two points
   * @param lat1 - Latitude of first point
   * @param lon1 - Longitude of first point
   * @param lat2 - Latitude of second point
   * @param lon2 - Longitude of second point
   * @returns Bearing in degrees
   */
  static calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x);
    bearing = this.toDegrees(bearing);
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }
  
  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Convert radians to degrees
   */
  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
  
  /**
   * Format bearing as compass direction
   * @param bearing - Bearing in degrees
   * @returns Compass direction string
   */
  static formatBearing(bearing: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                       'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }

  /**
   * Format distance based on unit preference
   * @param distanceKm - Distance in kilometers
   * @param unit - Unit preference ('km' or 'miles')
   * @returns Formatted distance string
   */
  static formatDistance(distanceKm: number, unit: 'km' | 'miles' = 'km'): string {
    if (unit === 'miles') {
      const distanceMiles = distanceKm * 0.621371;
      if (distanceMiles < 0.1) {
        return `${Math.round(distanceMiles * 5280)}ft`;
      } else if (distanceMiles < 10) {
        return `${distanceMiles.toFixed(1)}mi`;
      } else {
        return `${Math.round(distanceMiles)}mi`;
      }
    } else {
      if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)}m`;
      } else if (distanceKm < 10) {
        return `${distanceKm.toFixed(1)}km`;
      } else {
        return `${Math.round(distanceKm)}km`;
      }
    }
  }
}

export default APRSPasscodeGenerator;
