export interface LightningStrike {
  id: string;
  latitude: number;
  longitude: number;
  age: number;
  timestamp: string;
  polarity: 'positive' | 'negative' | 'unknown';
  intensity: number;
  source: string;
}

class FreeLightningPlacefileService {
  private url: string;
  private intervalMs: number;
  private timer: number | null = null;
  private subscribers: ((strikes: LightningStrike[]) => void)[] = [];
  private strikes: LightningStrike[] = [];

  constructor(url: string, intervalMs: number = 60000) {
    this.url = url;
    this.intervalMs = intervalMs;
  }

  start() {
    this.fetchAndNotify();
    this.timer = window.setInterval(() => this.fetchAndNotify(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  subscribe(callback: (strikes: LightningStrike[]) => void): () => void {
    this.subscribers.push(callback);
    // Immediately send current data if available
    if (this.strikes.length > 0) callback(this.strikes);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private async fetchAndNotify() {
    try {
      // Disabled due to CORS issues - using real lightning data from other sources
      console.log('FreeLightning placefile service disabled due to CORS restrictions');
      // Keep empty strikes array to prevent errors
      this.strikes = [];
      this.subscribers.forEach(cb => cb(this.strikes));
    } catch (err) {
      console.error('Failed to fetch or parse lightning placefile:', err);
      // Keep empty strikes array to prevent errors
      this.strikes = [];
      this.subscribers.forEach(cb => cb(this.strikes));
    }
  }
}

// Example usage URL (replace with your actual FreeLightning.com placefile URL)
export const freeLightningPlacefileService = new FreeLightningPlacefileService(
  'https://www.freelightning.com/hub/placefile.php?request=10488|10582|163828418|10233|10183|10418|0|84764|1',
  60000 // 1 minute
);
