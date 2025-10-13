
import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3, TrendingUp, Users, MapPin, Download, Filter, RefreshCw, Navigation } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  getVisitTrends,
  getRepresentativePerformance,
  getDoctorPopularity,
  getProductUsage,
  getTerritoryPerformance,
  getRepresentativeMeetingStats,
  type VisitTrendData,
  type RepresentativePerformance,
  type DoctorPopularity,
  type ProductUsage,
  type TerritoryPerformance,
  type RepresentativeMeetingStat
} from '../lib/api/reporting';
import { t } from '../lib/i18n';
import { getRoutePoints } from '../lib/api/visits';
import { supabase } from '../lib/supabase';
import { loadGoogleMaps } from '../lib/maps';
// no-op

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  pink: '#EC4899',
  gray: '#6B7280'
};

export default function ReportsPage() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [visitTrends, setVisitTrends] = useState<VisitTrendData[]>([]);
  const [repPerformance, setRepPerformance] = useState<RepresentativePerformance[]>([]);
  const [doctorPopularity, setDoctorPopularity] = useState<DoctorPopularity[]>([]);
  const [productUsage, setProductUsage] = useState<ProductUsage[]>([]);
  const [territoryPerformance, setTerritoryPerformance] = useState<TerritoryPerformance[]>([]);
  // removed monthlyStats to avoid unused state until trends return
  const [repStats, setRepStats] = useState<RepresentativeMeetingStat[]>([]);
  const [repFilters, setRepFilters] = useState({
    fromDate: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    repId: '',
    brandId: ''
  });
  // Brand filter removed
  const [repStatsLoading, setRepStatsLoading] = useState(false);

  // Filter states
  const [trendPeriod, setTrendPeriod] = useState(30);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'performance' | 'representatives' | 'route'>('overview');

  // Route map states
  const [reps, setReps] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedRep, setSelectedRep] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10));
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [visits, setVisits] = useState<any[]>([]);
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    loadReportData();
  }, [trendPeriod]);

  useEffect(() => {
    if (selectedTab === 'route') {
      loadRepOptions();
    }
    if (selectedTab === 'representatives') {
      loadRepOptions();
      loadRepresentativeStats();
    }
  }, [selectedTab]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      const [trends, reps, doctors, products, territories] = await Promise.all([
        getVisitTrends(trendPeriod),
        getRepresentativePerformance(),
        getDoctorPopularity(),
        getProductUsage(),
        getTerritoryPerformance()
      ]);

      setVisitTrends(trends);
      setRepPerformance(reps);
      setDoctorPopularity(doctors);
      setProductUsage(products);
      setTerritoryPerformance(territories);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
  };

  const loadRepOptions = async () => {
    try {
      const { data } = await supabase
        .from('representatives')
        .select('id, full_name')
        .order('full_name', { ascending: true });
      setReps(data || []);
      if (!selectedRep && data && data.length) setSelectedRep(data[0].id);
    } catch {}
  };

  const loadRepVisits = async () => {
    if (!selectedRep) return;
    try {
      setRouteLoading(true);
      const { data, error } = await supabase
        .from('visit_logs')
        .select('id, doctor_id, doctors(first_name,last_name), scheduled_date, status, start_time, end_time')
        .eq('rep_id', selectedRep)
        .gte('scheduled_date', fromDate)
        .lte('scheduled_date', toDate)
        .order('scheduled_date', { ascending: false });
      if (!error) setVisits(data || []);
    } finally {
      setRouteLoading(false);
    }
  };

  // Brand options removed

  const loadRepresentativeStats = async () => {
    try {
      setRepStatsLoading(true);
      const stats = await getRepresentativeMeetingStats({
        fromDate: repFilters.fromDate,
        toDate: repFilters.toDate,
        representativeId: repFilters.repId || undefined
      });
      setRepStats(stats);
    } finally {
      setRepStatsLoading(false);
    }
  };

  const exportRepStats = (type: 'csv' | 'xlsx') => {
    if (repStats.length === 0) return;
    const header = [
      t('pages.reports.representatives.table.representative'),
      t('pages.reports.representatives.table.total'),
      t('pages.reports.representatives.table.completed'),
      t('pages.reports.representatives.table.postponed'),
      t('pages.reports.representatives.table.missed'),
      'Ümumi A','Ümumi B','Ümumi C','Ümumi D',
      'PlanetA A','PlanetA B','PlanetA C','PlanetA D'
    ];
    const rows = repStats.map(stat => [
      stat.representative_name,
      stat.total,
      stat.completed,
      stat.postponed,
      stat.missed,
      (stat as any).total_A || 0,
      (stat as any).total_B || 0,
      (stat as any).total_C || 0,
      (stat as any).total_D || 0,
      (stat as any).planeta_A || 0,
      (stat as any).planeta_B || 0,
      (stat as any).planeta_C || 0,
      (stat as any).planeta_D || 0
    ]);
    const delimiter = type === 'csv' ? ',' : '\t';
    const ext = type === 'csv' ? 'csv' : 'xlsx';
    const content = [header.join(delimiter), ...rows.map(r => r.join(delimiter))].join('\n');
    const mime = type === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rep_stats_${new Date().toISOString().slice(0,10)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRouteOnMap = async (visitId: string) => {
    try {
      setRouteLoading(true);
      const { data: points } = await getRoutePoints(visitId);
      const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
      const container = mapNode;
      if (!container) return;
      container.innerHTML = '';
      if (!points || points.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm">Marşrut məlumatı tapılmadı</div>';
        return;
      }
      if (!apiKey) {
        container.innerHTML = '<div class="text-gray-500 text-sm">Xəritə açarı tələb olunur. Nöqtələrin siyahısı göstərilir.</div>';
        const ul = document.createElement('ul');
        ul.className = 'mt-2 text-xs text-gray-600 list-disc pl-5';
        points.forEach((p: any) => {
          const li = document.createElement('li');
          li.textContent = `${p.recorded_at} • ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
          ul.appendChild(li);
        });
        container.appendChild(ul);
        return;
      }
      try {
        await loadGoogleMaps(apiKey);
        // @ts-ignore
        const map = new google.maps.Map(container, {
          center: { lat: points[0].lat, lng: points[0].lng },
          zoom: 15,
        });
        // @ts-ignore
        new google.maps.Polyline({
          path: points.map((p: any) => ({ lat: p.lat, lng: p.lng })),
          geodesic: true,
          strokeColor: '#1D4ED8',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map
        });
        const last = points[points.length - 1];
        // @ts-ignore
        new google.maps.Marker({ position: { lat: points[0].lat, lng: points[0].lng }, map, title: 'Start' });
        // @ts-ignore
        new google.maps.Marker({ position: { lat: last.lat, lng: last.lng }, map, title: 'End' });
      } catch (err: any) {
        container.innerHTML = `<div class="text-red-500 text-sm">${err?.message || 'Xəritə yüklənmədi. Google Maps API açarını və aktivləşdirilmiş xidmətləri yoxlayın.'}</div>`;
      }
    } finally {
      setRouteLoading(false);
    }
  };

  const exportData = () => {
    const csvData = visitTrends.map(item => 
      `${item.date},${item.total},${item.completed},${item.postponed},${item.missed},${item.completionRate}`
    ).join('\n');
    
    const blob = new Blob([`Date,Total,Completed,Postponed,Missed,Completion Rate\n${csvData}`], 
      { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `btk_reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check permissions
  if (!user || (role !== 'manager' && role !== 'super_admin')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Access denied. Manager or Super Admin privileges required.</p>
        </div>
      </Layout>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-900">Peşəkar Hesabatlar</h1>
            <p className="mt-2 text-gray-600">Komandanızın performansını izləmək üçün analitika və təhlillər</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={exportData}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Məlumatı ixrac et
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Yenilənir...' : 'Yenilə'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Ümumi baxış', icon: BarChart3 },
              { id: 'performance', label: 'Performans', icon: TrendingUp },
              { id: 'representatives', label: 'Nümayəndələr', icon: Users },
              { id: 'route', label: 'Görüş xəritəsi', icon: Navigation }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Visits</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {visitTrends.reduce((sum, day) => sum + day.total, 0)}
                    </p>
                    <p className="text-xs text-gray-500">Last {trendPeriod} days</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg. Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {visitTrends.length > 0 
                        ? Math.round(visitTrends.reduce((sum, day) => sum + day.completionRate, 0) / visitTrends.length)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Last {trendPeriod} days</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Representatives</p>
                    <p className="text-2xl font-bold text-gray-900">{repPerformance.length}</p>
                    <p className="text-xs text-gray-500">Team members</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <MapPin className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Territories Covered</p>
                    <p className="text-2xl font-bold text-gray-900">{territoryPerformance.length}</p>
                    <p className="text-xs text-gray-500">Active areas</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visit Trends Chart */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Visit Activity Trends</h3>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={trendPeriod}
                    onChange={(e) => setTrendPeriod(Number(e.target.value))}
                    className="form-select text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
              </div>
              
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <LineChart data={visitTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke={COLORS.primary} 
                      strokeWidth={2}
                      name="Total Visits"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke={COLORS.success} 
                      strokeWidth={2}
                      name="Completed"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="postponed" 
                      stroke={COLORS.warning} 
                      strokeWidth={2}
                      name="Postponed"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="missed" 
                      stroke={COLORS.danger} 
                      strokeWidth={2}
                      name="Missed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products & Doctors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Assigned Products</h3>
                <div style={{ width: '100%', height: '250px' }}>
                  <ResponsiveContainer>
                    <BarChart data={productUsage.slice(0, 8)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="timesAssigned" fill={COLORS.indigo} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Doctors */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Visited Doctors</h3>
                <div style={{ width: '100%', height: '250px' }}>
                  <ResponsiveContainer>
                    <BarChart data={doctorPopularity.slice(0, 8)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="totalVisits" fill={COLORS.success} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {selectedTab === 'performance' && (
          <div className="space-y-6">
            {/* Representative Performance */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Representative Performance Comparison</h3>
              <div style={{ width: '100%', height: '400px' }}>
                <ResponsiveContainer>
                  <BarChart data={repPerformance.slice(0, 15)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalVisits" fill={COLORS.primary} name="Total Visits" />
                    <Bar dataKey="completedVisits" fill={COLORS.success} name="Completed Visits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Territory Performance */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Territory Performance</h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <BarChart data={territoryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="territory" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completionRate" fill={COLORS.purple} name="Completion Rate %" />
                    <Bar dataKey="totalReps" fill={COLORS.indigo} name="Representatives" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Table */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Performance Metrics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Representative
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Territory
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Visits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {repPerformance.slice(0, 20).map((rep) => (
                      <tr key={rep.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {rep.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rep.territory}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.totalVisits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.completedVisits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            rep.completionRate >= 80 
                              ? 'bg-green-100 text-green-800'
                              : rep.completionRate >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {rep.completionRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab removed */}

        {selectedTab === 'representatives' && (
          <div className="space-y-6">
            <div className="card">
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('reports.representatives.filtersTitle')}</h3>
                  <p className="text-sm text-gray-500">{t('reports.subtitle')}</p>
                </div>
                <div className="flex flex-col md:flex-row md:flex-wrap items-end gap-3">
                  <div>
                    <label className="form-label text-xs">{t('reports.representatives.fromDate')}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={repFilters.fromDate}
                      onChange={(e) => setRepFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">{t('reports.representatives.toDate')}</label>
                    <input
                      type="date"
                      className="form-input"
                      value={repFilters.toDate}
                      onChange={(e) => setRepFilters(prev => ({ ...prev, toDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1 min-w-[260px] max-w-xl">
                    <label className="form-label text-xs">{t('reports.representatives.representative')}</label>
                    <select
                      className="form-input w-full"
                      value={repFilters.repId}
                      onChange={(e) => setRepFilters(prev => ({ ...prev, repId: e.target.value }))}
                    >
                      <option value="">Hamısı</option>
                      {reps.map(rep => (
                        <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-primary md:ml-auto" onClick={loadRepresentativeStats}>{t('reports.representatives.applyFilters')}</button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t('reports.representatives.table.representative')}</h3>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary text-xs" onClick={() => exportRepStats('csv')}>{t('reports.representatives.exportCsv')}</button>
                  <button className="btn-secondary text-xs" onClick={() => exportRepStats('xlsx')}>{t('reports.representatives.exportXlsx')}</button>
                </div>
              </div>

              {repStatsLoading ? (
                <div className="py-12 text-center text-sm text-gray-500">{t('common.loading')}</div>
              ) : repStats.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">{t('reports.representatives.noData')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.reports.representatives.table.representative')}</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-16">{t('pages.reports.representatives.table.total')}</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-16">{t('pages.reports.representatives.table.completed')}</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-16">{t('pages.reports.representatives.table.postponed')}</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-20">TAM. GÖRÜŞ</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">Ümumi A</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">Ümumi B</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">Ümumi C</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">Ümumi D</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">PlanetA A</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">PlanetA B</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">PlanetA C</th>
                        <th className="px-2 py-3 text-center text-[11px] font-medium text-gray-500 uppercase tracking-wider">PlanetA D</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-16">Uğur faizi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {repStats.map(stat => {
                        const denom = (stat.completed + stat.missed) || 0;
                        const rate = denom > 0 ? Math.round((stat.completed / denom) * 100) : 0;
                        const badge = rate >= 70 ? 'bg-green-100 text-green-800' : rate >= 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800';
                        return (
                          <tr key={`${stat.representative_id}-${stat.brand_name || 'general'}`}>
                            <td className="px-4 py-3 text-sm text-gray-900">{stat.representative_name}</td>
                            <td className="px-2 py-3 text-sm text-gray-900 text-center whitespace-nowrap">{stat.total}</td>
                            <td className="px-2 py-3 text-sm text-green-600 text-center whitespace-nowrap">{stat.completed}</td>
                            <td className="px-2 py-3 text-sm text-yellow-600 text-center whitespace-nowrap">{stat.postponed}</td>
                            <td className="px-2 py-3 text-sm text-red-600 text-center whitespace-nowrap">{stat.missed}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).total_A || 0}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).total_B || 0}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).total_C || 0}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).total_D || 0}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).planeta_A || 0}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).planeta_B || 0}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).planeta_C || 0}</td>
                            <td className="px-2 py-3 text-sm text-center">{(stat as any).planeta_D || 0}</td>
                            <td className="px-2 py-3 text-sm text-center"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge}`}>{rate}%</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Route Map Tab */}
        {selectedTab === 'route' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Görüş xəritəsi</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="form-label">Nümayəndə</label>
                  <select className="form-input" value={selectedRep} onChange={(e) => setSelectedRep(e.target.value)}>
                    {reps.map(r => (
                      <option key={r.id} value={r.id}>{r.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Başlanğıc tarix</label>
                  <input type="date" className="form-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Son tarix</label>
                  <input type="date" className="form-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <button className="btn-primary w-full" onClick={loadRepVisits}>Görüşləri gətir</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="card lg:col-span-1">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Görüşlər</h4>
                {routeLoading && <div className="text-sm text-gray-500">Yüklənir...</div>}
                <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                  {visits.map(v => (
                    <button key={v.id} onClick={() => { setSelectedVisitId(v.id); renderRouteOnMap(v.id); }} className={`w-full text-left py-3 px-2 hover:bg-gray-50 ${selectedVisitId === v.id ? 'bg-gray-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Dr. {v.doctors?.first_name} {v.doctors?.last_name}</p>
                          <p className="text-xs text-gray-500">{v.scheduled_date} • {v.status}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {visits.length === 0 && (
                    <p className="text-sm text-gray-500">Göstəriləcək görüş yoxdur</p>
                  )}
                </div>
              </div>

              <div className="card lg:col-span-2">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Xəritə</h4>
                <div ref={setMapNode as any} style={{ height: 420 }} className="rounded-lg border border-gray-200" />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}