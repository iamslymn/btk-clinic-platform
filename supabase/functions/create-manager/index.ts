import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateManagerRequest {
  email: string;
  password: string;
  full_name: string;
}

interface CreateManagerResponse {
  success: boolean;
  data?: {
    manager_id: string;
    user_id: string;
    email: string;
    full_name: string;
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify this is a POST request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, password, full_name }: CreateManagerRequest = await req.json()
    
    // Validate required fields
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Client for verifying the current user
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Admin client for creating users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the current user and get their details
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if the current user is a super_admin
    const { data: currentUserData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !currentUserData || currentUserData.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only super administrators can create managers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user with this email already exists
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingAuthUser?.users.some(u => u.email === email)
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ success: false, error: 'A user with this email already exists' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Create Supabase Auth user
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'manager',
        full_name: full_name
      }
    })

    if (authUserError || !authUser.user) {
      console.error('Auth user creation error:', authUserError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user created:', authUser.user.id)

    try {
      // Step 2: Create user record in users table
      const { data: userRecord, error: userRecordError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authUser.user.id,
          email: email,
          role: 'manager'
        })
        .select()
        .single()

      if (userRecordError) {
        console.error('User record creation error:', userRecordError)
        // Clean up auth user if user record creation fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Step 3: Create manager profile
      const { data: managerRecord, error: managerError } = await supabaseAdmin
        .from('managers')
        .insert({
          user_id: authUser.user.id,
          full_name: full_name
        })
        .select()
        .single()

      if (managerError) {
        console.error('Manager record creation error:', managerError)
        // Clean up user record and auth user
        await supabaseAdmin.from('users').delete().eq('id', authUser.user.id)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create manager profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Success response
      const response: CreateManagerResponse = {
        success: true,
        data: {
          manager_id: managerRecord.id,
          user_id: authUser.user.id,
          email: email,
          full_name: full_name
        }
      }

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      console.error('Transaction error:', error)
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create manager' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
