import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { t } from '../lib/i18n';

interface Manager {
  id: string;
  full_name: string;
  user?: {
    id: string;
    email: string;
  };
}

interface EditManagerFormProps {
  manager: Manager;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditManagerForm({ manager, onClose, onSuccess }: EditManagerFormProps) {
  const [formData, setFormData] = useState({
    full_name: manager.full_name,
    email: manager.user?.email || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Update manager name
      await supabase
        .from('managers')
        .update({ full_name: formData.full_name })
        .eq('id', manager.id);

      // Update user email if changed
      if (formData.email !== manager.user?.email && manager.user?.id) {
        await supabase
          .from('users')
          .update({ email: formData.email })
          .eq('id', manager.user.id);
      }

      // Update password if provided
      if (formData.password.trim() && manager.user?.id) {
        await supabase.auth.admin.updateUserById(manager.user.id, {
          password: formData.password
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error updating manager:', err);
      setError(err.message || 'Failed to update manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('entities.manager.edit')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('forms.fullName')}
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('forms.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('forms.password')} <span className="text-gray-500 text-xs">(boş buraxın dəyişdirmək üçün)</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Yeni şifrə (istəyə bağlı)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? t('messages.loading') : t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
