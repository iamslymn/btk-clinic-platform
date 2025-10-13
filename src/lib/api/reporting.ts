import { supabase } from '../supabase';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, subWeeks, subMonths } from 'date-fns';

// Interfaces for reporting data
export interface VisitTrendData {
  date: string;
  total: number;
  completed: number;
  postponed: number;
  missed: number;
  completionRate: number;
}

export interface RepresentativePerformance {
  id: string;
  name: string;
  totalVisits: number;
  completedVisits: number;
  completionRate: number;
  territory: string;
}

export interface DoctorPopularity {
  id: string;
  name: string;
  specialty: string;
  totalVisits: number;
  totalReps: number;
}

export interface ProductUsage {
  id: string;
  name: string;
  brandName: string;
  timesAssigned: number;
  activeAssignments: number;
}

export interface TerritoryPerformance {
  territory: string;
  totalReps: number;
  totalVisits: number;
  completedVisits: number;
  completionRate: number;
}

export interface RepresentativeMeetingStat {
  representative_id: string;
  representative_name: string;
  brand_name: string | null; // deprecated in UI; kept for backward compat
  total: number;
  completed: number;
  postponed: number;
  missed: number;
  // New fields: completed visit counts by doctor category schemas
  completed_total_category?: number;
  completed_planeta_category?: number;
}

export interface RepresentativeMeetingFilters {
  fromDate?: string;
  toDate?: string;
  representativeId?: string;
  brandId?: string; // deprecated; ignored
}

export interface MonthlyStats {
  month: string;
  totalVisits: number;
  completedVisits: number;
  newDoctors: number;
  activeReps: number;
}

// Get visit trends for the last 30 days
export const getVisitTrends = async (days: number = 30): Promise<VisitTrendData[]> => {
  try {
    const endDate = new Date();
    const startDate = subDays(endDate, days - 1);

    const { data: visits, error } = await supabase
      .from('visit_logs')
      .select('scheduled_date, status')
      .gte('scheduled_date', format(startDate, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(endDate, 'yyyy-MM-dd'))
      .order('scheduled_date');

    if (error) throw error;

    // Group visits by date
    const dateMap = new Map<string, any>();
    
    // Initialize all dates with zero values
    for (let i = 0; i < days; i++) {
      const date = format(subDays(endDate, days - 1 - i), 'yyyy-MM-dd');
      dateMap.set(date, {
        date: format(subDays(endDate, days - 1 - i), 'MMM dd'),
        total: 0,
        completed: 0,
        postponed: 0,
        missed: 0,
        completionRate: 0
      });
    }

    // Populate with actual visit data (postponed has zero impact on success rate)
    (visits || []).forEach(visit => {
      const date = visit.scheduled_date;
      const dateData = dateMap.get(date);
      if (dateData) {
        dateData.total++;
        if (visit.status === 'completed') dateData.completed++;
        if (visit.status === 'postponed') dateData.postponed++;
        if (visit.status === 'missed') dateData.missed++;
        
        // Success rate ignores postponed visits
        const denom = (dateData.completed + dateData.missed) || 0;
        dateData.completionRate = denom > 0 
          ? Math.round((dateData.completed / denom) * 100)
          : 0;
      }
    });

    return Array.from(dateMap.values());
  } catch (error) {
    console.error('Error getting visit trends:', error);
    return [];
  }
};

// Get representative performance comparison
export const getRepresentativePerformance = async (): Promise<RepresentativePerformance[]> => {
  try {
    // Get representatives first
    const { data: reps, error: repsError } = await supabase
      .from('representatives')
      .select(`
        id,
        full_name
      `)
      .order('full_name');

    if (repsError) throw repsError;

    // Get visit logs for each representative
    const repsWithStats = await Promise.all((reps || []).map(async (rep) => {
      const { data: visits, error: visitsError } = await supabase
        .from('visit_logs')
        .select('status')
        .eq('rep_id', rep.id);

      if (visitsError) {
        console.warn(`Error getting visits for rep ${rep.id}:`, visitsError.message);
        return {
          id: rep.id,
          name: rep.full_name,
          totalVisits: 0,
          completedVisits: 0,
          completionRate: 0,
          territory: 'Unknown'
        };
      }

      const totalVisits = visits?.length || 0;
      const completedVisits = visits?.filter(v => v.status === 'completed').length || 0;
      const missedVisits = visits?.filter(v => v.status === 'missed').length || 0;
      const denom = completedVisits + missedVisits;
      const completionRate = denom > 0 ? Math.round((completedVisits / denom) * 100) : 0;

      return {
        id: rep.id,
        name: rep.full_name,
        totalVisits,
        completedVisits,
        completionRate,
        territory: 'Assigned' // Simplified for now
      };
    }));

    return repsWithStats.sort((a, b) => b.completionRate - a.completionRate);
  } catch (error) {
    console.error('Error getting representative performance:', error);
    return [];
  }
};

// Get most popular doctors (by visit count)
export const getDoctorPopularity = async (): Promise<DoctorPopularity[]> => {
  try {
    const { data: doctors, error } = await supabase
      .from('doctors')
      .select(`
        id,
        first_name,
        last_name,
        specialty,
        visit_logs (
          id,
          rep_id
        )
      `)
      .order('first_name');

    if (error) throw error;

    return (doctors || [])
      .map(doctor => {
        const visits = doctor.visit_logs || [];
        const uniqueReps = new Set(visits.map((v: any) => v.rep_id));

        return {
          id: doctor.id,
          name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
          specialty: doctor.specialty,
          totalVisits: visits.length,
          totalReps: uniqueReps.size
        };
      })
      .filter(doctor => doctor.totalVisits > 0)
      .sort((a, b) => b.totalVisits - a.totalVisits)
      .slice(0, 10); // Top 10
  } catch (error) {
    console.error('Error getting doctor popularity:', error);
    return [];
  }
};

// Get product usage statistics
export const getProductUsage = async (): Promise<ProductUsage[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        brands (
          name
        ),
        rep_doctor_products (
          id,
          rep_doctor_assignments (
            id
          )
        )
      `)
      .order('name');

    if (error) throw error;

    return (products || [])
      .map(product => {
        const assignments = product.rep_doctor_products || [];
        const activeAssignments = assignments.filter((rdp: any) => rdp.rep_doctor_assignments?.id).length;

        return {
          id: product.id,
          name: product.name,
          brandName: (product.brands as any)?.name || 'Unknown Brand',
          timesAssigned: assignments.length,
          activeAssignments
        };
      })
      .filter(product => product.timesAssigned > 0)
      .sort((a, b) => b.timesAssigned - a.timesAssigned)
      .slice(0, 15); // Top 15
  } catch (error) {
    console.error('Error getting product usage:', error);
    return [];
  }
};

// Get territory performance
export const getTerritoryPerformance = async (): Promise<TerritoryPerformance[]> => {
  try {
    // Get all representatives
    const { data: reps, error: repsError } = await supabase
      .from('representatives')
      .select('id, full_name');

    if (repsError) throw repsError;

    // For now, create simplified territory data since territory field may not exist
    const territoryMap = new Map<string, any>();

    for (const rep of reps || []) {
      const territory = 'General'; // Simplified territory grouping

      if (!territoryMap.has(territory)) {
        territoryMap.set(territory, {
          territory,
          totalReps: 0,
          totalVisits: 0,
          completedVisits: 0,
          completionRate: 0
        });
      }

      const territoryData = territoryMap.get(territory);
      territoryData.totalReps++;

      // Get visit logs for this rep
      const { data: visits } = await supabase
        .from('visit_logs')
        .select('status')
        .eq('rep_id', rep.id);

      const comp = visits?.filter(v => v.status === 'completed').length || 0;
      const miss = visits?.filter(v => v.status === 'missed').length || 0;
      territoryData.totalVisits += (comp + miss);
      territoryData.completedVisits += comp;
      territoryData.completionRate = (comp + miss) > 0
        ? Math.round((comp / (comp + miss)) * 100)
        : 0;
    }

    return Array.from(territoryMap.values())
      .filter(territory => territory.totalVisits > 0)
      .sort((a, b) => b.completionRate - a.completionRate);
  } catch (error) {
    console.error('Error getting territory performance:', error);
    return [];
  }
};

export const getRepresentativeMeetingStats = async (filters: RepresentativeMeetingFilters = {}): Promise<RepresentativeMeetingStat[]> => {
  try {
    // Base stats (totals, completed, postponed, missed) via RPC; brand ignored
    const { data, error } = await supabase.rpc('get_rep_meeting_stats', {
      p_from_date: filters.fromDate || null,
      p_to_date: filters.toDate || null,
      p_rep_id: filters.representativeId || null,
      p_brand_id: null
    });
    if (error) throw error;

    const base: RepresentativeMeetingStat[] = (data || []).map((row: any) => ({
      representative_id: row.representative_id,
      representative_name: row.representative_name,
      brand_name: row.brand_name,
      total: row.total_count,
      completed: row.completed_count,
      postponed: row.postponed_count,
      missed: row.missed_count,
    }));

    // Compute category-specific completed counts for selected range
    const rangeApplied = {
      from: filters.fromDate || null,
      to: filters.toDate || null,
    };

    let q = supabase
      .from('visit_logs')
      .select('rep_id, doctor:doctors ( total_category, planeta_category )')
      .eq('status', 'completed');

    if (rangeApplied.from) q = q.gte('scheduled_date', rangeApplied.from);
    if (rangeApplied.to) q = q.lte('scheduled_date', rangeApplied.to);
    if (filters.representativeId) q = q.eq('rep_id', filters.representativeId);

    const { data: completedRows, error: catErr } = await q;
    if (catErr) throw catErr;

    type RatingBuckets = { A: number; B: number; C: number; D: number };
    const zero: RatingBuckets = { A: 0, B: 0, C: 0, D: 0 };
    const catMap = new Map<string, { total: number; planeta: number; totalRatings: RatingBuckets; planetaRatings: RatingBuckets }>();

    (completedRows || []).forEach((row: any) => {
      const repId = row.rep_id as string;
      const d = row.doctor || {};
      const hasTotal = !!d.total_category;
      const hasPlaneta = !!d.planeta_category;
      const totalRating = (d.total_category as keyof RatingBuckets) || undefined;
      const planetaRating = (d.planeta_category as keyof RatingBuckets) || undefined;

      const current = catMap.get(repId) || { total: 0, planeta: 0, totalRatings: { ...zero }, planetaRatings: { ...zero } };
      if (hasTotal) {
        current.total += 1;
        if (totalRating && current.totalRatings[totalRating] !== undefined) current.totalRatings[totalRating] += 1;
      }
      if (hasPlaneta) {
        current.planeta += 1;
        if (planetaRating && current.planetaRatings[planetaRating] !== undefined) current.planetaRatings[planetaRating] += 1;
      }
      catMap.set(repId, current);
    });

    // Merge
    return base.map(stat => ({
      ...stat,
      completed_total_category: (catMap.get(stat.representative_id)?.total) || 0,
      completed_planeta_category: (catMap.get(stat.representative_id)?.planeta) || 0,
      // Flatten for UI columns
      // Ümumi ratings
      ...(catMap.has(stat.representative_id) ? {
        total_A: catMap.get(stat.representative_id)!.totalRatings.A,
        total_B: catMap.get(stat.representative_id)!.totalRatings.B,
        total_C: catMap.get(stat.representative_id)!.totalRatings.C,
        total_D: catMap.get(stat.representative_id)!.totalRatings.D,
        planeta_A: catMap.get(stat.representative_id)!.planetaRatings.A,
        planeta_B: catMap.get(stat.representative_id)!.planetaRatings.B,
        planeta_C: catMap.get(stat.representative_id)!.planetaRatings.C,
        planeta_D: catMap.get(stat.representative_id)!.planetaRatings.D,
      } : { total_A: 0, total_B: 0, total_C: 0, total_D: 0, planeta_A: 0, planeta_B: 0, planeta_C: 0, planeta_D: 0 })
    }));
  } catch (error) {
    console.error('Error getting representative meeting stats:', error);
    return [];
  }
};

// Get monthly statistics for the last 6 months
export const getMonthlyStats = async (): Promise<MonthlyStats[]> => {
  try {
    const months: MonthlyStats[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      const monthEnd = endOfMonth(subMonths(new Date(), i));
      const monthName = format(monthStart, 'MMM yyyy');

      // Get visits for this month
      const { data: visits } = await supabase
        .from('visit_logs')
        .select('status')
        .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(monthEnd, 'yyyy-MM-dd'));

      // Get new doctors this month
      const { count: newDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      // Get active representatives (those who had visits this month)
      const { data: activeRepsData } = await supabase
        .from('visit_logs')
        .select('rep_id')
        .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(monthEnd, 'yyyy-MM-dd'));

      const activeReps = new Set((activeRepsData || []).map(v => v.rep_id)).size;

      const totalVisits = visits?.length || 0;
      const completedVisits = visits?.filter(v => v.status === 'completed').length || 0;

      months.push({
        month: monthName,
        totalVisits,
        completedVisits,
        newDoctors: newDoctors || 0,
        activeReps
      });
    }

    return months;
  } catch (error) {
    console.error('Error getting monthly stats:', error);
    return [];
  }
};

// Get comprehensive report summary
export const getReportSummary = async () => {
  try {
    const [
      trends,
      repPerformance,
      doctorPopularity,
      productUsage,
      territoryPerformance,
      monthlyStats
    ] = await Promise.all([
      getVisitTrends(7), // Last 7 days
      getRepresentativePerformance(),
      getDoctorPopularity(),
      getProductUsage(),
      getTerritoryPerformance(),
      getMonthlyStats()
    ]);

    return {
      trends,
      repPerformance: repPerformance.slice(0, 10), // Top 10
      doctorPopularity: doctorPopularity.slice(0, 5), // Top 5
      productUsage: productUsage.slice(0, 10), // Top 10
      territoryPerformance,
      monthlyStats
    };
  } catch (error) {
    console.error('Error getting report summary:', error);
    throw error;
  }
};