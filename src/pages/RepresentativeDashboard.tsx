import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, CheckCircle, XCircle, AlertCircle, Play, Square, User, Package, Eye, Timer } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { assignmentService } from '../lib/services/assignment-service-simple';
import type { AssignmentListItem } from '../lib/services/assignment-service-simple';
import { format } from 'date-fns';
import { az } from 'date-fns/locale';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import { startVisit, endVisit, addRoutePoints, createInstantVisit, hasActiveVisit } from '../lib/api/visits';
import { t, toAzWeekday } from '../lib/i18n';

export default function RepresentativeDashboard() {
  const { user, representative } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<{
    assignmentId: string;
    doctorId: string;
    visitLogId?: string;
    startTime: Date;
    elapsed: number;
    doctorName?: string;
  } | null>(null);
  const [meetingInterval, setMeetingInterval] = useState<NodeJS.Timeout | null>(null);
  const [productModal, setProductModal] = useState<{assignment: AssignmentListItem} | null>(null);
  const [stats, setStats] = useState({
    totalAssignments: 0,
    todayAssignments: 0,
    activeMeetings: 0,
    completedVisits: 0,
    postponedVisits: 0,
  });
  const [completedToday, setCompletedToday] = useState<{
    id: string;
    doctorId: string;
    doctorName: string;
    durationMinutes: number;
  }[]>([]);
  const [todayLogs, setTodayLogs] = useState<{ doctor_id: string; status: string; start_time?: string; end_time?: string; id?: string }[]>([]);
  const [todayCompletedDoctorIds, setTodayCompletedDoctorIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [postponeOpen, setPostponeOpen] = useState<null | { assignment: AssignmentListItem }>(null);
  const [postponeReason, setPostponeReason] = useState('');
  const [instantOpen, setInstantOpen] = useState(false);
  const [instantDoctors, setInstantDoctors] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantClinics, setInstantClinics] = useState<{ id: string; name: string }[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [geoWatchId, setGeoWatchId] = useState<number | null>(null);
  const routeBufferRef = useRef<{ lat: number; lng: number; recorded_at: string }[]>([]);
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFlushRef = useRef<number>(0);

  useEffect(() => {
    if (representative?.id) {
      loadDashboardData();
    } else {
      if (user?.id && (user as any)?.role === 'rep') {
        loadDashboardDataDirectly(user.id);
      }
    }
  }, [user, representative]);

  useEffect(() => {
    // Resume tracking if there is an active meeting in storage (verify with backend)
    (async () => {
      const stored = localStorage.getItem('activeMeeting');
      if (!activeMeeting && stored && representative?.id) {
        try {
          const parsed = JSON.parse(stored);
          const exists = await hasActiveVisit(representative.id);
          if (exists && parsed && parsed.assignmentId && parsed.startTime) {
            // Ensure doctorName is populated
            let doctorName: string | undefined = parsed.doctorName;
            if (!doctorName && parsed.doctorId) {
              try {
                const { data: d } = await supabase
                  .from('doctors')
                  .select('first_name,last_name')
                  .eq('id', parsed.doctorId)
                  .single();
                if (d) doctorName = `Dr. ${d.first_name} ${d.last_name}`;
              } catch {}
            }
            setActiveMeeting({
              assignmentId: parsed.assignmentId,
              doctorId: parsed.doctorId,
              visitLogId: parsed.visitLogId,
              startTime: new Date(parsed.startTime),
              elapsed: Math.floor((Date.now() - new Date(parsed.startTime).getTime()) / 1000),
              doctorName,
            });
            // Restart geolocation watcher
            startGeoTracking(parsed.visitLogId);
          } else {
            // Clear stale local state if backend has no active visit
            localStorage.removeItem('activeMeeting');
          }
        } catch {
          // Defensive: clear corrupted entries
          localStorage.removeItem('activeMeeting');
        }
      }
    })();
  }, [representative?.id]);

  // Timer effect for active meeting
  useEffect(() => {
    if (activeMeeting) {
      const interval = setInterval(() => {
        setActiveMeeting(prev => prev ? {
          ...prev,
          elapsed: Math.floor((new Date().getTime() - prev.startTime.getTime()) / 1000)
        } : null);
      }, 1000);
      setMeetingInterval(interval);

      return () => {
        clearInterval(interval);
        setMeetingInterval(null);
      };
    } else if (meetingInterval) {
      clearInterval(meetingInterval);
      setMeetingInterval(null);
    }
  }, [activeMeeting]);

  const loadDashboardData = async () => {
    if (!representative?.id) return;

    try {
      setLoading(true);
      const repId = representative.id;
      // Load assignments for this representative
      const assignmentsData = await assignmentService.getAssignmentsForRep(repId);
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const { data: todayLogsRaw } = await supabase
        .from('visit_logs')
        .select('id, doctor_id, status, start_time, end_time')
        .eq('rep_id', repId)
        .eq('scheduled_date', todayStr);
      setTodayLogs(todayLogsRaw || []);
      const todayCompleted = new Set<string>((todayLogsRaw || []).filter((l: any) => l.status === 'completed' && !!l.end_time).map((l: any) => l.doctor_id as string));
      setTodayCompletedDoctorIds(todayCompleted);

      // Build doctor name map via clinic_doctors for cases without assignments (instant visits)
      const completedLogs = (todayLogsRaw || []).filter((l: any) => l.status === 'completed');
      const docIdsNeedingNames = completedLogs
        .map((l: any) => l.doctor_id)
        .filter((id: string) => !assignmentsData.find(a => a.doctor_id === id));
      let doctorNameById: Record<string, string> = {};
      try {
        if (docIdsNeedingNames.length > 0) {
          const { data: repWithClinics } = await supabase
            .from('representatives')
            .select('representative_clinics ( clinic:clinics ( id ) )')
            .eq('id', repId)
            .single();
          const clinicIds = ((repWithClinics as any)?.representative_clinics || []).map((rc: any) => rc.clinic?.id).filter(Boolean);
          if (clinicIds.length > 0) {
            const { data: rows } = await supabase
              .from('clinic_doctors')
              .select('doctor:doctors ( id, first_name, last_name ), clinic_id')
              .in('clinic_id', clinicIds)
              .in('doctor_id', docIdsNeedingNames);
            (rows || []).forEach((r: any) => {
              const d = r.doctor;
              if (d) doctorNameById[d.id] = `Dr. ${d.first_name} ${d.last_name}`;
            });
          }
        }
      } catch {}

      const completedData = completedLogs.map((log: any) => {
        const assignment = assignmentsData.find(a => a.doctor_id === log.doctor_id);
        const start = log.start_time ? new Date(log.start_time) : null;
        const end = log.end_time ? new Date(log.end_time) : null;
        const durationMinutes = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)) : 0;
        const fallbackName = doctorNameById[log.doctor_id] || 'Həkim';
        return {
          id: log.id,
          doctorId: log.doctor_id,
          doctorName: assignment ? `Dr. ${assignment.doctor?.first_name} ${assignment.doctor?.last_name}` : fallbackName,
          durationMinutes
        };
      });
      setCompletedToday(completedData);

      // Load all visit logs for this representative to compute postponed and monthly completed counts
      const { data: allLogs } = await supabase
        .from('visit_logs')
        .select('status')
        .eq('rep_id', repId);
      const postponedVisits = (allLogs || []).filter((l: any) => l.status === 'postponed').length;

      // Monthly completed visits counter (first day of current month -> today)
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const { count: monthCompletedCount } = await supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('rep_id', repId)
        .eq('status', 'completed')
        .gte('scheduled_date', monthStartStr);

      // Calculate stats
      const todayAssignments = assignmentsData.filter(assignment =>
        assignment.visit_days.includes(format(new Date(), 'EEEE'))
      ).length;

      const statsData = {
        totalAssignments: assignmentsData.length,
        todayAssignments,
        activeMeetings: activeMeeting ? 1 : 0,
        completedVisits: monthCompletedCount || 0,
        postponedVisits,
      };

      setAssignments(assignmentsData);
      setStats(statsData);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Direct lookup method when representative object is not populated
  const loadDashboardDataDirectly = async (userId: string) => {
    try {
      setLoading(true);
      // First, get the representative record directly
      const { data: repData, error: repError } = await supabase
        .from('representatives')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (repError) { return; }

      if (!repData) {
        return;
      }

      // Load assignments for this representative
      const assignmentsData = await assignmentService.getAssignmentsForRep(repData.id);

      const { data: allLogs } = await supabase
        .from('visit_logs')
        .select('status')
        .eq('rep_id', repData.id);
      const postponedVisits = (allLogs || []).filter((l: any) => l.status === 'postponed').length;

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const { data: todayLogsRaw } = await supabase
        .from('visit_logs')
        .select('id, doctor_id, status, start_time, end_time')
        .eq('rep_id', repData.id)
        .eq('scheduled_date', todayStr);
      setTodayLogs(todayLogsRaw || []);
      const completedIds = new Set<string>((todayLogsRaw || []).filter((l: any) => l.status === 'completed' && !!l.end_time).map((l: any) => l.doctor_id as string));
      setTodayCompletedDoctorIds(completedIds);
      const completedLogs = (todayLogsRaw || []).filter((l: any) => l.status === 'completed');
      const docIdsNeedingNames = completedLogs
        .map((l: any) => l.doctor_id)
        .filter((id: string) => !assignmentsData.find(a => a.doctor_id === id));
      let doctorNameById: Record<string, string> = {};
      try {
        if (docIdsNeedingNames.length > 0) {
          const { data: repWithClinics } = await supabase
            .from('representatives')
            .select('representative_clinics ( clinic:clinics ( id ) )')
            .eq('id', repData.id)
            .single();
          const clinicIds = ((repWithClinics as any)?.representative_clinics || []).map((rc: any) => rc.clinic?.id).filter(Boolean);
          if (clinicIds.length > 0) {
            const { data: rows } = await supabase
              .from('clinic_doctors')
              .select('doctor:doctors ( id, first_name, last_name ), clinic_id')
              .in('clinic_id', clinicIds)
              .in('doctor_id', docIdsNeedingNames);
            (rows || []).forEach((r: any) => {
              const d = r.doctor;
              if (d) doctorNameById[d.id] = `Dr. ${d.first_name} ${d.last_name}`;
            });
          }
        }
      } catch {}

      const completedData = completedLogs.map((log: any) => {
        const assignment = assignmentsData.find(a => a.doctor_id === log.doctor_id);
        const start = log.start_time ? new Date(log.start_time) : null;
        const end = log.end_time ? new Date(log.end_time) : null;
        const durationMinutes = start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)) : 0;
        const fallbackName = doctorNameById[log.doctor_id] || 'Həkim';
        return {
          id: log.id,
          doctorId: log.doctor_id,
          doctorName: assignment ? `Dr. ${assignment.doctor?.first_name} ${assignment.doctor?.last_name}` : fallbackName,
          durationMinutes
        };
      });
      setCompletedToday(completedData);

      const todayAssignments = assignmentsData.filter(assignment =>
        assignment.visit_days.includes(format(new Date(), 'EEEE'))
      ).length;

      // Monthly completed visits
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const { count: monthCompletedCount } = await supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('rep_id', repData.id)
        .eq('status', 'completed')
        .gte('scheduled_date', monthStartStr);

      const statsData = {
        totalAssignments: assignmentsData.length,
        todayAssignments,
        activeMeetings: activeMeeting ? 1 : 0,
        completedVisits: monthCompletedCount || 0,
        postponedVisits,
      };

      setAssignments(assignmentsData);
      setStats(statsData);
    } catch (error) {
      console.error('❌ Error in direct dashboard data loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGeoTracking = (visitLogId?: string) => {
    if (!('geolocation' in navigator)) {
      alert('Lokasiya icazəsi verilməlidir');
      return false;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const nowIso = new Date().toISOString();
        // Distance filter ~20m using simple threshold on degree deltas (~1e-4 deg ~ 11m)
        const prev = lastPointRef.current;
        const delta = prev ? Math.max(Math.abs(latitude - prev.lat), Math.abs(longitude - prev.lng)) : Number.MAX_VALUE;
        if (!prev || delta > 0.00018) {
          lastPointRef.current = { lat: latitude, lng: longitude };
          routeBufferRef.current.push({ lat: latitude, lng: longitude, recorded_at: nowIso });
        }
        // Flush every 10s or when buffer has 5+ points
        const now = Date.now();
        if (routeBufferRef.current.length >= 5 || now - lastFlushRef.current > 10000) {
          flushRouteBuffer(visitLogId);
          lastFlushRef.current = now;
        }
      },
      () => {
        alert('Lokasiya icazəsi verilməlidir');
      },
      { enableHighAccuracy: false, maximumAge: 5000, timeout: 10000 }
    );
    setGeoWatchId(watchId);
    return true;
  };

  const stopGeoTracking = async () => {
    if (geoWatchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(geoWatchId);
      setGeoWatchId(null);
    }
    await flushRouteBuffer(activeMeeting?.visitLogId);
  };

  const flushRouteBuffer = async (visitLogId?: string) => {
    try {
      if (!visitLogId || !representative?.id) return;
      const points = routeBufferRef.current.splice(0).map(p => ({
        visit_log_id: visitLogId,
        rep_id: representative.id,
        lat: p.lat,
        lng: p.lng,
        recorded_at: p.recorded_at,
      }));
      if (points.length > 0) {
        await addRoutePoints(points);
      }
    } catch {
      // swallow; next flush will retry
    }
  };

  const loadInstantClinics = async () => {
    if (!representative?.id) return;
    const { supabase } = await import('../lib/supabase');
    const { data: repWithClinics } = await supabase
      .from('representatives')
      .select('representative_clinics ( clinic:clinics ( id, name ) )')
      .eq('id', representative.id)
      .single();
    const clinics = ((repWithClinics as any)?.representative_clinics || [])
      .map((rc: any) => rc.clinic)
      .filter(Boolean);
    setInstantClinics(clinics);
  };

  const loadInstantDoctors = async (clinicId: string) => {
    if (!representative?.id) return;
    try {
      setInstantLoading(true);
      const { supabase } = await import('../lib/supabase');
      const { data: clinicDoctors } = await supabase
        .from('clinic_doctors')
        .select('doctor:doctors ( id, first_name, last_name )')
        .eq('clinic_id', clinicId);
      const map = new Map<string, { id: string; first_name: string; last_name: string }>();
      (clinicDoctors || []).forEach((cd: any) => {
        const d = cd.doctor;
        if (d && !map.has(d.id)) { map.set(d.id, { id: d.id, first_name: d.first_name, last_name: d.last_name }); }
      });
      setInstantDoctors(Array.from(map.values()));
    } finally {
      setInstantLoading(false);
    }
  };

  const openInstantModal = async () => {
    await loadInstantClinics();
    setSelectedClinicId('');
    setInstantDoctors([]);
    setInstantOpen(true);
  };

  const handleCreateInstantVisit = async (doctorId: string) => {
    if (!representative?.id) return;
    // Frontend guard: prevent multiple active visits
    try {
      const active = await hasActiveVisit(representative.id);
      if (active || activeMeeting) {
        alert(t('representative.dashboard.instant.hasActive'));
        return;
      }
    } catch {}
    // Confirm dialog
    const ok = window.confirm(t('representative.dashboard.instant.confirmText'));
    if (!ok) return;
    try {
      setActionLoading(doctorId);
      const res = await createInstantVisit(representative.id, doctorId);
      // Determine doctor full name from loaded list or fetch if necessary
      let doctorName = '';
      const fromList = instantDoctors.find(d => d.id === doctorId);
      if (fromList) {
        doctorName = `Dr. ${fromList.first_name} ${fromList.last_name}`;
      } else {
        try {
          const { data: d } = await supabase
            .from('doctors')
            .select('first_name,last_name')
            .eq('id', doctorId)
            .single();
          if (d) doctorName = `Dr. ${d.first_name} ${d.last_name}`;
        } catch {}
      }
      // Start tracking immediately
      setActiveMeeting({ assignmentId: `instant-${doctorId}`, doctorId, visitLogId: res.id, startTime: new Date(), elapsed: 0, doctorName });
      localStorage.setItem('activeMeeting', JSON.stringify({ assignmentId: `instant-${doctorId}`, doctorId, visitLogId: res.id, startTime: new Date().toISOString(), doctorName }));
      startGeoTracking(res.id);
      setInstantOpen(false);
      alert('Anlıq görüş başlandı');
    } catch (e: any) {
      alert(e?.message || 'Anlıq görüş başlatmaq alınmadı');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartMeeting = async (assignment: AssignmentListItem) => {
    if (!representative?.id) return;

    try {
      setActionLoading(assignment.id);

      // Create or update visit log using API (avoids invalid enum values)
      const log = await startVisit(representative.id, assignment.doctor_id);
      const startTime = new Date();
      setActiveMeeting({ assignmentId: assignment.id, doctorId: assignment.doctor_id, visitLogId: log.id, startTime, elapsed: 0 });
      localStorage.setItem('activeMeeting', JSON.stringify({ assignmentId: assignment.id, doctorId: assignment.doctor_id, visitLogId: log.id, startTime: startTime.toISOString() }));
      // Start geo tracking with permission guard
      const ok = startGeoTracking(log.id);
      if (!ok) {
        // prevent start when permission denied
        setActiveMeeting(null);
        alert('Lokasiya icazəsi verilməlidir');
        return;
      }

      // Update local status and stats
      setTodayLogs(prev => {
        const next = [...prev];
        const idx = next.findIndex(item => item.doctor_id === assignment.doctor_id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], status: 'in_progress', start_time: startTime.toISOString(), id: log.id };
        } else {
          next.push({ doctor_id: assignment.doctor_id, status: 'in_progress', start_time: startTime.toISOString(), id: log.id });
        }
        return next;
      });

      setStats(prev => ({ ...prev, activeMeetings: 1 }));

    } catch (error) {
      console.error('Error starting meeting:', error);
      alert('Failed to start meeting. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndMeeting = async () => {
    if (!activeMeeting || !representative?.id) return;

    try {
      setActionLoading(activeMeeting.assignmentId);

      // End the visit using API function (by log id)
      if (activeMeeting.visitLogId) {
        await stopGeoTracking();
        await endVisit(activeMeeting.visitLogId);
      }
      localStorage.removeItem('activeMeeting');

      // Clear active meeting
      setActiveMeeting(null);

      // Update stats
      setStats(prev => ({
        ...prev,
        activeMeetings: 0,
        completedVisits: prev.completedVisits + 1
      }));

      // Record completed entry with duration
      const durationMinutes = Math.max(1, Math.round(activeMeeting.elapsed / 60));
      const a = assignments.find(a => a.id === activeMeeting.assignmentId);
      const entryId = activeMeeting.visitLogId || activeMeeting.assignmentId;
      let doctorIdToUse = a ? a.doctor_id : activeMeeting.doctorId;
      let doctorNameToUse = a && a.doctor ? `Dr. ${a.doctor.first_name} ${a.doctor.last_name}` : '';

      if (!doctorNameToUse) {
        try {
          const { data: d } = await supabase
            .from('doctors')
            .select('first_name,last_name')
            .eq('id', activeMeeting.doctorId)
            .single();
          if (d) doctorNameToUse = `Dr. ${d.first_name} ${d.last_name}`;
        } catch {}
      }

      setCompletedToday(prev => {
        const filtered = prev.filter(item => item.id !== entryId);
        return [
          {
            id: entryId,
            doctorId: doctorIdToUse,
            doctorName: doctorNameToUse || 'Həkim',
            durationMinutes
          },
          ...filtered
        ];
      });

      setTodayCompletedDoctorIds(prev => {
        const next = new Set(prev);
        if (doctorIdToUse) next.add(doctorIdToUse);
        return next;
      });

      setTodayLogs(prev => {
        const next = [...prev];
        const idx = next.findIndex(item => item.doctor_id === doctorIdToUse);
        if (idx >= 0) {
          next[idx] = { ...next[idx], status: 'completed', end_time: new Date().toISOString(), id: activeMeeting.visitLogId } as any;
        } else {
          next.push({ doctor_id: doctorIdToUse, status: 'completed', end_time: new Date().toISOString(), id: activeMeeting.visitLogId } as any);
        }
        return next;
      });

      alert(`Meeting completed! Duration: ${formatDuration(activeMeeting.elapsed)}`);
      // Refresh today logs from backend so "Today’s Completed" list reflects DB state
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const { data: refreshed } = await supabase
          .from('visit_logs')
          .select('id, doctor_id, status, start_time, end_time')
          .eq('rep_id', representative.id)
          .eq('scheduled_date', todayStr);
        setTodayLogs(refreshed || []);
      } catch {}

    } catch (error) {
      console.error('Error ending meeting:', error);
      alert('Failed to end meeting. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePostpone = async () => {
    if (!representative?.id || !postponeOpen) return;
    if (!postponeReason.trim()) {
      alert('Qeyd və yeni vaxt tələb olunur');
      return;
    }
    try {
      setActionLoading(postponeOpen.assignment.id);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // Update or insert visit_log with postponed status
      const { data: existing } = await supabase
        .from('visit_logs')
        .select('id')
        .eq('rep_id', representative.id)
        .eq('doctor_id', postponeOpen.assignment.doctor_id)
        .eq('scheduled_date', todayStr)
        .maybeSingle();

      let updatedRow: { id: string; doctor_id: string; status: string; start_time?: string | null; end_time?: string | null; scheduled_date: string } | null = null;

      if (existing) {
        const { data } = await supabase
          .from('visit_logs')
          .update({ status: 'postponed', postpone_reason: postponeReason, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('id, doctor_id, status, start_time, end_time, scheduled_date')
          .single();
        updatedRow = data as any;
      } else {
        const { data } = await supabase
          .from('visit_logs')
          .insert({
            rep_id: representative.id,
            doctor_id: postponeOpen.assignment.doctor_id,
            scheduled_date: todayStr,
            status: 'postponed',
            postpone_reason: postponeReason
          })
          .select('id, doctor_id, status, start_time, end_time, scheduled_date')
          .single();
        updatedRow = data as any;
      }

      if (updatedRow) {
        setTodayLogs(prev => {
          const idx = prev.findIndex(l => l.doctor_id === updatedRow!.doctor_id && (l as any).scheduled_date === updatedRow!.scheduled_date);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...updatedRow } as any;
            return copy;
          }
          return [...prev, updatedRow as any];
        });
        // reflect postponed counter quickly
        setStats(s => ({ ...s, postponedVisits: (s.postponedVisits || 0) + 1 }));
      }

      setPostponeOpen(null);
      setPostponeReason('');
      alert('Təxirə salındı');
    } catch (e) {
      alert('Təxirə salınmadı, yenidən cəhd edin');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // time parsing removed

  // helpers removed (unused)

  const canStartMeeting = (assignment: AssignmentListItem) => {
    // Check if today is one of the assigned visit days
    const today = format(new Date(), 'EEEE');
    if (!assignment.visit_days.includes(today)) return false;

    // Only allow within the exact visit window
    return isWithinTimeWindow(assignment);
  };

  const isWithinTimeWindow = (_assignment: AssignmentListItem) => {
    // Time windows removed: always allow during the scheduled day
    return true;
  };

  const isTodayAssignment = (assignment: AssignmentListItem) => {
    const today = format(new Date(), 'EEEE');
    return assignment.visit_days.includes(today);
  };

  const pendingToday = useMemo(() => (
    assignments.filter((assignment) => {
      if (!isTodayAssignment(assignment)) return false;
      const status = todayLogs.find(log => log.doctor_id === assignment.doctor_id)?.status;
      if (status === 'completed' || status === 'postponed' || status === 'missed') return false;
      return isWithinTimeWindow(assignment);
    })
  ), [assignments, todayLogs]);

  const allAssignmentsWithStatus = useMemo(() => (
    assignments.map((assignment) => {
      const status = todayLogs.find(log => log.doctor_id === assignment.doctor_id)?.status || 'planned';
      const duration = completedToday.find(item => item.doctorId === assignment.doctor_id)?.durationMinutes || 0;
      return { assignment, status, duration };
    })
  ), [assignments, todayLogs, completedToday]);

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
            <p>User Email: {user?.email}</p>
            <p>User Role: {(user as any)?.role}</p>
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('representative.dashboard.welcome')}</h1>
          <p className="mt-2 text-gray-600">{t('representative.dashboard.todaysOverview')} {format(new Date(), 'EEEE, d MMMM yyyy', { locale: az })}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
            <p className="text-sm text-gray-600">{t('representative.dashboard.totalAssignments')}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.todayAssignments} {t('representative.dashboard.today')}</p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completedVisits}</p>
            <p className="text-sm text-gray-600">{t('representative.dashboard.completedVisits')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('representative.dashboard.thisMonth')}</p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Timer className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.activeMeetings}</p>
            <p className="text-sm text-gray-600">{t('representative.dashboard.activeMeetings')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('representative.dashboard.inProgress')}</p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.postponedVisits}</p>
            <p className="text-sm text-gray-600">{t('representative.dashboard.postponedCount')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('representative.dashboard.today')}</p>
          </div>
        </div>

        {/* Active Meeting Timer */}
        {activeMeeting && (
          <div className="card bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Timer className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t('representative.dashboard.meetingInProgress')}</h3>
                  <p className="text-sm text-gray-600">
                    {activeMeeting.doctorName || (() => {
                      const a = assignments.find(a => a.id === activeMeeting.assignmentId);
                      return a && a.doctor ? `Dr. ${a.doctor.first_name} ${a.doctor.last_name}` : 'Dr.';
                    })()}
                  </p>
                  <p className="text-lg font-mono text-green-600 font-bold">
                    {formatDuration(activeMeeting.elapsed)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleEndMeeting}
                disabled={actionLoading === activeMeeting.assignmentId}
                className="btn-primary flex items-center gap-2"
              >
                {actionLoading === activeMeeting.assignmentId ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {t('representative.dashboard.finishMeeting')}
              </button>
            </div>
          </div>
        )}

        {/* Pending Assignments */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('representative.dashboard.pendingSectionTitle')}</h2>
          <div className="mb-3">
            <button className="btn-primary text-sm" onClick={openInstantModal}>Anlıq Görüş</button>
          </div>

          {pendingToday.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{t('representative.dashboard.noPending')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingToday.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          Dr. {assignment.doctor?.first_name} {assignment.doctor?.last_name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          isWithinTimeWindow(assignment) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isWithinTimeWindow(assignment) ? t('representative.dashboard.inWindow') : t('representative.dashboard.outsideWindow')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {assignment.doctor?.specialty} • {assignment.start_time} - {assignment.end_time}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('representative.dashboard.visitDays')}: {assignment.visit_days.map((d: string) => toAzWeekday(d)).join(', ')}
                      </p>
                      {assignment.products && assignment.products.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {assignment.products.length} {t('representative.dashboard.products')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Products Button */}
                    {assignment.products && assignment.products.length > 0 && (
                      <button
                        className="p-2 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="View assigned products"
                        onClick={() => setProductModal({ assignment })}
                      >
                        <Package className="w-4 h-4" />
                      </button>
                    )}

                    {/* View Location Button */}
                    {isWithinTimeWindow(assignment) && !todayCompletedDoctorIds.has(assignment.doctor_id) && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => {
                          if (assignment.doctor?.address) {
                            const url = `https://www.google.com/maps?q=${encodeURIComponent(assignment.doctor.address)}`;
                            window.open(url, '_blank');
                          } else if ((assignment.doctor as any)?.location_lat && (assignment.doctor as any)?.location_lng) {
                            const url = `https://www.google.com/maps?q=${(assignment.doctor as any).location_lat},${(assignment.doctor as any).location_lng}`;
                            window.open(url, '_blank');
                          }
                        }}
                      >
                        Ünvana get
                      </button>
                    )}

                    {/* Meeting Controls */}
                    {activeMeeting?.assignmentId === assignment.id ? (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {t('representative.dashboard.meetingActive')}
                      </span>
                    ) : (
                      <>
                        {canStartMeeting(assignment) && (
                          <button
                            onClick={() => handleStartMeeting(assignment)}
                            disabled={actionLoading === assignment.id}
                            className="btn-primary text-sm flex items-center gap-1"
                          >
                            {actionLoading === assignment.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            {t('representative.dashboard.startMeeting')}
                          </button>
                        )}

                        {(() => {
                          const status = todayLogs.find(l => l.doctor_id === assignment.doctor_id)?.status;
                          const notStarted = !status || status === 'planned';
                          const isToday = isTodayAssignment(assignment);
                          return isToday && notStarted && !todayCompletedDoctorIds.has(assignment.doctor_id);
                        })() && (
                          <button
                            onClick={() => setPostponeOpen({ assignment })}
                            className="btn-secondary text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          >
                            Görüşü təxirə sal
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

            </div>
          )}
        </div>

      {postponeOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Görüşü təxirə sal</h3>
            <div className="space-y-3">
              <div>
                <label className="form-label">Qeyd *</label>
                <textarea className="form-input" rows={3} value={postponeReason} onChange={(e) => setPostponeReason(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setPostponeOpen(null)}>Ləğv et</button>
              <button className="btn-primary" onClick={handlePostpone}>Yadda saxla</button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Visit Modal */}
      {instantOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Anlıq Görüş</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setInstantOpen(false)}>✕</button>
            </div>
            <div className="mb-3">
              <label className="form-label">{t('representative.dashboard.instant.selectHospital')}</label>
              <select className="form-input" value={selectedClinicId} onChange={async (e) => { setSelectedClinicId(e.target.value); if (e.target.value) { await loadInstantDoctors(e.target.value); } else { setInstantDoctors([]); } }}>
                <option value="">Seçin</option>
                {instantClinics.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {instantLoading ? (
              <div className="py-10 text-center"><LoadingSpinner /></div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {selectedClinicId && instantDoctors.length === 0 ? (
                  <p className="text-sm text-gray-500">Seçilmiş klinikada həkim tapılmadı</p>
                ) : (
                  instantDoctors.map(d => (
                    <button key={d.id} onClick={() => handleCreateInstantVisit(d.id)} disabled={actionLoading === d.id}
                      className="w-full text-left py-3 px-2 hover:bg-gray-50 flex items-center justify-between">
                      <span>Dr. {d.first_name} {d.last_name}</span>
                      {actionLoading === d.id && <LoadingSpinner size="sm" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {/* Completed Today */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('representative.dashboard.completedSectionTitle')}</h2>
          {completedToday.length === 0 ? (
            <p className="text-sm text-gray-500">{t('representative.dashboard.noCompleted')}</p>
          ) : (
            <div className="space-y-2">
              {completedToday.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{item.doctorName}</span>

                  </div>
                  <div className="text-sm text-green-700">
                    {item.durationMinutes} dəq
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Assignments */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('representative.dashboard.allSectionTitle')}</h2>
          <div className="space-y-3">
            {allAssignmentsWithStatus.map(({ assignment, status, duration }) => (
              <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Dr. {assignment.doctor?.first_name} {assignment.doctor?.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {assignment.visit_days.map((d: string) => toAzWeekday(d)).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {/* Time removed */}
                    <p className={`inline-flex items-center px-2 py-1 mt-1 text-xs rounded-full ${
                      status === 'completed' ? 'bg-green-100 text-green-800' :
                      status === 'postponed' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'missed' ? 'bg-red-100 text-red-800' :
                      status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }` }>
                      {status === 'completed' ? t('representative.dashboard.statusCompleted')
                        : status === 'postponed' ? t('representative.dashboard.statusPostponed')
                        : status === 'missed' ? t('representative.dashboard.statusMissed')
                        : status === 'in_progress' ? t('representative.dashboard.meetingActive')
                        : t('representative.dashboard.statusPlanned')}
                    </p>
                    {status === 'completed' && duration > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{duration} dəq</p>
                    )}
                  </div>
                  {assignment.products && assignment.products.length > 0 && (
                    <button
                      className="p-1 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50"
                      title="View products"
                      onClick={() => setProductModal({ assignment })}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Details Modal */}
        {productModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('representative.dashboard.productsFor')} Dr. {productModal.assignment.doctor?.first_name} {productModal.assignment.doctor?.last_name}
                </h3>
                <button
                  onClick={() => setProductModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {productModal.assignment.products && productModal.assignment.products.length > 0 ? (
                <div className="space-y-4">
                  {productModal.assignment.products.map((product) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          {('description' in product) && (
                            <p className="text-sm text-gray-600 mt-1">{(product as any).description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {product.brand_name || t('representative.dashboard.brand')}
                            </span>
                            {(product as any).specialty && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {(product as any).specialty}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <button className="btn-secondary text-xs">
                            {t('representative.dashboard.viewDetails')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>{t('representative.dashboard.noProducts')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}