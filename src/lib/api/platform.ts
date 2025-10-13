import { supabase } from '../supabase';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from 'date-fns';

// Platform-wide statistics interface
export interface PlatformStats {
  // User counts
  totalUsers: number;
  totalManagers: number;
  totalRepresentatives: number;
  
  // Business data counts
  totalDoctors: number;
  totalBrands: number;
  totalProducts: number;
  totalAssignments: number;
  
  // Activity metrics
  totalVisits: number;
  completedVisits: number;
  postponedVisits: number;
  missedVisits: number;
  overallCompletionRate: number;
  
  // Time-based metrics
  thisWeekVisits: number;
  thisMonthVisits: number;
  lastWeekVisits: number;
  lastMonthVisits: number;
  weekOverWeekGrowth: number;
  monthOverMonthGrowth: number;
  
  // Top performers
  topManagers: {
    id: string;
    full_name: string;
    totalReps: number;
    completionRate: number;
  }[];
  topRepresentatives: {
    id: string;
    full_name: string;
    manager_name: string;
    completedVisits: number;
    completionRate: number;
  }[];
}

// Get comprehensive platform statistics
export const getPlatformStats = async (): Promise<PlatformStats> => {
  try {
    const now = new Date();
    
    // Date ranges
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Run all queries in parallel for performance
    const [
      usersResult,
      managersResult,
      representativesResult,
      doctorsResult,
      brandsResult,
      productsResult,
      assignmentsResult,
      allVisitsResult,
      thisWeekVisitsResult,
      lastWeekVisitsResult,
      thisMonthVisitsResult,
      lastMonthVisitsResult,
      managersWithStatsResult,
      repsWithStatsResult
    ] = await Promise.all([
      // User counts
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('managers').select('*', { count: 'exact', head: true }),
      supabase.from('representatives').select('*', { count: 'exact', head: true }),
      
      // Business data counts
      supabase.from('doctors').select('*', { count: 'exact', head: true }),
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('rep_doctor_assignments').select('*', { count: 'exact', head: true }),
      
      // All visits for completion rates
      supabase.from('visit_logs').select('status'),
      
      // Time-based visit counts
      supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', format(thisWeekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(thisWeekEnd, 'yyyy-MM-dd')),
      
      supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', format(lastWeekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(lastWeekEnd, 'yyyy-MM-dd')),
        
      supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', format(thisMonthStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(thisMonthEnd, 'yyyy-MM-dd')),
        
      supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(lastMonthEnd, 'yyyy-MM-dd')),
      
      // Top managers data
      supabase
        .from('managers')
        .select(`
          id,
          full_name,
          representatives (
            id,
            visit_logs (
              status
            )
          )
        `),
        
      // Top representatives data
      supabase
        .from('representatives')
        .select(`
          id,
          full_name,
          managers!representatives_manager_id_fkey (
            full_name
          ),
          visit_logs (
            status
          )
        `)
    ]);

    // Process basic counts
    const totalUsers = usersResult.count || 0;
    const totalManagers = managersResult.count || 0;
    const totalRepresentatives = representativesResult.count || 0;
    const totalDoctors = doctorsResult.count || 0;
    const totalBrands = brandsResult.count || 0;
    const totalProducts = productsResult.count || 0;
    const totalAssignments = assignmentsResult.count || 0;

    // Process visit statistics
    const allVisits = allVisitsResult.data || [];
    const totalVisits = allVisits.length;
    const completedVisits = allVisits.filter(v => v.status === 'completed').length;
    const postponedVisits = allVisits.filter(v => v.status === 'postponed').length;
    const missedVisits = allVisits.filter(v => v.status === 'missed').length;
    const overallCompletionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

    // Time-based metrics
    const thisWeekVisits = thisWeekVisitsResult.count || 0;
    const lastWeekVisits = lastWeekVisitsResult.count || 0;
    const thisMonthVisits = thisMonthVisitsResult.count || 0;
    const lastMonthVisits = lastMonthVisitsResult.count || 0;

    const weekOverWeekGrowth = lastWeekVisits > 0 
      ? Math.round(((thisWeekVisits - lastWeekVisits) / lastWeekVisits) * 100)
      : 0;
      
    const monthOverMonthGrowth = lastMonthVisits > 0 
      ? Math.round(((thisMonthVisits - lastMonthVisits) / lastMonthVisits) * 100)
      : 0;

    // Process top managers
    const topManagers = (managersWithStatsResult.data || [])
      .map(manager => {
        const totalReps = manager.representatives?.length || 0;
        const allManagerVisits = manager.representatives?.flatMap(rep => rep.visit_logs || []) || [];
        const completedManagerVisits = allManagerVisits.filter(v => v.status === 'completed').length;
        const completionRate = allManagerVisits.length > 0 
          ? Math.round((completedManagerVisits / allManagerVisits.length) * 100)
          : 0;
          
        return {
          id: manager.id,
          full_name: manager.full_name,
          totalReps,
          completionRate
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5); // Top 5

    // Process top representatives
    const topRepresentatives = (repsWithStatsResult.data || [])
      .map(rep => {
        const repVisits = rep.visit_logs || [];
        const completedRepVisits = repVisits.filter(v => v.status === 'completed').length;
        const completionRate = repVisits.length > 0 
          ? Math.round((completedRepVisits / repVisits.length) * 100)
          : 0;
          
        return {
          id: rep.id,
          full_name: rep.full_name,
          manager_name: (rep.managers as any)?.full_name || 'Unknown',
          completedVisits: completedRepVisits,
          completionRate
        };
      })
      .sort((a, b) => b.completedVisits - a.completedVisits)
      .slice(0, 5); // Top 5

    return {
      // User counts
      totalUsers,
      totalManagers,
      totalRepresentatives,
      
      // Business data counts
      totalDoctors,
      totalBrands,
      totalProducts,
      totalAssignments,
      
      // Activity metrics
      totalVisits,
      completedVisits,
      postponedVisits,
      missedVisits,
      overallCompletionRate,
      
      // Time-based metrics
      thisWeekVisits,
      thisMonthVisits,
      lastWeekVisits,
      lastMonthVisits,
      weekOverWeekGrowth,
      monthOverMonthGrowth,
      
      // Top performers
      topManagers,
      topRepresentatives
    };
    
  } catch (error) {
    console.error('Error getting platform stats:', error);
    throw error;
  }
};

// Get activity timeline for the last 30 days
export const getActivityTimeline = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: visits, error } = await supabase
      .from('visit_logs')
      .select('scheduled_date, status, created_at')
      .gte('scheduled_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
      .order('scheduled_date', { ascending: true });

    if (error) throw error;

    // Group visits by date
    const timeline = (visits || []).reduce((acc, visit) => {
      const date = visit.scheduled_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          completed: 0,
          postponed: 0,
          missed: 0
        };
      }
      
      acc[date].total++;
      if (visit.status === 'completed') acc[date].completed++;
      if (visit.status === 'postponed') acc[date].postponed++;
      if (visit.status === 'missed') acc[date].missed++;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(timeline);
  } catch (error) {
    console.error('Error getting activity timeline:', error);
    throw error;
  }
};

// Admin-only: reset visit-related data (manual trigger)
export const resetVisits = async (): Promise<void> => {
  try {
    // meeting_route_points (if exists)
    try {
      await supabase.from('meeting_route_points').delete().neq('visit_log_id', '');
    } catch {}
    // visit_logs
    await supabase.from('visit_logs').delete().neq('id', '');
    // visit_goals
    await supabase.from('visit_goals').delete().neq('id', '');
    // rep_doctor_products (optional cleanup)
    await supabase.from('rep_doctor_products').delete().neq('id', '');
  } catch (error) {
    console.error('resetVisits failed:', error);
    throw error;
  }
};

// Get recent activity feed
export const getRecentActivity = async (limit: number = 10) => {
  try {
    const { data: visits, error } = await supabase
      .from('visit_logs')
      .select(`
        id,
        status,
        start_time,
        end_time,
        created_at,
        doctors!visit_logs_doctor_id_fkey (
          first_name,
          last_name,
          specialty
        ),
        representatives!visit_logs_rep_id_fkey (
          full_name,
          managers!representatives_manager_id_fkey (
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (visits || []).map(visit => ({
      id: visit.id,
      type: 'visit',
      status: visit.status,
      timestamp: visit.created_at,
      description: `${(visit.representatives as any)?.full_name} ${visit.status} visit with Dr. ${(visit.doctors as any)?.first_name} ${(visit.doctors as any)?.last_name}`,
      details: {
        representative: (visit.representatives as any)?.full_name,
        manager: (visit.representatives as any)?.managers?.full_name,
        doctor: `Dr. ${(visit.doctors as any)?.first_name} ${(visit.doctors as any)?.last_name}`,
        specialty: (visit.doctors as any)?.specialty,
        duration: visit.start_time && visit.end_time 
          ? Math.round((new Date(visit.end_time).getTime() - new Date(visit.start_time).getTime()) / (1000 * 60))
          : null
      }
    }));
  } catch (error) {
    console.error('Error getting recent activity:', error);
    throw error;
  }
};