import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { freeLightningPlacefileService, LightningStrike } from '../services/freeLightningPlacefileService';

interface LightningOverlayProps {
  visible: boolean;
  opacity?: number;
  maxAge?: number; // Maximum age in minutes to show strikes
  showStrength?: boolean;
}

const LightningOverlay: React.FC<LightningOverlayProps> = ({
  visible,
  opacity = 0.8,
  maxAge = 60,
  showStrength = true
}) => {
  const map = useMap();
  const lightningLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [strikes, setStrikes] = useState<LightningStrike[]>([]);

  // Subscribe to lightning data updates
  useEffect(() => {
    freeLightningPlacefileService.start();
    const unsubscribe = freeLightningPlacefileService.subscribe(setStrikes);
    return () => {
      unsubscribe();
      freeLightningPlacefileService.stop();
    };
  }, []);

  // Update lightning strikes on map
  useEffect(() => {
    if (!visible || !strikes.length) {
      clearLightningStrikes();
      return;
    }
    updateLightningStrikes();
  }, [visible, strikes, maxAge, showStrength, opacity]);

  // Clear existing lightning strikes
  const clearLightningStrikes = () => {
    if (lightningLayerRef.current) {
      map.removeLayer(lightningLayerRef.current);
      lightningLayerRef.current = null;
    }
    
    markersRef.current.forEach(marker => {
      if (marker && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
    markersRef.current = [];
  };

  // Update lightning strikes on map
  const updateLightningStrikes = () => {
    if (!strikes.length) return;
    const L = (window as any).L;
    clearLightningStrikes();
    lightningLayerRef.current = L.layerGroup();
    const recentStrikes = strikes.filter((strike: LightningStrike) => strike.age <= maxAge);
    recentStrikes.forEach((strike: LightningStrike) => {
      const marker = createLightningMarker(strike, L);
      if (marker) {
        lightningLayerRef.current.addLayer(marker);
        markersRef.current.push(marker);
      }
    });
    if (lightningLayerRef.current && lightningLayerRef.current.getLayers().length > 0) {
      lightningLayerRef.current.addTo(map);
    }
    console.log(`Added ${recentStrikes.length} lightning strikes to map from FreeLightning Placefile`);
  };

  // Create lightning marker
  const createLightningMarker = (strike: LightningStrike, L: any) => {
    // Calculate color based on age (newer = brighter)
    const ageRatio = strike.age / maxAge;
    const intensity = Math.max(0.2, 1 - ageRatio);
    
    // Color based on intensity and polarity
    let color = '#FFD700'; // Default gold
    if (strike.polarity === 'positive') {
      color = strike.intensity > 70 ? '#FF4500' : '#FF6347'; // Orange/red for positive
    } else if (strike.polarity === 'negative') {
      color = strike.intensity > 70 ? '#1E90FF' : '#87CEEB'; // Blue for negative
    } else {
      color = strike.intensity > 70 ? '#FFD700' : '#F0E68C'; // Gold for unknown
    }

    // Adjust color for age
    const rgba = hexToRgba(color, intensity * opacity);

    // Size based on intensity
    const size = Math.max(8, Math.min(20, strike.intensity / 5));
    const glow = Math.max(4, Math.min(16, strike.intensity / 6));

    // Create custom icon for lightning
    const iconHtml = `
      <div style="
        position: relative;
        width: ${size + 4}px;
        height: ${size + 4}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          background: ${rgba};
          border-radius: 50%;
          box-shadow: 0 0 ${glow}px ${rgba};
          animation: lightningPulse 2s infinite;
        "></div>
        <div style="
          position: absolute;
          color: white;
          font-size: ${Math.max(10, Math.min(16, size * 0.8))}px;
          font-weight: bold;
          text-shadow: 0 0 3px black;
          pointer-events: none;
          z-index: 1000;
        ">⚡</div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'lightning-marker',
      iconSize: [size + 4, size + 4],
      iconAnchor: [(size + 4) / 2, (size + 4) / 2],
      popupAnchor: [0, -(size + 4) / 2]
    });

    // Create marker
    const marker = L.marker([strike.latitude, strike.longitude], { icon });

    // Add popup with strike information
    const popupContent = `
      <div style="font-family: Arial, sans-serif; min-width: 200px; color: #333;">
        <h4 style="margin: 0 0 10px 0; color: ${color};">⚡ Lightning Strike</h4>
        <div style="margin: 5px 0;"><strong>Time:</strong> ${new Date(strike.timestamp).toLocaleString()}</div>
        <div style="margin: 5px 0;"><strong>Age:</strong> ${strike.age} minutes ago</div>
        <div style="margin: 5px 0;"><strong>Intensity:</strong> ${strike.intensity}/100</div>
        <div style="margin: 5px 0;"><strong>Polarity:</strong> ${strike.polarity}</div>
        <div style="margin: 5px 0;"><strong>Location:</strong> ${strike.latitude.toFixed(4)}°, ${strike.longitude.toFixed(4)}°</div>
        <div style="margin: 5px 0; font-size: 12px; color: #666;"><strong>Source:</strong> ${strike.source}</div>
      </div>
    `;

    marker.bindPopup(popupContent);
    return marker;
  };

  // Convert hex color to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // No need for map move effect, as placefile is global and not bounds-filtered

  // Cleanup
  useEffect(() => {
    return () => {
      clearLightningStrikes();
    };
  }, []);

  return null;
};

export default LightningOverlay;
