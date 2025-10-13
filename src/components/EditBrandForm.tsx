import React from 'react';
import { X } from 'lucide-react';
import { t } from '../lib/i18n';

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
        <p className="text-gray-600">Brand editing functionality will be implemented soon.</p>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {t('actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
