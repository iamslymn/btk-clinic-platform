
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Phone, Building2, Calendar, ArrowLeft, Loader, Search } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { createRepresentative } from '../lib/api/representatives';
import { t, tList } from '../lib/i18n';
import { getClinics } from '../lib/api/clinics';
import { getBrands } from '../lib/api/brands-enhanced';
import type { Clinic, Brand } from '../types';

// Validation schema
const addRepresentativeSchema = z.object({
  full_name: z.string()
    .min(2, t('forms.validation.minLength').replace('{{min}}', '2'))
    .max(100, t('forms.validation.maxLength').replace('{{max}}', '100')),
  email: z.string()
    .email(t('forms.validation.validEmailRequired'))
    .toLowerCase(),
  password: z.string()
    .min(8, t('forms.validation.passwordTooShort'))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, t('forms.validation.passwordComplexity')),
  phone: z.string()
    .min(10, t('forms.validation.phoneRequired'))
    .regex(/^[\+]?[0-9\s\-\(\)]+$/, t('forms.validation.phoneRequired')),
  clinic_ids: z.array(z.string()).min(1, 'Ən azı bir klinika seçin'),
  brand_ids: z.array(z.string()).min(1, 'Ən azı bir brend seçin'),
  hire_date: z.string()
    .min(1, t('forms.validation.hireDateRequired')),
  notes: z.string().optional()
});

type AddRepresentativeForm = z.infer<typeof addRepresentativeSchema>;

export default function CreateRepresentativePage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [clinicSearch, setClinicSearch] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<AddRepresentativeForm>({
    resolver: zodResolver(addRepresentativeSchema),
    defaultValues: {
      hire_date: new Date().toISOString().split('T')[0],
      clinic_ids: [],
      brand_ids: []
    }
  });

  const selectedClinics = watch('clinic_ids') || [];

  useEffect(() => {
    const loadClinics = async () => {
      try {
        const [clinicsData, brandsData] = await Promise.all([getClinics(), getBrands()]);
        setClinics(clinicsData);
        setBrands(brandsData);
      } catch (err) {
        console.error('Failed to load clinics', err);
      }
    };
    loadClinics();
  }, []);

  const handleClinicToggle = (clinicId: string) => {
    const current = selectedClinics as string[];
    if (current.includes(clinicId)) {
      setValue('clinic_ids', current.filter(id => id !== clinicId));
    } else {
      setValue('clinic_ids', [...current, clinicId]);
    }
  };

  const onSubmit = async (data: AddRepresentativeForm) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await createRepresentative({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        clinic_ids: data.clinic_ids,
        brand_ids: data.brand_ids,
        hire_date: data.hire_date,
        notes: data.notes || null
      });

      // Success - redirect to representatives list with detailed message
      navigate('/representatives', { 
        replace: true,
        state: { 
          message: `Representative ${data.full_name} has been created successfully! They now have a complete account with login credentials.`,
          type: 'success',
          details: [
            'Login credentials created:',
            `Email: ${data.email}`,
            `Password: ${data.password}`,
            'Account is ready for immediate use - no email verification required.',
            'They will be redirected to the Representative Dashboard upon login.'
          ]
        }
      });

    } catch (error: any) {
      console.error('Error creating representative:', error);
      
      // Handle specific error messages
      if (error.message.includes('server-side implementation')) {
        setSubmitError('Representative creation requires administrator setup. Please contact your system administrator to create new user accounts.');
      } else if (error.message.includes('already exists') || error.code === '23505') {
        setSubmitError('A user with this email address already exists. Please use a different email.');
      } else if (error.message.includes('Manager profile not found')) {
        setSubmitError('Manager profile not found. Please ensure you have proper manager permissions.');
      } else {
        setSubmitError(error.message || 'Failed to create representative. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All entered data will be lost.')) {
      navigate('/representatives');
    }
  };

  // Check permissions
  if (!user || (role !== 'manager' && role !== 'super_admin')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">{t('forms.addRepresentative.accessDenied')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/representatives')}
            className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('forms.addRepresentative.title')}</h1>
            <p className="mt-2 text-gray-600">{t('forms.addRepresentative.subtitle')}</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-red-800 mb-1">{t('forms.addRepresentative.errorCreating')}</h3>
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('forms.addRepresentative.personalInformation')}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('forms.addRepresentative.fullNameLabel')}
                  </label>
                  <input
                    {...register('full_name')}
                    type="text"
                    className={`form-input ${errors.full_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder={t('forms.addRepresentative.fullNamePlaceholder')}
                  />
                  {errors.full_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('forms.addRepresentative.emailLabel')}
                  </label>
                  <div className="relative">
                    <input
                      {...register('email')}
                      type="email"
                      className={`form-input pl-10 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder={t('forms.addRepresentative.emailPlaceholder')}
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('forms.addRepresentative.phoneLabel')}
                  </label>
                  <div className="relative">
                    <input
                      {...register('phone')}
                      type="tel"
                      className={`form-input pl-10 ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                      placeholder={t('forms.addRepresentative.phonePlaceholder')}
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('forms.addRepresentative.passwordLabel')}
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className={`form-input ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder={t('forms.addRepresentative.passwordPlaceholder')}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {t('forms.addRepresentative.passwordHint')}
                  </p>
                </div>
              </div>
            </div>

            {/* Work Information Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {t('forms.addRepresentative.workInformation')}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clinics multi-select */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Klinikalar</label>
                  <div className="relative max-w-md mb-3">
                    <input
                      type="text"
                      value={clinicSearch}
                      onChange={(e) => setClinicSearch(e.target.value)}
                      className="form-input pl-10"
                      placeholder="Klinika axtar..."
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
                    <p className="mt-1 text-sm text-red-600">{errors.clinic_ids.message as string}</p>
                  )}
                </div>

                {/* Brands multi-select */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brendlər</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {brands.map(brand => (
                      <label key={brand.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={(watch('brand_ids') || []).includes(brand.id)}
                          onChange={(e) => {
                            const current = watch('brand_ids') || [];
                            setValue('brand_ids', e.target.checked ? [...current, brand.id] : current.filter(id => id !== brand.id));
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{brand.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.brand_ids && (
                    <p className="mt-1 text-sm text-red-600">{errors.brand_ids.message as string}</p>
                  )}
                </div>

                {/* Hire Date */}
                <div>
                  <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('forms.addRepresentative.hireDateLabel')}
                  </label>
                  <div className="relative">
                    <input
                      {...register('hire_date')}
                      type="date"
                      className={`form-input pl-10 ${errors.hire_date ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    />
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.hire_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.hire_date.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Notes Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('forms.addRepresentative.additionalNotes')}
              </h3>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('forms.addRepresentative.notesLabel')}
                </label>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="form-input"
                  placeholder={t('forms.addRepresentative.notesPlaceholder')}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                {t('forms.addRepresentative.cancel')}
              </button>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {t('forms.addRepresentative.creating')}
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    {t('forms.addRepresentative.createButton')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-4 h-4 text-blue-600">💡</div>
            </div>
            <div>
              <h4 className="font-medium text-blue-900 mb-2">{t('forms.addRepresentative.creatingTip')}</h4>
              <div className="text-sm text-blue-800 space-y-1">
                {tList('forms.addRepresentative.tipContent').map((tip, index) => (
                  <p key={index}>• {tip}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}