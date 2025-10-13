import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { t } from '../lib/i18n';
import { getSpecializations, createSpecialization, updateSpecialization, deleteSpecialization } from '../lib/api/specializations';
import type { Specialization } from '../types';

export default function SpecializationsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Specialization[]>([]);
  const [form, setForm] = useState({ name: '', display_name: '', description: '' });
  const [editing, setEditing] = useState<Specialization | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setItems(await getSpecializations());
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateSpecialization(editing.id, form);
        setEditing(null);
      } else {
        await createSpecialization(form);
      }
      setForm({ name: '', display_name: '', description: '' });
      await load();
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    }
  };

  const handleEdit = (s: Specialization) => {
    setEditing(s);
    setForm({ name: s.name, display_name: s.display_name, description: s.description || '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete specialization?')) return;
    await deleteSpecialization(id);
    await load();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('pages.specializations.title')}</h1>
          <p className="text-gray-600">{t('pages.specializations.subtitle')}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="form-input" placeholder={t('pages.specializations.key')} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
            <input className="form-input" placeholder={t('pages.specializations.displayName')} value={form.display_name} onChange={e => setForm(prev => ({ ...prev, display_name: e.target.value }))} required />
            <input className="form-input md:col-span-2" placeholder={t('pages.specializations.description')} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
            <button className="btn-primary">{editing ? t('actions.update') : t('actions.add')}</button>
          </form>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.specializations.table.key')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.specializations.table.displayName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('pages.specializations.table.description')}</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-3">{s.name}</td>
                    <td className="px-6 py-3">{s.display_name}</td>
                    <td className="px-6 py-3">{s.description}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(s)} className="btn-secondary">{t('pages.specializations.table.edit')}</button>
                      <button onClick={() => handleDelete(s.id)} className="btn-secondary">{t('pages.specializations.table.delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}


