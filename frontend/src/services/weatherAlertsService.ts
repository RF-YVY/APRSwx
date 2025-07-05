// Simple weather alerts service using National Weather Service API
export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme';
  event_type: string;
  effective_at: string;
  expires_at: string;
  areas: string[];
}

class WeatherAlertsService {
  private readonly baseUrl = 'https://api.weather.gov/alerts';

  async getAlertsForLocation(latitude: number, longitude: number): Promise<WeatherAlert[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/active?point=${latitude},${longitude}&status=actual&message_type=alert`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.features.map((feature: any) => ({
        id: feature.properties.id,
        title: feature.properties.headline,
        description: feature.properties.description,
        severity: feature.properties.severity,
        event_type: feature.properties.event,
        effective_at: feature.properties.effective,
        expires_at: feature.properties.expires,
        areas: feature.properties.areaDesc ? feature.properties.areaDesc.split(';') : []
      }));
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  async getNationalAlerts(): Promise<WeatherAlert[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/active?status=actual&message_type=alert&severity=Severe,Extreme`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.features.map((feature: any) => ({
        id: feature.properties.id,
        title: feature.properties.headline,
        description: feature.properties.description,
        severity: feature.properties.severity,
        event_type: feature.properties.event,
        effective_at: feature.properties.effective,
        expires_at: feature.properties.expires,
        areas: feature.properties.areaDesc ? feature.properties.areaDesc.split(';') : []
      }));
    } catch (error) {
      console.error('Error fetching national alerts:', error);
      return [];
    }
  }
}

export const weatherAlertsService = new WeatherAlertsService();
