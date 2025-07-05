# APRSwx Testing Guide

## Testing the Recent Fixes

### 1. Map Click for Lat/Long Selection
**Test Steps:**
1. Open settings panel
2. Click "📍 Click Map for Location"
3. Verify cursor changes to crosshair
4. Verify "🎯 Click map to set location" indicator appears
5. Click anywhere on the map
6. Verify coordinates appear in location fields
7. Verify click mode automatically disables

**Expected Results:**
- Cursor changes to crosshair when click mode is enabled
- Orange pulsing indicator shows "Click map to set location"
- Clicking map captures lat/lng coordinates
- Location fields update with new coordinates
- Button text changes back to normal after click

### 2. Settings Panel Width
**Test Steps:**
1. Open settings panel
2. Check panel width and content fit
3. Scroll through all settings sections

**Expected Results:**
- Panel should be wider (500-650px)
- More options fit on screen with less scrolling
- All text and controls are readable
- Scrolling is contained within the panel

### 3. Station Type Auto-Selection
**Test Steps:**
1. Open settings panel
2. Check "Station Types" section in filters
3. Verify all types are pre-selected

**Expected Results:**
- Mobile ✓
- Fixed ✓  
- Weather ✓
- Digipeater ✓
- IGate ✓

### 4. Distance Range Filter
**Test Steps:**
1. Check distance range input label
2. Verify it shows "Distance Range (km):"
3. Change the value and check conversion display

**Expected Results:**
- Label shows "Distance Range (km):"
- Input accepts numeric values
- Shows conversion: "100 km (62 miles)" format

### 5. Dark Mode Theme
**Test Steps:**
1. Toggle dark mode switch
2. Verify entire app changes theme
3. Check all panels, buttons, inputs

**Expected Results:**
- Entire app background becomes dark (#1a1a1a)
- All panels switch to dark theme
- Text becomes light colored
- Buttons and inputs have dark styling
- Status indicators remain visible

### 6. Weather Radar Images
**Test Steps:**
1. Toggle radar overlay on map
2. Wait for radar to load
3. Verify radar image appears

**Expected Results:**
- Radar toggle button activates
- Current weather radar overlay appears on map
- Images load from National Weather Service
- No broken image indicators

### 7. Distance-Based Station Filtering
**Test Steps:**
1. Set user location
2. Set distance range to 50km
3. Verify only nearby stations appear in list

**Expected Results:**
- Station list shows only stations within range
- Distance is calculated correctly
- Stations beyond range are hidden
- Counter shows filtered count

## Debugging Tips

### Check Browser Console
Open Developer Tools (F12) and check for:
- JavaScript errors
- Network request failures
- Warning messages

### Network Tab
Monitor requests to:
- `/api/weather/radar-overlay/`
- `/api/weather/radar-sites/`
- WebSocket connections

### Local Storage
Check `aprswx_user_settings` in browser storage for:
- Saved user preferences
- Station type selections
- Distance settings

## Common Issues and Solutions

### Map Click Not Working
- Check if click event handlers are properly attached
- Verify cursor changes to crosshair
- Look for JavaScript errors in console

### Radar Images Not Loading
- Check network tab for failed requests
- Verify NWS radar service is available
- Check for CORS issues

### Dark Mode Not Complete
- Verify CSS classes are applied to body element
- Check if all components have dark theme styles
- Look for missing CSS selectors

### Settings Not Persisting
- Check localStorage for saved settings
- Verify JSON serialization/deserialization
- Look for save/load errors in console

## Performance Testing

### Load Times
- Initial page load should be < 3 seconds
- Settings panel should open instantly
- Map interactions should be responsive

### Memory Usage
- Check for memory leaks during extended use
- Monitor WebSocket connection stability
- Verify proper cleanup of map overlays

### Network Efficiency
- Radar data should be cached appropriately
- API requests should not be duplicated
- WebSocket should reconnect automatically

## Browser Compatibility

Test in:
- Chrome/Edge (Chromium-based)
- Firefox
- Safari (if available)

Check for:
- CSS compatibility
- JavaScript feature support
- WebSocket functionality
- Geolocation API access

## Mobile Testing

If testing on mobile:
- Touch interactions work properly
- Settings panel is readable
- Map controls are accessible
- Text size is appropriate
