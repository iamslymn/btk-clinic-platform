import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MapPin, Save } from 'lucide-react';
import Layout from '../components/Layout';
import { getDoctor, updateDoctor } from '../lib/api/doctors';
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

export default function EditDoctorPage() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
  });

  useEffect(() => {
    if (id) {
      loadDoctor();
    }
  }, [id]);

  const loadDoctor = async () => {
    if (!id) return;
    
    try {
      setInitialLoading(true);
      const doctor = await getDoctor(id);
      reset({
        first_name: doctor.first_name,
        last_name: doctor.last_name,
        specialty: doctor.specialty,
        category: doctor.category,
        address: doctor.address,
        location_lat: doctor.location_lat || undefined,
        location_lng: doctor.location_lng || undefined,
      });
    } catch (error) {
      console.error('Error loading doctor:', error);
      alert('Failed to load doctor data');
      navigate('/super-admin/doctors');
    } finally {
      setInitialLoading(false);
    }
  };

  const onSubmit = async (data: DoctorFormData) => {
    if (!id) return;

    try {
      setLoading(true);
      await updateDoctor(id, data);
      navigate('/super-admin/doctors');
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert('Failed to update doctor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationLookup = async () => {
    const address = watch('address');
    if (!address) {
      alert('Please enter an address first');
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setValue('location_lat', lat);
        setValue('location_lng', lng);
        alert('Location coordinates found and updated!');
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

  if (initialLoading) {
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Doctor</h1>
            <p className="text-gray-600">Update doctor information</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Latitude (Optional)</label>
                <input
                  type="number"
                  step="any"
                  {...register('location_lat', { valueAsNumber: true })}
                  className="form-input"
                  placeholder="40.7128"
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
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleLocationLookup}
              className="mt-2 flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm"
            >
              <MapPin className="w-4 h-4" />
              Update coordinates from address
            </button>
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
                  Update Doctor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}