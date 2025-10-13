# Manual Deployment Commands

If you prefer to run commands manually instead of using the automated script, follow these steps:

## 1. Install Supabase CLI

### Option A: Using Homebrew (Recommended for macOS)
```bash
brew install supabase/tap/supabase
```

### Option B: Using npm
```bash
npm install -g supabase
```

### Verify installation
```bash
supabase --version
```

## 2. Login to Supabase
```bash
supabase login
```

## 3. Link Your Project
```bash
# Get your project reference from Supabase Dashboard -> Settings -> General
supabase link --project-ref YOUR_PROJECT_REF
```

## 4. Deploy Edge Function
```bash
supabase functions deploy create-manager
```

## 5. Apply SQL Policies

### Method A: Via Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `rls-policies-manager-creation.sql`
4. Paste and run the query

### Method B: Via psql (if you have direct DB access)
```bash
# Replace with your database credentials
psql -h YOUR_DB_HOST -U postgres -d postgres -f rls-policies-manager-creation.sql
```

## 6. Apply Specialization Schema Fix (if needed)
```bash
# Via Supabase Dashboard SQL Editor
# Copy and paste contents of fix-specialization-schema-complete.sql
```

## 7. Verify Deployment
```bash
# List functions to verify deployment
supabase functions list

# Check function logs
supabase functions logs create-manager
```

## 8. Test in Browser
1. Open your BTK Medical Platform
2. Login as super_admin
3. Try creating a new manager
4. Check for any errors in browser console

## Common Issues

### "supabase command not found"
- Make sure Supabase CLI is installed correctly
- Restart your terminal after installation

### "Not logged in"
- Run `supabase login` and follow the prompts

### "Project not linked"
- Run `supabase link --project-ref YOUR_PROJECT_REF`
- Get your project ref from Supabase Dashboard

### Edge Function errors
- Check logs: `supabase functions logs create-manager`
- Verify environment variables are set in Supabase

### Database permission errors
- Ensure RLS policies are applied correctly
- Check your user has super_admin role in the database
