import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Users, Stethoscope, Package, TrendingUp, Calendar } from 'lucide-react';
import Layout from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { ManagerDashboardStats } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { RoleBasedAccess, ReadOnlyWarning } from '../components/RoleBasedAccess';
import { usePermissions } from '../lib/permissions';
import { t } from '../lib/i18n';

function ManagerDashboardHome() {
  const [stats, setStats] = useState<ManagerDashboardStats>({
    totalRepresentatives: 0,
    totalDoctors: 0,
    totalBrands: 0,
    activeAssignments: 0,
    totalVisits: 0,
    completedVisits: 0,
    missedVisits: 0,
    postponedVisits: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { userProfile, role } = useAuth();
  const permissions = usePermissions(role);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Global aggregates (same as Superadmin view)
      const [
        repsCountRes,
        doctorsCountRes,
        brandsCountRes,
        assignmentsCountRes,
        visitsRes
      ] = await Promise.all([
        supabase.from('representatives').select('*', { count: 'exact', head: true }),
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        supabase.from('brands').select('*', { count: 'exact', head: true }),
        supabase.from('rep_doctor_assignments').select('*', { count: 'exact', head: true }),
        supabase.from('visit_logs').select('status')
      ]);

      const visits = (visitsRes as any).data || [];
      const completedVisits = visits.filter((v: any) => v.status === 'completed').length;
      const missedVisits = visits.filter((v: any) => v.status === 'missed').length;
      const postponedVisits = visits.filter((v: any) => v.status === 'postponed').length;
      const completionRate = visits.length > 0 ? (completedVisits / visits.length) * 100 : 0;

      setStats({
        totalRepresentatives: (repsCountRes as any).count || 0,
        totalDoctors: (doctorsCountRes as any).count || 0,
        totalBrands: (brandsCountRes as any).count || 0,
        activeAssignments: (assignmentsCountRes as any).count || 0,
        totalVisits: visits.length,
        completedVisits,
        missedVisits,
        postponedVisits,
        completionRate: Math.round(completionRate),
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('roles.manager')} {t('headers.dashboard')}</h1>
          <p className="mt-2 text-gray-600">
            {t('headers.welcome')}, {userProfile?.manager?.full_name}
          </p>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Nümayəndələr</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRepresentatives}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <Stethoscope className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Həkimlər</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDoctors}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Brendlər</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBrands}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktiv tapşırıqlar</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeAssignments}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Görüş performansı</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ümumi görüş</span>
                <span className="font-semibold">{stats.totalVisits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bitmiş</span>
                <span className="font-semibold text-green-600">{stats.completedVisits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tam. olmayan</span>
                <span className="font-semibold text-red-600">{stats.missedVisits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Təxirə salınmış</span>
                <span className="font-semibold text-yellow-600">{stats.postponedVisits}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Uğur faizi</span>
                  <span className="font-bold text-primary-600">{stats.completionRate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('headers.quickActions')}</h3>
            <div className="space-y-3">
              
              <RoleBasedAccess permission="CREATE_REPRESENTATIVE">
                <a
                  href="/representatives/create"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Users className="w-5 h-5 text-primary-600" />
                  <span className="font-medium">{t('entities.representative.add')}</span>
                </a>
              </RoleBasedAccess>
              
              <a
                href="/assignments"
                className="flex items-center gap-3 p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <Calendar className="w-5 h-5 text-primary-600" />
                <span className="font-medium">{t('entities.assignment.plural')} idarəetmə</span>
              </a>
              
              <a
                href="/reports"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <span className="font-medium">{t('nav.reports')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function ManagerDashboard() {
  return (
    <Routes>
      <Route path="/" element={<ManagerDashboardHome />} />
      <Route path="/*" element={<ManagerDashboardHome />} />
    </Routes>
  );
}