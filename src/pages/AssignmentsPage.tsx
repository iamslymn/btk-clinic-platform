import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Calendar, Target, Package, User, Stethoscope } from 'lucide-react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import AssignmentCalendarView from '../components/AssignmentCalendarView';
import AssignmentWizard from '../components/AssignmentWizard';
import EditAssignmentForm from '../components/EditAssignmentForm';
import { useAuth } from '../hooks/useAuth';
import { RoleBasedAccess } from '../components/RoleBasedAccess';
import { usePermissions } from '../lib/permissions';
import { t, toAzWeekday } from '../lib/i18n';

// NEW: Use simplified services instead of complex API calls
import { assignmentService, type AssignmentListItem } from '../lib/services/assignment-service-simple';
import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export default function AssignmentsPage() {
  const { role } = useAuth();
  const permissions = usePermissions(role);
  
  // NEW: Simplified state using clean types
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showRepSchedule, setShowRepSchedule] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editing, setEditing] = useState<AssignmentWithDetails | null>(null);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    assignmentsWithGoals: 0,
    activeReps: 0,
    assignedDoctors: 0,
  });

  // Weekly progress: key is `${rep_id}:${doctor_id}` -> completed count this week
  const [weeklyProgress, setWeeklyProgress] = useState<Record<string, number>>({});
  
  const navigate = useNavigate();

  const [newAssignment, setNewAssignment] = useState({
    rep_id: '',
    doctor_id: '',
    visit_days: [] as string[],
    start_time: '09:00',
    end_time: '10:00',
    product_ids: [] as string[],
    visits_per_week: 1,
  });

  const weekDays = [
    { value: 'Monday', label: 'Mon' },
    { value: 'Tuesday', label: 'Tue' },
    { value: 'Wednesday', label: 'Wed' },
    { value: 'Thursday', label: 'Thu' },
    { value: 'Friday', label: 'Fri' },
    { value: 'Saturday', label: 'Sat' },
    { value: 'Sunday', label: 'Sun' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Live update weekly progress when visits are logged
  useEffect(() => {
    const channel = supabase
      .channel('visit-logs-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'visit_logs' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visit_logs' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  // Data loading
  const loadData = async () => {
    try {
      setLoading(true);
      
      const [allAssignments, statsData] = await Promise.all([
        assignmentService.getAllAssignments(),
        assignmentService.getAssignmentStats()
      ]);
      
      setAssignments(allAssignments);
      setStats(statsData);

      // Compute weekly completed visits per assignment pair (rep, doctor)
      const repIds = Array.from(new Set(allAssignments.map(a => a.rep_id)));
      const doctorIds = Array.from(new Set(allAssignments.map(a => a.doctor_id)));
      if (repIds.length > 0 && doctorIds.length > 0) {
        const now = new Date();
        const ws = startOfWeek(now, { weekStartsOn: 1 });
        const we = endOfWeek(now, { weekStartsOn: 1 });
        const { data: logs } = await supabase
          .from('visit_logs')
          .select('rep_id, doctor_id, status, scheduled_date')
          .in('rep_id', repIds)
          .in('doctor_id', doctorIds)
          .gte('scheduled_date', format(ws, 'yyyy-MM-dd'))
          .lte('scheduled_date', format(we, 'yyyy-MM-dd'));
        const map: Record<string, number> = {};
        (logs || []).forEach(l => {
          if (l.status === 'completed') {
            const key = `${l.rep_id}:${l.doctor_id}`;
            map[key] = (map[key] || 0) + 1;
          }
        });
        setWeeklyProgress(map);
      } else {
        setWeeklyProgress({});
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      // Handle error gracefully
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async (assignmentId: string, doctorName: string, repName: string) => {
    if (!confirm(`Are you sure you want to delete the assignment between ${repName} and Dr. ${doctorName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(assignmentId);
      await assignmentService.deleteAssignment(assignmentId);
      await loadData(); // Reload the list
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // NOTE: Old form handlers removed - now using AssignmentWizard component

  // Filter assignments based on search
  const filteredAssignments = assignments.filter(assignment => {
    const query = searchQuery.toLowerCase();
    const doctorName = assignment.doctor 
      ? `${assignment.doctor.first_name} ${assignment.doctor.last_name}`.toLowerCase()
      : '';
    const repName = (assignment.representative as any)?.full_name?.toLowerCase?.() || '';
    const specialty = (assignment.doctor as any)?.specialty?.toLowerCase?.() || '';
    
    return doctorName.includes(query) || 
           repName.includes(query) ||
           specialty.includes(query);
  });

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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('pages.assignments.title')}</h1>
            <p className="mt-2 text-gray-600">
              {t('pages.assignments.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RoleBasedAccess permission="CREATE_ASSIGNMENT">
              <button
                onClick={() => setShowWizard(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('pages.assignments.newAssignment')}
              </button>
            </RoleBasedAccess>
          </div>
        </div>

        {/* NOTE: Old create form removed - now using AssignmentWizard component */}
        {false && (
          <div className="card bg-primary-50 border-primary-200">
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('pages.assignments.newAssignment')}</h3>
              
              {/* Rep and Doctor Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Representative</label>
                  {/* Old form removed - using AssignmentWizard instead */}
                </div>

                <div>
                  {/* Old form removed - using AssignmentWizard instead */}
                </div>
              </div>

              {/* Visit Days */}
              <div>
                <label className="form-label">Visit Days</label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleDayToggle(day.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newAssignment.visit_days.includes(day.value)
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    value={newAssignment.start_time}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, start_time: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Time</label>
                  <input
                    type="time"
                    value={newAssignment.end_time}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, end_time: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Visits per Week</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={newAssignment.visits_per_week}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, visits_per_week: parseInt(e.target.value) || 1 }))}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Products Selection */}
              <div>
                <label className="form-label">Products to Promote</label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                  {products.length === 0 ? (
                    <p className="text-gray-500 text-sm">No products available. Create products first.</p>
                  ) : (
                    products.map((product) => (
                      <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newAssignment.product_ids.includes(product.id)}
                          onChange={() => handleProductToggle(product.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">
                          {product.name} <span className="text-gray-500">({product.brand?.name})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={createLoading || !newAssignment.rep_id || !newAssignment.doctor_id || newAssignment.visit_days.length === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  {createLoading ? <LoadingSpinner size="sm" /> : <Plus className="w-4 h-4" />}
                  Create Assignment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewAssignment({
                      rep_id: '',
                      doctor_id: '',
                      visit_days: [],
                      start_time: '09:00',
                      end_time: '10:00',
                      product_ids: [],
                      visits_per_week: 1,
                    });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View Mode Toggle & Search */}
        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors bg-white text-gray-900 shadow-sm`}
              >
                {t('pages.assignments.allAssignments')}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCalendarView(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {t('pages.assignments.calendarView')}
              </button>
              <a href="/manager/weekly-schedule" className="btn-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Nümayəndə Cədvəli
              </a>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by representative, doctor, or specialty..."
              className="pl-10 form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.totalAssignments}</p>
            <p className="text-sm text-gray-600">Total Assignments</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">{stats.activeReps}</p>
            <p className="text-sm text-gray-600">Active Reps</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.assignedDoctors}</p>
            <p className="text-sm text-gray-600">Assigned Doctors</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.assignmentsWithGoals}</p>
            <p className="text-sm text-gray-600">With Goals</p>
          </div>
        </div>

        {/* Assignments List */}
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t('pages.assignments.allAssignments')}</h2>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Calendar className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery ? 'Tapşırıq tapılmadı' : t('pages.assignments.noAssignments')}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Create your first assignment to start scheduling representative visits'
                }
              </p>
              {!searchQuery && assignments.length === 0 && (
                <button
                  onClick={() => setShowWizard(true)}
                  className="btn-primary"
                >
                  Create Your First Assignment
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary-600" />
                          <span className="font-medium text-gray-900">
                            {assignment.representative?.full_name}
                          </span>
                        </div>
                        <div className="text-gray-400">→</div>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-900">
                            Dr. {assignment.doctor?.first_name} {assignment.doctor?.last_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({assignment.doctor?.specialty})
                          </span>
                        </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{assignment.visit_days.map((d: string) => toAzWeekday(d)).join(', ')}</span>
                        </div>
                        {/* Time removed */}
                        {assignment.visit_goals && assignment.visit_goals.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Target className="w-4 h-4" />
                            {(() => {
                              const goal = assignment.visit_goals![0]?.visits_per_week || 0;
                              const key = `${assignment.rep_id}:${assignment.doctor_id}`;
                              const done = weeklyProgress[key] || 0;
                              const remaining = Math.max(goal - done, 0);
                              return (
                                <span>
                                  Həftəlik: {goal} • Tamamlanan: {done} • Qalan: {remaining}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Products */}
                      {assignment.products && assignment.products.length > 0 && (
                        <div className="mt-3 flex items-start gap-2">
                          <Package className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="flex flex-wrap gap-2">
                            {assignment.products.map((productAssignment) => (
                              <span
                                key={productAssignment.id}
                                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                              >
                                {productAssignment.product?.name}
                                <span className="ml-1 text-blue-600">
                                  ({productAssignment.product?.brand?.name})
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditing(assignment)}
                        className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                        title="Edit assignment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(
                          assignment.id, 
                          `${assignment.doctor?.first_name} ${assignment.doctor?.last_name}`,
                          assignment.representative?.full_name || 'Unknown Rep'
                        )}
                        disabled={deleteLoading === assignment.id}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                        title="Delete assignment"
                      >
                        {deleteLoading === assignment.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NOTE: Prerequisites warning removed - handled by AssignmentWizard */}
      </div>

      {/* Assignment Calendar View */}
      {showCalendarView && (
        <AssignmentCalendarView
          onClose={() => setShowCalendarView(false)}
        />
      )}

      {/* Representative Schedule View */}
      {false && showRepSchedule && <></>}

      {/* New Assignment Wizard */}
      {showWizard && (
        <AssignmentWizard
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            loadData();
            setShowWizard(false);
          }}
        />
      )}

      {/* Edit Assignment Modal */}
      {editing && (
        <EditAssignmentForm
          assignment={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => loadData()}
        />
      )}
    </Layout>
  );
}