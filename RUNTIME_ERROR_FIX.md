# APRSwx Runtime Error Fix - userLocation.latitude.toFixed() Issue

## 🐛 PROBLEM
Frontend was throwing runtime error:
```
TypeError: userLocation.latitude.toFixed is not a function
```

## 🔍 ROOT CAUSE
The backend API was returning latitude/longitude as strings instead of numbers:
```python
# BEFORE (backend/websockets/settings_api.py)
'latitude': str(settings_obj.latitude),
'longitude': str(settings_obj.longitude),
```

This caused the frontend to receive strings, and when JavaScript tried to call `.toFixed()` on a string, it failed.

## ✅ SOLUTION IMPLEMENTED

### 1. Backend Fix (settings_api.py)
```python
# AFTER - Return as numbers
'latitude': float(settings_obj.latitude),
'longitude': float(settings_obj.longitude),
```

### 2. Frontend Defensive Coding
Added `Number()` wrapper for safety in case any strings still get through:

**APRSMap.tsx:**
```tsx
// BEFORE
<p>{userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</p>

// AFTER  
<p>{Number(userLocation.latitude).toFixed(6)}, {Number(userLocation.longitude).toFixed(6)}</p>
```

**Similar fixes applied to:**
- `UserSettingsSimple.tsx`
- Station detail displays in `APRSMap.tsx`

## 🧪 VERIFICATION
- ✅ Backend now returns numeric values for latitude/longitude
- ✅ Frontend protected with Number() conversion
- ✅ toFixed() errors should be resolved

## 📋 FILES MODIFIED
- `backend/websockets/settings_api.py` - Fixed API response data types
- `frontend/src/components/APRSMap.tsx` - Added defensive Number() wrappers
- `frontend/src/components/UserSettingsSimple.tsx` - Added defensive Number() wrappers

## 🎯 RESULT
The runtime error `userLocation.latitude.toFixed is not a function` should now be resolved. Users can set locations without encountering JavaScript errors in the browser console.

## 🔄 NEXT STEPS
1. Refresh the frontend page
2. Test setting a location in settings
3. Verify no more runtime errors occur
4. Check browser console for any remaining errors
