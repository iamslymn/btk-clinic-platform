# Manual Superadmin Creation Guide

Since the superadmin user `superadmin@btk.com` doesn't exist in Supabase Auth, follow these steps:

## Step 1: Create Auth User in Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** (or "Invite user")
4. Enter:
   - **Email**: `superadmin@btk.com`
   - **Password**: `Btk@2025`
   - Check **"Auto Confirm User"** (important!)
5. Click **Create user**
6. **Copy the user ID (UUID)** that appears in the list

## Step 2: Insert Superadmin Profile in Database

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query (replace `PASTE_THE_AUTH_USER_ID_HERE` with the actual UUID you copied):

```sql
-- Insert superadmin into public.users
INSERT INTO public.users (id, email, role)
VALUES ('PASTE_THE_AUTH_USER_ID_HERE', 'superadmin@btk.com', 'super_admin')
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', email = 'superadmin@btk.com';
```

## Step 3: Test Login

1. Clear your browser's localStorage:
   - Open DevTools (F12)
   - Go to **Application** → **Local Storage** → your site
   - Delete all keys
   - Refresh the page

2. Log in with:
   - Email: `superadmin@btk.com`
   - Password: `Btk@2025`

---

## Why This Is Needed

The platform uses two separate authentication paths:
1. **Supabase Auth** (`auth.users`) - for managers and super_admins
2. **Database-only** (`public.users`) - for representatives

Super admins **must** exist in both:
- `auth.users` (created via Dashboard or Admin API)
- `public.users` (created via SQL)

The 400 error you're seeing means the user exists in `public.users` but not in `auth.users`, so the password grant fails.

