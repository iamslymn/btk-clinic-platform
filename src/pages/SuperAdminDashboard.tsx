import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Users, UserPlus, TrendingUp, Activity, BarChart3, AlertCircle, CheckCircle, Search } from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getManagers, deleteManager } from '../lib/api/managers';
import { getPlatformStats, getRecentActivity } from '../lib/api/platform';
import type { ManagerWithDetails } from '../lib/api/managers';
import type { PlatformStats } from '../lib/api/platform';
import CreateManagerForm from '../components/CreateManagerForm';
import ManagerList from '../components/ManagerList';
import LoadingSpinner from '../components/LoadingSpinner';

function SuperAdminDashboardHome() {
  const { user, role } = useAuth();
  const [managers, setManagers] = useState<ManagerWithDetails[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [managersData, statsData, activityData] = await Promise.all([
        getManagers(),
        getPlatformStats(), 
        getRecentActivity(10)
      ]);
      
      setManagers(managersData);
      setPlatformStats(statsData);
      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return '↗️';
    if (growth < 0) return '↘️';
    return '→';
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'postponed':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'missed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  // Filter managers based on search
  const filteredManagers = managers.filter(manager => 
    manager.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    manager.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!user || role !== 'super_admin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Access denied. Super Admin privileges required.</p>
          <p className="text-sm text-gray-500 mt-2">Current role: {role || 'none'}</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Super Admin İdarə Paneli</h1>
            <p className="mt-2 text-gray-600">Platforma icmalı və idarəetmə alətləri</p>
          </div>
          <button
            onClick={() => setShowCreateManager(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Yeni Menecer
          </button>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-50 rounded-lg">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ümumi istifadəçilər</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats?.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {platformStats?.totalManagers} menecer, {platformStats?.totalRepresentatives} nümayəndə
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ümumi görüşlər</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats?.totalVisits || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {platformStats?.overallCompletionRate}% uğur faizi
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aylıq artım</p>
                <p className="text-2xl font-bold text-gray-900">
                  <span className={getGrowthColor(platformStats?.monthOverMonthGrowth || 0)}>
                    {getGrowthIcon(platformStats?.monthOverMonthGrowth || 0)} {Math.abs(platformStats?.monthOverMonthGrowth || 0)}%
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  bu ay {platformStats?.thisMonthVisits} görüş
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Platform məlumatları</p>
                <p className="text-2xl font-bold text-gray-900">{platformStats?.totalDoctors || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Həkim, {platformStats?.totalProducts} məhsul
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Managers */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ən yaxşı menecerlər</h3>
            <div className="space-y-3">
              {platformStats?.topManagers.slice(0, 5).map((manager, index) => (
                <div key={manager.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm font-medium text-primary-600">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{manager.full_name}</p>
                      <p className="text-sm text-gray-600">{manager.totalReps} nümayəndə</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{manager.completionRate}%</p>
                    <p className="text-xs text-gray-500">uğur</p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">Hələ performans məlumatı yoxdur</p>
              )}
            </div>
          </div>

          {/* Top Representatives */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ən yaxşı nümayəndələr</h3>
            <div className="space-y-3">
              {platformStats?.topRepresentatives.slice(0, 5).map((rep, index) => (
                <div key={rep.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{rep.full_name}</p>
                      <p className="text-sm text-gray-600">Menecer: {rep.manager_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{rep.completedVisits}</p>
                    <p className="text-xs text-gray-500">bitmiş görüş</p>
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">Hələ performans məlumatı yoxdur</p>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Manager Management */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Menecer idarəetməsi</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Menecer axtar..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <ManagerList managers={filteredManagers} onManagerUpdate={loadDashboardData} />
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Son platforma fəaliyyəti</h2>
          
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Son fəaliyyət yoxdur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.status)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span>Menecer: {activity.details.manager}</span>
                      <span>•</span>
                      <span>{activity.details.specialty}</span>
                      {activity.details.duration && (
                        <>
                          <span>•</span>
                          <span>{activity.details.duration} dəqiqə</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{format(new Date(activity.timestamp), 'dd MMM, HH:mm')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Manager Modal */}
        {showCreateManager && (
          <CreateManagerForm
            onClose={() => setShowCreateManager(false)}
            onSuccess={() => {
              setShowCreateManager(false);
              loadDashboardData();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

export default function SuperAdminDashboard() {
  return (
    <Routes>
      <Route path="/" element={<SuperAdminDashboardHome />} />
      <Route path="/*" element={<SuperAdminDashboardHome />} />
    </Routes>
  );
}