
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MapPin, Save, Navigation } from 'lucide-react';
import Layout from '../components/Layout';
import GoogleMap from '../components/GoogleMap';
import { createDoctor } from '../lib/api/doctors';
import { geocodeAddress, reverseGeocode, type MapLocation } from '../lib/maps';
import type { DoctorCategory } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

const doctorSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  specialty: z.string().min(3, 'Specialty must be at least 3 characters'),
  category: z.enum(['A', 'B', 'C', 'D'] as const),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
});

type DoctorFormData = z.infer<typeof doctorSchema>;

export default function CreateDoctorPage() {
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showMap, setShowMap] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
  });

  const watchedAddress = watch('address');

  const onSubmit = async (data: DoctorFormData) => {
    try {
      setLoading(true);
      await createDoctor(data);
      navigate('/super-admin/doctors');
    } catch (error) {
      console.error('Error creating doctor:', error);
      alert('Failed to create doctor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeocodeAddress = async () => {
    const address = getValues('address');
    if (!address?.trim()) {
      alert('Please enter an address first');
      return;
    }

    try {
      setGeoLoading(true);
      const location = await geocodeAddress(address);
      if (location) {
        setSelectedLocation(location);
        setValue('location_lat', location.lat);
        setValue('location_lng', location.lng);
        setShowMap(true);
      } else {
        alert('Could not find location for this address. You can select it manually on the map.');
        setShowMap(true);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error finding location. Please try again.');
    } finally {
      setGeoLoading(false);
    }
  };

  const handleLocationSelect = async (location: MapLocation) => {
    setSelectedLocation(location);
    setValue('location_lat', location.lat);
    setValue('location_lng', location.lng);

    // Try to reverse geocode to get address
    try {
      const address = await reverseGeocode(location.lat, location.lng);
      if (address && !watchedAddress) {
        setValue('address', address);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: MapLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        try {
          const address = await reverseGeocode(location.lat, location.lng);
          if (address) {
            setValue('address', address);
          }
        } catch (error) {
          console.error('Error getting address:', error);
        }

        handleLocationSelect(location);
        setShowMap(true);
      },
      (error) => {
        console.error('Error getting current location:', error);
        alert('Could not get your current location. Please enter address manually.');
      }
    );
  };

  const handleLocationLookup = async () => {
    const address = watch('address');
    if (!address) {
      alert('Please enter an address first');
      return;
    }

    try {
      // Simple geocoding using a public API (in production, use Google Maps API)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setValue('location_lat', lat);
        setValue('location_lng', lng);
        alert('Location coordinates found and set!');
      } else {
        alert('Could not find coordinates for this address');
      }
    } catch (error) {
      console.error('Error looking up location:', error);
      alert('Error looking up location coordinates');
    }
  };

  const categories = [
    { value: 'A', label: 'Category A - High Priority', color: 'text-green-600' },
    { value: 'B', label: 'Category B - Medium Priority', color: 'text-blue-600' },
    { value: 'C', label: 'Category C - Standard', color: 'text-yellow-600' },
    { value: 'D', label: 'Category D - Low Priority', color: 'text-red-600' },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/super-admin/doctors')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Doctor</h1>
            <p className="text-gray-600">Add a new doctor to your network</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  {...register('first_name')}
                  className="form-input"
                  placeholder="John"
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  {...register('last_name')}
                  className="form-input"
                  placeholder="Smith"
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Specialty</label>
              <input
                type="text"
                {...register('specialty')}
                className="form-input"
                placeholder="Cardiology, Orthopedics, General Practice, etc."
              />
              {errors.specialty && (
                <p className="mt-1 text-sm text-red-600">{errors.specialty.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Category</label>
              <select {...register('category')} className="form-input">
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Information</h2>
            
            <div>
              <label className="form-label">Address</label>
              <textarea
                {...register('address')}
                className="form-input"
                rows={3}
                placeholder="Hospital/clinic address including street, city, and postal code"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* Location Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={geoLoading || !watchedAddress?.trim()}
                className="btn-secondary flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                {geoLoading ? 'Finding Location...' : 'Find on Map'}
              </button>
              
              <button
                type="button"
                onClick={getCurrentLocation}
                className="btn-secondary flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Use Current Location
              </button>
              
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Select on Map
              </button>
              
              {selectedLocation && (
                <div className="text-sm text-gray-600">
                  📍 Location: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </div>
              )}
            </div>

            {/* Interactive Map */}
            {showMap && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-gray-900">Select Doctor Location</h3>
                  <button
                    type="button"
                    onClick={() => setShowMap(false)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
                  >
                    Hide Map
                  </button>
                </div>
                
                <GoogleMap
                  center={selectedLocation || undefined}
                  height="350px"
                  clickable={true}
                  showCurrentLocation={true}
                  onLocationSelect={handleLocationSelect}
                  className="rounded-lg border border-gray-300"
                />
                
                <p className="text-xs text-gray-500 mt-2">
                  💡 Click anywhere on the map to set the doctor's location
                </p>
              </div>
            )}

            {/* Coordinates Display/Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="form-label">Latitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  {...register('location_lat', { valueAsNumber: true })}
                  className="form-input"
                  placeholder="40.7128"
                  readOnly={!!selectedLocation}
                />
              </div>

              <div>
                <label className="form-label">Longitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  {...register('location_lng', { valueAsNumber: true })}
                  className="form-input"
                  placeholder="-74.0060"
                  readOnly={!!selectedLocation}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate('/super-admin/doctors')}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Doctor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}