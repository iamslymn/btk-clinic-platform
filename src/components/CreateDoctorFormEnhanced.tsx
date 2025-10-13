import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Stethoscope, Search, Building, Check } from 'lucide-react';
import { createDoctor } from '../lib/api/doctors-enhanced';
import { getSpecializations } from '../lib/api/specializations';
import { getClinics } from '../lib/api/clinics';
import type { CreateDoctorForm, DoctorCategory, DoctorGender, Specialization } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

const createDoctorSchema = z.object({
	first_name: z.string().min(1, t('forms.validation.firstNameRequired')),
	last_name: z.string().min(1, t('forms.validation.lastNameRequired')),
	specialization_id: z.string().min(1, t('forms.validation.specializationRequired')),
	total_category: z.enum(['A', 'B', 'C', 'D']),
	planeta_category: z.enum(['A', 'B', 'C', 'D']),
	gender: z.enum(['male', 'female']),
	phone: z.string().min(1, t('forms.validation.phoneRequired')),
	// Address/location removed from UI – keep optional for compatibility
	address: z.string().optional(),
	location_lat: z.number().optional(),
	location_lng: z.number().optional(),
	clinic_ids: z.array(z.string()).min(1, 'Ən azı bir klinika seçin')
});

type CreateDoctorFormData = z.infer<typeof createDoctorSchema>;

interface CreateDoctorFormEnhancedProps {
	onClose: () => void;
	onSuccess: () => void;
}

// Specializations will be loaded dynamically from the database

const categories: { value: DoctorCategory; label: string }[] = [
	{ value: 'A', label: 'A kateqoriyası' },
	{ value: 'B', label: 'B kateqoriyası' },
	{ value: 'C', label: 'C kateqoriyası' },
	{ value: 'D', label: 'D kateqoriyası' }
];

const genders: { value: any; label: string }[] = [
	{ value: 'male', label: t('forms.male') },
	{ value: 'female', label: t('forms.female') }
];

export default function CreateDoctorFormEnhanced({ onClose, onSuccess }: CreateDoctorFormEnhancedProps) {
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
		reset,
		setValue,
		watch
	} = useForm<CreateDoctorFormData>({
		resolver: zodResolver(createDoctorSchema),
		defaultValues: {
			clinic_ids: []
		}
	});

	const selectedClinicIds = watch('clinic_ids') || [];

	// Load specializations and clinics on component mount
	useEffect(() => {
		const loadData = async () => {
			try {
				setLoadingSpecializations(true);
				const [specs, clinicsData] = await Promise.all([
					getSpecializations(),
					getClinics()
				]);
				setSpecializations(specs);
				setClinics(clinicsData);
			} catch (err) {
				setError('Failed to load specializations');
			} finally {
				setLoadingSpecializations(false);
			}
		};

		loadData();
	}, []);

	const onSubmit = async (data: CreateDoctorFormData) => {
		try {
			setIsSubmitting(true);
			setError('');

			await createDoctor(data as unknown as CreateDoctorForm);

			reset();
			onSuccess();
			onClose();
		} catch (err: any) {
			setError(err.message || 'Failed to create doctor');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-xl font-semibold text-gray-900">{t('forms.createDoctor.title')}</h2>
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

					{/* Personal Information */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
							<User className="w-5 h-5" />
							{t('forms.personalInformation')}
						</h3>
						
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="first_name" className="form-label">{t('forms.createDoctor.firstNameLabel')}</label>
								<input
									id="first_name"
									type="text"
									{...register('first_name')}
									className="form-input"
									placeholder={t('forms.firstName')}
									autoComplete="given-name"
								/>
								{errors.first_name && (
									<p className="text-sm text-red-600 mt-1">{errors.first_name.message}</p>
								)}
							</div>

							<div>
								<label htmlFor="last_name" className="form-label">{t('forms.createDoctor.lastNameLabel')}</label>
								<input
									id="last_name"
									type="text"
									{...register('last_name')}
									className="form-input"
									placeholder={t('forms.lastName')}
									autoComplete="family-name"
								/>
								{errors.last_name && (
									<p className="text-sm text-red-600 mt-1">{errors.last_name.message}</p>
								)}
							</div>

							<div>
								<label htmlFor="gender" className="form-label">{t('forms.createDoctor.genderLabel')}</label>
								<select id="gender" {...register('gender')} className="form-input" autoComplete="sex">
									<option value="">{t('forms.createDoctor.selectGender')}</option>
									{genders.map(gender => (
										<option key={gender.value} value={gender.value}>
											{gender.label}
										</option>
									))}
								</select>
								{errors.gender && (
									<p className="text-sm text-red-600 mt-1">{errors.gender.message}</p>
								)}
							</div>

							<div>
								<label htmlFor="phone" className="form-label">{t('forms.createDoctor.phoneLabel')}</label>
								<input
									id="phone"
									type="tel"
									{...register('phone')}
									className="form-input"
									placeholder={t('forms.phone')}
									autoComplete="tel"
								/>
								{errors.phone && (
									<p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
								)}
							</div>

							{/* Email field removed - not required anymore */}
						</div>
					</div>

					{/* Professional Information */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
							<Stethoscope className="w-5 h-5" />
							{t('forms.professionalInformation')}
						</h3>
						
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label htmlFor="specialization_id" className="form-label">{t('forms.createDoctor.specializationLabel')}</label>
								<select id="specialization_id" {...register('specialization_id')} className="form-input" disabled={loadingSpecializations} autoComplete="organization-title">
									<option value="">
										{loadingSpecializations ? t('messages.loading') : t('forms.createDoctor.selectSpecialization')}
									</option>
									{specializations.map(spec => (
										<option key={spec.id} value={spec.id}>
											{spec.display_name}
										</option>
									))}
								</select>
								{errors.specialization_id && (
									<p className="text-sm text-red-600 mt-1">{errors.specialization_id.message}</p>
								)}
							</div>

							<div>
								<label htmlFor="total_category" className="form-label">{t('forms.createDoctor.totalCategoryLabel')}</label>
								<select id="total_category" {...register('total_category')} className="form-input">
									<option value="">{t('forms.category')}</option>
									{categories.map(cat => (
										<option key={cat.value} value={cat.value}>
											{cat.label}
										</option>
									))}
								</select>
								{errors.total_category && (
									<p className="text-sm text-red-600 mt-1">{errors.total_category.message}</p>
								)}
							</div>

							<div>
								<label htmlFor="planeta_category" className="form-label">{t('forms.createDoctor.planetaCategoryLabel')}</label>
								<select id="planeta_category" {...register('planeta_category')} className="form-input">
									<option value="">{t('forms.category')}</option>
									{categories.map(cat => (
										<option key={cat.value} value={cat.value}>
											{cat.label}
										</option>
									))}
								</select>
								{errors.planeta_category && (
									<p className="text-sm text-red-600 mt-1">{errors.planeta_category.message}</p>
								)}
							</div>
						</div>
					</div>

					{/* Clinics selection */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
							<Building className="w-5 h-5" />
							Klinikalar
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
								.map(clinic => {
									const selected = (selectedClinicIds as string[]).includes(clinic.id);
									return (
										<button
											key={clinic.id}
											type="button"
											onClick={() => {
												const current = selectedClinicIds as string[];
												if (current.includes(clinic.id)) {
													setValue('clinic_ids', current.filter(id => id !== clinic.id));
												} else {
													setValue('clinic_ids', [...current, clinic.id]);
												}
											}}
											className={`flex items-start gap-3 p-3 border rounded-lg text-left hover:bg-gray-50 ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
										>
											<div className={`w-5 h-5 rounded ${selected ? 'bg-blue-600' : 'bg-gray-200'} flex items-center justify-center text-white mt-0.5`}>
												{selected && <Check className="w-3 h-3" />}
											</div>
											<div className="flex-1">
												<div className="text-sm font-medium text-gray-900">{clinic.name}</div>
												<div className="text-xs text-gray-600 truncate">{clinic.address}</div>
											</div>
										</button>
									);
								})}
						</div>
						{errors.clinic_ids && (
							<p className="text-sm text-red-600">{errors.clinic_ids.message}</p>
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
							{t('forms.createDoctor.cancel')}
						</button>
						<button
							type="submit"
							className="btn-primary flex items-center gap-2"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<LoadingSpinner size="sm" />
									{t('forms.createDoctor.creating')}
								</>
							) : (
								<>
									<User className="w-4 h-4" />
									{t('forms.createDoctor.createButton')}
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
