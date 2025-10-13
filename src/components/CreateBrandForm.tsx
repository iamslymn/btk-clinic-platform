import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Tag } from 'lucide-react';
import { createBrand } from '../lib/api/brands-enhanced';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

const createBrandSchema = z.object({
  name: z.string().min(1, t('forms.validation.brandNameRequired'))
});

type CreateBrandFormData = z.infer<typeof createBrandSchema>;

interface CreateBrandFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateBrandForm({ onClose, onSuccess }: CreateBrandFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateBrandFormData>({
    resolver: zodResolver(createBrandSchema)
  });

  const onSubmit = async (data: CreateBrandFormData) => {
    try {
      setIsSubmitting(true);
      setError('');

      await createBrand(data);
      
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating brand:', err);
      setError(err.message || t('messages.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('forms.createBrand.title')}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="form-label">{t('forms.createBrand.nameLabel')}</label>
            <input
              type="text"
              {...register('name')}
              className="form-input"
              placeholder={t('forms.createBrand.namePlaceholder')}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              {t('forms.createBrand.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  {t('forms.createBrand.creating')}
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4" />
                  {t('forms.createBrand.createButton')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
