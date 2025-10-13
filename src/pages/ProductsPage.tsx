
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Package, Tag, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';
import { getProducts, deleteProduct, searchProducts } from '../lib/api/products';
import { getBrands } from '../lib/api/brands';
import type { Product, Brand } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { t } from '../lib/i18n';
import CreateProductForm from '../components/CreateProductForm';
import EditProductForm from '../components/EditProductForm';
import { useAuth } from '../hooks/useAuth';

export default function ProductsPage() {
  const { role } = useAuth();
  const [products, setProducts] = useState<(Product & { brand?: Brand })[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<(Product & { brand?: Brand }) | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBrandFilter, setSelectedBrandFilter] = useState(searchParams.get('brand') || '');
  const navigate = useNavigate();

  // legacy quick-create removed in favor of full modal

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-select brand if coming from brands page
    const brandId = searchParams.get('brand');
    if (brandId) {
      setSelectedBrandFilter(brandId);
      setNewProduct(prev => ({ ...prev, brand_id: brandId }));
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, brandsData] = await Promise.all([
        getProducts(),
        getBrands()
      ]);
      setProducts(productsData);
      setBrands(brandsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadData();
      return;
    }

    try {
      const data = await searchProducts(query);
      setProducts(data);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete ${productName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(productId);
      await deleteProduct(productId);
      await loadData(); // Reload the list
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.brand_id) return;

    try {
      setCreateLoading(true);
      await createProduct({
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        brand_id: newProduct.brand_id,
      });
      setNewProduct({ name: '', description: '', brand_id: selectedBrandFilter });
      setShowCreateForm(false);
      await loadData();
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Filter products by selected brand
  const filteredProducts = selectedBrandFilter 
    ? products.filter(p => p.brand_id === selectedBrandFilter)
    : products;

  const selectedBrand = brands.find(b => b.id === selectedBrandFilter);

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
          <div className="flex items-center gap-4">
            {selectedBrandFilter && (
              <button
                onClick={() => {
                  setSelectedBrandFilter('');
                  setSearchParams({});
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedBrand ? `${selectedBrand.name} ${t('nav.products')}` : t('pages.products.title')}
              </h1>
              <p className="mt-2 text-gray-600">
                {selectedBrand 
                  ? `${selectedBrand.name} üçün məhsulları idarə edin` 
                  : t('pages.products.subtitle')}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {role !== 'rep' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('pages.products.addProduct')}
              </button>
            )}
            <button
              onClick={() => navigate('/brands')}
              className="btn-secondary flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              Manage Brands
            </button>
          </div>
        </div>

        {/* Create Product Modal */}
        {showCreateModal && (
          <CreateProductForm onClose={() => setShowCreateModal(false)} onSuccess={loadData} />
        )}

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('pages.products.searchPlaceholder')}
                className="pl-10 form-input"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          
          {!selectedBrandFilter && (
            <div className="card">
              <select
                value={selectedBrandFilter}
                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                className="form-input"
              >
                <option value="">All brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>


        {/* Products List */}
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedBrand ? `${selectedBrand.name} Products` : 'All Products'}
            </h2>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Package className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery ? 'No products found' : selectedBrand ? `No products for ${selectedBrand.name} yet` : 'No products yet'}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : `Add your first ${selectedBrand ? selectedBrand.name : ''} product to start building your catalog`
                }
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  Add Your First Product
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {product.brand?.name || 'Unknown Brand'}
                            </span>
                            <span>Created {new Date(product.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {product.description && (
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {role !== 'rep' && (
                        <>
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={deleteLoading === product.id}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                            title="Delete product"
                          >
                            {deleteLoading === product.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* No brands warning */}
        {brands.length === 0 && (
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600">
                <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Brend Yoxdur</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Məhsul əlavə etməzdən əvvəl ən azı bir brend yaratmalısınız. 
                  <button 
                    onClick={() => navigate('/brands')}
                    className="ml-1 underline hover:no-underline"
                  >
                    İlk brendinizi yaradın
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={loadData}
        />
      )}
    </Layout>
  );
}