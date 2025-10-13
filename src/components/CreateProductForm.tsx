import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Package, Tag, FileText, Upload } from 'lucide-react';
import { createProduct } from '../lib/api/products-enhanced';
import { getBrands } from '../lib/api/brands-enhanced';
import type { CreateProductForm, Brand } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { t } from '../lib/i18n';

const createProductSchema = z.object({
  brand_id: z.string().min(1, 'Brend seçilməlidir'),
  name: z.string().min(1, 'Məhsul adı tələb olunur'),
  description: z.string().min(1, 'Açıqlama tələb olunur'),
  annotations: z.string().optional(),
  pdf_file: z.any().optional()
});

type CreateProductFormData = z.infer<typeof createProductSchema>;

interface CreateProductFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Priority specializations ləğv edildi

export default function CreateProductForm({ onClose, onSuccess }: CreateProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CreateProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {}
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoadingData(true);
      const brandsData = await getBrands();
      setBrands(brandsData);
    } catch (err: any) {
      setError('Failed to load brands');
    } finally {
      setLoadingData(false);
    }
  };

  // Priority specializations ləğv edildi

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setValue('pdf_file', file as any);
    } else {
      setValue('pdf_file', undefined as any);
    }
  };

  const onSubmit = async (data: CreateProductFormData) => {
    try {
      setIsSubmitting(true);
      setError('');

      const formData: CreateProductForm = {
        ...data,
        pdf_file: selectedFile || undefined
      };

      await createProduct(formData);
      
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || t('messages.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Yeni Məhsul Yarat</h2>
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

          {/* Əsas Məlumat */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Məhsul Məlumatları
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Brend
                </label>
                <select {...register('brand_id')} className="form-input">
                  <option value="">Brend seçin</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                {errors.brand_id && (
                  <p className="text-sm text-red-600 mt-1">{errors.brand_id.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Məhsul adı</label>
                <input
                  type="text"
                  {...register('name')}
                  className="form-input"
                  placeholder="Məhsul adını daxil edin"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Açıqlama *</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="form-input"
                  placeholder="Məhsul haqqında açıqlama daxil edin"
                />
                {errors.description && (
                  <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Prioritet ixtisaslar bölməsi silindi */}

          {/* PDF Yükləmə */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Məhsul Sənədi
            </h3>
            
            <div>
              <label className="form-label">PDF Sənəd (İstəyə bağlı)</label>
              <input type="file" accept="application/pdf" className="form-input" onChange={handleFileChange} />
              {selectedFile && (
                <p className="text-xs text-gray-500 mt-1">Seçildi: {selectedFile.name}</p>
              )}
            </div>
          </div>

          {/* Qeydlər */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Əlavə Məlumat</h3>
            <div>
              <label className="form-label">Qeydlər (İstəyə bağlı)</label>
              <textarea
                {...register('annotations')}
                rows={4}
                className="form-input"
                placeholder="Bu məhsul ilə bağlı əlavə qeydləri daxil edin..."
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
              Ləğv et
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Yaradılır...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Məhsulu Yarat
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
