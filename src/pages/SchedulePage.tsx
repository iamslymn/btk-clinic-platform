
import { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, MapPin, User, Package, ChevronLeft, ChevronRight, Play, Square } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isBefore } from 'date-fns';
import { az } from 'date-fns/locale';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { assignmentService } from '../lib/services/assignment-service-simple';
import { getVisitHistory, startVisit, endVisit } from '../lib/api/visits';
import type { AssignmentListItem } from '../lib/services/assignment-service-simple';
import type { VisitLogWithDetails } from '../lib/api/visits';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { t } from '../lib/i18n';

export default function SchedulePage() {
  const { user, representative } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [visitLogs, setVisitLogs] = useState<VisitLogWithDetails[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Localized labels for display only
  const dayLabels = [
    t('representative.schedule.days.monday'),
    t('representative.schedule.days.tuesday'),
    t('representative.schedule.days.wednesday'),
    t('representative.schedule.days.thursday'),
    t('representative.schedule.days.friday'),
    t('representative.schedule.days.saturday'),
    t('representative.schedule.days.sunday')
  ];

  useEffect(() => {
    if (representative?.id) {
      loadScheduleData();
    } else if (user?.id && (user as any)?.role === 'rep') {
      loadScheduleDataDirectly(user.id);
    }
  }, [user, representative, currentWeek]);

  useEffect(() => {
    const todayIndex = weekDays.findIndex(date => isSameDay(date, new Date()));
    setSelectedDayIndex(todayIndex >= 0 ? todayIndex : 0);
  }, [currentWeek]);

  const loadScheduleData = async () => {
    if (!representative?.id) return;

    try {
      setLoading(true);
      const repId = representative.id;
      const [assignmentsData, logsData] = await Promise.all([
        assignmentService.getAssignmentsForRep(repId),
        getVisitHistory(repId, weekStart, weekEnd)
      ]);
      setAssignments(assignmentsData);
      setVisitLogs(logsData);

      // Mark missed only for past days (not today). New visits must remain UPCOMING/Planned
      const todayMidnight = new Date();
      todayMidnight.setHours(0,0,0,0);
      const toReviewDates = weekDays.filter(d => isBefore(d, todayMidnight));
      for (const date of toReviewDates) {
        const enDay = format(date, 'EEEE');
        const todaysAssignments = assignmentsData.filter(a => a.visit_days.includes(enDay));
        const dayLogs = logsData.filter(l => isSameDay(parseISO(l.scheduled_date), date));
        for (const a of todaysAssignments) {
          const existing = dayLogs.find(l => l.doctor_id === a.doctor_id);
          const isFinal = existing && (existing.status === 'completed' || existing.status === 'postponed');
          // For past days only: mark as missed if not completed/postponed
          if (!isFinal) {
            if (!existing) {
              await supabase.from('visit_logs').insert({
                rep_id: repId,
                doctor_id: a.doctor_id,
                scheduled_date: format(date, 'yyyy-MM-dd'),
                status: 'missed'
              });
            } else if (existing.status !== 'missed') {
              await supabase.from('visit_logs').update({ status: 'missed' }).eq('id', (existing as any).id);
            }
          }
        }
      }
      // Refresh logs after potential updates
      const { data: refreshedLogs } = await supabase
        .from('visit_logs')
        .select('*')
        .eq('rep_id', repId)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));
      if (refreshedLogs) setVisitLogs(refreshedLogs as any);
    } catch (error) {
      // optional structured logging could be added behind a flag
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleDataDirectly = async (userId: string) => {
    try {
      setLoading(true);
      // First, get the representative record directly
      const { data: repData, error: repError } = await supabase
        .from('representatives')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (repError) { return; }

      if (!repData) { return; }

      const [assignmentsData, logsData] = await Promise.all([
        assignmentService.getAssignmentsForRep(repData.id),
        getVisitHistory(repData.id, weekStart, weekEnd)
      ]);
      setAssignments(assignmentsData);
      setVisitLogs(logsData);
    } catch (error) {
      // optional structured logging could be added behind a flag
    } finally {
      setLoading(false);
    }
  };

  const handleStartVisit = async (doctorId: string, assignmentId: string) => {
    if (!representative?.id) return;

    try {
      setActionLoading(`start-${assignmentId}`);
      await startVisit(representative.id, doctorId);
      await loadScheduleData(); // Reload data
    } catch (error) {
      console.error('Error starting visit:', error);
      alert('Failed to start visit. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndVisit = async (visitId: string) => {
    try {
      setActionLoading(`end-${visitId}`);
      await endVisit(visitId);
      await loadScheduleData(); // Reload data
    } catch (error) {
      console.error('Error ending visit:', error);
      alert('Failed to end visit. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getScheduleForDay = (date: Date, dayName: string) => {
    // Respect finite recurrence window if defined on assignment.visit_goals
    const isWithinRecurrenceWindow = (assignment: AssignmentListItem, targetDate: Date): boolean => {
      const goals = (assignment as any).visit_goals as any[] | undefined;
      if (!goals || goals.length === 0) return true;
      const goal = goals[0] as any;
      const start = goal?.start_date ? new Date(goal.start_date) : null;
      const weeks = goal?.recurring_weeks !== undefined ? Number(goal.recurring_weeks) || 0 : null;
      if (!start || weeks === null) return true;
      const end = new Date(start);
      end.setDate(start.getDate() + weeks * 7);
      // Include if targetDate is within [start, end]
      return !(targetDate < start || targetDate > end);
    };

    const dayAssignments = assignments
      .filter(assignment => assignment.visit_days.includes(dayName))
      .filter(assignment => isWithinRecurrenceWindow(assignment, date));

    // Get visit logs for this specific date
    const dayLogs = visitLogs.filter(log => 
      isSameDay(parseISO(log.scheduled_date), date)
    );

    return dayAssignments.map(assignment => {
      const existingLog = dayLogs.find(log => log.doctor_id === assignment.doctor_id);
      return {
        assignment,
        visitLog: existingLog,
        canAct: isSameDay(date, new Date()) // Can only act on today
      };
    });
  };

  const weekSchedules = useMemo(() => {
    return weekDays.map((date) => {
      const enDayName = format(date, 'EEEE');
      return getScheduleForDay(date, enDayName);
    });
  }, [weekDays, assignments, visitLogs]);

  const selectedDaySchedule = weekSchedules[selectedDayIndex] || [];
  const selectedDate = weekDays[selectedDayIndex];

  const getVisitStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': // Bitmiş görüş
        return 'bg-green-100 text-green-800 border-green-200';
      case 'postponed': // Təxirə salındı
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'missed': // Tamamlanmamış görüş
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'postponed':
        return 'bg-yellow-100 text-yellow-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const statusLabelAz = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'Bitmiş görüş';
      case 'postponed':
        return 'Təxirə salındı';
      case 'missed':
        return 'Tamamlanmamış görüş';
      default:
        return 'Planlaşdırılıb';
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => addDays(prev, direction === 'next' ? 7 : -7));
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

  if (!representative) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Representative profile not found. Please contact your manager.</p>
          <div className="mt-4 text-sm text-gray-600">
            <p>Debug info:</p>
            <p>User ID: {user?.id}</p>
            <p>Representative Object: {representative ? 'Found' : 'Not Found'}</p>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900">{t('representative.schedule.title')}</h1>
            <p className="mt-2 text-gray-600">
              {t('representative.schedule.yourVisits')} {format(weekStart, 'd MMMM', { locale: az })} - {format(weekEnd, 'd MMMM yyyy', { locale: az })} {t('representative.schedule.weekRange')}
            </p>
          </div>
          
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
            >
              {t('representative.schedule.navigation.thisWeek')}
            </button>
            <button 
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekly Calendar Grid */}
        <div className="card">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weekDays.map((date, index) => {
              const daySchedule = weekSchedules[index] || [];
              const isToday = isSameDay(date, new Date());
              const isSelected = selectedDayIndex === index;

              return (
                <button
                  type="button"
                  key={date.toISOString()}
                  onClick={() => setSelectedDayIndex(index)}
                  className={`text-left p-4 rounded-lg border-2 transition-colors focus:outline-none ${
                    isSelected ? 'border-primary-300 bg-primary-50' : isToday ? 'border-primary-200 bg-primary-50/60' : 'border-gray-200'
                  }`}
                >
                  <div className="mb-3">
                    <h3 className={`font-semibold ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                      {dayLabels[index]}
                    </h3>
                    <p className={`text-sm ${isSelected ? 'text-primary-700' : 'text-gray-600'}`}>
                      {format(date, 'd MMMM', { locale: az })}
                    </p>
                  </div>

                  {daySchedule.length === 0 ? (
                    <p className="text-xs text-gray-500">{t('representative.schedule.noVisits')}</p>
                  ) : (
                    <div className="space-y-2">
                      {daySchedule.slice(0, 2).map(({ assignment, visitLog }) => (
                        <div key={`${assignment.id}-${index}`} className={`p-3 rounded-lg border text-xs ${getVisitStatusColor(visitLog?.status)}`}>
                          <p className="font-medium truncate">Dr. {assignment.doctor?.first_name} {assignment.doctor?.last_name}</p>
                          <p className="text-xs mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {assignment.start_time} - {assignment.end_time}
                          </p>
                        </div>
                      ))}
                      {daySchedule.length > 2 && (
                        <div className="text-xs text-primary-700 font-medium">
                          +{daySchedule.length - 2} {t('representative.schedule.moreMeetings')}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Day Schedule */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {`${dayLabels[selectedDayIndex]} üçün görüşlər`}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: az }) : ''}
              </p>
            </div>
          </div>

          {selectedDaySchedule.length === 0 ? (
            <p className="text-sm text-gray-500">{t('representative.schedule.noVisits')}</p>
          ) : (
            <div className="space-y-4">
              {selectedDaySchedule.map(({ assignment, visitLog, canAct }) => (
                <div key={`${assignment.id}-detail`} className={`p-4 border rounded-lg ${getVisitStatusColor(visitLog?.status)}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <User className="w-4 h-4" />
                        <span>Dr. {assignment.doctor?.first_name} {assignment.doctor?.last_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="w-4 h-4" />
                        <span>{assignment.start_time} - {assignment.end_time}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 mt-0.5" />
                        <span>{assignment.doctor?.address}</span>
                      </div>
                      {assignment.products && assignment.products.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-gray-700">
                          <Package className="w-3 h-3 mt-0.5" />
                          <div className="flex flex-wrap gap-1">
                            {assignment.products.map(product => (
                              <span key={product.id} className="px-2 py-0.5 bg-white bg-opacity-60 rounded">
                                {(product as any).product?.name || 'Məhsul'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full self-start md:self-end ${getStatusBadgeClass(visitLog?.status)}`}>
                        {statusLabelAz(visitLog?.status)}
                      </span>

                      {visitLog ? (
                        <div className="text-xs text-gray-700 space-y-1">
                          {visitLog.start_time && (
                            <p>
                              {t('representative.schedule.started')}: {format(new Date(visitLog.start_time), 'HH:mm')}
                              {visitLog.end_time && ` • ${t('representative.schedule.ended')}: ${format(new Date(visitLog.end_time), 'HH:mm')}`}
                            </p>
                          )}
                          {visitLog.postpone_reason && (
                            <p>{t('representative.schedule.reason')}: {visitLog.postpone_reason}</p>
                          )}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        {visitLog && canAct && visitLog.status === 'in_progress' && (
                          <button
                            onClick={() => visitLog.id && handleEndVisit(visitLog.id)}
                            disabled={actionLoading === `end-${visitLog.id}`}
                            className="btn-secondary text-xs"
                          >
                            {actionLoading === `end-${visitLog.id}` ? <LoadingSpinner size="sm" /> : t('representative.schedule.actions.endVisit')}
                          </button>
                        )}

                        {!visitLog && canAct && (
                          <button
                            onClick={() => handleStartVisit(assignment.doctor_id, assignment.id)}
                            disabled={actionLoading === `start-${assignment.id}`}
                            className="btn-primary text-xs flex items-center gap-1"
                          >
                            {actionLoading === `start-${assignment.id}` ? <LoadingSpinner size="sm" /> : <Play className="w-3 h-3" />}
                            {t('representative.schedule.actions.startVisit')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-600">
              {weekDays.reduce((total, date) => {
                const index = weekDays.findIndex(d => d === date);
                return total + (weekSchedules[index]?.length || 0);
              }, 0)}
            </p>
            <p className="text-sm text-gray-600">{t('representative.schedule.summary.visitsThisWeek')}</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">
              {visitLogs.filter(log => log.status === 'completed').length}
            </p>
            <p className="text-sm text-gray-600">{t('representative.schedule.summary.completed')}</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {visitLogs.filter(log => log.status === 'postponed').length}
            </p>
            <p className="text-sm text-gray-600">{t('representative.schedule.summary.postponed')}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}