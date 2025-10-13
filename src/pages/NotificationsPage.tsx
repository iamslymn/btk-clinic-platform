import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { listNotifications, markNotificationRead } from '../lib/api/notifications';
import type { NotificationRecord } from '../lib/api/notifications';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState<NotificationRecord | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const rows = await listNotifications(100);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onOpen = async (n: NotificationRecord) => {
    if (!n.read) {
      try { await markNotificationRead(n.id); } catch {}
    }
    setOpened(n);
  };

  const onGo = () => {
    if (opened?.link) navigate(opened.link);
  };

  const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('az-Latn-AZ', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Bildirişlər</h1>
          {!loading && (
            <span className="text-sm text-gray-500">{items.filter(i => !i.read).length} oxunmamış</span>
          )}
        </div>

        <div className="card">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Məlumatlar yüklənir</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">Bildiriş yoxdur</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(n => (
                <li key={n.id}>
                  <button onClick={() => onOpen(n)} className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 ${!n.read ? 'bg-primary-50/40' : ''}`}>
                    <div className={`mt-1 w-2 h-2 rounded-full ${n.read ? 'bg-gray-300' : 'bg-primary-500'}`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-600">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmt(n.created_at)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {opened && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">{opened.title}</h2>
                <button className="text-gray-500" onClick={() => setOpened(null)}>✕</button>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <p className="whitespace-pre-line">{opened.message}</p>
                {opened.representative_name && (
                  <p><span className="font-medium">Nümayəndə:</span> {opened.representative_name}</p>
                )}
                {opened.doctor_name && (
                  <p><span className="font-medium">Həkim:</span> {opened.doctor_name}</p>
                )}
                {opened.clinic_name && (
                  <p><span className="font-medium">Klinika:</span> {opened.clinic_name}</p>
                )}
                {opened.scheduled_date && (
                  <p><span className="font-medium">Tarix:</span> {opened.scheduled_date}</p>
                )}
                {opened.note && (
                  <p><span className="font-medium">Qeyd:</span> {opened.note}</p>
                )}
                <p className="text-xs text-gray-400">{fmt(opened.created_at)}</p>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                {opened.link && (
                  <button className="btn-primary" onClick={onGo}>Aç</button>
                )}
                <button className="btn-secondary" onClick={() => setOpened(null)}>Bağla</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
