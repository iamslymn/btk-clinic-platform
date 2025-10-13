
import { useState, useEffect } from 'react';
import { Calendar, MapPin, User, CheckCircle, XCircle, AlertCircle, Filter, Search, ChevronDown } from 'lucide-react';
import { format, subWeeks, subMonths, parseISO } from 'date-fns';
import { az } from 'date-fns/locale';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getVisitHistory, getRepVisitStats } from '../lib/api/visits';
import type { VisitLogWithDetails } from '../lib/api/visits';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { t } from '../lib/i18n';

type FilterPeriod = 'week' | 'month' | '3months' | 'all';
type FilterStatus = 'all' | 'completed' | 'postponed' | 'missed';

export default function VisitsPage() {
  const { user, representative } = useAuth();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<VisitLogWithDetails[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<VisitLogWithDetails[]>([]);
  const [stats, setStats] = useState({
    weekCompleted: 0,
    weekTotal: 0,
    monthCompleted: 0,
    monthTotal: 0,
    weekCompletionRate: 0,
    monthCompletionRate: 0,
  });
  
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (representative?.id) {
      loadVisitsData();
    } else if (user?.id && (user as any)?.role === 'rep') {
      loadVisitsDataDirectly(user.id);
    }
  }, [user, representative, filterPeriod]);

  useEffect(() => {
    applyFilters();
  }, [visits, filterStatus, searchQuery]);

  const loadVisitsData = async () => {
    if (!representative?.id) return;

    try {
      setLoading(true);
      const repId = representative.id;
      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date | undefined;
      
      switch (filterPeriod) {
        case 'week':
          startDate = subWeeks(now, 1);
          break;
        case 'month':
          startDate = subMonths(now, 1);
          break;
        case '3months':
          startDate = subMonths(now, 3);
          break;
        case 'all':
          startDate = undefined;
          break;
      }

      const [visitsData, statsData] = await Promise.all([
        getVisitHistory(repId, startDate),
        getRepVisitStats(repId)
      ]);
      
      setVisits(visitsData);
      setStats(statsData);
    } catch (error) {
      // optional structured logging could be added behind a flag
    } finally {
      setLoading(false);
    }
  };

  const loadVisitsDataDirectly = async (userId: string) => {
    try {
      setLoading(true);
      // First, get the representative record directly
      // Try auth_user_id first (new way), then user_id (old way)
      let repData, repError;
      
      const authUserResult = await supabase
        .from('representatives')
        .select('*')
        .eq('auth_user_id', userId)
        .single();
      
      if (authUserResult.data) {
        repData = authUserResult.data;
        repError = authUserResult.error;
      } else {
        console.log('🔄 VisitsPage - Fallback: Trying user_id for representative lookup');
        const userIdResult = await supabase
          .from('representatives')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        repData = userIdResult.data;
        repError = userIdResult.error;
      }

      if (repError) { return; }

      if (!repData) { return; }

      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date | undefined;
      
      switch (filterPeriod) {
        case 'week':
          startDate = subWeeks(now, 1);
          break;
        case 'month':
          startDate = subMonths(now, 1);
          break;
        case '3months':
          startDate = subMonths(now, 3);
          break;
        case 'all':
          startDate = undefined;
          break;
      }

      const [visitsData, statsData] = await Promise.all([
        getVisitHistory(repData.id, startDate),
        getRepVisitStats(repData.id)
      ]);
      
      setVisits(visitsData);
      setStats(statsData);
    } catch (error) {
      // optional structured logging could be added behind a flag
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = visits;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(visit => visit.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(visit =>
        `${visit.doctor?.first_name} ${visit.doctor?.last_name}`.toLowerCase().includes(query) ||
        visit.doctor?.specialty?.toLowerCase().includes(query) ||
        visit.doctor?.address?.toLowerCase().includes(query) ||
        visit.postpone_reason?.toLowerCase().includes(query)
      );
    }

    setFilteredVisits(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'postponed':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'missed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Calendar className="w-5 h-5 text-gray-400" />;
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const periodLabels = {
    week: t('representative.visits.periods.week'),
    month: t('representative.visits.periods.month'),
    '3months': t('representative.visits.periods.3months'),
    all: t('representative.visits.periods.all')
  };

  const statusLabels = {
    all: t('representative.visits.statuses.all'),
    completed: t('representative.visits.statuses.completed'),
    postponed: t('representative.visits.statuses.postponed'),
    missed: t('representative.visits.statuses.missed')
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

  if (!representative) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Nümayəndə profili tapılmadı. Zəhmət olmasa menecerinizlə əlaqə saxlayın.</p>
          <div className="mt-4 text-sm text-gray-600">
            <p>Texniki məlumat:</p>
            <p>İstifadəçi ID: {user?.id}</p>
            <p>Nümayəndə obyekt: {representative ? 'Tapıldı' : 'Tapılmadı'}</p>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900">{t('representative.visits.title')}</h1>
            <p className="mt-2 text-gray-600">
              {t('representative.visits.reviewVisits')}
            </p>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            {t('representative.visits.filters')}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.weekCompleted}</p>
            <p className="text-sm text-gray-600">{t('representative.visits.thisWeek')}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.weekCompletionRate}% {t('representative.visits.inSelectedPeriod')}</p>
          </div>
          
          <div className="card text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.monthCompleted}</p>
            <p className="text-sm text-gray-600">{t('representative.visits.thisMonth')}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.monthCompletionRate}% {t('representative.visits.inSelectedPeriod')}</p>
          </div>
          
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{visits.filter(v => v.status === 'completed').length}</p>
            <p className="text-sm text-gray-600">{t('representative.visits.totalCompleted')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('representative.visits.inSelectedPeriod')}</p>
          </div>
          
          <div className="card text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{visits.filter(v => v.status === 'postponed').length}</p>
            <p className="text-sm text-gray-600">{t('representative.visits.postponed')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('representative.visits.inSelectedPeriod')}</p>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('representative.visits.filterVisits')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Period Filter */}
              <div>
                <label className="form-label">{t('representative.visits.timePeriod')}</label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
                  className="form-input"
                >
                  {Object.entries(periodLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="form-label">{t('representative.visits.visitStatus')}</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  className="form-input"
                >
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="form-label">{t('representative.visits.search')}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={t('representative.visits.searchPlaceholder')}
                    className="pl-10 form-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Visits List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('representative.visits.visitHistory')} ({filteredVisits.length} {t('representative.visits.visits')})
            </h2>
          </div>

          {filteredVisits.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery || filterStatus !== 'all' ? t('representative.visits.noVisitsFound') : t('representative.visits.noVisitsYet')}
              </p>
              <p className="text-gray-400 text-sm">
                {searchQuery || filterStatus !== 'all'
                  ? t('representative.visits.adjustFilters')
                  : t('representative.visits.completeVisits')
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(visit.status)}
                      </div>
                      
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-900">
                            Dr. {visit.doctor?.first_name} {visit.doctor?.last_name}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(visit.status)}`}>
                            {{
                              completed: 'Bitmiş görüş',
                              postponed: 'Təxirə salındı',
                              missed: 'Tamamlanmamış görüş',
                              planned: 'Planlaşdırılıb',
                              in_progress: 'Gedişatda'
                            }[visit.status as keyof any] || visit.status}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{visit.doctor?.specialty}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{visit.doctor?.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{format(parseISO(visit.scheduled_date), 'EEEE, d MMMM, yyyy', { locale: az })}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {visit.postpone_reason && (
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5" />
                                <span>Qeyd: {visit.postpone_reason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Duration removed */}
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