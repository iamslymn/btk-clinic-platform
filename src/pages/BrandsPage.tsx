
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Package, Tag } from 'lucide-react';
import Layout from '../components/Layout';
import { getBrands, deleteBrand, searchBrands } from '../lib/api/brands';
import { getProductsByBrand } from '../lib/api/products';
import type { Brand } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { RoleBasedAccess, ReadOnlyWarning } from '../components/RoleBasedAccess';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../lib/permissions';
import { t } from '../lib/i18n';

export default function BrandsPage() {
  const [brands, setBrands] = useState<(Brand & { productCount?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();
  const permissions = usePermissions(role);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const data = await getBrands();
      
      // Get product counts for each brand
      const brandsWithCounts = await Promise.all(
        data.map(async (brand) => {
          try {
            const products = await getProductsByBrand(brand.id);
            return { ...brand, productCount: products.length };
          } catch (error) {
            return { ...brand, productCount: 0 };
          }
        })
      );
      
      setBrands(brandsWithCounts);
    } catch (error) {
      console.error('Error loading brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadBrands();
      return;
    }

    try {
      const data = await searchBrands(query);
      setBrands(data.map(brand => ({ ...brand, productCount: 0 })));
    } catch (error) {
      console.error('Error searching brands:', error);
    }
  };

  const handleDelete = async (brandId: string, brandName: string) => {
    if (!confirm(`Are you sure you want to delete ${brandName}? This will also delete all associated products and cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(brandId);
      await deleteBrand(brandId);
      await loadBrands(); // Reload the list
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Failed to delete brand. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    try {
      setCreateLoading(true);
      const { createBrand } = await import('../lib/api/brands');
      await createBrand({ name: newBrandName.trim() });
      setNewBrandName('');
      setShowCreateForm(false);
      await loadBrands();
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('Failed to create brand. Please try again.');
    } finally {
      setCreateLoading(false);
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Role-based Access Warning */}
        {permissions.hasReadOnlyBrands && (
          <ReadOnlyWarning resource="brands" />
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('pages.brands.title')}</h1>
            <p className="mt-2 text-gray-600">
              {t('pages.brands.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <RoleBasedAccess permission="CREATE_BRAND">
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('pages.brands.addBrand')}
              </button>
            </RoleBasedAccess>
            
            <button
              onClick={() => navigate('/products')}
              className="btn-secondary flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              {t('pages.products.title')}
            </button>
          </div>
        </div>

        {/* Quick Create Form */}
        {showCreateForm && (
          <div className="card bg-primary-50 border-primary-200">
            <form onSubmit={handleCreateBrand} className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="form-label">{t('pages.brands.brandName')}</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="form-input"
                  placeholder="məs., Heel, Sanum, Pfizer"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createLoading || !newBrandName.trim()}
                  className="btn-primary flex items-center gap-2"
                >
                  {createLoading ? <LoadingSpinner size="sm" /> : <Plus className="w-4 h-4" />}
                  {t('actions.create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBrandName('');
                  }}
                  className="btn-secondary"
                >
                  {t('actions.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('pages.brands.searchPlaceholder')}
              className="pl-10 form-input"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-600">{brands.length}</p>
            <p className="text-sm text-gray-600">{t('pages.brands.totalBrands')}</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">
              {brands.reduce((sum, brand) => sum + (brand.productCount || 0), 0)}
            </p>
            <p className="text-sm text-gray-600">{t('pages.products.totalProducts')}</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">
              {brands.filter(b => (b.productCount || 0) > 0).length}
            </p>
            <p className="text-sm text-gray-600">{t('pages.brands.activeBrands')}</p>
          </div>
        </div>

        {/* Brands List */}
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Brands</h2>
          </div>

          {brands.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Tag className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery ? 'Brend tapılmadı' : t('pages.brands.noBrands')}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {searchQuery 
                  ? 'Axtarış şərtlərini dəyişib yenidən cəhd edin' 
                  : 'Kataloqunuzu qurmağa başlamaq üçün ilk əczaçılıq brendinizi əlavə edin'
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  Add Your First Brand
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Tag className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {brand.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{brand.productCount || 0} məhsul</span>
                            <span>Yaradılıb {new Date(brand.created_at).toLocaleDateString('az-AZ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/products?brand=${brand.id}`)}
                        className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                        title="View products"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      <RoleBasedAccess permission="EDIT_BRAND">
                        <button
                          onClick={() => navigate(`/brands/${brand.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                          title="Edit brand"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </RoleBasedAccess>
                      
                      <RoleBasedAccess permission="DELETE_BRAND">
                        <button
                          onClick={() => handleDelete(brand.id, brand.name)}
                          disabled={deleteLoading === brand.id}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          title="Delete brand"
                        >
                          {deleteLoading === brand.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </RoleBasedAccess>
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