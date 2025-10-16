/**
 * Admin/Manager Visit History Page
 * 
 * Displays all visit history with advanced filtering for managers and admins.
 * Features:
 * - Filter by representative, date range, status, doctor name
 * - Display discussed products for each visit
 * - Export functionality
 * - Role-based data scoping (managers see their team, admins see all)
 */

import { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, User, CheckCircle, XCircle, AlertCircle, 
  Filter, Search, Download, RefreshCw, Pill, ChevronDown 
} from 'lucide-react';
import { format, parseISO, subMonths } from 'date-fns';
import { az } from 'date-fns/locale';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { 
  getAllVisitHistory, 
  getVisitStatsForAdmin,
  type VisitLogWithRepresentative,
  type VisitHistoryFilters 
} from '../lib/api/visits';
import { getDiscussedProductsSummary } from '../lib/api/discussed-products';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { t } from '../lib/i18n';

export default function AdminVisitHistoryPage() {
  const { user, role, manager } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<VisitLogWithRepresentative[]>([]);
  const [discussedProducts, setDiscussedProducts] = useState<Record<string, string[]>>({});
  const [representatives, setRepresentatives] = useState<{ id: string; full_name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState<VisitHistoryFilters>({
    representativeId: '',
    dateFrom: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    status: 'all',
    doctorName: ''
  });

  // Stats
  const [stats, setStats] = useState({
    weekCompleted: 0,
    weekTotal: 0,
    monthCompleted: 0,
    monthTotal: 0,
    totalVisits: 0,
    completedVisits: 0,
    postponedVisits: 0,
    missedVisits: 0,
    weekCompletionRate: 0,
    monthCompletionRate: 0,
  });

  useEffect(() => {
    loadRepresentatives();
    loadVisitData();
  }, []);

  const loadRepresentatives = async () => {
    try {
      let query = supabase
        .from('representatives')
        .select('id, full_name')
        .order('full_name');

      // If manager, scope to their representatives
      if (role === 'manager' && manager?.id) {
        query = query.eq('manager_id', manager.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRepresentatives(data || []);
    } catch (error) {
      console.error('Error loading representatives:', error);
    }
  };

  const loadVisitData = async () => {
    try {
      setLoading(true);

      // Build filters with manager scope if applicable
      const queryFilters: VisitHistoryFilters = {
        ...filters,
        managerId: role === 'manager' && manager?.id ? manager.id : undefined
      };

      const [visitsData, statsData] = await Promise.all([
        getAllVisitHistory(queryFilters),
        getVisitStatsForAdmin(role === 'manager' && manager?.id ? manager.id : undefined)
      ]);

      setVisits(visitsData);
      setStats(statsData);

      // Load discussed products
      if (visitsData.length > 0) {
        const visitIds = visitsData.map(v => v.id);
        const discussedProductsData = await getDiscussedProductsSummary(visitIds);
        setDiscussedProducts(discussedProductsData);
      }
    } catch (error) {
      console.error('Error loading visit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadVisitData();
  };

  const handleResetFilters = () => {
    setFilters({
      representativeId: '',
      dateFrom: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
      status: 'all',
      doctorName: ''
    });
    // Reload will happen via useEffect or manual trigger
    setTimeout(loadVisitData, 100);
  };

  const exportToCSV = () => {
    if (visits.length === 0) return;

    const headers = [
      'Tarix',
      'Nümayəndə',
      'Həkim',
      'İxtisas',
      'Status',
      'Danışılan dərmanlar',
      'Qeyd'
    ];

    const rows = visits.map(visit => [
      visit.scheduled_date,
      visit.representative?.full_name || '-',
      visit.doctor ? `Dr. ${visit.doctor.first_name} ${visit.doctor.last_name}` : '-',
      visit.doctor?.specialty || '-',
      visit.status,
      discussedProducts[visit.id]?.join(', ') || '-',
      visit.postpone_reason || '-'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ziyaret-tarixcesi-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-10 h-10 text-green-600" />;
      case 'postponed':
        return <AlertCircle className="w-10 h-10 text-yellow-600" />;
      case 'missed':
        return <XCircle className="w-10 h-10 text-red-600" />;
      case 'in_progress':
        return <Calendar className="w-10 h-10 text-blue-600" />;
      default:
        return <Calendar className="w-10 h-10 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'postponed':
        return 'bg-yellow-100 text-yellow-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Bitmiş görüş',
      postponed: 'Təxirə salındı',
      missed: 'Tamamlanmamış görüş',
      in_progress: 'Gedişatda',
      planned: 'Planlaşdırılıb'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">{t('representative.adminVisitHistory.loading')}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('representative.adminVisitHistory.title')}</h1>
          <p className="text-gray-600 mt-2">{t('representative.adminVisitHistory.subtitle')}</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalVisits}</p>
            <p className="text-sm text-gray-600">{t('representative.adminVisitHistory.stats.totalVisits')}</p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedVisits}</p>
            <p className="text-sm text-gray-600">{t('representative.adminVisitHistory.stats.completedVisits')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.monthCompletionRate}% {t('representative.adminVisitHistory.stats.thisMonth')}
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.postponedVisits}</p>
            <p className="text-sm text-gray-600">{t('representative.adminVisitHistory.stats.postponedVisits')}</p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.missedVisits}</p>
            <p className="text-sm text-gray-600">{t('representative.adminVisitHistory.stats.missedVisits')}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t('representative.adminVisitHistory.filters.title')}
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              <ChevronDown className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Representative Filter */}
                <div>
                  <label className="form-label">
                    {t('representative.adminVisitHistory.filters.representative')}
                  </label>
                  <select
                    value={filters.representativeId}
                    onChange={(e) => setFilters({ ...filters, representativeId: e.target.value })}
                    className="form-input"
                  >
                    <option value="">{t('representative.adminVisitHistory.filters.allRepresentatives')}</option>
                    {representatives.map(rep => (
                      <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                    ))}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label className="form-label">
                    {t('representative.adminVisitHistory.filters.dateFrom')}
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="form-input"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="form-label">
                    {t('representative.adminVisitHistory.filters.dateTo')}
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="form-input"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <label className="form-label">
                    {t('representative.adminVisitHistory.filters.status')}
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="form-input"
                  >
                    <option value="all">{t('representative.adminVisitHistory.statuses.all')}</option>
                    <option value="completed">{t('representative.adminVisitHistory.statuses.completed')}</option>
                    <option value="in_progress">{t('representative.adminVisitHistory.statuses.in_progress')}</option>
                    <option value="postponed">{t('representative.adminVisitHistory.statuses.postponed')}</option>
                    <option value="missed">{t('representative.adminVisitHistory.statuses.missed')}</option>
                  </select>
                </div>

                {/* Doctor Search */}
                <div className="md:col-span-2">
                  <label className="form-label">
                    {t('representative.adminVisitHistory.filters.doctorSearch')}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.doctorName}
                      onChange={(e) => setFilters({ ...filters, doctorName: e.target.value })}
                      placeholder={t('representative.adminVisitHistory.filters.doctorSearchPlaceholder')}
                      className="pl-10 form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleApplyFilters}
                  className="btn-primary flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  {t('representative.adminVisitHistory.filters.applyFilters')}
                </button>
                <button
                  onClick={handleResetFilters}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('representative.adminVisitHistory.filters.resetFilters')}
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={visits.length === 0}
                  className="btn-secondary flex items-center gap-2 ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {t('representative.adminVisitHistory.export.csv')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Visits List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('representative.adminVisitHistory.title')} ({visits.length} {t('representative.visits.visits')})
            </h2>
          </div>

          {visits.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 text-lg mb-2">{t('representative.adminVisitHistory.noData')}</p>
              <p className="text-gray-400 text-sm">{t('representative.adminVisitHistory.adjustFilters')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Status Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(visit.status)}
                      </div>

                      <div className="flex-1">
                        {/* Header with Status Badge */}
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-medium text-gray-900">
                            Dr. {visit.doctor?.first_name} {visit.doctor?.last_name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(visit.status)}`}>
                            {getStatusLabel(visit.status)}
                          </span>
                        </div>

                        {/* Visit Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
                          {/* Left Column */}
                          <div className="space-y-2">
                            {/* Representative */}
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-gray-700">
                                {t('representative.adminVisitHistory.card.representative')}:
                              </span>
                              <span>{visit.representative?.full_name || '-'}</span>
                            </div>

                            {/* Doctor Specialty */}
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span className="font-medium text-gray-700">
                                {t('representative.adminVisitHistory.card.specialty')}:
                              </span>
                              <span>{visit.doctor?.specialty || '-'}</span>
                            </div>

                            {/* Date */}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium text-gray-700">
                                {t('representative.adminVisitHistory.card.date')}:
                              </span>
                              <span>
                                {format(parseISO(visit.scheduled_date), 'EEEE, d MMMM, yyyy', { locale: az })}
                              </span>
                            </div>
                          </div>

                          {/* Right Column */}
                          <div className="space-y-2">
                            {/* Address */}
                            {visit.doctor?.address && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{visit.doctor.address}</span>
                              </div>
                            )}

                            {/* Postpone Reason */}
                            {visit.postpone_reason && (
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600" />
                                <div className="flex-1">
                                  <span className="font-medium text-gray-700">
                                    {t('representative.adminVisitHistory.card.postponeReason')}:
                                  </span>
                                  <p className="text-gray-600 mt-0.5">{visit.postpone_reason}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Discussed Products */}
                        {discussedProducts[visit.id] && discussedProducts[visit.id].length > 0 ? (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-start gap-2">
                              <Pill className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-2">
                                  {t('representative.adminVisitHistory.card.discussedProducts')}:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {discussedProducts[visit.id].map((product, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {product}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-500 italic">
                              {t('representative.adminVisitHistory.card.noProducts')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

