import * as Location from 'expo-location';

let cachedLocationInfo = {
  latitude: 12.9591,
  longitude: 77.6974,
  areaName: 'Marathahalli, Bengaluru',
  country: 'India',
};

let hasRequestedPermission = false;

export const setManualLocation = (latitude, longitude, areaName) => {
  cachedLocationInfo = {
    latitude,
    longitude,
    areaName,
    country: 'India',
  };
  return cachedLocationInfo;
};

export const getCachedLocation = () => cachedLocationInfo;

export const getUserLocation = async (forceRefresh = false) => {
  // If we already have a cached location and refresh is not forced, return immediately (0ms latency!)
  if (cachedLocationInfo && !forceRefresh) {
    return cachedLocationInfo;
  }

  try {
    if (!hasRequestedPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      hasRequestedPermission = true;
      if (status !== 'granted') {
        return cachedLocationInfo;
      }
    }

    // 1. Try fastest instant cached GPS fix first (under 5ms)
    let loc = await Location.getLastKnownPositionAsync();

    // 2. Fallback to quick low-power position if no cached position
    if (!loc) {
      loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Lowest,
      });
    }

    if (loc && loc.coords) {
      cachedLocationInfo = {
        ...cachedLocationInfo,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      // Reverse geocode asynchronously without blocking
      Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }).then((places) => {
        if (places && places.length > 0) {
          const p = places[0];
          const parts = [p.district || p.subregion || p.name, p.city].filter(Boolean);
          cachedLocationInfo.areaName = parts.length > 0 ? parts.join(', ') : (p.city || 'Marathahalli, Bengaluru');
        }
      }).catch(() => {});
    }

    return cachedLocationInfo;
  } catch (error) {
    return cachedLocationInfo;
  }
};
