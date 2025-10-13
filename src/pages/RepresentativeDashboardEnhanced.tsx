import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Package, Play, Square, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getAssignmentsWithDetails } from '../lib/api/assignments-quiet';
import { getActiveMeetingsForRepresentative, getMeetingsForRepresentative, postponeMeeting } from '../lib/api/meetings';
import { getProductsForRepresentative, getProducts } from '../lib/api/products-enhanced';
import { startMeeting, endMeeting } from '../lib/api/meetings';
import type { 
  AssignmentWithDetails, 
  MeetingWithDetails, 
  ProductWithDetails,
  RepresentativeDashboardData 
} from '../types';

export default function RepresentativeDashboardEnhanced() {
  const { user, representative } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<RepresentativeDashboardData | null>(null);
  const [allProducts, setAllProducts] = useState<ProductWithDetails[]>([]);
  const [activeProductTab, setActiveProductTab] = useState<'my' | 'all'>('my');
  const [productModal, setProductModal] = useState<ProductWithDetails | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [postponeNote, setPostponeNote] = useState('');
  const [postponeMeetingId, setPostponeMeetingId] = useState<string | null>(null);

  useEffect(() => {
    if (representative?.id) {
      loadDashboardData();
    }
  }, [representative?.id]);

  const loadDashboardData = async () => {
    if (!representative?.id) return;

    try {
      setLoading(true);
      setError('');

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Load all data in parallel
      const [assignmentsData, activeMeetingsData, allMeetingsData, productsData, allProductsData] = await Promise.all([
        getAssignmentsWithDetails().then(assignments => 
          assignments.filter(a => 
            a.representative_id === representative.id && 
            a.assigned_date === today
          )
        ),
        getActiveMeetingsForRepresentative(representative.id),
        getMeetingsForRepresentative(representative.id),
        getProductsForRepresentative(representative.id),
        getProducts()
      ]);

      // Calculate stats
      const todayMeetings = allMeetingsData.filter(m => 
        m.start_time && new Date(m.start_time).toDateString() === new Date().toDateString()
      ).length;

      const completedMeetings = allMeetingsData.filter(m => m.status === 'completed').length;

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weeklyMeetings = allMeetingsData.filter(m => 
        m.start_time && new Date(m.start_time) >= weekStart
      ).length;

      const monthStart = new Date();
      monthStart.setDate(1);
      const monthlyMeetings = allMeetingsData.filter(m => 
        m.start_time && new Date(m.start_time) >= monthStart
      ).length;

      setDashboardData({
        todayAssignments: assignmentsData,
        activeMeetings: activeMeetingsData,
        availableProducts: productsData,
        stats: {
          todayMeetings,
          completedMeetings,
          weeklyMeetings,
          monthlyMeetings
        }
      });
      setAllProducts(allProductsData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMeeting = async (assignmentId: string, doctorId: string) => {
    try {
      setActionLoading(`start-${assignmentId}-${doctorId}`);
      await startMeeting(assignmentId, doctorId);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error starting meeting:', err);
      setError(err.message || 'Failed to start meeting');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndMeeting = async (meetingId: string) => {
    try {
      setActionLoading(`end-${meetingId}`);
      await endMeeting(meetingId);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error ending meeting:', err);
      setError(err.message || 'Failed to end meeting');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostponeMeeting = async () => {
    if (!postponeMeetingId) return;
    try {
      setActionLoading(`postpone-${postponeMeetingId}`);
      await postponeMeeting(postponeMeetingId, postponeNote || 'Reason not provided');
      setPostponeMeetingId(null);
      setPostponeNote('');
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error postponing meeting:', err);
      setError(err.message || 'Failed to postpone meeting');
    } finally {
      setActionLoading(null);
    }
  };

  if (!representative) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Representative profile not found. Please contact your manager.</p>
          <div className="mt-4 text-sm text-gray-600">
            <p>Debug info:</p>
            <p>User ID: {user?.id}</p>
            <p>User Email: {user?.email}</p>
            <p>Representative Object: {representative ? 'Found' : 'Not Found'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {representative.first_name} {representative.last_name}!
          </h1>
          <p className="text-gray-600 mt-1">Here's your schedule and activities for today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Today's Meetings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {dashboardData.stats.todayMeetings}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {dashboardData.stats.completedMeetings}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">This Week</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {dashboardData.stats.weeklyMeetings}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Products</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {dashboardData.availableProducts.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Assignments */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Today's Assignments</h2>
            </div>
            <div className="p-6">
              {dashboardData?.todayAssignments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No assignments for today</p>
              ) : (
                <div className="space-y-4">
                  {dashboardData?.todayAssignments.map((assignment) => (
                    <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{assignment.clinic.name}</h3>
                        <span className="text-sm text-gray-500">{assignment.assigned_date}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{assignment.clinic.address}</p>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Doctors to visit:</h4>
                        {assignment.doctors.map((assignmentDoctor) => (
                          <div key={assignmentDoctor.doctor.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                            <div>
                              <p className="text-sm font-medium">
                                Dr. {assignmentDoctor.doctor.first_name} {assignmentDoctor.doctor.last_name}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">
                                {assignmentDoctor.doctor.specialization?.display_name}
                              </p>
                            </div>
                      <button
                              onClick={() => handleStartMeeting(assignment.id, assignmentDoctor.doctor.id)}
                              disabled={actionLoading === `start-${assignment.id}-${assignmentDoctor.doctor.id}`}
                              className="btn-primary text-xs flex items-center gap-1"
                            >
                      <button
                        onClick={() => setPostponeMeetingId(assignment.id)}
                        className="btn-secondary text-xs ml-2"
                      >
                        Postpone
                      </button>
                              {actionLoading === `start-${assignment.id}-${assignmentDoctor.doctor.id}` ? (
                                <LoadingSpinner size="xs" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Start Meeting
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Meetings */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Active Meetings</h2>
            </div>
            <div className="p-6">
              {dashboardData?.activeMeetings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No active meetings</p>
              ) : (
                <div className="space-y-4">
                  {dashboardData?.activeMeetings.map((meeting) => (
                    <div key={meeting.id} className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          Dr. {meeting.doctor.first_name} {meeting.doctor.last_name}
                        </h3>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          In Progress
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 capitalize">{meeting.doctor.specialization?.display_name}</p>
                      <p className="text-xs text-gray-500 mb-3">
                        Started: {new Date(meeting.start_time!).toLocaleTimeString()}
                      </p>
                      
                      <button
                        onClick={() => handleEndMeeting(meeting.id)}
                        disabled={actionLoading === `end-${meeting.id}`}
                        className="btn-secondary text-xs flex items-center gap-1 w-full justify-center"
                      >
                        {actionLoading === `end-${meeting.id}` ? (
                          <LoadingSpinner size="xs" />
                        ) : (
                          <Square className="w-3 h-3" />
                        )}
                        End Meeting
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <button
                className={`px-3 py-1 rounded text-sm ${activeProductTab === 'my' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveProductTab('my')}
              >
                My Products
              </button>
              <button
                className={`px-3 py-1 rounded text-sm ${activeProductTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                onClick={() => setActiveProductTab('all')}
              >
                All Products
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeProductTab === 'my' ? (dashboardData?.availableProducts || []) : allProducts).map((product) => (
                <button key={product.id} onClick={() => setProductModal(product)} className="text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {product.brand.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {productModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setProductModal(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{productModal.name}</h3>
                <button onClick={() => setProductModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="text-sm text-gray-700 mb-3">{productModal.description || 'No description'}</div>
              <div className="text-xs text-gray-500 mb-3">Brand: {productModal.brand.name}</div>
              {productModal.priority_specializations.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Priority for:</p>
                  <div className="flex flex-wrap gap-1">
                    {productModal.priority_specializations.map(spec => (
                      <span key={spec} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded capitalize">{spec}</span>
                    ))}
                  </div>
                </div>
              )}
              {productModal.pdf_url && (
                <a href={productModal.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                  <FileText className="w-4 h-4" /> View PDF <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Postpone Modal */}
      {postponeMeetingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Görüşü təxirə sal</h3>
              <label className="form-label">Səbəb</label>
              <textarea
                className="form-input"
                rows={4}
                value={postponeNote}
                onChange={(e) => setPostponeNote(e.target.value)}
                placeholder="Səbəbi daxil edin..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <button className="btn-secondary" onClick={() => setPostponeMeetingId(null)}>Ləğv et</button>
                <button className="btn-primary" disabled={actionLoading === `postpone-${postponeMeetingId}`} onClick={handlePostponeMeeting}>
                  {actionLoading === `postpone-${postponeMeetingId}` ? 'Göndərilir...' : 'Təxirə sal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
