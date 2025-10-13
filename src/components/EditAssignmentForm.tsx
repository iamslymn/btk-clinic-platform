import React, { useMemo, useState } from 'react';
import { X, Clock, Calendar, Save } from 'lucide-react';
import type { AssignmentListItem } from '../lib/services/assignment-service-simple';
import LoadingSpinner from './LoadingSpinner';

interface EditAssignmentFormProps {
  assignment: AssignmentListItem & { visit_goals?: any[] };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAssignmentForm({ assignment, onClose, onSuccess }: EditAssignmentFormProps) {
  const weekDays = useMemo(() => [
    { value: 'Monday', label: 'Mon' },
    { value: 'Tuesday', label: 'Tue' },
    { value: 'Wednesday', label: 'Wed' },
    { value: 'Thursday', label: 'Thu' },
    { value: 'Friday', label: 'Fri' },
    { value: 'Saturday', label: 'Sat' },
    { value: 'Sunday', label: 'Sun' },
  ], []);

  const initialVisitsPerWeek = assignment.visit_goals && assignment.visit_goals.length > 0
    ? assignment.visit_goals[0].visits_per_week || 1
    : 1;

  const [visitDays, setVisitDays] = useState<string[]>(assignment.visit_days || []);
  const [startTime, setStartTime] = useState<string>(assignment.start_time || '09:00');
  const [endTime, setEndTime] = useState<string>(assignment.end_time || '10:00');
  const [visitsPerWeek, setVisitsPerWeek] = useState<number>(initialVisitsPerWeek);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleDay = (value: string) => {
    setVisitDays(prev => prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      // Prefer clean service update to avoid ES module mixing issues in assignments.ts
      const { assignmentService } = await import('../lib/services/assignment-service-simple');
      const updated = await assignmentService.createAssignment({
        rep_id: assignment.rep_id,
        doctor_id: assignment.doctor_id,
        visit_days: visitDays,
        start_time: startTime,
        end_time: endTime,
        product_ids: [],
      });

      // Upsert weekly goal if provided to keep dashboard counters accurate
      try {
        const { supabase } = await import('../lib/supabase');
        const { data: goal } = await supabase
          .from('visit_goals')
          .select('id')
          .eq('assignment_id', updated.id)
          .maybeSingle();
        if (goal) {
          await supabase
            .from('visit_goals')
            .update({ visits_per_week: visitsPerWeek })
            .eq('id', goal.id);
        } else {
          await supabase
            .from('visit_goals')
            .insert({ assignment_id: updated.id, visits_per_week: visitsPerWeek });
        }
      } catch {}
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to update assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Tapşırığı redaktə et</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="p-4 space-y-6">
          <div>
            <label className="form-label flex items-center gap-2"><Calendar className="w-4 h-4" /> Günü</label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${visitDays.includes(day.value) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label flex items-center gap-2"><Clock className="w-4 h-4" /> Başlama</label>
              <input type="time" className="form-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Bitiş</label>
              <input type="time" className="form-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Həftəlik təkrarlanma</label>
              <input type="number" min={0} max={20} className="form-input" value={visitsPerWeek} onChange={(e) => setVisitsPerWeek(parseInt(e.target.value || '0', 10))} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary">Ləğv et</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
            Yadda saxla
          </button>
        </div>
      </div>
    </div>
  );
}


