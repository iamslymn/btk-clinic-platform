import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { assignmentService, type AssignmentListItem } from '../lib/services/assignment-service-simple';
import { representativeService } from '../lib/services/data-services';
import type { SimpleRepresentative } from '../lib/data-access/interfaces';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function ManagerWeeklySchedule() {
  const [loading, setLoading] = useState(true);
  const [reps, setReps] = useState<SimpleRepresentative[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date()));
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i)), [currentWeek]);

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (selectedRepId) loadAssignmentsForRep(selectedRepId);
  }, [selectedRepId]);

  const loadBase = async () => {
    try {
      setLoading(true);
      const repsData = await representativeService.getAll();
      setReps(repsData);
      if (repsData.length > 0) {
        setSelectedRepId(repsData[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentsForRep = async (repId: string) => {
    setLoading(true);
    try {
      const data = await assignmentService.getAssignmentsForRep(repId);
      setAssignments(data);
    } finally {
      setLoading(false);
    }
  };

  const filterByDay = (dayIndex: number) => {
    const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const name = dayNames[dayIndex];
    return assignments.filter(a => a.visit_days.includes(name));
  };

  if (loading && reps.length === 0) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Weekly Schedule</h1>
            <p className="text-gray-600">View and edit representatives’ schedules</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentWeek(prev => addDays(prev, -7))} className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentWeek(startOfWeek(new Date()))} className="btn-secondary">This Week</button>
            <button onClick={() => setCurrentWeek(prev => addDays(prev, 7))} className="p-2 hover:bg-gray-100 rounded">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <label className="form-label">Representative</label>
            <select value={selectedRepId} onChange={e => setSelectedRepId(e.target.value)} className="form-input max-w-sm">
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((d, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-2">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-2">
                  {filterByDay(idx).length === 0 ? (
                    <div className="text-xs text-gray-400">No visits</div>
                  ) : (
                    filterByDay(idx).map(a => (
                      <div key={a.id} className="p-2 bg-gray-50 rounded border">
                        <div className="text-sm font-medium">Dr. {a.doctor?.first_name} {a.doctor?.last_name}</div>
                        <div className="text-xs text-gray-600">{a.start_time} - {a.end_time}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}


