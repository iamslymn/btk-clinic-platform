import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Mail, Lock, Building2, Search, Tag } from 'lucide-react';
import { createRepresentative } from '../lib/api/representatives-enhanced';
import { getManagers } from '../lib/api/managers';
import { getBrands } from '../lib/api/brands-enhanced';
import { getClinics } from '../lib/api/clinics';
import type { CreateRepresentativeForm, Manager, Brand, Clinic } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

const createRepresentativeSchema = z.object({
  email: z.string().email(t('forms.validation.validEmailRequired')),
  password: z.string().min(6, t('forms.validation.passwordMinLength')),
  first_name: z.string().min(1, t('forms.validation.firstNameRequired')),
  last_name: z.string().min(1, t('forms.validation.lastNameRequired')),
  manager_id: z.string().min(1, t('forms.validation.managerRequired')),
  clinic_ids: z.array(z.string()).min(1, 'At least one clinic is required'),
  brand_ids: z.array(z.string()).min(1, t('forms.validation.atLeastOneBrand'))
});

type CreateRepresentativeFormData = z.infer<typeof createRepresentativeSchema>;

interface CreateRepresentativeFormEnhancedProps {
  onClose: () => void;
  onSuccess: () => void;
}

const bakuDistricts: { value: BakuDistrict; label: string }[] = [
  { value: 'nasimi', label: 'Nasimi' },
  { value: 'yasamal', label: 'Yasamal' },
  { value: 'sabail', label: 'Sabail' },
  { value: 'narimanov', label: 'Narimanov' },
  { value: 'nizami', label: 'Nizami' },
  { value: 'khatai', label: 'Khatai' },
  { value: 'binagadi', label: 'Binagadi' },
  { value: 'surakhani', label: 'Surakhani' },
  { value: 'sabunchu', label: 'Sabunchu' },
  { value: 'khazar', label: 'Khazar' },
  { value: 'garadagh', label: 'Garadagh' },
  { value: 'pirallahi', label: 'Pirallahi' }
];

export default function CreateRepresentativeFormEnhanced({ onClose, onSuccess }: CreateRepresentativeFormEnhancedProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicSearch, setClinicSearch] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreateRepresentativeFormData>({
    resolver: zodResolver(createRepresentativeSchema),
    defaultValues: {
      clinic_ids: [],
      brand_ids: []
    }
  });

  const selectedClinics = watch('clinic_ids') || [];
  const selectedBrands = watch('brand_ids') || [];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const [managersData, brandsData, clinicsData] = await Promise.all([
        getManagers(),
        getBrands(),
        getClinics()
      ]);
      setManagers(managersData);
      setBrands(brandsData);
      setClinics(clinicsData);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      setError('Failed to load managers and brands');
    } finally {
      setLoadingData(false);
    }
  };

  const handleClinicToggle = (clinicId: string) => {
    const current = selectedClinics as string[];
    if (current.includes(clinicId)) {
      setValue('clinic_ids', current.filter(id => id !== clinicId));
    } else {
      setValue('clinic_ids', [...current, clinicId]);
    }
  };

  const handleBrandChange = (brandId: string, checked: boolean) => {
    const currentBrands = selectedBrands;
    if (checked) {
      setValue('brand_ids', [...currentBrands, brandId]);
    } else {
      setValue('brand_ids', currentBrands.filter(b => b !== brandId));
    }
  };

  const onSubmit = async (data: CreateRepresentativeFormData) => {
    try {
      setIsSubmitting(true);
      setError('');

      await createRepresentative(data);
      
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating representative:', err);
      setError(err.message || 'Failed to create representative');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">{t('forms.createRepresentative.loadingData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('forms.createRepresentative.title')}</h2>
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

          {/* Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('forms.createRepresentative.accountInfo')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">{t('forms.createRepresentative.emailLabel')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    {...register('email')}
                    className="form-input pl-10"
                    placeholder={t('forms.createRepresentative.emailPlaceholder')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">{t('forms.createRepresentative.passwordLabel')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="password"
                    {...register('password')}
                    className="form-input pl-10"
                    placeholder={t('forms.createRepresentative.passwordPlaceholder')}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">{t('forms.createRepresentative.personalInfo')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">{t('forms.createRepresentative.firstNameLabel')}</label>
                <input
                  type="text"
                  {...register('first_name')}
                  className="form-input"
                  placeholder={t('forms.createRepresentative.firstNamePlaceholder')}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">{t('forms.createRepresentative.lastNameLabel')}</label>
                <input
                  type="text"
                  {...register('last_name')}
                  className="form-input"
                  placeholder={t('forms.createRepresentative.lastNamePlaceholder')}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="form-label">{t('forms.createRepresentative.managerLabel')}</label>
                <select {...register('manager_id')} className="form-input">
                  <option value="">{t('forms.createRepresentative.selectManager')}</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name}
                    </option>
                  ))}
                </select>
                {errors.manager_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.manager_id.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Work Clinics */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              İş Klinikalari
            </h3>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={clinicSearch}
                onChange={(e) => setClinicSearch(e.target.value)}
                placeholder="Klinika axtar..."
                className="pl-10 form-input"
              />
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {clinics
                .filter(c => !clinicSearch || `${c.name} ${c.address}`.toLowerCase().includes(clinicSearch.toLowerCase()))
                .map(clinic => (
                <label key={clinic.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedClinics.includes(clinic.id)}
                    onChange={() => handleClinicToggle(clinic.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{clinic.name}</div>
                    <div className="text-xs text-gray-600 truncate">{clinic.address}</div>
                  </div>
                </label>
              ))}
            </div>
            {errors.clinic_ids && (
              <p className="text-sm text-red-600">{errors.clinic_ids.message}</p>
            )}
          </div>

          {/* Brands */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              {t('forms.createRepresentative.brands')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {brands.map(brand => (
                <label key={brand.id} className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.id)}
                    onChange={(e) => handleBrandChange(brand.id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{brand.name}</span>
                </label>
              ))}
            </div>
            {errors.brand_ids && (
              <p className="text-sm text-red-600">{errors.brand_ids.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              {t('forms.createRepresentative.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('forms.createRepresentative.creating')}
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  {t('forms.createRepresentative.createButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
