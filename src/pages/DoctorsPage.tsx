
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, MapPin, Phone, Mail, List, Map as MapIcon, Navigation } from 'lucide-react';
import Layout from '../components/Layout';
import GoogleMap from '../components/GoogleMap';
import { getDoctors, deleteDoctor, searchDoctors } from '../lib/api/doctors-enhanced';
import { getDirectionsUrl, type DoctorMapMarker } from '../lib/maps';
import type { DoctorWithWorkplacesAndSpecialization as Doctor } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { RoleBasedAccess, ReadOnlyWarning } from '../components/RoleBasedAccess';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../lib/permissions';
import { t } from '../lib/i18n';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const navigate = useNavigate();
  const { role } = useAuth();
  const permissions = usePermissions(role);

  // Convert doctors to map markers
  const doctorMarkers: DoctorMapMarker[] = doctors
    .filter(doctor => doctor.location_lat && doctor.location_lng)
    .map(doctor => ({
      id: doctor.id,
      lat: doctor.location_lat!,
      lng: doctor.location_lng!,
      name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
      specialty: doctor.specialty,
      address: doctor.address,
      phone: doctor.phone
    }));

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const data = await getDoctors();
      setDoctors(data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadDoctors();
      return;
    }

    try {
      const data = await searchDoctors(query);
      setDoctors(data);
    } catch (error) {
      console.error('Error searching doctors:', error);
    }
  };

  const handleDelete = async (doctorId: string, doctorName: string) => {
    if (!confirm(`Are you sure you want to delete Dr. ${doctorName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(doctorId);
      await deleteDoctor(doctorId);
      await loadDoctors(); // Reload the list
    } catch (error) {
      console.error('Error deleting doctor:', error);
      alert('Failed to delete doctor. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleMarkerClick = (marker: DoctorMapMarker) => {
    const doctor = doctors.find(d => d.id === marker.id);
    if (doctor) {
      navigate(`/doctors/${doctor.id}/edit`);
    }
  };

  const getDirections = (doctor: Doctor) => {
    if (doctor.location_lat && doctor.location_lng) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const origin = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            const destination = {
              lat: doctor.location_lat!,
              lng: doctor.location_lng!
            };
            const url = getDirectionsUrl(origin, destination);
            window.open(url, '_blank');
          },
          (error) => {
            console.error('Error getting current location:', error);
            // Fallback to just the doctor's location
            window.open(`https://www.google.com/maps/search/?api=1&query=${doctor.location_lat},${doctor.location_lng}`, '_blank');
          }
        );
      } else {
        // Fallback if geolocation is not available
        window.open(`https://www.google.com/maps/search/?api=1&query=${doctor.location_lat},${doctor.location_lng}`, '_blank');
      }
    } else {
      // Fallback to address search
      const addressQuery = encodeURIComponent(doctor.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${addressQuery}`, '_blank');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-blue-100 text-blue-800', 
      C: 'bg-yellow-100 text-yellow-800',
      D: 'bg-red-100 text-red-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Role-based Access Warning */}
        {permissions.hasReadOnlyDoctors && (
          <ReadOnlyWarning resource="doctors" />
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('pages.doctors.title')}</h1>
            <p className="mt-2 text-gray-600">
              {t('pages.doctors.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                {t('pages.assignments.listView')}
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                Xəritə {doctorMarkers.length > 0 && `(${doctorMarkers.length})`}
              </button>
            </div>
            
            <RoleBasedAccess permission="CREATE_DOCTOR">
              <button
                onClick={() => navigate('/super-admin/doctors/create')}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('pages.doctors.addDoctor')}
              </button>
            </RoleBasedAccess>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('pages.doctors.searchPlaceholder')}
              className="pl-10 form-input"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>


        {/* Map View */}
        {viewMode === 'map' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Həkim Yerləşmələri</h2>
                <p className="text-sm text-gray-600">
                  {doctors.length} həkimdən {doctorMarkers.length}-nin yer məlumatı var
                </p>
              </div>
              {doctorMarkers.length === 0 && (
                <p className="text-sm text-gray-500">
                  Add location coordinates to doctors to see them on the map
                </p>
              )}
            </div>
            
            <GoogleMap
              height="500px"
              markers={doctorMarkers}
              onMarkerClick={handleMarkerClick}
              showCurrentLocation={true}
              className="rounded-lg border border-gray-300"
            />
            
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <p>💡 Click on markers to view doctor details</p>
              <p>🗺️ Use current location for directions</p>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Doctor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specialty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ümumi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Planeta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Klinika(lar)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center">
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : doctors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        {searchQuery ? t('pages.doctors.noResults') : 'Həkim tapılmadı.'}
                      </td>
                    </tr>
                  ) : (
                    doctors.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                Dr. {doctor.first_name} {doctor.last_name}
                              </div>
                              {doctor.phone && (
                                <div className="text-sm text-gray-500 flex items-center mt-1">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {doctor.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doctor.specialty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(doctor.total_category || doctor.category)}`}>
                            {doctor.total_category || doctor.category || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(doctor.planeta_category)}`}>
                            {doctor.planeta_category || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {doctor.clinics && doctor.clinics.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {doctor.clinics.map((link) => (
                                <span key={link.id} className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  {(link as any).clinic?.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Heç bir klinika təyin edilməyib</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <RoleBasedAccess permission="EDIT_DOCTOR">
                              <button
                                onClick={() => navigate(`/super-admin/doctors/${doctor.id}/edit`)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title={t('pages.doctors.editDoctor')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </RoleBasedAccess>
                            
                            <RoleBasedAccess permission="DELETE_DOCTOR">
                              <button
                                onClick={() => handleDelete(doctor.id, `${doctor.first_name} ${doctor.last_name}`)}
                                disabled={deleteLoading === doctor.id}
                                className="text-red-600 hover:text-red-900"
                                title={t('pages.doctors.deleteDoctor')}
                              >
                                {deleteLoading === doctor.id ? (
                                  <LoadingSpinner />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </RoleBasedAccess>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


      </div>
    </Layout>
  );
}