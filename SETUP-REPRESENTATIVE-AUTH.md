# Representative Authentication Setup

This guide explains how to set up proper Supabase Auth for representative creation.

## Required Environment Variables

Add these to your `.env` file:

```bash
# Existing variables (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# NEW: Service Role Key (Required for Representative Creation)
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## How to Get Your Service Role Key

1. **Go to Supabase Dashboard** → Your Project
2. **Navigate to Settings** → **API**  
3. **Copy the `service_role` key** (not the `anon` key)
4. **Add it to your `.env` file** as `VITE_SUPABASE_SERVICE_ROLE_KEY`

## Security Warning ⚠️

**IMPORTANT**: The service role key has admin privileges and should **NEVER** be used on the client-side in production!

### For Production:
- Move representative creation to a **server-side API**
- Use the service role key **only on the server**
- Never expose it in client-side code

### For Development/Demo:
- The current implementation works for testing
- Keep the service role key in your local `.env` file only
- Don't commit it to version control

## Disable Email Confirmation (Optional)

To make representative login even smoother:

1. **Go to Supabase Dashboard** → **Authentication** → **Settings**
2. **Find "Confirm email"** setting  
3. **Turn it OFF** (disable email confirmation)
4. **Save changes**

This allows representatives to login immediately without email verification.

## How It Works Now

### Manager Creates Representative:
1. **Fills out form** with name, email, password, etc.
2. **Clicks "Create Representative"**
3. **System creates full Supabase Auth account** with provided email+password
4. **No email verification required** - account is ready immediately
5. **Representative appears in list** with complete auth info

### Representative Login:
1. **Uses exact email and password** set by manager
2. **Logs in normally** (no "any password" system)
3. **Gets redirected to Representative Dashboard**

## Testing the New System

1. **Add service role key to `.env`**
2. **Restart your dev server**: `npm run dev`
3. **Login as manager**: `manager@btk.com` / `manager123`
4. **Go to Representatives** → **Add Representative**
5. **Fill form with real email+password**
6. **Submit** - should create complete auth account
7. **Test login** with the exact credentials you set

## Troubleshooting

### "Admin operations unavailable" Error:
- Check that `VITE_SUPABASE_SERVICE_ROLE_KEY` is set in `.env`
- Restart your dev server after adding the variable
- Verify the service role key is correct (from Supabase Dashboard)

### "User already exists" Error:
- The email is already registered in Supabase Auth
- Try a different email address
- Or delete the existing user from Supabase Auth dashboard

### Representatives Not Showing Login Info:
- Old representatives (created with the old system) won't have auth accounts
- Delete old representatives and recreate them with the new system
- Or use the "Create Login" button for existing representatives

## Migration from Old System

If you have existing representatives without auth accounts:

1. **Delete old representatives** (they don't have real auth accounts)
2. **Recreate them** using the new system
3. **Or use the "Create Login" button** to add auth accounts to existing representatives

---

**Result**: Complete Supabase Auth integration with email+password, no email verification, and immediate login capability for representatives! 🎉