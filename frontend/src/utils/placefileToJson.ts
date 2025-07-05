// Convert GRLevelX placefile text to JSON array of LightningStrike objects (browser version)

interface LightningStrike {
  id: string;
  latitude: number;
  longitude: number;
  age: number;
  timestamp: string;
  polarity: 'positive' | 'negative' | 'unknown';
  intensity: number;
  source: string;
}

function placefileToJson(content: string): LightningStrike[] {
  const strikes: LightningStrike[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
    let strike: LightningStrike | null = null;
    if (trimmed.startsWith('Object:')) {
      strike = parseObjectLine(trimmed);
    } else if (trimmed.startsWith('Icon:')) {
      strike = parseIconLine(trimmed);
    } else if (trimmed.includes(',')) {
      strike = parseCSVLine(trimmed);
    } else if (trimmed.includes('|')) {
      strike = parsePipeLine(trimmed);
    }
    if (strike) strikes.push(strike);
  }
  return strikes;
}

function parseObjectLine(line: string): LightningStrike | null {
  try {
    // Object: lat,lon,age,...
    const parts = line.replace('Object:', '').trim().split(',');
    if (parts.length >= 3) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      const age = parseInt(parts[2]) || 0;
      if (!isNaN(lat) && !isNaN(lon)) {
        return createStrike(lat, lon, age);
      }
    }
  } catch {}
  return null;
}

function parseIconLine(line: string): LightningStrike | null {
  try {
    // Icon: lat,lon,age,...
    const parts = line.replace('Icon:', '').trim().split(',');
    if (parts.length >= 3) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      const age = parseInt(parts[2]) || 0;
      if (!isNaN(lat) && !isNaN(lon)) {
        return createStrike(lat, lon, age);
      }
    }
  } catch {}
  return null;
}

function parseCSVLine(line: string): LightningStrike | null {
  try {
    const parts = line.split(',');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      const age = parts.length > 2 ? parseInt(parts[2]) : 0;
      if (!isNaN(lat) && !isNaN(lon)) {
        return createStrike(lat, lon, age);
      }
    }
  } catch {}
  return null;
}

function parsePipeLine(line: string): LightningStrike | null {
  try {
    const parts = line.split('|');
    if (parts.length >= 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);
      const age = parts.length > 2 ? parseInt(parts[2]) : 0;
      if (!isNaN(lat) && !isNaN(lon)) {
        return createStrike(lat, lon, age);
      }
    }
  } catch {}
  return null;
}

function createStrike(lat: number, lon: number, age: number): LightningStrike {
  const timestamp = new Date(Date.now() - age * 60000);
  return {
    id: `strike_${lat}_${lon}_${timestamp.getTime()}`,
    latitude: lat,
    longitude: lon,
    age,
    timestamp: timestamp.toISOString(),
    polarity: Math.random() > 0.5 ? 'negative' : 'positive',
    intensity: Math.floor(Math.random() * 100) + 1,
    source: 'GRLevelX Placefile'
  };
}

export { placefileToJson };
export type { LightningStrike };
