import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package, Tag, FileText, Upload } from 'lucide-react';
import { getBrands } from '../lib/api/brands-enhanced';
import { updateProduct } from '../lib/api/products-enhanced';
import type { Brand, CreateProductForm } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

const editProductSchema = z.object({
  brand_id: z.string().min(1, t('forms.validation.brandRequired')),
  name: z.string().min(1, t('forms.validation.productNameRequired')),
  description: z.string().optional(),
  priority_specializations: z.array(z.string()).optional(),
  annotations: z.string().optional(),
  pdf_file: z.any().optional()
});

type EditProductFormData = z.infer<typeof editProductSchema>;

interface EditProductFormProps {
  product: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProductForm({ product, onClose, onSuccess }: EditProductFormProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<EditProductFormData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      brand_id: product.brand_id || product.brand?.id || '',
      name: product.name || '',
      description: product.description || '',
      priority_specializations: product.priority_specializations || [],
      annotations: product.annotations || ''
    }
  });

  useEffect(() => {
    const loadBrands = async () => {
      try {
        setLoading(true);
        const data = await getBrands();
        setBrands(data);
      } catch (e: any) {
        setError(e.message || 'Failed to load brands');
      } finally {
        setLoading(false);
      }
    };
    loadBrands();
  }, []);

  const onSubmit = async (data: EditProductFormData) => {
    try {
      setIsSubmitting(true);
      setError('');
      const payload: any = { ...data } as CreateProductForm;
      await updateProduct(product.id, payload);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('entities.product.edit')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center gap-2"><Tag className="w-4 h-4" /> Brend</label>
              <select {...register('brand_id')} className="form-input">
                <option value="">Brend seçin</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {errors.brand_id && <p className="text-sm text-red-600 mt-1">{errors.brand_id.message}</p>}
            </div>
            <div>
              <label className="form-label">Ad</label>
              <input type="text" {...register('name')} className="form-input" />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Açıqlama</label>
              <textarea {...register('description')} rows={3} className="form-input" />
            </div>
          </div>

          <div>
            <label className="form-label flex items-center gap-2"><FileText className="w-4 h-4" /> PDF sənəd (opsional)</label>
            <input type="file" accept="application/pdf" className="form-input" onChange={(e) => setValue('pdf_file', e.target.files?.[0] as any)} />
            <p className="text-xs text-gray-500 mt-1">Mövcud: {product.pdf_url ? 'Var' : 'Yoxdur'}</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">{t('actions.cancel')}</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <LoadingSpinner size="sm" /> : t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
