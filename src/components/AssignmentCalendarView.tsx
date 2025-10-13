import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, User, Stethoscope, Package } from 'lucide-react';
import { assignmentService } from '../lib/services/assignment-service-simple';
import LoadingSpinner from './LoadingSpinner';

interface AssignmentCalendarViewProps {
  onClose: () => void;
}

// Helper function to get start of week (Sunday) - moved outside component
const getStartOfWeek = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day;
  return new Date(start.setDate(diff));
};

interface WeeklyAssignment {
  id: string;
  rep_id: string;
  doctor_id: string;
  visit_days: string[];
  start_time: string;
  end_time: string;
  doctor?: { first_name: string; last_name: string };
  representative?: { first_name: string; last_name: string };
  products?: any[];
  visit_goals?: any[];
  visit_day: string;
  assignment_date: string; // YYYY-MM-DD
}

export default function AssignmentCalendarView({ onClose }: AssignmentCalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(getStartOfWeek(new Date()));
  const [assignments, setAssignments] = useState<WeeklyAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWeeklyAssignments();
  }, [currentWeek]);

  const loadWeeklyAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all assignments with goals
      const assignmentsData = await assignmentService.getAllAssignments();
      
      // Convert assignments to weekly calendar format
      const weeklyAssignments: WeeklyAssignment[] = [];
      
      assignmentsData.forEach((assignment: any) => {
        // Filter by finite recurrence window if present
        const goal = assignment.visit_goals && assignment.visit_goals[0];
        let inWindow = true;
        if (goal && (goal as any).start_date && (goal as any).recurring_weeks) {
          const startDate = new Date((goal as any).start_date);
          const weeks = Number((goal as any).recurring_weeks) || 0;
          const windowEnd = new Date(startDate);
          windowEnd.setDate(windowEnd.getDate() + weeks * 7);
          const thisWeekEnd = new Date(currentWeek);
          thisWeekEnd.setDate(currentWeek.getDate() + 6);
          // Only include if the week intersects [startDate, windowEnd]
          inWindow = !(thisWeekEnd < startDate || currentWeek > windowEnd);
        }
        if (!inWindow) return;
        // For each visit_day in the assignment, create calendar entries for the current week
        if (assignment.visit_days && assignment.visit_days.length > 0) {
          assignment.visit_days.forEach((dayName: string) => {
            // Get the date for this day in the current week
            const assignmentDate = getDateForDayInWeek(currentWeek, dayName);
            
            weeklyAssignments.push({
              id: (assignment as any).id,
              rep_id: (assignment as any).rep_id,
              doctor_id: (assignment as any).doctor_id,
              visit_days: (assignment as any).visit_days || [],
              start_time: (assignment as any).start_time,
              end_time: (assignment as any).end_time,
              doctor: (assignment as any).doctor,
              representative: (assignment as any).representative,
              products: (assignment as any).products || [],
              visit_goals: (assignment as any).visit_goals || [],
              assignment_date: assignmentDate.toISOString().split('T')[0],
              visit_day: dayName
            });
          });
        }
      });
      
      setAssignments(weeklyAssignments);
    } catch (err: any) {
      setError('Failed to load weekly assignments: ' + err.message);
      console.error('Calendar load error:', err);
    } finally {
      setLoading(false);
    }
  };



  // Helper function to get the date for a specific day name in a given week
  const getDateForDayInWeek = (weekStart: Date, dayName: string): Date => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(dayName);
    
    if (targetDayIndex === -1) return weekStart; // Fallback
    
    const startOfWeek = getStartOfWeek(weekStart);
    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + targetDayIndex);
    
    return targetDate;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const getWeekDays = () => {
    const days = [];
    const startDate = getStartOfWeek(currentWeek);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getAssignmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return assignments.filter(assignment => {
      return assignment.assignment_date === dateStr;
    });
  };

  const weekDays = getWeekDays();
  const weekRange = `${currentWeek.toLocaleDateString('az-AZ', { month: 'long', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('az-AZ', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Assignment Calendar
            </h2>
            <div className="text-sm text-gray-600">{weekRange}</div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Loading weekly assignments...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-4 min-h-[500px]">
              {weekDays.map((day, dayIndex) => {
                const dayAssignments = getAssignmentsForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <div key={dayIndex} className="border border-gray-200 rounded-lg">
                    {/* Day Header */}
                    <div className={`p-3 border-b border-gray-200 ${
                      isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}>
                      <div className={`text-sm font-medium ${
                        isToday ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {day.toLocaleDateString('az-AZ', { weekday: 'long' })}
                      </div>
                      <div className={`text-lg font-bold ${
                        isToday ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {day.getDate()}
                      </div>
                    </div>

                    {/* Assignments */}
                    <div className="p-2 space-y-2">
                      {dayAssignments.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <div className="text-xs">No assignments</div>
                        </div>
                      ) : (
                        dayAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                          >
                            {/* Time removed: date-based display only */}

                            {/* Representative */}
                            <div className="flex items-center gap-1 text-xs text-blue-600 mb-1">
                              <User className="w-3 h-3" />
                              <span className="font-medium truncate">
                                {assignment.representative?.first_name} {assignment.representative?.last_name}
                              </span>
                            </div>

                            {/* Doctor */}
                            <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                              <Stethoscope className="w-3 h-3" />
                              <span className="font-medium truncate">
                                Dr. {assignment.doctor?.first_name} {assignment.doctor?.last_name}
                              </span>
                            </div>

                            {/* Products */}
                            {assignment.products && assignment.products.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-purple-600">
                                <Package className="w-3 h-3" />
                                <span className="truncate">
                                  {assignment.products.length} product{assignment.products.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}

                            {/* Weekly Tag if goal hints recurrence */}
                            {assignment.visit_goals && assignment.visit_goals.length > 0 && (
                              <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                🔄 Weekly
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {!loading && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Total assignments this week: {assignments.length}</span>
                <span>
                  Representatives: {new Set(assignments.map(a => a.rep_id)).size} • 
                  Doctors: {new Set(assignments.map(a => a.doctor_id)).size}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


