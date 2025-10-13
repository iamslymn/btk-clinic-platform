
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Mail, User, Building2, Tag } from 'lucide-react';
import Layout from '../components/Layout';
import { deleteRepresentative } from '../lib/api/representatives';
import { getRepresentatives as getRepsEnhanced, searchRepresentatives as searchRepsEnhanced } from '../lib/api/representatives-enhanced';
// import { supabase } from '../lib/supabase';
import type { RepresentativeWithDetails } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { t } from '../lib/i18n';
import EditRepresentativeFormEnhanced from '../components/EditRepresentativeFormEnhanced';

interface EditingRepModal {
  rep: RepresentativeWithDetails;
}

export default function RepresentativesPage() {
  const [representatives, setRepresentatives] = useState<RepresentativeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [editingModal, setEditingModal] = useState<EditingRepModal | null>(null);
  const navigate = useNavigate();


  useEffect(() => {
    loadRepresentatives();
  }, []);

  const loadRepresentatives = async () => {
    try {
      setLoading(true);
      const data = await getRepsEnhanced();
      setRepresentatives(data);
    } catch (error) {
      console.error('Error loading representatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadRepresentatives();
      return;
    }

    try {
      const data = await searchRepsEnhanced(query);
      setRepresentatives(data);
    } catch (error) {
      console.error('Error searching representatives:', error);
    }
  };

  const handleDelete = async (repId: string, repName: string) => {
    if (!confirm(`${repName} nümayəndəsini silmək istədiyinizə əminsiniz?`)) {
      return;
    }

    try {
      setDeleteLoading(repId);
      await deleteRepresentative(repId);
      await loadRepresentatives();
    } catch (error) {
      console.error('Error deleting representative:', error);
      alert('Nümayəndə silinmədi. Yenidən cəhd edin.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleEdit = (rep: RepresentativeWithDetails) => {
    setEditingModal({ rep });
  };



  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('nav.representatives')}</h1>
            <p className="mt-2 text-gray-600">
              Nümayəndələrinizi idarə edin
            </p>
          </div>
          <button
            onClick={() => navigate('/representatives/create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('entities.representative.add')}
          </button>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Ad və ya e-poçt ilə axtarış..."
              className="pl-10 form-input"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Representatives Table */}
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('entities.representative.plural')}</h2>
          </div>

          {representatives.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery ? 'Nümayəndə tapılmadı' : 'Hələ nümayəndə yoxdur'}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {searchQuery 
                  ? 'Axtarış şərtlərini dəyişib yenidən cəhd edin' 
                  : 'İlk nümayəndənizi əlavə edin'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/representatives/create')}
                  className="btn-primary"
                >
                  İlk Nümayəndəni Əlavə Et
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('forms.fullName')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('forms.email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İş klinikaları
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brendlər
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Əməllər
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {representatives.map((representative) => (
                    <tr key={representative.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-primary-600 font-medium text-xs">
                              {representative.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {representative.full_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="w-4 h-4 mr-1" />
                          {representative.user?.email || 'E-poçt yoxdur'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {(representative.clinics || []).map(c => (
                            <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                              <Building2 className="w-3 h-3" /> {c.clinic.name}
                            </span>
                          ))}
                          {(representative.clinics || []).length === 0 && (
                            <span className="text-gray-400">Təyin edilməyib</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {(representative.brands || []).map(b => (
                            <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs">
                              <Tag className="w-3 h-3" /> {b.brand?.name}
                            </span>
                          ))}
                          {(representative.brands || []).length === 0 && (
                            <span className="text-gray-400">Yoxdur</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <>
                            <button
                              onClick={() => handleEdit(representative)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title={t('actions.edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(representative.id, representative.full_name)}
                              disabled={deleteLoading === representative.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title={t('actions.delete')}
                            >
                              {deleteLoading === representative.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editingModal && (
          <EditRepresentativeFormEnhanced
            representative={editingModal.rep}
            onClose={() => setEditingModal(null)}
            onUpdated={loadRepresentatives}
          />
        )}

      </div>
    </Layout>
  );
}