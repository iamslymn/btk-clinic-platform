import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, Building, Check } from 'lucide-react';
import { updateDoctor } from '../lib/api/doctors-enhanced';
import { getSpecializations } from '../lib/api/specializations';
import { getClinics } from '../lib/api/clinics';
import type { DoctorWithWorkplacesAndSpecialization, Specialization } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

const updateDoctorSchema = z.object({
	first_name: z.string().min(1, t('forms.validation.firstNameRequired')),
	last_name: z.string().min(1, t('forms.validation.lastNameRequired')),
	specialization_id: z.string().min(1, t('forms.validation.specializationRequired')),
	total_category: z.enum(['A', 'B', 'C', 'D']),
	planeta_category: z.enum(['A', 'B', 'C', 'D']),
	gender: z.enum(['male', 'female']),
	phone: z.string().min(1, t('forms.validation.phoneRequired')),
	address: z.string().optional(),
	clinic_ids: z.array(z.string()).min(1, 'Ən azı bir klinika seçin').optional()
});

type UpdateDoctorFormData = z.infer<typeof updateDoctorSchema>;

interface EditDoctorFormProps {
	doctor: DoctorWithWorkplacesAndSpecialization;
	onClose: () => void;
	onSuccess: () => void;
}

const categories = [
	{ value: 'A', label: 'A kateqoriyası' },
	{ value: 'B', label: 'B kateqoriyası' },
	{ value: 'C', label: 'C kateqoriyası' },
	{ value: 'D', label: 'D kateqoriyası' }
];

const genders = [
	{ value: 'male', label: t('forms.male') },
	{ value: 'female', label: t('forms.female') }
];

export default function EditDoctorForm({ doctor, onClose, onSuccess }: EditDoctorFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [specializations, setSpecializations] = useState<Specialization[]>([]);
	const [loadingSpecializations, setLoadingSpecializations] = useState(true);
	const [clinics, setClinics] = useState<{ id: string; name: string; address: string }[]>([]);
	const [clinicSearch, setClinicSearch] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
		reset
	} = useForm<UpdateDoctorFormData>({
		resolver: zodResolver(updateDoctorSchema),
		defaultValues: {
			first_name: doctor.first_name,
			last_name: doctor.last_name,
			specialization_id: doctor.specialization_id || '',
			total_category: doctor.total_category || (doctor as any).category,
			planeta_category: doctor.planeta_category,
			gender: (doctor.gender as any) || 'male',
			phone: doctor.phone || '',
			address: doctor.address,
			clinic_ids: (doctor.clinics || []).map((c: any) => c.clinic?.id).filter(Boolean)
		}
	});

	const selectedClinicIds = watch('clinic_ids') || [];

	useEffect(() => {
		const loadData = async () => {
			try {
				const [specs, clinicsData] = await Promise.all([
					getSpecializations(),
					getClinics()
				]);
				setSpecializations(specs);
				setClinics(clinicsData);
			} catch (error) {
				console.error('Error loading specializations/clinics:', error);
			} finally {
				setLoadingSpecializations(false);
			}
		};

		loadData();
	}, []);

	const onSubmit = async (data: UpdateDoctorFormData) => {
		try {
			setIsSubmitting(true);
			setError('');

			await updateDoctor(doctor.id, data as any);

			onSuccess();
			onClose();
		} catch (err: any) {
			setError(err.message || 'Failed to update doctor');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">Həkimi Redaktə Et - Dr. {doctor.first_name} {doctor.last_name}</h2>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
				</div>

				<form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
					{error && (<div className="bg-red-50 border border-red-200 rounded-lg p-4"><p className="text-red-700">{error}</p></div>)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-4">
							<h3 className="text-lg font-medium text-gray-900">Əsas Məlumatlar</h3>
							<div>
								<label htmlFor="edit_first_name" className="form-label">{t('forms.firstName')} *</label>
								<input id="edit_first_name" {...register('first_name')} type="text" className="form-input" placeholder={`${t('forms.firstName')} daxil edin`} autoComplete="given-name" />
								{errors.first_name && (<p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>)}
							</div>
							<div>
								<label htmlFor="edit_last_name" className="form-label">{t('forms.lastName')} *</label>
								<input id="edit_last_name" {...register('last_name')} type="text" className="form-input" placeholder={`${t('forms.lastName')} daxil edin`} autoComplete="family-name" />
								{errors.last_name && (<p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>)}
							</div>
							<div>
								<label htmlFor="edit_phone" className="form-label">{t('forms.phone')} *</label>
								<input id="edit_phone" {...register('phone')} type="tel" className="form-input" placeholder={`${t('forms.phone')} nömrəsi`} autoComplete="tel" />
								{errors.phone && (<p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>)}
							</div>
							<div>
								<label htmlFor="edit_gender" className="form-label">{t('forms.gender')} *</label>
								<select id="edit_gender" {...register('gender')} className="form-input" autoComplete="sex">
									<option value="">{t('forms.createDoctor.selectGender')}</option>
									{genders.map(gender => (<option key={gender.value} value={gender.value}>{gender.label}</option>))}
								</select>
								{errors.gender && (<p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>)}
							</div>
						</div>
						<div className="space-y-4">
							<h3 className="text-lg font-medium text-gray-900">Peşəkar Məlumatlar</h3>
							<div>
								<label htmlFor="edit_specialization_id" className="form-label">{t('forms.createDoctor.specializationLabel')} *</label>
								<select id="edit_specialization_id" {...register('specialization_id')} className="form-input" disabled={loadingSpecializations} autoComplete="organization-title">
									<option value="">{loadingSpecializations ? t('messages.loading') : t('forms.createDoctor.selectSpecialization')}</option>
									{specializations.map(spec => (<option key={spec.id} value={spec.id}>{spec.display_name}</option>))}
								</select>
								{errors.specialization_id && (<p className="text-sm text-red-600 mt-1">{errors.specialization_id.message}</p>)}
							</div>
							<div>
								<label htmlFor="edit_total_category" className="form-label">{t('forms.totalCategory')} *</label>
								<select id="edit_total_category" {...register('total_category')} className="form-input">
									<option value="">{t('forms.category')} seçin</option>
									{categories.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
								</select>
								{errors.total_category && (<p className="text-sm text-red-600 mt-1">{errors.total_category.message}</p>)}
							</div>
							<div>
								<label htmlFor="edit_planeta_category" className="form-label">{t('forms.planetaCategory')} *</label>
								<select id="edit_planeta_category" {...register('planeta_category')} className="form-input">
									<option value="">{t('forms.category')} seçin</option>
									{categories.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
								</select>
								{errors.planeta_category && (<p className="text-sm text-red-600 mt-1">{errors.planeta_category.message}</p>)}
							</div>
						</div>
					</div>

					{/* Clinics selection */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium text-gray-900 flex items-center gap-2"><Building className="w-5 h-5" />Klinikalar</h3>
						<div className="relative max-w-md">
							<input type="text" value={clinicSearch} onChange={(e) => setClinicSearch(e.target.value)} placeholder="Klinika axtar..." className="form-input" />
						</div>
						<div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
							{clinics
								.filter(c => !clinicSearch || `${c.name} ${c.address}`.toLowerCase().includes(clinicSearch.toLowerCase()))
								.map(clinic => {
									const selected = (selectedClinicIds as string[]).includes(clinic.id);
									return (
										<button key={clinic.id} type="button" onClick={() => {
											const current = selectedClinicIds as string[];
											setValue('clinic_ids', selected ? current.filter(id => id !== clinic.id) : [...current, clinic.id]);
										}} className={`flex items-start gap-3 p-3 border rounded-lg text-left hover:bg-gray-50 ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
											<div className={`w-5 h-5 rounded ${selected ? 'bg-blue-600' : 'bg-gray-200'} flex items-center justify-center text-white mt-0.5`}>{selected && <Check className="w-3 h-3" />}</div>
											<div className="flex-1"><div className="text-sm font-medium text-gray-900">{clinic.name}</div><div className="text-xs text-gray-600 truncate">{clinic.address}</div></div>
										</button>
									);
								})}
						</div>
						{errors.clinic_ids && (<p className="text-sm text-red-600">{errors.clinic_ids.message}</p>)}
					</div>

					<div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
						<button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>{t('actions.cancel')}</button>
						<button type="submit" className="btn-primary flex items-center gap-2" disabled={isSubmitting}>{isSubmitting ? (<><LoadingSpinner size="xs" />{t('forms.updating')}</>) : (<><Save className="w-4 h-4" />{t('forms.updateDoctor')}</>)}</button>
					</div>
				</form>
			</div>
		</div>
	);
}
