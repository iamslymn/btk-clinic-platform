import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader } from 'lucide-react';
import { 
  loadGoogleMaps, 
  MAP_CONFIG, 
  type MapLocation, 
  type DoctorMapMarker 
} from '../lib/maps';

interface GoogleMapProps {
  center?: MapLocation;
  zoom?: number;
  height?: string;
  className?: string;
  markers?: DoctorMapMarker[];
  showCurrentLocation?: boolean;
  clickable?: boolean;
  onLocationSelect?: (location: MapLocation) => void;
  onMarkerClick?: (marker: DoctorMapMarker) => void;
}

// Note: For production, you would need a real Google Maps API key
// This is a placeholder implementation
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'demo-key';

export default function GoogleMap({
  center = MAP_CONFIG.defaultCenter,
  zoom = MAP_CONFIG.defaultZoom,
  height = '400px',
  className = '',
  markers = [],
  showCurrentLocation = false,
  clickable = false,
  onLocationSelect,
  onMarkerClick
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<MapLocation | null>(null);

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (mapInstance.current && center) {
      mapInstance.current.setCenter(center);
    }
  }, [center]);

  useEffect(() => {
    if (mapInstance.current) {
      addMarkersToMap();
    }
  }, [markers]);

  const initializeMap = async () => {
    if (!mapRef.current) return;

    try {
      setLoading(true);
      setError(null);

      // For demo purposes, we'll create a simple fallback map
      if (GOOGLE_MAPS_API_KEY === 'demo-key') {
        createFallbackMap();
        return;
      }

      await loadGoogleMaps(GOOGLE_MAPS_API_KEY);

      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        styles: MAP_CONFIG.styles,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: false
      });

      mapInstance.current = map;

      if (clickable && onLocationSelect) {
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const location: MapLocation = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng()
            };
            onLocationSelect(location);
          }
        });
      }

      if (showCurrentLocation) {
        getCurrentUserLocation();
      }

      addMarkersToMap();
      setLoading(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to load map. Please check your internet connection.');
      createFallbackMap();
    }
  };

  const createFallbackMap = () => {
    if (!mapRef.current) return;

    // Create a simple fallback map UI
    setLoading(false);
    setError('Map integration requires Google Maps API key. Showing location list instead.');
  };

  const getCurrentUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: MapLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);

          if (mapInstance.current) {
            const userMarker = new google.maps.Marker({
              position: location,
              map: mapInstance.current,
              title: 'Your Location',
              icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation">
                    <polygon points="3,11 22,2 13,21 11,13 3,11"></polygon>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24)
              }
            });
          }
        },
        (error) => {
          console.warn('Error getting user location:', error);
        }
      );
    }
  };

  const addMarkersToMap = () => {
    if (!mapInstance.current || !google.maps) return;

    markers.forEach((marker) => {
      const mapMarker = new google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map: mapInstance.current!,
        title: marker.name,
        icon: {
          url: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32)
        }
      });

      if (onMarkerClick) {
        mapMarker.addListener('click', () => {
          onMarkerClick(marker);
        });
      }

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${marker.name}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${marker.specialty}</p>
            <p style="margin: 0; font-size: 11px; color: #888;">${marker.address}</p>
            ${marker.phone ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">${marker.phone}</p>` : ''}
          </div>
        `
      });

      mapMarker.addListener('click', () => {
        infoWindow.open(mapInstance.current!, mapMarker);
      });
    });
  };

  // Fallback UI when Google Maps is not available
  if (GOOGLE_MAPS_API_KEY === 'demo-key' || error) {
    return (
      <div className={`${className}`} style={{ height }}>
        <div className="w-full h-full bg-gray-100 border border-gray-300 rounded-lg flex flex-col">
          {/* Fallback Map Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Location Map</span>
              {error && (
                <span className="text-xs text-amber-600 ml-2">
                  (Demo Mode - Google Maps API required)
                </span>
              )}
            </div>
          </div>

          {/* Fallback Map Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {markers.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 mb-3">
                  {markers.length} Location{markers.length !== 1 ? 's' : ''}
                </h4>
                {markers.map((marker, index) => (
                  <div
                    key={marker.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => onMarkerClick?.(marker)}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 text-sm">{marker.name}</h5>
                        <p className="text-xs text-gray-600">{marker.specialty}</p>
                        <p className="text-xs text-gray-500 mt-1">{marker.address}</p>
                        {marker.phone && (
                          <p className="text-xs text-gray-500">{marker.phone}</p>
                        )}
                      </div>
                      <Navigation className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No locations to display</p>
              </div>
            )}
          </div>

          {/* Fallback Map Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-600 text-center">
              💡 To see interactive maps, configure Google Maps API key
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <Loader className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: height }}
      />

      {clickable && (
        <div className="absolute top-2 left-2 bg-white shadow-md rounded-lg p-2">
          <p className="text-xs text-gray-600">Click on the map to select location</p>
        </div>
      )}
    </div>
  );
}