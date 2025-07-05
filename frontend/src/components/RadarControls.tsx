import React, { useState } from 'react';

interface RadarControlsProps {
  onRadarToggle: (enabled: boolean) => void;
  onRadarProductChange: (productId: string) => void;
  onRadarOpacityChange: (opacity: number) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  className?: string;
}

const RadarControls: React.FC<RadarControlsProps> = ({
  onRadarToggle,
  onRadarOpacityChange,
  userLocation,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [radarEnabled, setRadarEnabled] = useState(false);
  const [opacity, setOpacity] = useState(0.7);

  const handleRadarToggle = (enabled: boolean) => {
    setRadarEnabled(enabled);
    onRadarToggle(enabled);
  };

  const handleOpacityChange = (newOpacity: number) => {
    setOpacity(newOpacity);
    onRadarOpacityChange(newOpacity);
  };

  return (
    <div className={`radar-controls ${className || ''}`}>
      <div className="radar-controls-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="radar-controls-title">
          <span className="radar-controls-icon">🌩️</span>
          <span>Weather Radar</span>
          {radarEnabled && (
            <span className="radar-status active">ON</span>
          )}
        </div>
        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className="radar-controls-content">
          <div className="radar-toggle-section">
            <label className="radar-toggle-label">
              <input
                type="checkbox"
                checked={radarEnabled}
                onChange={(e) => handleRadarToggle(e.target.checked)}
                className="radar-toggle-checkbox"
              />
              <span className="radar-toggle-slider"></span>
              <span className="radar-toggle-text">Enable Radar Overlay</span>
            </label>
          </div>

          {radarEnabled && (
            <>
              <div className="radar-opacity-section">
                <label className="radar-opacity-label">
                  Opacity: {Math.round(opacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="radar-opacity-slider"
                />
              </div>

              <div className="radar-info-section">
                <div className="radar-info-item">
                  <span className="radar-info-label">Product:</span>
                  <span className="radar-info-value">🌧️ Precipitation</span>
                </div>
                <div className="radar-info-item">
                  <span className="radar-info-label">Coverage:</span>
                  <span className="radar-info-value">National (CONUS)</span>
                </div>
                <div className="radar-info-item">
                  <span className="radar-info-label">Update:</span>
                  <span className="radar-info-value">5-10 minutes</span>
                </div>
                <div className="radar-info-item">
                  <span className="radar-info-label">Resolution:</span>
                  <span className="radar-info-value">1 km</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RadarControls;
