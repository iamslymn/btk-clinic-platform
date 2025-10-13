// Google Maps utility functions and types

export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface DoctorMapMarker extends MapLocation {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone?: string;
}

// Load Google Maps API dynamically
export const loadGoogleMaps = (apiKey: string): Promise<typeof google> => {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.maps) {
      resolve(google);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (typeof google !== 'undefined' && google.maps) {
        resolve(google);
      } else {
        reject(new Error('Google Maps API failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'));
    };
    
    document.head.appendChild(script);
  });
};

// Geocode address to coordinates
export const geocodeAddress = async (address: string): Promise<MapLocation | null> => {
  try {
    if (typeof google === 'undefined' || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    const geocoder = new google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            address: results[0].formatted_address
          });
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Reverse geocode coordinates to address
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    if (typeof google === 'undefined' || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    const geocoder = new google.maps.Geocoder();
    const latlng = { lat, lng };
    
    return new Promise((resolve) => {
      geocoder.geocode({ location: latlng }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
};

// Calculate distance between two points
export const calculateDistance = (
  point1: MapLocation,
  point2: MapLocation
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(point2.lat - point1.lat);
  const dLon = deg2rad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get directions URL for Google Maps
export const getDirectionsUrl = (origin: MapLocation, destination: MapLocation): string => {
  return `https://www.google.com/maps/dir/${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;
};

// Get current location using browser's geolocation API
export const getCurrentLocation = (): Promise<MapLocation | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.warn('Error getting current location:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000 // 10 minutes
      }
    );
  });
};

// Default coordinates for different cities in Turkey (you can customize this)
export const DEFAULT_LOCATIONS = {
  istanbul: { lat: 41.0082, lng: 28.9784 },
  ankara: { lat: 39.9334, lng: 32.8597 },
  izmir: { lat: 38.4192, lng: 27.1287 },
  bursa: { lat: 40.1826, lng: 29.0665 },
  antalya: { lat: 36.8969, lng: 30.7133 }
};

// Google Maps configuration
export const MAP_CONFIG = {
  defaultZoom: 12,
  defaultCenter: DEFAULT_LOCATIONS.istanbul,
  styles: [
    {
      featureType: 'poi.business',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text',
      stylers: [{ visibility: 'off' }]
    }
  ]
};