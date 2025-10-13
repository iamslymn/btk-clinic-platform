import React, { useState, useEffect } from 'react';
import { X, Clock, User, Stethoscope, Package, Check, Plus, FileText, ExternalLink } from 'lucide-react';
import { getMeetingById, getProductsForMeeting, addProductToMeeting, updateMeetingProduct, endMeeting } from '../lib/api/meetings';
import type { MeetingWithDetails, ProductWithDetails, MeetingProduct } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface MeetingFlowProps {
  meetingId: string;
  onClose: () => void;
  onMeetingEnd: () => void;
}

export default function MeetingFlow({ meetingId, onClose, onMeetingEnd }: MeetingFlowProps) {
  const [meeting, setMeeting] = useState<MeetingWithDetails | null>(null);
  const [priorityProducts, setPriorityProducts] = useState<ProductWithDetails[]>([]);
  const [otherProducts, setOtherProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [showEndMeetingModal, setShowEndMeetingModal] = useState(false);

  useEffect(() => {
    loadMeetingData();
  }, [meetingId]);

  const loadMeetingData = async () => {
    try {
      setLoading(true);
      setError('');

      const [meetingData, productsData] = await Promise.all([
        getMeetingById(meetingId),
        getProductsForMeeting(meetingId)
      ]);

      setMeeting(meetingData);
      setPriorityProducts(productsData.priorityProducts);
      setOtherProducts(productsData.otherProducts);
    } catch (err: any) {
      console.error('Error loading meeting data:', err);
      setError(err.message || 'Failed to load meeting data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productId: string) => {
    try {
      setActionLoading(`add-${productId}`);
      await addProductToMeeting(meetingId, {
        product_id: productId,
        discussed: true
      });
      await loadMeetingData();
    } catch (err: any) {
      console.error('Error adding product:', err);
      setError(err.message || 'Failed to add product to meeting');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateProduct = async (meetingProductId: string, discussed: boolean, notes?: string) => {
    try {
      setActionLoading(`update-${meetingProductId}`);
      await updateMeetingProduct(meetingProductId, { discussed, notes });
      await loadMeetingData();
    } catch (err: any) {
      console.error('Error updating product:', err);
      setError(err.message || 'Failed to update product');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndMeeting = async () => {
    try {
      setActionLoading('end-meeting');
      await endMeeting(meetingId, meetingNotes);
      setShowEndMeetingModal(false);
      onMeetingEnd();
      onClose();
    } catch (err: any) {
      console.error('Error ending meeting:', err);
      setError(err.message || 'Failed to end meeting');
    } finally {
      setActionLoading(null);
    }
  };

  const isProductDiscussed = (productId: string): MeetingProduct | null => {
    return meeting?.products.find(mp => mp.product.id === productId) || null;
  };

  const formatDuration = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <p className="text-red-600">Meeting not found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Meeting with Dr. {meeting.doctor.first_name} {meeting.doctor.last_name}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Stethoscope className="w-4 h-4" />
                  {meeting.doctor.specialization?.display_name}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(meeting.start_time!)} elapsed
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {meeting.assignment.clinic.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEndMeetingModal(true)}
                className="btn-primary"
              >
                End Meeting
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Products */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Priority Products for {meeting.doctor.specialization?.display_name}
                </h3>
                
                {priorityProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No priority products for this specialization
                  </p>
                ) : (
                  <div className="space-y-3">
                    {priorityProducts.map((product) => {
                      const discussedProduct = isProductDiscussed(product.id);
                      return (
                        <div key={product.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              <p className="text-sm text-blue-600 font-medium">{product.brand.name}</p>
                            </div>
                            {discussedProduct ? (
                              <div className="flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">Discussed</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddProduct(product.id)}
                                disabled={actionLoading === `add-${product.id}`}
                                className="btn-primary text-sm flex items-center gap-1"
                              >
                                {actionLoading === `add-${product.id}` ? (
                                  <LoadingSpinner size="xs" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                                Mark as Discussed
                              </button>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                          
                          {product.annotations && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                              <p className="text-xs text-gray-600">{product.annotations}</p>
                            </div>
                          )}

                          {product.pdf_url && (
                            <a
                              href={product.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <FileText className="w-3 h-3" />
                              View PDF
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Other Products */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-600" />
                  Other Available Products
                </h3>
                
                {otherProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No other products available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {otherProducts.map((product) => {
                      const discussedProduct = isProductDiscussed(product.id);
                      return (
                        <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              <p className="text-sm text-gray-600">{product.brand.name}</p>
                            </div>
                            {discussedProduct ? (
                              <div className="flex items-center gap-2">
                                <Check className="w-5 h-5 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">Discussed</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddProduct(product.id)}
                                disabled={actionLoading === `add-${product.id}`}
                                className="btn-secondary text-sm flex items-center gap-1"
                              >
                                {actionLoading === `add-${product.id}` ? (
                                  <LoadingSpinner size="xs" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                                Mark as Discussed
                              </button>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                          
                          {product.priority_specializations.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Priority for:</p>
                              <div className="flex flex-wrap gap-1">
                                {product.priority_specializations.map((spec) => (
                                  <span key={spec} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {product.annotations && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
                              <p className="text-xs text-gray-600">{product.annotations}</p>
                            </div>
                          )}

                          {product.pdf_url && (
                            <a
                              href={product.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <FileText className="w-3 h-3" />
                              View PDF
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Discussed Products Summary */}
            {meeting.products.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Products Discussed ({meeting.products.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {meeting.products.map((meetingProduct) => (
                    <div key={meetingProduct.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">{meetingProduct.product.name}</span>
                        <span className="text-sm text-gray-600">({meetingProduct.product.brand.name})</span>
                      </div>
                      {meetingProduct.notes && (
                        <p className="text-sm text-gray-600 ml-6">{meetingProduct.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* End Meeting Modal */}
      {showEndMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">End Meeting</h3>
              
              <div className="mb-4">
                <label className="form-label">Meeting Notes (Optional)</label>
                <textarea
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  rows={4}
                  className="form-input"
                  placeholder="Add any final notes about this meeting..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEndMeetingModal(false)}
                  className="btn-secondary"
                  disabled={actionLoading === 'end-meeting'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndMeeting}
                  className="btn-primary flex items-center gap-2"
                  disabled={actionLoading === 'end-meeting'}
                >
                  {actionLoading === 'end-meeting' ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Ending...
                    </>
                  ) : (
                    'End Meeting'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
