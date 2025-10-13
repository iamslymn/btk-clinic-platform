import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Calendar, Target, Package, User, Stethoscope, CalendarDays } from 'lucide-react';
import Layout from '../components/Layout';
import CalendarAssignmentForm from '../components/CalendarAssignmentForm';
import AssignmentCalendarView from '../components/AssignmentCalendarView';
import AssignmentWizard from '../components/AssignmentWizard';
import { useAuth } from '../hooks/useAuth';
import { RoleBasedAccess } from '../components/RoleBasedAccess';
import { usePermissions } from '../lib/permissions';
import LoadingSpinner from '../components/LoadingSpinner';

// NEW: Use the simplified service layer instead of complex Supabase queries
import { assignmentService, type AssignmentListItem } from '../lib/services/assignment-service-simple';
import { dataAccess } from '../lib/data-access/config';

export default function AssignmentsPageSimple() {
  const { role } = useAuth();
  const permissions = usePermissions(role);
  
  // Simplified state - no complex types with deep nesting
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [recurringAssignments, setRecurringAssignments] = useState<AssignmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'recurring'>('all');
  const [stats, setStats] = useState({
    totalAssignments: 0,
    assignmentsWithGoals: 0,
    activeReps: 0,
    assignedDoctors: 0,
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // NEW: Simplified data loading using service layer
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Simple, parallel service calls instead of complex nested queries
      const [
        allAssignments,
        recurringData,
        statsData
      ] = await Promise.all([
        assignmentService.getAllAssignments(),
        assignmentService.getRecurringAssignments(),
        assignmentService.getAssignmentStats()
      ]);
      
      setAssignments(allAssignments);
      setRecurringAssignments(recurringData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading assignments:', error);
      // Handle error gracefully
      setAssignments([]);
      setRecurringAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Simplified delete handlers using service layer
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

  const handleDeleteRecurringAssignment = async (parentId: string) => {
    if (!confirm('Are you sure you want to delete this entire recurring assignment series? This will delete all future occurrences.')) {
      return;
    }

    try {
      setDeleteLoading(parentId);
      await assignmentService.deleteRecurringAssignments(parentId);
      await loadData();
    } catch (error) {
      console.error('Error deleting recurring assignment:', error);
      alert('Failed to delete recurring assignment series.');
    } finally {
      setDeleteLoading(null);
    }
  };

  // NEW: Simplified filtering - no complex nested property access
  const assignmentsToFilter = viewMode === 'recurring' ? recurringAssignments : assignments;
  const filteredAssignments = assignmentsToFilter.filter(assignment => {
    const query = searchQuery.toLowerCase();
    const doctorName = assignment.doctor 
      ? `${assignment.doctor.first_name} ${assignment.doctor.last_name}`.toLowerCase()
      : '';
    const repName = assignment.representative?.full_name?.toLowerCase() || '';
    const specialty = assignment.doctor?.specialty?.toLowerCase() || '';
    
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
            <h1 className="text-3xl font-bold text-gray-900">Visit Assignments</h1>
            <p className="mt-2 text-gray-600">
              Assign doctors to representatives with schedules and product promotions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <RoleBasedAccess permission="CREATE_ASSIGNMENT">
              <button
                onClick={() => setShowWizard(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Assignment
              </button>
            </RoleBasedAccess>
            
            <RoleBasedAccess permission="CREATE_ASSIGNMENT">
              <button
                onClick={() => setShowCalendarForm(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                Weekly Recurring
              </button>
            </RoleBasedAccess>
          </div>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="card">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Assignments
              </button>
              <button
                onClick={() => setViewMode('recurring')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'recurring'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Weekly Series
              </button>
            </div>
            
            <button
              onClick={() => setShowCalendarView(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Calendar View
            </button>
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
            <p className="text-2xl font-bold text-green-600">{stats.assignmentsWithGoals}</p>
            <p className="text-sm text-gray-600">With Goals</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.activeReps}</p>
            <p className="text-sm text-gray-600">Active Reps</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.assignedDoctors}</p>
            <p className="text-sm text-gray-600">Assigned Doctors</p>
          </div>
        </div>

        {/* Assignments List */}
        <div className="card">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No assignments found matching your search.' : 'No assignments found.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAssignments.map((assignment) => (
                <div key={assignment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        {/* Representative Info */}
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            {assignment.representative?.full_name || 'Unknown Rep'}
                          </span>
                        </div>

                        {/* Doctor Info */}
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">
                            Dr. {assignment.doctor?.first_name} {assignment.doctor?.last_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({assignment.doctor?.specialty})
                          </span>
                        </div>

                        {/* Time removed */}

                        {/* Products Count */}
                        {assignment.products && assignment.products.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-gray-600">
                              {assignment.products.length} product{assignment.products.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {/* Recurring Indicator */}
                        {assignment.recurring_type && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            🔄 Recurring
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      {assignment.doctor?.address && (
                        <p className="text-sm text-gray-500 mt-2">
                          📍 {assignment.doctor.address}
                        </p>
                      )}

                      {/* Notes */}
                      {assignment.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          "{assignment.notes}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <RoleBasedAccess permission="DELETE_ASSIGNMENT">
                        <button
                          onClick={() => {
                            const doctorName = `${assignment.doctor?.first_name} ${assignment.doctor?.last_name}`;
                            const repName = assignment.representative?.full_name || 'Unknown';
                            
                            if (assignment.recurring_type && !assignment.recurring_type) {
                              handleDeleteRecurringAssignment(assignment.id);
                            } else {
                              handleDelete(assignment.id, doctorName, repName);
                            }
                          }}
                          disabled={deleteLoading === assignment.id}
                          className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                          title="Delete assignment"
                        >
                          {deleteLoading === assignment.id ? (
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

      {/* Calendar Assignment Form */}
      {showCalendarForm && (
        <CalendarAssignmentForm
          onClose={() => setShowCalendarForm(false)}
          onSuccess={() => {
            loadData();
            setShowCalendarForm(false);
          }}
        />
      )}

      {/* Assignment Calendar View */}
      {showCalendarView && (
        <AssignmentCalendarView
          onClose={() => setShowCalendarView(false)}
        />
      )}

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
    </Layout>
  );
}
