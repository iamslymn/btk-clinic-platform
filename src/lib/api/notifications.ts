import { supabase } from '../supabase';
import { customAuth } from '../customAuth';

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  created_at: string;
  read: boolean;
  recipient_user_id?: string | null;
  recipient_role?: 'super_admin' | 'manager' | 'rep' | null;
  related_visit_id?: string | null;
  representative_name?: string | null;
  doctor_name?: string | null;
  clinic_name?: string | null;
  scheduled_date?: string | null;
  note?: string | null;
};

export type CreateNotificationInput = {
  title: string;
  message: string;
  link?: string | null;
  recipientUserId?: string | null;
  recipientRole?: 'super_admin' | 'manager' | 'rep' | null;
  relatedVisitId?: string | null;
  representativeName?: string | null;
  doctorName?: string | null;
  clinicName?: string | null;
  scheduledDate?: string | null;
  note?: string | null;
};

export const listNotifications = async (limit: number = 50): Promise<NotificationRecord[]> => {
  const currentUser = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  const userId = currentUser?.id;
  const role = (profile?.role as any) || null;

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId && role) {
    query = query.or(`recipient_user_id.eq.${userId},recipient_role.eq.${role}`);
  } else if (role) {
    query = query.eq('recipient_role', role);
  } else if (userId) {
    query = query.eq('recipient_user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as NotificationRecord[];
};

export const getUnreadCount = async (): Promise<number> => {
  const currentUser = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  const userId = currentUser?.id;
  const role = (profile?.role as any) || null;

  let query = supabase
    .from('notifications')
    .select('id, read')
    .eq('read', false);

  if (userId && role) {
    query = query.or(`recipient_user_id.eq.${userId},recipient_role.eq.${role}`);
  } else if (role) {
    query = query.eq('recipient_role', role);
  } else if (userId) {
    query = query.eq('recipient_user_id', userId);
  }

  const { data, error } = await query;
  if (error) return 0;
  return (data || []).length;
};

export const markNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
};

export const createNotification = async (input: CreateNotificationInput): Promise<void> => {
  const payload: any = {
    title: input.title,
    message: input.message,
    link: input.link || null,
    recipient_user_id: input.recipientUserId || null,
    recipient_role: input.recipientRole || null,
    read: false,
    related_visit_id: input.relatedVisitId || null,
    representative_name: input.representativeName || null,
    doctor_name: input.doctorName || null,
    clinic_name: input.clinicName || null,
    scheduled_date: input.scheduledDate || null,
    note: input.note || null,
  };
  await supabase.from('notifications').insert(payload);
};
