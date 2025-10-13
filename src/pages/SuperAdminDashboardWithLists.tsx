import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  Users, Stethoscope, Package, Tag, BarChart3
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getDoctors } from '../lib/api/doctors-enhanced';
import { getBrands } from '../lib/api/brands-enhanced';
import { getProducts } from '../lib/api/products-enhanced';
import { getClinicsWithDoctors } from '../lib/api/clinics';
import { getManagers } from '../lib/api/managers';
import { getRepresentatives, getRepresentativeStats } from '../lib/api/representatives';
import type { DoctorWithWorkplacesAndSpecialization, Brand, ProductWithDetails, ManagerWithDetails } from '../types';
import CreateDoctorFormEnhanced from '../components/CreateDoctorFormEnhanced';
import CreateProductForm from '../components/CreateProductForm';
import CreateBrandForm from '../components/CreateBrandForm';
import CreateManagerForm from '../components/CreateManagerForm';
import EditManagerForm from '../components/EditManagerForm';
import EditDoctorForm from '../components/EditDoctorForm';
import EditBrandForm from '../components/EditBrandForm';
import EditProductForm from '../components/EditProductForm';
import ManagerList from '../components/ManagerList';
import LoadingSpinner from '../components/LoadingSpinner';
import { RoleBasedAccess } from '../components/RoleBasedAccess';
import { t } from '../lib/i18n';

// Import existing page components
import DoctorsPage from './DoctorsPage';
import ClinicsPage from './ClinicsPage';
import SpecializationsPage from './SpecializationsPage';
import BrandsPage from './BrandsPage';
import ProductsPage from './ProductsPage';
import ReportsPage from './ReportsPage';

function SuperAdminDashboardHome() {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're on the managers page
  const isManagersPage = location.pathname === '/super-admin/managers';

  // Check if we're on the create doctor page
  const isCreateDoctorPage = location.pathname === '/super-admin/doctors/create' || location.pathname === '/doctors/create';

  // Check if we're on the representatives page
  const isRepresentativesPage = location.pathname === '/super-admin/representatives';

  // Check if we're on the edit doctor page
  const isEditDoctorPage = location.pathname.startsWith('/super-admin/doctors/') && location.pathname.includes('/edit');
  
  // Data states
  const [managers, setManagers] = useState<ManagerWithDetails[]>([]);
  const [representatives, setRepresentatives] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithWorkplacesAndSpecialization[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  // const [clinics, setClinics] = useState<ClinicWithDoctors[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateBrand, setShowCreateBrand] = useState(false);

  // Edit states
  const [editingManager, setEditingManager] = useState<ManagerWithDetails | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<DoctorWithWorkplacesAndSpecialization | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductWithDetails | null>(null);

  // Prevent modal reopening flag
  const [preventModalReopen, setPreventModalReopen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Reset preventModalReopen when navigating to doctors list
  useEffect(() => {
    if (location.pathname === '/super-admin/doctors') {
      setPreventModalReopen(false);
    }
  }, [location.pathname]);

  // Auto-open create doctor modal when on create doctor page
  useEffect(() => {
    if (isCreateDoctorPage && !showCreateDoctor) {
      setShowCreateDoctor(true);
    }
  }, [isCreateDoctorPage, showCreateDoctor]);

  // Handle edit doctor page
  useEffect(() => {
    if (isEditDoctorPage && !editingDoctor && !preventModalReopen) {
      const doctorId = location.pathname.split('/')[3]; // Extract doctor ID from /super-admin/doctors/:id/edit
      if (doctorId && doctorId !== 'create') { // Make sure it's not the create page
        loadDoctorForEditing(doctorId);
      }
    } else if (!isEditDoctorPage && editingDoctor && !preventModalReopen) {
      // Clear editing doctor when navigating away from edit page
      setEditingDoctor(null);
    }
  }, [isEditDoctorPage, location.pathname, editingDoctor, preventModalReopen]);

  const loadDoctorForEditing = async (doctorId: string) => {
    try {
      console.log('Loading doctor for editing:', doctorId);
      const doctorsData = await getDoctors();
      const doctor = doctorsData.find(d => d.id === doctorId);
      if (doctor) {
        console.log('Doctor found for editing:', doctor);
        setEditingDoctor(doctor);
      } else {
        console.log('Doctor not found for editing:', doctorId);
      }
    } catch (error) {
      console.error('Error loading doctor for editing:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load data with error handling for each API call
      const results = await Promise.allSettled([
        getManagers(),
        getRepresentatives(),
        getDoctors(),
        getBrands(),
        getProducts(),
        getClinicsWithDoctors()
      ]);

      // Process results safely
      setManagers(results[0].status === 'fulfilled' ? (results[0].value as any) : []);

      // Enhance representatives with statistics
      if (results[1].status === 'fulfilled') {
        const repsData = results[1].value || [];
        const repsWithStats = await Promise.all(
          repsData.map(async (rep: any) => {
            const stats = await getRepresentativeStats(rep.id);
            return { ...rep, stats };
          })
        );
        setRepresentatives(repsWithStats);
      } else {
        setRepresentatives([]);
      }

      setDoctors(results[2].status === 'fulfilled' ? results[2].value : []);
      setBrands(results[3].status === 'fulfilled' ? results[3].value : []);
      setProducts(results[4].status === 'fulfilled' ? results[4].value : []);
      // clinics dataset currently unused in dashboard summary

      // Log any errors
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const apiNames = ['managers', 'representatives', 'doctors', 'brands', 'products', 'clinics'];
          console.error(`Error loading ${apiNames[index]}:`, result.reason);
        }
      });

    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Unused handlers removed

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

        // If we're on the create doctor page, show minimal layout with just the modal
        if (isCreateDoctorPage) {
          return (
            <Layout>
              <div className="min-h-screen">
                {/* Modals */}
                {showCreateDoctor && (
                  <CreateDoctorFormEnhanced
                    onClose={() => {
                      setShowCreateDoctor(false);
                      navigate('/super-admin/doctors');
                    }}
                    onSuccess={() => {
                      setShowCreateDoctor(false);
                      navigate('/super-admin/doctors');
                    }}
                  />
                )}

                {editingDoctor && (
                  <EditDoctorForm
                    doctor={editingDoctor}
                    onClose={() => {
                      setPreventModalReopen(true);
                      setEditingDoctor(null);
                      navigate('/super-admin/doctors');
                      // Reset the flag after navigation
                      setTimeout(() => setPreventModalReopen(false), 1000);
                    }}
                    onSuccess={() => {
                      setPreventModalReopen(true);
                      setEditingDoctor(null);
                      navigate('/super-admin/doctors');
                      // Reset the flag after navigation
                      setTimeout(() => setPreventModalReopen(false), 1000);
                    }}
                  />
                )}
              </div>
            </Layout>
          );
        }

        // If we're on the representatives page, show only representatives
        if (isRepresentativesPage) {
          return (
            <Layout>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Nümayəndə İdarəetməsi
                    </h1>
                    <p className="mt-2 text-gray-600">
                      Nümayəndələri idarə edin və məlumatlarını görün
                    </p>
                  </div>
                  <button
                    onClick={() => window.history.back()}
                    className="btn-secondary"
                  >
                    ← Geri qayıt
                  </button>
                </div>

                {/* Representatives Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card text-center">
                    <p className="text-2xl font-bold text-blue-600">{representatives.length}</p>
                    <p className="text-sm text-gray-600">Ümumi Nümayəndə</p>
                  </div>
                  <div className="card text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {representatives.filter(r => r.user?.role === 'rep').length}
                    </p>
                    <p className="text-sm text-gray-600">Aktiv Nümayəndə</p>
                  </div>
                  <div className="card text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {representatives.reduce((sum, r) => sum + (r.stats?.totalVisits || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-600">Ümumi Ziyarət</p>
                  </div>
                  <div className="card text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {representatives.reduce((sum, r) => sum + (r.stats?.totalDoctors || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-600">Təyin Olunan Həkim</p>
                  </div>
                </div>

                {/* Representatives List */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Nümayəndələr</h2>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Nümayəndə axtar..."
                          className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={''}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nümayəndə
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Həkimlər
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ziyarətlər
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Uğur Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {representatives.map((rep) => (
                          <tr key={rep.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-medium text-sm">
                                    {rep.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {rep.full_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {rep.user?.email || 'Email yoxdur'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {rep.stats?.totalDoctors || 0} həkim
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {rep.stats?.totalVisits || 0} ziyarət
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (rep.stats?.completionRate || 0) >= 80
                                  ? 'bg-green-100 text-green-800'
                                  : (rep.stats?.completionRate || 0) >= 60
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {rep.stats?.completionRate || 0}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Aktiv
                              </span>
                            </td>
                          </tr>
                        ))}
                        {representatives.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                              Nümayəndə tapılmadı.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </Layout>
          );
        }

        // If we're on the managers page, show only managers
        if (isManagersPage) {
          return (
            <Layout>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Manager İdarəetməsi
                    </h1>
                    <p className="mt-2 text-gray-600">
                      Menecerləri idarə edin və yeni menecer əlavə edin
                    </p>
                  </div>
                  <button
                    onClick={() => window.history.back()}
                    className="btn-secondary"
                  >
                    ← Geri qayıt
                  </button>
                </div>

                {/* Manager Management */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Menecerlər</h2>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Menecer axtar..."
                          className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          value={''}
                          onChange={() => {}}
                        />
                      </div>
                      <RoleBasedAccess permission="CREATE_MANAGER">
                        <button
                          onClick={() => setShowCreateManager(true)}
                          className="btn-primary flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Yeni Menecer
                        </button>
                      </RoleBasedAccess>
                    </div>
                  </div>

                  <ManagerList
                    managers={managers}
                    onManagerUpdate={loadDashboardData}
                    onEditManager={(manager) => setEditingManager(manager)}
                  />
                </div>
              </div>

              {/* Modals */}
              {showCreateManager && (
                <CreateManagerForm
                  onClose={() => setShowCreateManager(false)}
                  onSuccess={() => {
                    setShowCreateManager(false);
                    loadDashboardData();
                  }}
                />
              )}

              {/* Other modals for editing */}
              {editingManager && (
                <EditManagerForm
                  manager={editingManager}
                  onClose={() => setEditingManager(null)}
                  onSuccess={() => {
                    setEditingManager(null);
                    loadDashboardData();
                  }}
                />
              )}
            </Layout>
          );
        }

        return (
    <Layout>
          <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Super Admin İdarə Paneli
            </h1>
            <p className="mt-2 text-gray-600">
              BTK Tibbi Platforma İdarəetməsi
            </p>
          </div>
        </div>

        {/* Dashboard Content */}
            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">Some data may not be available: {error}</p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Managers</p>
                    <p className="text-2xl font-bold text-gray-900">{managers.length}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Stethoscope className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Doctors</p>
                    <p className="text-2xl font-bold text-gray-900">{doctors.length}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Tag className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Brands</p>
                    <p className="text-2xl font-bold text-gray-900">{brands.length}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Products</p>
                    <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('headers.quickActions')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <RoleBasedAccess permission="CREATE_MANAGER">
                <button
                  onClick={() => setShowCreateManager(true)}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Users className="w-5 h-5" />
                    {t('entities.manager.add')}
                </button>
                </RoleBasedAccess>
                
                <RoleBasedAccess permission="CREATE_DOCTOR">
                <button
                  onClick={() => setShowCreateDoctor(true)}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Stethoscope className="w-5 h-5" />
                    {t('entities.doctor.add')}
                </button>
                </RoleBasedAccess>
                
                <RoleBasedAccess permission="CREATE_BRAND">
                <button
                  onClick={() => setShowCreateBrand(true)}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Tag className="w-5 h-5" />
                    {t('entities.brand.add')}
                </button>
                </RoleBasedAccess>
                
                <RoleBasedAccess permission="CREATE_PRODUCT">
                <button
                  onClick={() => setShowCreateProduct(true)}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Package className="w-5 h-5" />
                    {t('entities.product.add')}
                </button>
                </RoleBasedAccess>
                
                <button
                  className="btn-secondary flex items-center justify-center gap-2 py-3"
                  onClick={() => navigate('/super-admin/reports')}
                >
                  <BarChart3 className="w-5 h-5" />
                  Hesabatlar
                </button>
              </div>
            </div>

        {/* Recent Activity */}
        <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Son fəaliyyət</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Sistem uğurla başladı</span>
                  <span className="text-xs text-gray-400 ml-auto">İndi</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Məlumat yükləndi: {managers.length} menecer, {doctors.length} həkim</span>
                  <span className="text-xs text-gray-400 ml-auto">1 dəq əvvəl</span>
                </div>
          </div>
        </div>

        {/* Modals */}
        {showCreateManager && (
          <CreateManagerForm
            onClose={() => setShowCreateManager(false)}
            onSuccess={() => {
              setShowCreateManager(false);
              loadDashboardData();
            }}
          />
        )}


        {showCreateBrand && (
          <CreateBrandForm
            onClose={() => setShowCreateBrand(false)}
            onSuccess={() => {
              setShowCreateBrand(false);
              loadDashboardData();
            }}
          />
        )}

        {showCreateProduct && (
          <CreateProductForm
            onClose={() => setShowCreateProduct(false)}
            onSuccess={() => {
              setShowCreateProduct(false);
              loadDashboardData();
            }}
          />
        )}

        {editingManager && (
          <EditManagerForm
            manager={editingManager}
            onClose={() => setEditingManager(null)}
            onSuccess={() => {
              setEditingManager(null);
              loadDashboardData();
            }}
          />
        )}

        {editingDoctor && (
          <EditDoctorForm
            doctor={editingDoctor}
            onClose={() => {
              setPreventModalReopen(true);
              setEditingDoctor(null);
              navigate('/super-admin/doctors');
              // Reset the flag after navigation
              setTimeout(() => setPreventModalReopen(false), 1000);
            }}
            onSuccess={() => {
              setPreventModalReopen(true);
              setEditingDoctor(null);
              navigate('/super-admin/doctors');
              // Reset the flag after navigation
              setTimeout(() => setPreventModalReopen(false), 1000);
            }}
          />
        )}

        {editingBrand && (
          <EditBrandForm
            brand={editingBrand}
            onClose={() => setEditingBrand(null)}
            onSuccess={() => {
              setEditingBrand(null);
              loadDashboardData();
            }}
          />
        )}

        {editingProduct && (
          <EditProductForm
            product={editingProduct}
            onClose={() => setEditingProduct(null)}
            onSuccess={() => {
              setEditingProduct(null);
              loadDashboardData();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

export default function SuperAdminDashboardWithLists() {
  return (
    <Routes>
      {/* Redirect /super-admin to /super-admin/dashboard */}
      <Route path="/" element={<Navigate to="/super-admin/dashboard" replace />} />
      
      {/* Dashboard routes */}
      <Route path="/dashboard" element={<SuperAdminDashboardHome />} />
      <Route path="/managers" element={<SuperAdminDashboardHome />} />
      <Route path="/representatives" element={<SuperAdminDashboardHome />} />
      <Route path="/doctors" element={<DoctorsPage />} />
      <Route path="/doctors/create" element={<SuperAdminDashboardHome />} />
      <Route path="/doctors/:id/edit" element={<SuperAdminDashboardHome />} />
      <Route path="/brands" element={<BrandsPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/clinics" element={<ClinicsPage />} />
      <Route path="/specializations" element={<SpecializationsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SuperAdminDashboardHome />} />
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/super-admin/dashboard" replace />} />
    </Routes>
  );
}
