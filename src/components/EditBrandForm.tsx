import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { t } from '../lib/i18n';
import { updateBrand } from '../lib/api/brands';
import LoadingSpinner from './LoadingSpinner';

interface Brand {
  id: string;
  name: string;
}

interface EditBrandFormProps {
  brand: Brand;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditBrandForm({ brand, onClose, onSuccess }: EditBrandFormProps) {
  const [name, setName] = useState(brand.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      setError('');
      await updateBrand(brand.id, { name: name.trim() });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update brand');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('entities.brand.edit')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Brend adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              placeholder="Brend adını daxil edin"
              required
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={saving}
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Yadda saxlanır...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('actions.save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
