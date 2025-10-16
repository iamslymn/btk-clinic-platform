import { supabase } from '../supabase';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import type { 
  VisitLog,
  Doctor,
  Product,
  Brand,
  RepDoctorAssignment
} from '../../types';
import { createNotification } from './notifications';

// Extended visit log with relationships
export interface VisitLogWithDetails extends VisitLog {
  doctor?: Doctor;
  assignment?: RepDoctorAssignment & {
    products?: (Product & { brand?: Brand })[];
  };
}

// Get today's scheduled visits for a representative
export const getTodayVisits = async (repId: string): Promise<VisitLogWithDetails[]> => {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const enDay = format(today, 'EEEE'); // english day name used in DB visit_days

  // First get assignments that should happen today
  const { data: assignments, error: assignmentsError } = await supabase
    .from('rep_doctor_assignments')
    .select(`
      *,
      doctors!rep_doctor_assignments_doctor_id_fkey (
        id,
        first_name,
        last_name,
        specialty,
        category,
        address,
        location_lat,
        location_lng
      ),
      rep_doctor_products (
        id,
        product_id,
        products (
          id,
          name,
          description,
          brands (
            id,
            name
          )
        )
      )
    `)
    .eq('rep_id', repId)
    .contains('visit_days', [enDay]);

  if (assignmentsError) throw assignmentsError;

  // Get existing visit logs for today
  const { data: existingLogs, error: logsError } = await supabase
    .from('visit_logs')
    .select('*')
    .eq('rep_id', repId)
    .eq('scheduled_date', todayStr);

  if (logsError) throw logsError;

  // Combine assignments with existing logs
  const visits: VisitLogWithDetails[] = [];

  for (const assignment of assignments || []) {
    const existingLog = existingLogs?.find((log: any) => log.doctor_id === assignment.doctor_id);
    
    if (existingLog) {
      // Use existing log
      visits.push({
        ...existingLog,
        doctor: assignment.doctors as Doctor,
        assignment: {
          ...assignment,
          products: assignment.rep_doctor_products?.map((rdp: any) => ({
            ...rdp.products,
            brand: rdp.products?.brands
          })) || []
        }
      });
    } else {
      // Create a placeholder for scheduled visit in UI (not persisted)
      visits.push({
        id: `pending-${assignment.id}` as any,
        rep_id: repId as any,
        doctor_id: assignment.doctor_id as any,
        scheduled_date: todayStr as any,
        start_time: null as any,
        end_time: null as any,
        status: 'planned' as any,
        postpone_reason: null as any,
        created_at: new Date().toISOString() as any,
        updated_at: new Date().toISOString() as any,
        doctor: assignment.doctors as Doctor,
        assignment: {
          ...assignment,
          products: assignment.rep_doctor_products?.map((rdp: any) => ({
            ...rdp.products,
            brand: rdp.products?.brands
          })) || []
        }
      } as any);
    }
  }

  return visits.sort((a, b) => {
    // Sort by assignment start time, then by status
    const aTime = a.assignment?.start_time || '09:00';
    const bTime = b.assignment?.start_time || '09:00';
    return aTime.localeCompare(bTime);
  });
};

// Start a visit
export const startVisit = async (repId: string, doctorId: string): Promise<VisitLog> => {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Prevent multiple active visits across different doctors
  {
    const { data: anyActive } = await supabase
      .from('visit_logs')
      .select('id, doctor_id, status')
      .eq('rep_id', repId)
      .eq('status', 'in_progress')
      .eq('scheduled_date', todayStr)
      .is('end_time', null)
      .limit(1)
      .maybeSingle();
    if (anyActive && anyActive.doctor_id !== doctorId) {
      throw new Error('Sizdə hazırda aktiv görüş var. Yeni görüş başlatmaq üçün əvvəlkini bitirin.');
    }
  }

  // Check if visit log already exists
  const { data: existingLog } = await supabase
    .from('visit_logs')
    .select('*')
    .eq('rep_id', repId)
    .eq('doctor_id', doctorId)
    .eq('scheduled_date', todayStr)
    .maybeSingle();

  if (existingLog) {
    // If already completed, do not restart
    if (existingLog.status === 'completed') {
      return existingLog as any;
    }

    // Update existing log: start and move to in_progress if not completed
    const { data, error } = await supabase
      .from('visit_logs')
      .update({
        start_time: now.toISOString(),
        status: 'in_progress',
        updated_at: now.toISOString()
      })
      .eq('id', existingLog.id)
      .select()
      .single();

    if (error) throw error;
    // Notify managers and super admins about instant/in-progress visit
    try {
      await createNotification({
        title: 'Anlıq görüş başladı',
        message: `Nümayəndə ${repId} həkim ${doctorId} ilə anlıq görüş başlatdı`,
        link: '/reports',
        recipientRole: 'manager'
      });
      await createNotification({
        title: 'Anlıq görüş başladı',
        message: `Nümayəndə ${repId} həkim ${doctorId} ilə anlıq görüş başlatdı`,
        link: '/reports',
        recipientRole: 'super_admin'
      });
    } catch {}
    return data;
  } else {
    // Create new log (default planned) and immediately mark in_progress
    const { data, error } = await supabase
      .from('visit_logs')
      .insert({
        rep_id: repId,
        doctor_id: doctorId,
        scheduled_date: todayStr,
        start_time: now.toISOString(),
        status: 'in_progress',
        // @ts-ignore - visit_type column added by migration
        visit_type: 'instant'
      })
      .select()
      .single();
    if (error) throw error;

    try {
      // Load names and clinic
      const [{ data: rep }, { data: doctor }, { data: clinicMembership }] = await Promise.all([
        supabase.from('representatives').select('full_name').eq('id', repId).maybeSingle(),
        supabase.from('doctors').select('first_name,last_name').eq('id', doctorId).maybeSingle(),
        supabase.from('clinic_doctors').select('clinics(name)').eq('doctor_id', doctorId).limit(1)
      ]);
      const repName = rep?.full_name || 'Məlumat yoxdur';
      const docName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Məlumat yoxdur';
      const clinicName = (clinicMembership && (clinicMembership as any)[0]?.clinics?.name) || null;
      await Promise.all([
        createNotification({
          title: 'Anlıq görüş başlatıldı',
          message: `Nümayəndə ${repName} ${docName} ilə anlıq görüş başlatdı${clinicName ? ` (${clinicName})` : ''}.`,
          link: '/reports',
          recipientRole: 'manager',
          relatedVisitId: data.id,
          representativeName: repName,
          doctorName: docName,
          clinicName,
          scheduledDate: todayStr,
        }),
        createNotification({
          title: 'Anlıq görüş başlatıldı',
          message: `Nümayəndə ${repName} ${docName} ilə anlıq görüş başlatdı${clinicName ? ` (${clinicName})` : ''}.`,
          link: '/reports',
          recipientRole: 'super_admin',
          relatedVisitId: data.id,
          representativeName: repName,
          doctorName: docName,
          clinicName,
          scheduledDate: todayStr,
        }),
      ]);
    } catch {}
    return data;
  }
};

// End a visit
export const endVisit = async (visitId: string): Promise<VisitLog> => {
  const now = new Date();

  const { data, error } = await supabase
    .from('visit_logs')
    .update({
      end_time: now.toISOString(),
      status: 'completed',
      updated_at: now.toISOString()
    })
    .eq('id', visitId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Meeting route tracking
export type RoutePointInput = {
  visit_log_id: string;
  rep_id: string;
  lat: number;
  lng: number;
  recorded_at?: string;
};

export const addRoutePoints = async (points: RoutePointInput[]) => {
  if (!points || points.length === 0) return { data: [], error: null } as const;
  const { data, error } = await supabase
    .from('meeting_route_points')
    .insert(points)
    .select('id');
  return { data, error } as const;
};

export const getRoutePoints = async (visitLogId: string) => {
  const { data, error } = await supabase
    .from('meeting_route_points')
    .select('lat, lng, recorded_at')
    .eq('visit_log_id', visitLogId)
    .order('recorded_at', { ascending: true });
  return { data, error } as const;
};

// Check if representative has an active (ongoing) visit for today
export const hasActiveVisit = async (repId: string): Promise<boolean> => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const { data } = await supabase
    .from('visit_logs')
    .select('id')
    .eq('rep_id', repId)
    .eq('status', 'in_progress')
    .eq('scheduled_date', todayStr)
    .is('end_time', null)
    .limit(1)
    .maybeSingle();
  return !!data;
};

// Create an instant visit that starts immediately
export const createInstantVisit = async (
  repId: string,
  doctorId: string
) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  // Authorization check: ensure doctor works at one of the representative's assigned clinics
  try {
    const { data: repClinics } = await supabase
      .from('representatives')
      .select('representative_clinics ( clinic_id )')
      .eq('id', repId)
      .single();
    const clinicIds = ((repClinics as any)?.representative_clinics || []).map((rc: any) => rc.clinic_id);
    if (!clinicIds || clinicIds.length === 0) throw new Error('Klinika təyinatı yoxdur');
    const { data: membership } = await supabase
      .from('clinic_doctors')
      .select('clinic_id')
      .eq('doctor_id', doctorId)
      .in('clinic_id', clinicIds);
    if (!membership || membership.length === 0) throw new Error('Bu həkim üçün icazə yoxdur');
  } catch (e: any) {
    throw new Error(e?.message || 'İcazə yoxlanışı uğursuz oldu');
  }

  // Block multiple active visits
  {
    const { data: active } = await supabase
      .from('visit_logs')
      .select('id')
      .eq('rep_id', repId)
      .eq('status', 'in_progress')
      .eq('scheduled_date', todayStr)
      .is('end_time', null)
      .limit(1)
      .maybeSingle();
    if (active) {
      throw new Error('Sizdə hazırda aktiv görüş var. Yeni görüş başlatmaq üçün əvvəlkini bitirin.');
    }
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('visit_logs')
    .insert({
      rep_id: repId,
      doctor_id: doctorId,
      scheduled_date: todayStr,
      start_time: nowIso,
      status: 'in_progress',
      // @ts-ignore - visit_type column added by migration
      visit_type: 'instant'
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
};

// Postpone a visit
export const postponeVisit = async (
  repId: string, 
  doctorId: string, 
  reason: string
): Promise<VisitLog> => {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');

  // Check if visit log already exists
  const { data: existingLog } = await supabase
    .from('visit_logs')
    .select('*')
    .eq('rep_id', repId)
    .eq('doctor_id', doctorId)
    .eq('scheduled_date', todayStr)
    .single();

  if (existingLog) {
    // Update existing log
    const { data, error } = await supabase
      .from('visit_logs')
      .update({
        status: 'postponed',
        postpone_reason: reason,
        updated_at: now.toISOString()
      })
      .eq('id', existingLog.id)
      .select()
      .single();

    if (error) throw error;
    try {
      const [{ data: rep }, { data: doctor }] = await Promise.all([
        supabase.from('representatives').select('full_name').eq('id', repId).maybeSingle(),
        supabase.from('doctors').select('first_name,last_name').eq('id', doctorId).maybeSingle(),
      ]);
      const repName = rep?.full_name || 'Məlumat yoxdur';
      const docName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Məlumat yoxdur';
      const body = `Nümayəndə ${repName} ${docName} ilə görüşü təxirə saldı.`;
      await Promise.all([
        createNotification({
          title: 'Görüş təxirə salındı',
          message: `${body}\nQeyd: ${reason}`,
          link: '/reports',
          recipientRole: 'manager',
          relatedVisitId: existingLog.id,
          representativeName: repName,
          doctorName: docName,
          scheduledDate: todayStr,
          note: reason
        }),
        createNotification({
          title: 'Görüş təxirə salındı',
          message: `${body}\nQeyd: ${reason}`,
          link: '/reports',
          recipientRole: 'super_admin',
          relatedVisitId: existingLog.id,
          representativeName: repName,
          doctorName: docName,
          scheduledDate: todayStr,
          note: reason
        }),
      ]);
    } catch {}
    return data;
  } else {
    // Create new log
    const { data, error } = await supabase
      .from('visit_logs')
      .insert({
        rep_id: repId,
        doctor_id: doctorId,
        scheduled_date: todayStr,
        status: 'postponed',
        postpone_reason: reason
      })
      .select()
      .single();

    if (error) throw error;
    try {
      const [{ data: rep }, { data: doctor }] = await Promise.all([
        supabase.from('representatives').select('full_name').eq('id', repId).maybeSingle(),
        supabase.from('doctors').select('first_name,last_name').eq('id', doctorId).maybeSingle(),
      ]);
      const repName = rep?.full_name || 'Məlumat yoxdur';
      const docName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Məlumat yoxdur';
      const body = `Nümayəndə ${repName} ${docName} ilə görüşü təxirə saldı.`;
      await Promise.all([
        createNotification({
          title: 'Görüş təxirə salındı',
          message: `${body}\nQeyd: ${reason}`,
          link: '/reports',
          recipientRole: 'manager',
          relatedVisitId: data.id,
          representativeName: repName,
          doctorName: docName,
          scheduledDate: todayStr,
          note: reason
        }),
        createNotification({
          title: 'Görüş təxirə salındı',
          message: `${body}\nQeyd: ${reason}`,
          link: '/reports',
          recipientRole: 'super_admin',
          relatedVisitId: data.id,
          representativeName: repName,
          doctorName: docName,
          scheduledDate: todayStr,
          note: reason
        }),
      ]);
    } catch {}
    return data;
  }
};

// Get visit history for a representative
export const getVisitHistory = async (
  repId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<VisitLogWithDetails[]> => {
  let query = supabase
    .from('visit_logs')
    .select(`
      *,
      doctors!visit_logs_doctor_id_fkey (
        id,
        first_name,
        last_name,
        specialty,
        category,
        address
      )
    `)
    .eq('rep_id', repId)
    .order('scheduled_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('scheduled_date', format(startDate, 'yyyy-MM-dd'));
  }
  if (endDate) {
    query = query.lte('scheduled_date', format(endDate, 'yyyy-MM-dd'));
  }

  const { data, error } = await query;
  if (error) throw error;

  return data?.map((log: any) => ({
    ...log,
    doctor: log.doctors as Doctor
  })) || [];
};

// Get visit statistics for a representative
export const getRepVisitStats = async (repId: string) => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // This week's visits
  const { data: weekVisits } = await supabase
    .from('visit_logs')
    .select('status')
    .eq('rep_id', repId)
    .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
    .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

  // This month's visits  
  const { data: monthVisits } = await supabase
    .from('visit_logs')
    .select('status')
    .eq('rep_id', repId)
    .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'));

  // Today's visits
  const { data: todayVisits } = await supabase
    .from('visit_logs')
    .select('status')
    .eq('rep_id', repId)
    .eq('scheduled_date', format(today, 'yyyy-MM-dd'));

  // Active assignments count
  const { count: totalAssignments } = await supabase
    .from('rep_doctor_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('rep_id', repId);

  const weekCompleted = weekVisits?.filter((v: any) => v.status === 'completed').length || 0;
  const weekPostponed = weekVisits?.filter((v: any) => v.status === 'postponed').length || 0;
  const weekMissed = weekVisits?.filter((v: any) => v.status === 'missed').length || 0;

  const monthCompleted = monthVisits?.filter((v: any) => v.status === 'completed').length || 0;
  const todayCompleted = todayVisits?.filter((v: any) => v.status === 'completed').length || 0;

  return {
    // Weekly stats
    weekCompleted,
    weekPostponed,
    weekMissed,
    weekTotal: weekCompleted + weekPostponed + weekMissed,
    
    // Monthly stats
    monthCompleted,
    monthTotal: monthVisits?.length || 0,
    
    // Today stats
    todayCompleted,
    todayScheduled: todayVisits?.length || 0,
    
    // General stats
    totalAssignments: totalAssignments || 0,
    
    // Completion rates
    weekCompletionRate: weekVisits?.length ? Math.round((weekCompleted / weekVisits.length) * 100) : 0,
    monthCompletionRate: monthVisits?.length ? Math.round((monthCompleted / monthVisits.length) * 100) : 0,
  };
};

// Extended visit log with representative details for admin/manager view
export interface VisitLogWithRepresentative extends VisitLogWithDetails {
  representative?: {
    id: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
  };
  clinic?: {
    id: string;
    name: string;
    address?: string;
  };
}

// Filters for admin/manager visit history
export interface VisitHistoryFilters {
  representativeId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  doctorName?: string;
  managerId?: string; // For manager-scoped queries
}

/**
 * Get all visit history with filters for managers and admins
 * @param filters - Filtering options
 * @returns List of visits with full details
 */
export const getAllVisitHistory = async (
  filters: VisitHistoryFilters = {}
): Promise<VisitLogWithRepresentative[]> => {
  try {
    let query = supabase
      .from('visit_logs')
      .select(`
        *,
        doctors!visit_logs_doctor_id_fkey (
          id,
          first_name,
          last_name,
          specialty,
          category,
          address,
          total_category,
          planeta_category
        ),
        representatives!visit_logs_rep_id_fkey (
          id,
          full_name,
          first_name,
          last_name
        )
      `)
      .order('scheduled_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.representativeId) {
      query = query.eq('rep_id', filters.representativeId);
    }

    if (filters.dateFrom) {
      query = query.gte('scheduled_date', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('scheduled_date', filters.dateTo);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Manager scope: filter by manager's representatives
    if (filters.managerId) {
      const { data: managerReps, error: repsError } = await supabase
        .from('representatives')
        .select('id')
        .eq('manager_id', filters.managerId);

      if (repsError) throw repsError;

      const repIds = (managerReps || []).map((r: any) => r.id);
      if (repIds.length > 0) {
        query = query.in('rep_id', repIds);
      } else {
        // Manager has no representatives, return empty
        return [];
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    let visits = (data || []).map((log: any) => ({
      ...log,
      doctor: log.doctors as Doctor,
      representative: log.representatives
    }));

    // Apply doctor name filter (client-side for flexibility)
    if (filters.doctorName) {
      const searchTerm = filters.doctorName.toLowerCase();
      visits = visits.filter((v: any) => {
        const doctorFullName = v.doctor 
          ? `${v.doctor.first_name} ${v.doctor.last_name}`.toLowerCase()
          : '';
        return doctorFullName.includes(searchTerm);
      });
    }

    return visits;
  } catch (error) {
    console.error('Error getting all visit history:', error);
    throw error;
  }
};

/**
 * Get visit statistics for admin/manager dashboard
 * @param managerId - Optional manager ID to scope to their team
 * @returns Visit statistics
 */
export const getVisitStatsForAdmin = async (managerId?: string) => {
  try {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    let baseQuery = supabase.from('visit_logs');

    // If manager, scope to their representatives
    if (managerId) {
      const { data: managerReps } = await supabase
        .from('representatives')
        .select('id')
        .eq('manager_id', managerId);

      const repIds = (managerReps || []).map((r: any) => r.id);
      if (repIds.length === 0) {
        return {
          weekCompleted: 0,
          weekTotal: 0,
          monthCompleted: 0,
          monthTotal: 0,
          totalVisits: 0,
          completedVisits: 0,
          postponedVisits: 0,
          missedVisits: 0,
          weekCompletionRate: 0,
          monthCompletionRate: 0,
        };
      }
      baseQuery = baseQuery.in('rep_id', repIds);
    }

    // This week's visits
    const { data: weekVisits } = await baseQuery
      .select('status')
      .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'));

    // This month's visits
    const { data: monthVisits } = await baseQuery
      .select('status')
      .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'));

    // All-time stats
    const { data: allVisits } = await baseQuery.select('status');

    const weekCompleted = weekVisits?.filter((v: any) => v.status === 'completed').length || 0;
    const monthCompleted = monthVisits?.filter((v: any) => v.status === 'completed').length || 0;
    const totalCompleted = allVisits?.filter((v: any) => v.status === 'completed').length || 0;
    const totalPostponed = allVisits?.filter((v: any) => v.status === 'postponed').length || 0;
    const totalMissed = allVisits?.filter((v: any) => v.status === 'missed').length || 0;

    return {
      weekCompleted,
      weekTotal: weekVisits?.length || 0,
      monthCompleted,
      monthTotal: monthVisits?.length || 0,
      totalVisits: allVisits?.length || 0,
      completedVisits: totalCompleted,
      postponedVisits: totalPostponed,
      missedVisits: totalMissed,
      weekCompletionRate: weekVisits?.length ? Math.round((weekCompleted / weekVisits.length) * 100) : 0,
      monthCompletionRate: monthVisits?.length ? Math.round((monthCompleted / monthVisits.length) * 100) : 0,
    };
  } catch (error) {
    console.error('Error getting visit stats for admin:', error);
    return {
      weekCompleted: 0,
      weekTotal: 0,
      monthCompleted: 0,
      monthTotal: 0,
      totalVisits: 0,
      completedVisits: 0,
      postponedVisits: 0,
      missedVisits: 0,
      weekCompletionRate: 0,
      monthCompletionRate: 0,
    };
  }
};