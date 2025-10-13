import { supabase } from '../supabase';
import { customAuth } from '../customAuth';
import type { 
  MeetingWithDetails,
  MeetingProduct,
  MeetingProductForm,
  ProductWithDetails
} from '../../types';

// Get all meetings with details
export const getMeetings = async (): Promise<MeetingWithDetails[]> => {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      assignment:assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      doctor:doctors (
        id,
        first_name,
        last_name,
        specialization,
        total_category,
        planeta_category
      ),
      representative:representatives (
        id,
        first_name,
        last_name
      ),
      products:meeting_products (
        id,
        discussed,
        notes,
        created_at,
        product:products (
          id,
          name,
          description,
          priority_specializations,
          pdf_url,
          annotations,
          brand:brands (
            id,
            name
          )
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map((meeting: any) => ({
    ...meeting,
    products: meeting.products || []
  })) || [];
};

// Get meetings for a specific representative
export const getMeetingsForRepresentative = async (representativeId: string): Promise<MeetingWithDetails[]> => {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      assignment:assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      doctor:doctors (
        id,
        first_name,
        last_name,
        specialization,
        total_category,
        planeta_category
      ),
      representative:representatives (
        id,
        first_name,
        last_name
      ),
      products:meeting_products (
        id,
        discussed,
        notes,
        created_at,
        product:products (
          id,
          name,
          description,
          priority_specializations,
          pdf_url,
          annotations,
          brand:brands (
            id,
            name
          )
        )
      )
    `)
    .eq('representative_id', representativeId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data?.map((meeting: any) => ({
    ...meeting,
    products: meeting.products || []
  })) || [];
};

// Get active meetings for a representative (in progress)
export const getActiveMeetingsForRepresentative = async (representativeId: string): Promise<MeetingWithDetails[]> => {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      assignment:assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      doctor:doctors (
        id,
        first_name,
        last_name,
        specialization,
        total_category,
        planeta_category
      ),
      representative:representatives (
        id,
        first_name,
        last_name
      ),
      products:meeting_products (
        id,
        discussed,
        notes,
        created_at,
        product:products (
          id,
          name,
          description,
          priority_specializations,
          pdf_url,
          annotations,
          brand:brands (
            id,
            name
          )
        )
      )
    `)
    .eq('representative_id', representativeId)
    .eq('status', 'in_progress')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data?.map((meeting: any) => ({
    ...meeting,
    products: meeting.products || []
  })) || [];
};

// Start a meeting
export const startMeeting = async (assignmentId: string, doctorId: string): Promise<MeetingWithDetails> => {
  // Check if user is a representative
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'rep') {
    throw new Error('Only representatives can start meetings');
  }

  if (!profile.representative?.id) {
    throw new Error('Representative profile not found');
  }

  // Check if there's already an active meeting for this assignment and doctor
  const { data: existingMeeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('doctor_id', doctorId)
    .in('status', ['in_progress', 'completed'])
    .maybeSingle();

  if (existingMeeting) {
    throw new Error('Bu həkimlə görüş artıq aktivdir və ya tamamlanıb');
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      assignment_id: assignmentId,
      doctor_id: doctorId,
      representative_id: profile.representative.id,
      start_time: new Date().toISOString(),
      status: 'in_progress'
    })
    .select(`
      *,
      assignment:assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      doctor:doctors (
        id,
        first_name,
        last_name,
        specialization,
        total_category,
        planeta_category
      ),
      representative:representatives (
        id,
        first_name,
        last_name
      ),
      products:meeting_products (
        id,
        discussed,
        notes,
        created_at,
        product:products (
          id,
          name,
          description,
          priority_specializations,
          pdf_url,
          annotations,
          brand:brands (
            id,
            name
          )
        )
      )
    `)
    .single();

  if (error) throw error;
  if (!meeting) throw new Error('Failed to start meeting');

  return {
    ...meeting,
    products: meeting.products || []
  };
};
// Postpone a meeting (with reason)
export const postponeMeeting = async (
  meetingId: string,
  reason: string
): Promise<MeetingWithDetails> => {
  // Only representatives can postpone
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  if (!user || !profile || profile.role !== 'rep') {
    throw new Error('Only representatives can postpone meetings');
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update({ status: 'postponed', notes: reason })
    .eq('id', meetingId)
    .select(`
      *,
      assignment:assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      doctor:doctors (
        id,
        first_name,
        last_name,
        specialization,
        total_category,
        planeta_category
      ),
      representative:representatives (
        id,
        first_name,
        last_name,
        manager:managers (
          id,
          full_name
        )
      )
    `)
    .single();

  if (error) throw error;
  if (!meeting) throw new Error('Meeting not found');

  // TODO: notify manager - stub logging for now
  const managerName = (meeting as any).representative?.manager?.full_name;
  console.info('Notify manager about postponed meeting:', {
    managerName,
    meetingId,
    reason
  });

  return {
    ...meeting,
    products: (meeting as any).products || []
  } as any;
};

// End a meeting
export const endMeeting = async (meetingId: string, notes?: string): Promise<MeetingWithDetails> => {
  // Check if user is a representative
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'rep') {
    throw new Error('Only representatives can end meetings');
  }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update({
      end_time: new Date().toISOString(),
      status: 'completed',
      notes: notes || null
    })
    .eq('id', meetingId)
    .select(`
      *,
      assignment:assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      doctor:doctors (
        id,
        first_name,
        last_name,
        specialization,
        total_category,
        planeta_category
      ),
      representative:representatives (
        id,
        first_name,
        last_name
      ),
      products:meeting_products (
        id,
        discussed,
        notes,
        created_at,
        product:products (
          id,
          name,
          description,
          priority_specializations,
          pdf_url,
          annotations,
          brand:brands (
            id,
            name
          )
        )
      )
    `)
    .single();

  if (error) throw error;
  if (!meeting) throw new Error('Meeting not found');

  return {
    ...meeting,
    products: meeting.products || []
  };
};

// Add product to meeting (mark as discussed)
export const addProductToMeeting = async (
  meetingId: string, 
  productData: MeetingProductForm
): Promise<MeetingProduct> => {
  // Check if user is a representative
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'rep') {
    throw new Error('Only representatives can manage meeting products');
  }

  const { data, error } = await supabase
    .from('meeting_products')
    .insert({
      meeting_id: meetingId,
      product_id: productData.product_id,
      discussed: productData.discussed,
      notes: productData.notes || null
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Product is already added to this meeting');
    }
    throw error;
  }
  
  if (!data) throw new Error('Failed to add product to meeting');
  return data;
};

// Update meeting product
export const updateMeetingProduct = async (
  meetingProductId: string,
  updates: Partial<MeetingProductForm>
): Promise<MeetingProduct> => {
  // Check if user is a representative
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'rep') {
    throw new Error('Only representatives can manage meeting products');
  }

  const productUpdates: Partial<MeetingProduct> = {};
  if (updates.discussed !== undefined) productUpdates.discussed = updates.discussed;
  if (updates.notes !== undefined) productUpdates.notes = updates.notes;

  const { data, error } = await supabase
    .from('meeting_products')
    .update(productUpdates)
    .eq('id', meetingProductId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Meeting product not found');
  return data;
};

// Remove product from meeting
export const removeProductFromMeeting = async (meetingProductId: string): Promise<void> => {
  // Check if user is a representative
  const user = customAuth.getCurrentUser();
  const profile = customAuth.getUserProfile();
  
  if (!user || !profile || profile.role !== 'rep') {
    throw new Error('Only representatives can manage meeting products');
  }

  const { error } = await supabase
    .from('meeting_products')
    .delete()
    .eq('id', meetingProductId);

  if (error) throw error;
};

// Get products available for a meeting (prioritized by doctor's specialization)
export const getProductsForMeeting = async (
  meetingId: string
): Promise<{ priorityProducts: ProductWithDetails[]; otherProducts: ProductWithDetails[] }> => {
  // Get meeting details to find doctor's specialization and representative's brands
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select(`
      doctor:doctors (
        specialization_id,
        specialization:specializations (
          id,
          name,
          display_name
        )
      ),
      representative:representatives (
        brands:representative_brands (
          brand_id
        )
      )
    `)
    .eq('id', meetingId)
    .single();

  if (meetingError) throw meetingError;
  if (!meeting) throw new Error('Meeting not found');

  const doctorSpecializationName = meeting.doctor?.specialization?.name;
  const representativeBrandIds = meeting.representative?.brands?.map((rb: any) => rb.brand_id) || [];

  if (representativeBrandIds.length === 0) {
    return { priorityProducts: [], otherProducts: [] };
  }

  // Get all products for representative's brands
  const { data: allProducts, error: productsError } = await supabase
    .from('products')
    .select(`
      *,
      brand:brands (
        id,
        name
      )
    `)
    .in('brand_id', representativeBrandIds);

  if (productsError) throw productsError;

  const products: ProductWithDetails[] = (allProducts || []).map((product: any) => ({
    ...product,
    brand: product.brand,
    priority_specializations: product.priority_specializations || []
  }));

  // Separate priority products (matching doctor's specialization) from others
  const priorityProducts = products.filter(product => 
    doctorSpecializationName && 
    product.priority_specializations.includes(doctorSpecializationName)
  );

  const otherProducts = products.filter(product => 
    !doctorSpecializationName || 
    !product.priority_specializations.includes(doctorSpecializationName)
  );

  return { priorityProducts, otherProducts };
};

// Get meeting by ID
export const getMeetingById = async (meetingId: string): Promise<MeetingWithDetails> => {
  const { data, error } = await supabase
    .from('meetings')
    .select(`
      *,
      assignment:assignments (
        id,
        assigned_date,
        notes,
        clinic:clinics (
          id,
          name,
          address
        )
      ),
      doctor:doctors (
        id,
        first_name,
        last_name,
        specialization,
        total_category,
        planeta_category
      ),
      representative:representatives (
        id,
        first_name,
        last_name
      ),
      products:meeting_products (
        id,
        discussed,
        notes,
        created_at,
        product:products (
          id,
          name,
          description,
          priority_specializations,
          pdf_url,
          annotations,
          brand:brands (
            id,
            name
          )
        )
      )
    `)
    .eq('id', meetingId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Meeting not found');

  return {
    ...data,
    products: data.products || []
  };
};
