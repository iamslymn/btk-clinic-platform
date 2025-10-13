import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, User, Mail, Building2, Search, Tag } from 'lucide-react';
import { getManagers } from '../lib/api/managers';
import { getBrands } from '../lib/api/brands-enhanced';
import { getClinics } from '../lib/api/clinics';
import { updateRepresentative } from '../lib/api/representatives-enhanced';
import type { Manager, Brand, Clinic, RepresentativeWithDetails } from '../types';
import LoadingSpinner from './LoadingSpinner';

const editSchema = z.object({
  email: z.string().email('Düzgün e-poçt daxil edin'),
  first_name: z.string().min(1, 'Ad tələb olunur'),
  last_name: z.string().min(1, 'Soyad tələb olunur'),
  manager_id: z.string().min(1, 'Menecer seçin'),
  clinic_ids: z.array(z.string()).min(1, 'Ən azı bir klinika seçin'),
  brand_ids: z.array(z.string()).min(1, 'Ən azı bir brend seçin')
});

type EditForm = z.infer<typeof editSchema>;

interface Props {
  representative: RepresentativeWithDetails;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditRepresentativeFormEnhanced({ representative, onClose, onUpdated }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicSearch, setClinicSearch] = useState('');

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      email: representative.user?.email || '',
      first_name: representative.first_name,
      last_name: representative.last_name,
      manager_id: representative.manager_id,
      clinic_ids: (representative.clinics || []).map(c => c.clinic.id),
      brand_ids: (representative.brands || []).map(b => b.brand.id)
    }
  });

  const selectedClinics = watch('clinic_ids') || [];
  const selectedBrands = watch('brand_ids') || [];

  useEffect(() => {
    const loadData = async () => {
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
      } catch (e: any) {
        setError('Məlumatları yükləmək alınmadı');
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  const handleClinicToggle = (clinicId: string) => {
    const current = selectedClinics as string[];
    if (current.includes(clinicId)) setValue('clinic_ids', current.filter(id => id !== clinicId));
    else setValue('clinic_ids', [...current, clinicId]);
  };

  const handleBrandToggle = (brandId: string) => {
    const current = selectedBrands as string[];
    if (current.includes(brandId)) setValue('brand_ids', current.filter(id => id !== brandId));
    else setValue('brand_ids', [...current, brandId]);
  };

  const onSubmit = async (data: EditForm) => {
    try {
      setIsSubmitting(true);
      setError('');
      await updateRepresentative(representative.id, {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        manager_id: data.manager_id,
        clinic_ids: data.clinic_ids,
        brand_ids: data.brand_ids
      });
      onUpdated();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Yeniləmə alınmadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Nümayəndəni Redaktə Et</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" /> Hesab
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">E-poçt</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input type="email" {...register('email')} className="form-input pl-10" />
                </div>
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Şəxsi məlumatlar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Ad</label>
                <input type="text" {...register('first_name')} className="form-input" />
                {errors.first_name && <p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="form-label">Soyad</label>
                <input type="text" {...register('last_name')} className="form-input" />
                {errors.last_name && <p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Menecer</label>
                <select {...register('manager_id')} className="form-input">
                  <option value="">Menecer seçin</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                {errors.manager_id && <p className="text-sm text-red-600 mt-1">{errors.manager_id.message}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> İş klinikaları
            </h3>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" value={clinicSearch} onChange={(e) => setClinicSearch(e.target.value)} placeholder="Klinika axtar..." className="pl-10 form-input" />
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {clinics
                .filter(c => !clinicSearch || `${c.name} ${c.address}`.toLowerCase().includes(clinicSearch.toLowerCase()))
                .map(clinic => (
                  <label key={clinic.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                    <input type="checkbox" checked={selectedClinics.includes(clinic.id)} onChange={() => handleClinicToggle(clinic.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{clinic.name}</div>
                      <div className="text-xs text-gray-600 truncate">{clinic.address}</div>
                    </div>
                  </label>
                ))}
            </div>
            {errors.clinic_ids && <p className="text-sm text-red-600">{errors.clinic_ids.message}</p>}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5" /> Brendlər
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {brands.map(brand => (
                <label key={brand.id} className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <input type="checkbox" checked={selectedBrands.includes(brand.id)} onChange={() => handleBrandToggle(brand.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium text-gray-700">{brand.name}</span>
                </label>
              ))}
            </div>
            {errors.brand_ids && <p className="text-sm text-red-600">{errors.brand_ids.message}</p>}
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>Ləğv et</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Yenilə'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


