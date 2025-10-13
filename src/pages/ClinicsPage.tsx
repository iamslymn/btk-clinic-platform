import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { t } from '../lib/i18n';
import { getClinics, createClinic, updateClinic, deleteClinic } from '../lib/api/clinics';
import type { Clinic, CreateClinicForm } from '../types';

export default function ClinicsPage() {
  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CreateClinicForm>({ name: '', address: '', phone: '', email: '' });
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [doctorCounts, setDoctorCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const list = await getClinics();
      setClinics(list);
      try {
        const { getClinicDoctorCounts } = await import('../lib/api/clinics');
        const counts = await getClinicDoctorCounts();
        setDoctorCounts(counts);
      } catch {}
    } catch (e: any) {
      setError(e.message || 'Failed to load clinics');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateClinic(editing.id, form);
        setEditing(null);
      } else {
        await createClinic(form);
      }
      setForm({ name: '', address: '', phone: '', email: '' });
      await load();
    } catch (e: any) {
      alert(e.message || 'Failed to save clinic');
    }
  };

  const handleEdit = (clinic: Clinic) => {
    setEditing(clinic);
    setForm({ name: clinic.name, address: clinic.address, phone: clinic.phone || '', email: clinic.email || '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete clinic?')) return;
    try {
      await deleteClinic(id);
      await load();
    } catch (e: any) {
      alert(e.message || 'Failed to delete clinic');
    }
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
          <h1 className="text-3xl font-bold text-gray-900">{t('pages.clinics.title')}</h1>
          <p className="text-gray-600">{t('pages.clinics.subtitle')}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="form-input" placeholder={t('pages.clinics.name')} value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
            <input className="form-input" placeholder={t('pages.clinics.address')} value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} required />
            <input className="form-input" placeholder={t('pages.clinics.phone')} value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} />
            <input className="form-input" placeholder={t('pages.clinics.email')} value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} />
            <button className="btn-primary">{editing ? t('actions.update') : t('actions.add')}</button>
          </form>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.clinics.table.name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.clinics.table.address')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.clinics.table.phone')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.clinics.table.email')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Həkim sayı</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clinics.map(c => (
                  <tr key={c.id}>
                    <td className="px-6 py-3">{c.name}</td>
                    <td className="px-6 py-3">{c.address}</td>
                    <td className="px-6 py-3">{c.phone}</td>
                    <td className="px-6 py-3">{c.email}</td>
                    <td className="px-6 py-3">{doctorCounts[c.id] ?? '-'}</td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(c)} className="btn-secondary">{t('pages.clinics.table.edit')}</button>
                      <button onClick={() => handleDelete(c.id)} className="btn-secondary">{t('pages.clinics.table.delete')}</button>
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


