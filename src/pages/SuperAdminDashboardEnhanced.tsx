import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Users, UserPlus, TrendingUp, Activity, BarChart3, AlertCircle, CheckCircle, Search,
  Stethoscope, Building, Package, Tag, Calendar, FileText, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getManagers } from '../lib/api/managers';
import { getDoctors } from '../lib/api/doctors-enhanced';
import { getBrands } from '../lib/api/brands-enhanced';
import { getProducts } from '../lib/api/products-enhanced';
import { getClinicsWithDoctors } from '../lib/api/clinics';
import { getPlatformStats, getRecentActivity } from '../lib/api/platform';
import type { ManagerWithDetails } from '../lib/api/managers';
import type { PlatformStats } from '../lib/api/platform';
import type { DoctorWithWorkplaces, Brand, ProductWithDetails, ClinicWithDoctors } from '../types';
import CreateManagerForm from '../components/CreateManagerForm';
import CreateDoctorFormEnhanced from '../components/CreateDoctorFormEnhanced';
import CreateProductForm from '../components/CreateProductForm';
import CreateBrandForm from '../components/CreateBrandForm';
import ManagerList from '../components/ManagerList';
import LoadingSpinner from '../components/LoadingSpinner';

function SuperAdminDashboardHome() {
  const { user, role } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [managers, setManagers] = useState<ManagerWithDetails[]>([]);
  const [doctors, setDoctors] = useState<DoctorWithWorkplaces[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [clinics, setClinics] = useState<ClinicWithDoctors[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateBrand, setShowCreateBrand] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Set active tab based on URL
    const path = location.pathname.split('/').pop();
    if (['overview', 'doctors', 'brands', 'products', 'clinics'].includes(path || '')) {
      setActiveTab(path || 'overview');
    }
  }, [location]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        managersData, 
        doctorsData, 
        brandsData, 
        productsData, 
        clinicsData,
        statsData, 
        activityData
      ] = await Promise.all([
        getManagers(),
        getDoctors(),
        getBrands(),
        getProducts(),
        getClinicsWithDoctors(),
        // Skip platform stats and recent activity for now to avoid schema conflicts
        Promise.resolve(null),
        Promise.resolve([])
      ]);
      
      setManagers(managersData);
      setDoctors(doctorsData);
      setBrands(brandsData);
      setProducts(productsData);
      setClinics(clinicsData);
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'doctors', label: 'Doctors', icon: Stethoscope },
    { id: 'brands', label: 'Brands', icon: Tag },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'clinics', label: 'Clinics', icon: Building },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{platformStats?.totalUsers || managers.length}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {managers.length} managers, {platformStats?.totalRepresentatives || 0} reps
                    </p>
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
                    <p className="text-xs text-gray-500 mt-1">
                      {doctors.reduce((acc, d) => acc + d.workplaces.length, 0)} workplaces
                    </p>
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
                    <p className="text-xs text-gray-500 mt-1">
                      {brands.length} brands
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Building className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Clinics</p>
                    <p className="text-2xl font-bold text-gray-900">{clinics.length}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Active locations
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Manager Management */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Manager Management</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search managers..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setShowCreateManager(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Manager
                  </button>
                </div>
              </div>
              
              <ManagerList 
                managers={managers.filter(manager => 
                  manager.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  manager.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                onManagerUpdate={loadDashboardData} 
              />
            </div>
          </div>
        );

      case 'doctors':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Doctor Management</h2>
                <p className="text-gray-600">Manage doctors, specializations, and workplaces</p>
              </div>
              <button
                onClick={() => setShowCreateDoctor(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Doctor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">{doctor.specialization?.display_name}</p>
                    </div>
                    <div className="flex gap-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {doctor.total_category}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {doctor.planeta_category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <p className="text-sm text-gray-600">📧 {doctor.email}</p>
                    <p className="text-sm text-gray-600">📞 {doctor.phone}</p>
                    <p className="text-sm text-gray-600">👤 {doctor.gender}</p>
                  </div>

                  {doctor.workplaces.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">Workplaces:</p>
                      <div className="space-y-1">
                        {doctor.workplaces.map((workplace) => (
                          <div key={workplace.id} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium">{workplace.clinic_name}</p>
                            <p className="text-gray-600">{workplace.address}</p>
                            {workplace.phone && <p className="text-gray-600">📞 {workplace.phone}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {doctors.length === 0 && (
              <div className="text-center py-12">
                <Stethoscope className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No doctors found. Create your first doctor to get started.</p>
              </div>
            )}
          </div>
        );

      case 'brands':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Brand Management</h2>
                <p className="text-gray-600">Manage pharmaceutical brands</p>
              </div>
              <button
                onClick={() => setShowCreateBrand(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Brand
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {brands.map((brand) => (
                <div key={brand.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{brand.name}</h3>
                    <Tag className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Created: {format(new Date(brand.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>

            {brands.length === 0 && (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No brands found. Create your first brand to get started.</p>
              </div>
            )}
          </div>
        );

      case 'products':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
                <p className="text-gray-600">Manage products with specialization priorities</p>
              </div>
              <button
                onClick={() => setShowCreateProduct(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <div key={product.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-sm text-blue-600 font-medium">{product.brand.name}</p>
                    </div>
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                  
                  {product.priority_specializations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Priority for:</p>
                      <div className="flex flex-wrap gap-1">
                        {product.priority_specializations.slice(0, 3).map((spec) => (
                          <span key={spec} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded capitalize">
                            {spec}
                          </span>
                        ))}
                        {product.priority_specializations.length > 3 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            +{product.priority_specializations.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {product.pdf_url && (
                      <a
                        href={product.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        View PDF
                      </a>
                    )}
                    <span className="text-xs text-gray-500">
                      {format(new Date(product.created_at), 'MMM d')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No products found. Create your first product to get started.</p>
              </div>
            )}
          </div>
        );

      case 'clinics':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Clinic Management</h2>
                <p className="text-gray-600">Manage clinics and doctor assignments</p>
              </div>
              <button
                onClick={() => {/* TODO: Add create clinic form */}}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Clinic
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clinics.map((clinic) => (
                <div key={clinic.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{clinic.name}</h3>
                      <p className="text-sm text-gray-600">{clinic.address}</p>
                    </div>
                    <Building className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  {clinic.phone && (
                    <p className="text-sm text-gray-600 mb-2">📞 {clinic.phone}</p>
                  )}
                  {clinic.email && (
                    <p className="text-sm text-gray-600 mb-3">📧 {clinic.email}</p>
                  )}

                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Doctors ({clinic.doctors.length}):
                    </p>
                    {clinic.doctors.length > 0 ? (
                      <div className="space-y-1">
                        {clinic.doctors.slice(0, 3).map((clinicDoctor) => (
                          <div key={clinicDoctor.doctor.id} className="text-xs bg-gray-50 p-2 rounded">
                            <p className="font-medium">
                              Dr. {clinicDoctor.doctor.first_name} {clinicDoctor.doctor.last_name}
                            </p>
                            <p className="text-gray-600 capitalize">{clinicDoctor.doctor.specialization?.display_name}</p>
                          </div>
                        ))}
                        {clinic.doctors.length > 3 && (
                          <p className="text-xs text-gray-500 text-center py-1">
                            +{clinic.doctors.length - 3} more doctors
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No doctors assigned</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {clinics.length === 0 && (
              <div className="text-center py-12">
                <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No clinics found. Create your first clinic to get started.</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Platform overview and management tools</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}

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

        {showCreateDoctor && (
          <CreateDoctorFormEnhanced
            onClose={() => setShowCreateDoctor(false)}
            onSuccess={() => {
              setShowCreateDoctor(false);
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

        {showCreateBrand && (
          <CreateBrandForm
            onClose={() => setShowCreateBrand(false)}
            onSuccess={() => {
              setShowCreateBrand(false);
              loadDashboardData();
            }}
          />
        )}
      </div>
    </Layout>
  );
}

export default function SuperAdminDashboardEnhanced() {
  return (
    <Routes>
      <Route path="/" element={<SuperAdminDashboardHome />} />
      <Route path="/*" element={<SuperAdminDashboardHome />} />
    </Routes>
  );
}
