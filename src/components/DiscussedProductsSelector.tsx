/**
 * DiscussedProductsSelector Component
 * 
 * Allows representatives to select multiple products (drugs) that were discussed
 * during a doctor visit. Shows only products from the representative's assigned brands.
 * 
 * Features:
 * - Multi-selection with checkboxes
 * - Search and filter functionality
 * - Displays product name, dosage form, and brand
 * - Save/Cancel actions
 * - Fully localized in Azerbaijani
 */

import React, { useState, useEffect } from 'react';
import { Search, Check, X, Loader2, Package } from 'lucide-react';
import { t } from '../lib/i18n';
import {
  getAvailableProductsForRep,
  getDiscussedProductIds,
  updateDiscussedProducts
} from '../lib/api/discussed-products';
import type { ProductForSelection } from '../lib/api/discussed-products';

interface DiscussedProductsSelectorProps {
  visitId: string;
  representativeId: string;
  onSave?: () => void;
  onCancel?: () => void;
  readOnly?: boolean; // For completed visits
}

export const DiscussedProductsSelector: React.FC<DiscussedProductsSelectorProps> = ({
  visitId,
  representativeId,
  onSave,
  onCancel,
  readOnly = false
}) => {
  const [products, setProducts] = useState<ProductForSelection[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available products and current selections
  useEffect(() => {
    loadData();
  }, [visitId, representativeId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load available products for this rep
      const availableProducts = await getAvailableProductsForRep(representativeId);
      setProducts(availableProducts);

      // Load already selected products for this visit
      const selectedIds = await getDiscussedProductIds(visitId);
      setSelectedProductIds(selectedIds);
    } catch (err: any) {
      console.error('Error loading discussed products data:', err);
      setError(err.message || 'Məlumat yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  // Filter products by search query
  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.brand_name.toLowerCase().includes(query) ||
      (product.description && product.description.toLowerCase().includes(query))
    );
  });

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    if (readOnly) return;
    
    setSelectedProductIds(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  // Select all filtered products
  const selectAll = () => {
    if (readOnly) return;
    const allIds = filteredProducts.map(p => p.id);
    setSelectedProductIds(prev => {
      const newSet = new Set([...prev, ...allIds]);
      return Array.from(newSet);
    });
  };

  // Clear all selections
  const clearAll = () => {
    if (readOnly) return;
    setSelectedProductIds([]);
  };

  // Save selections to database
  const handleSave = async () => {
    if (readOnly) return;

    setSaving(true);
    setError(null);
    try {
      await updateDiscussedProducts(visitId, selectedProductIds);
      if (onSave) {
        onSave();
      }
    } catch (err: any) {
      console.error('Error saving discussed products:', err);
      setError(t('representative.dashboard.discussedProducts.errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">
          {t('representative.dashboard.discussedProducts.loadingProducts')}
        </span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          {t('representative.dashboard.discussedProducts.noProductsAvailable')}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {t('representative.dashboard.discussedProducts.noBrands')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('representative.dashboard.discussedProducts.title')}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {t('representative.dashboard.discussedProducts.selectProducts')}
          {' '}
          {selectedProductIds.length > 0 && (
            <span className="font-medium text-blue-600">
              ({selectedProductIds.length} {t('representative.dashboard.discussedProducts.selected')})
            </span>
          )}
        </p>
      </div>

      {/* Search and Actions */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('representative.dashboard.discussedProducts.search')}
              disabled={readOnly}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Quick Actions */}
          {!readOnly && (
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={filteredProducts.length === 0}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('representative.dashboard.discussedProducts.selectAll')}
              </button>
              <button
                onClick={clearAll}
                disabled={selectedProductIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-300 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('representative.dashboard.discussedProducts.clear')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('representative.dashboard.discussedProducts.noData')}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredProducts.map((product) => {
              const isSelected = selectedProductIds.includes(product.id);
              
              return (
                <li
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition ${
                    readOnly ? 'cursor-default' : ''
                  } ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center">
                    {/* Checkbox */}
                    <div
                      className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center mr-4 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-blue-600 font-medium">
                          {product.brand_name}
                        </span>
                        {product.description && (
                          <span className="text-xs text-gray-500 truncate">
                            {product.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Footer Actions */}
      {!readOnly && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('representative.dashboard.discussedProducts.cancel')}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('representative.dashboard.discussedProducts.saving')}
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {t('representative.dashboard.discussedProducts.save')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Read-only notice */}
      {readOnly && (
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Bu görüş tamamlanıb. Məhsullar dəyişdirilə bilməz.
          </p>
        </div>
      )}
    </div>
  );
};

export default DiscussedProductsSelector;

