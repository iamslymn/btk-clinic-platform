# Secure Manager Creation Setup

This document explains how to set up and deploy the secure manager creation system for the BTK Medical Platform.

## Overview

The manager creation system uses a secure server-side approach with:
- **Supabase Edge Function** for secure user creation using Admin API
- **Row Level Security (RLS)** policies to enforce super_admin-only access
- **Client-side API** that calls the Edge Function with proper authentication

## Files Created/Modified

### Server-Side Files

1. **`supabase/functions/create-manager/index.ts`**
   - Edge Function that handles secure manager creation
   - Uses Supabase Admin API to create auth users
   - Enforces super_admin-only access
   - Creates records in both `users` and `managers` tables

2. **`rls-policies-manager-creation.sql`**
   - RLS policies ensuring only super_admin can create managers
   - Proper access control for users, managers, and representatives tables
   - Helper functions and views for safe data access

3. **`supabase/config.toml`**
   - Configuration for the Edge Function

### Client-Side Files

4. **`src/lib/api/managers.ts`** (MODIFIED)
   - Updated `createManager()` function to call Edge Function
   - Proper error handling and authentication
   - Returns complete manager data with relationships

5. **`src/test/manager-creation.test.ts`** (NEW)
   - Test cases for manager creation security
   - Manual testing checklist

## Deployment Steps

### 1. Deploy the Edge Function

```bash
# Ensure you have Supabase CLI installed and logged in
supabase functions deploy create-manager

# Verify deployment
supabase functions list
```

### 2. Apply Database Policies

```bash
# Connect to your Supabase database and run the RLS policies
psql -h [your-db-host] -U postgres -d postgres -f rls-policies-manager-creation.sql

# Alternative: Copy and paste the SQL content into Supabase SQL Editor
```

### 3. Set Environment Variables

Ensure your Supabase project has these environment variables set:
- `SUPABASE_URL` (automatically set)
- `SUPABASE_SERVICE_ROLE_KEY` (automatically set)

### 4. Test the Implementation

1. **Login as super_admin** in your application
2. **Navigate to the manager creation form**
3. **Try creating a manager** with valid data
4. **Verify success** - manager should appear in the list
5. **Test error cases** - duplicate email, invalid data, etc.

## Security Features

### Authentication & Authorization
- ✅ Only authenticated users can call the function
- ✅ Only super_admin role can create managers
- ✅ JWT token validation on every request
- ✅ Proper error messages without exposing sensitive info

### Data Integrity
- ✅ Atomic transactions - if any step fails, all changes are rolled back
- ✅ Email uniqueness validation
- ✅ Required field validation
- ✅ Proper foreign key relationships

### Access Control
- ✅ RLS policies prevent unauthorized data access
- ✅ Managers can only see their own data (except super_admin)
- ✅ Representatives can only see their assigned manager
- ✅ Users can only update their own records

## Error Handling

The system provides clear error messages for:
- **Authentication errors** - "Authentication required"
- **Authorization errors** - "Only super administrators can create managers"
- **Validation errors** - "All fields are required", "Email already exists"
- **System errors** - "Failed to create manager" (with proper logging)

## Monitoring & Debugging

### Edge Function Logs
```bash
# View function logs
supabase functions logs create-manager

# Follow logs in real-time
supabase functions logs create-manager --follow
```

### Database Monitoring
- Check `auth.users` table for created auth users
- Check `users` table for user records
- Check `managers` table for manager profiles
- Verify all records have matching `user_id`

## Troubleshooting

### Common Issues

1. **"Function not found" error**
   - Ensure Edge Function is deployed: `supabase functions deploy create-manager`
   - Check function name matches exactly: `create-manager`

2. **"Permission denied" error**
   - Verify RLS policies are applied correctly
   - Check current user has super_admin role in database
   - Ensure JWT token is valid and not expired

3. **"Email already exists" error**
   - Check `auth.users` table for existing user with same email
   - This is expected behavior for security

4. **Edge Function timeout**
   - Check Supabase function logs for detailed error messages
   - Verify database connection and queries are working

### Database Verification Queries

```sql
-- Check if user was created properly
SELECT 
    au.email,
    u.role,
    m.full_name,
    m.created_at
FROM auth.users au
JOIN users u ON au.id = u.id
JOIN managers m ON u.id = m.user_id
WHERE au.email = 'test@example.com';

-- Check RLS policies are active
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('users', 'managers', 'representatives');
```

## API Usage

### Client-Side Example

```typescript
import { createManager } from '../lib/api/managers';

try {
  const newManager = await createManager({
    email: 'manager@company.com',
    password: 'securePassword123',
    full_name: 'John Doe'
  });
  
  console.log('Manager created:', newManager);
  // Handle success (refresh list, show notification, etc.)
  
} catch (error) {
  console.error('Failed to create manager:', error.message);
  // Handle error (show error message to user)
}
```

### Response Format

```typescript
// Success response
{
  success: true,
  data: {
    manager_id: "uuid-here",
    user_id: "uuid-here", 
    email: "manager@company.com",
    full_name: "John Doe"
  }
}

// Error response  
{
  success: false,
  error: "Error message here"
}
```

## Next Steps

1. **Deploy to production** following the steps above
2. **Monitor function performance** and logs
3. **Add additional validation** if needed (password strength, email format, etc.)
4. **Implement audit logging** for manager creation events
5. **Add email verification** workflow if required

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Edge Function logs for detailed error messages
3. Verify database policies and permissions
4. Test with a fresh super_admin user account
