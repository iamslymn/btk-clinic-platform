import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Calendar, User, Building, Users } from 'lucide-react';
import { createAssignment } from '../lib/api/assignments-enhanced';
import { getRepresentatives } from '../lib/api/representatives-enhanced';
import { getClinicsWithDoctors } from '../lib/api/clinics';
import { getClinicsForRepresentative } from '../lib/api/assignments-enhanced';
import type { AssignmentForm, RepresentativeWithDetails, ClinicWithDoctors } from '../types';
import LoadingSpinner from './LoadingSpinner';

const createAssignmentSchema = z.object({
  representative_id: z.string().min(1, 'Representative is required'),
  clinic_id: z.string().min(1, 'Clinic is required'),
  assigned_date: z.string().min(1, 'Date is required'),
  doctor_ids: z.array(z.string()).min(1, 'At least one doctor is required'),
  notes: z.string().optional()
});

type CreateAssignmentFormData = z.infer<typeof createAssignmentSchema>;

interface CreateAssignmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAssignmentForm({ onClose, onSuccess }: CreateAssignmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [representatives, setRepresentatives] = useState<RepresentativeWithDetails[]>([]);
  const [clinics, setClinics] = useState<ClinicWithDoctors[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<ClinicWithDoctors | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreateAssignmentFormData>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      doctor_ids: []
    }
  });

  const selectedDoctorIds = watch('doctor_ids') || [];
  const selectedClinicId = watch('clinic_id');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClinicId) {
      const clinic = clinics.find(c => c.id === selectedClinicId);
      setSelectedClinic(clinic || null);
      // Reset selected doctors when clinic changes
      setValue('doctor_ids', []);
    } else {
      setSelectedClinic(null);
    }
  }, [selectedClinicId, clinics, setValue]);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [representativesData, clinicsData] = await Promise.all([
        getRepresentatives(),
        getClinicsWithDoctors()
      ]);
      setRepresentatives(representativesData);
      setClinics(clinicsData);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setError('Failed to load representatives and clinics');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDoctorChange = (doctorId: string, checked: boolean) => {
    const currentDoctors = selectedDoctorIds;
    if (checked) {
      setValue('doctor_ids', [...currentDoctors, doctorId]);
    } else {
      setValue('doctor_ids', currentDoctors.filter(id => id !== doctorId));
    }
  };

  // When representative changes, filter clinics to those linked to rep
  const selectedRepId = watch('representative_id');
  useEffect(() => {
    const filterClinicsForRep = async () => {
      if (!selectedRepId) return;
      try {
        const repClinics = await getClinicsForRepresentative(selectedRepId);
        const repClinicIds = new Set(repClinics.map((c: any) => c.id));
        // Keep only clinics associated with the representative
        setClinics(prev => prev.filter(c => repClinicIds.has(c.id)));
        // Reset selected clinic and doctors when rep changes
        setValue('clinic_id', '');
        setValue('doctor_ids', []);
        setSelectedClinic(null);
      } catch (e) {
        // If fetch fails, keep full list as fallback
      }
    };
    filterClinicsForRep();
  }, [selectedRepId, setValue]);

  const onSubmit = async (data: CreateAssignmentFormData) => {
    try {
      setIsSubmitting(true);
      setError('');

      await createAssignment(data);
      
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      setError(err.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading representatives and clinics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Assignment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Assignment Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Assignment Date *
                </label>
                <input
                  type="date"
                  {...register('assigned_date')}
                  min={today}
                  className="form-input"
                />
                {errors.assigned_date && (
                  <p className="text-sm text-red-600 mt-1">{errors.assigned_date.message}</p>
                )}
              </div>

              <div>
                <label className="form-label flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Representative *
                </label>
                <select {...register('representative_id')} className="form-input">
                  <option value="">Select representative</option>
                  {representatives.map(rep => (
                    <option key={rep.id} value={rep.id}>
                      {rep.first_name} {rep.last_name}
                    </option>
                  ))}
                </select>
                {errors.representative_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.representative_id.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="form-label flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Clinic *
                </label>
                <select {...register('clinic_id')} className="form-input">
                  <option value="">Select clinic</option>
                  {clinics.map(clinic => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name} - {clinic.address}
                    </option>
                  ))}
                </select>
                {errors.clinic_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.clinic_id.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Doctor Selection */}
          {selectedClinic && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Doctors from {selectedClinic.name}
              </h3>
              
              {selectedClinic.doctors.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    No doctors are assigned to this clinic yet. Please add doctors to the clinic first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedClinic.doctors.map(clinicDoctor => (
                    <label 
                      key={clinicDoctor.doctor.id} 
                      className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDoctorIds.includes(clinicDoctor.doctor.id)}
                        onChange={(e) => handleDoctorChange(clinicDoctor.doctor.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          Dr. {clinicDoctor.doctor.first_name} {clinicDoctor.doctor.last_name}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          {clinicDoctor.doctor.specialization?.display_name}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Total: {clinicDoctor.doctor.total_category}
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Planeta: {clinicDoctor.doctor.planeta_category}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              
              {errors.doctor_ids && (
                <p className="text-sm text-red-600">{errors.doctor_ids.message}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Notes</h3>
            <div>
              <label className="form-label">Notes (Optional)</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="form-input"
                placeholder="Add any additional notes or instructions for this assignment..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Create Assignment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
