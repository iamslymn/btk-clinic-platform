import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getBrandsForRepresentative } from '../lib/api/brands-enhanced';
import { getProductsByBrand } from '../lib/api/products-enhanced';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RepBrandsPage() {
  const { representative } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [lastViewedProductId, setLastViewedProductId] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('lastViewedProductId') : null
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        if (!representative?.id) return;
        const repBrands = await getBrandsForRepresentative(representative.id);
        setBrands(repBrands as any);
        if (repBrands.length > 0) {
          const first = repBrands[0].id;
          setSelectedBrandId(first);
          const list = await getProductsByBrand(first);
          setProducts(list);
        }
      } catch (e: any) {
        setError('Brendləri yükləmək mümkün olmadı');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [representative?.id]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedBrandId) return;
      try {
        setLoading(true);
        const list = await getProductsByBrand(selectedBrandId);
        setProducts(list);
      } catch (e: any) {
        setError('Məhsulları yükləmək mümkün olmadı');
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [selectedBrandId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p: any) =>
      (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const openPdf = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  const onView = (productId: string) => {
    try { localStorage.setItem('lastViewedProductId', productId); } catch {}
    setLastViewedProductId(productId);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brendlər → Məhsullar</h1>
          <p className="text-gray-600 mt-1">Nümayəndəyə təyin edilmiş brendlər və məhsullar</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Brands */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Brendlərim</h2>
              <div className="space-y-2">
                {brands.length === 0 && <p className="text-sm text-gray-500">Heç bir brend təyin olunmayıb</p>}
                {brands.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBrandId(b.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedBrandId === b.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="card lg:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Məhsullar</h2>
                <input
                  className="form-input sm:max-w-xs"
                  placeholder="Axtar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-500">Məhsul tapılmadı</p>
              ) : (
                <div className="space-y-3">
                  {filtered.map((p: any) => (
                    <div key={p.id} className={`border border-gray-200 rounded-lg p-4 ${lastViewedProductId === p.id ? 'bg-yellow-50' : 'bg-white'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{p.name}</div>
                          <div className="text-sm text-gray-500">{p.brand?.name}</div>
                        </div>
                        {p.pdf_url && (
                          <button
                            onClick={() => { onView(p.id); openPdf(p.pdf_url); }}
                            className="btn-secondary text-sm"
                          >
                            PDF aç
                          </button>
                        )}
                      </div>
                      {p.description && (
                        <p className="text-sm text-gray-700 mt-2">{p.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


