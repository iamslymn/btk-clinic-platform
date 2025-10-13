import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { 
  Users, UserPlus, Stethoscope, Building, Package, Tag, Plus, Edit, Trash2, Eye
} from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getDoctors } from '../lib/api/doctors-enhanced';
import { getBrands } from '../lib/api/brands-enhanced';
import { getProducts } from '../lib/api/products-enhanced';
import { getClinicsWithDoctors } from '../lib/api/clinics';
import { getManagers, deleteManager } from '../lib/api/managers';
import { deleteDoctor } from '../lib/api/doctors-enhanced';
import { deleteBrand } from '../lib/api/brands-enhanced';
import { deleteProduct } from '../lib/api/products-enhanced';
import type { DoctorWithWorkplaces, Brand, ProductWithDetails, ClinicWithDoctors, ManagerWithDetails } from '../types';
import CreateDoctorFormEnhanced from '../components/CreateDoctorFormEnhanced';
import CreateProductForm from '../components/CreateProductForm';
import CreateBrandForm from '../components/CreateBrandForm';
import CreateManagerForm from '../components/CreateManagerForm';
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
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateBrand, setShowCreateBrand] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Set active tab based on URL
    const path = location.pathname;
    if (path.includes('/managers')) {
      setActiveTab('managers');
    } else if (path.includes('/doctors')) {
      setActiveTab('doctors');
    } else if (path.includes('/brands')) {
      setActiveTab('brands');
    } else if (path.includes('/products')) {
      setActiveTab('products');
    } else if (path.includes('/clinics')) {
      setActiveTab('clinics');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load data with error handling for each API call
      const results = await Promise.allSettled([
        getManagers(),
        getDoctors(),
        getBrands(),
        getProducts(),
        getClinicsWithDoctors()
      ]);

      // Process results safely
      setManagers(results[0].status === 'fulfilled' ? results[0].value : []);
      setDoctors(results[1].status === 'fulfilled' ? results[1].value : []);
      setBrands(results[2].status === 'fulfilled' ? results[2].value : []);
      setProducts(results[3].status === 'fulfilled' ? results[3].value : []);
      setClinics(results[4].status === 'fulfilled' ? results[4].value : []);

      // Log any errors
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const apiNames = ['managers', 'doctors', 'brands', 'products', 'clinics'];
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

  const handleDeleteManager = async (managerId: string) => {
    if (!confirm('Are you sure you want to delete this manager? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteManager(managerId);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error deleting manager:', err);
      setError(err.message || 'Failed to delete manager');
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteDoctor(doctorId);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error deleting doctor:', err);
      setError(err.message || 'Failed to delete doctor');
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteBrand(brandId);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error deleting brand:', err);
      setError(err.message || 'Failed to delete brand');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteProduct(productId);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product');
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

  // Remove tabs since we're using sidebar navigation

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">Some data may not be available: {error}</p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <Tag className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Brands</p>
                    <p className="text-2xl font-bold text-gray-900">{brands.length}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Active brands
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Building className="w-6 h-6 text-indigo-600" />
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

            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowCreateDoctor(true)}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Stethoscope className="w-5 h-5" />
                  Add Doctor
                </button>
                <button
                  onClick={() => setShowCreateBrand(true)}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Tag className="w-5 h-5" />
                  Add Brand
                </button>
                <button
                  onClick={() => setShowCreateProduct(true)}
                  className="btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Package className="w-5 h-5" />
                  Add Product
                </button>
              </div>
            </div>
          </div>
        );

      case 'managers':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowCreateManager(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Manager
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manager
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Representatives
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {managers.map((manager) => (
                    <tr key={manager.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <Users className="h-5 w-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {manager.full_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{manager.user?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {manager.representatives?.length || 0} reps
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(manager.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDeleteManager(manager.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {managers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No managers found. Create your first manager to get started.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'doctors':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
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

                  {doctor.workplaces && doctor.workplaces.length > 0 && (
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
            <div className="flex items-center justify-end">
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
                    Created: {new Date(brand.created_at).toLocaleDateString()}
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
            <div className="flex items-center justify-end">
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
                  
                  {product.priority_specializations && product.priority_specializations.length > 0 && (
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
                        📄 View PDF
                      </a>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(product.created_at).toLocaleDateString()}
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
                      Doctors ({clinic.doctors?.length || 0}):
                    </p>
                    {clinic.doctors && clinic.doctors.length > 0 ? (
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
                <p className="text-gray-500">No clinics found.</p>
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
            <h1 className="text-3xl font-bold text-gray-900">
              {activeTab === 'overview' && 'Super Admin Dashboard'}
              {activeTab === 'managers' && 'Manager Management'}
              {activeTab === 'doctors' && 'Doctor Management'}
              {activeTab === 'brands' && 'Brand Management'}
              {activeTab === 'products' && 'Product Management'}
              {activeTab === 'clinics' && 'Clinic Management'}
            </h1>
            <p className="mt-2 text-gray-600">
              {activeTab === 'overview' && 'BTK Loyalty Platform Management'}
              {activeTab === 'managers' && 'Manage platform managers and their access'}
              {activeTab === 'doctors' && 'Manage doctors, specializations, and workplaces'}
              {activeTab === 'brands' && 'Manage pharmaceutical brands'}
              {activeTab === 'products' && 'Manage products with specialization priorities'}
              {activeTab === 'clinics' && 'Manage clinics and doctor assignments'}
            </p>
          </div>
        </div>

        {/* Content */}
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

export default function SuperAdminDashboardSimple() {
  return (
    <Routes>
      <Route path="/" element={<SuperAdminDashboardHome />} />
      <Route path="/managers" element={<SuperAdminDashboardHome />} />
      <Route path="/doctors" element={<SuperAdminDashboardHome />} />
      <Route path="/brands" element={<SuperAdminDashboardHome />} />
      <Route path="/products" element={<SuperAdminDashboardHome />} />
      <Route path="/clinics" element={<SuperAdminDashboardHome />} />
      <Route path="/*" element={<SuperAdminDashboardHome />} />
    </Routes>
  );
}
