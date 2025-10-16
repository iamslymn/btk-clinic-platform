# Deployment Checklist - Discussed Products & Admin Visit History

## ✅ Completed Steps

### 1. Code Deployment
- [x] All changes committed to Git
- [x] Pushed to GitHub repository
- [x] Deployed to Vercel production
- [x] Build successful

**Production URL:** https://btk-clinic-platform-j2phfs7eb-slymndesign-gmailcoms-projects.vercel.app

---

## ⚠️ Required Database Migration

### IMPORTANT: Run Database Script in Supabase

**You must run the following SQL script in Supabase SQL Editor to enable the new features:**

```
File: add-visit-discussed-products.sql
```

#### How to Run:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `add-visit-discussed-products.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Verify success message

#### What This Script Does:

✅ Creates `visit_discussed_products` table
✅ Adds indexes for performance
✅ Enables Row Level Security (RLS)
✅ Creates RLS policies for all user roles:
   - Super admins can view all
   - Managers can view their team's data
   - Representatives can view, insert, and delete their own
✅ Creates `visit_discussed_products_detailed` view for reporting
✅ Grants necessary permissions

---

## 🧪 Testing Checklist

### After Running the Migration:

#### For Representatives:
- [ ] Start a visit (scheduled or instant)
- [ ] Click "Danışılan dərmanlar" button during active visit
- [ ] Products catalog opens showing only assigned brands
- [ ] Search function works
- [ ] Select multiple products
- [ ] Click "Yadda saxla" - should save successfully
- [ ] End the visit
- [ ] Go to "Vizitlər" page - discussed products appear as badges

#### For Managers:
- [ ] Login as manager
- [ ] Click "Ziyarət Tarixçəsi" in sidebar
- [ ] See all team visits
- [ ] Discussed products display for each visit
- [ ] Filter by representative works
- [ ] Filter by date range works
- [ ] Filter by status works
- [ ] Doctor search works
- [ ] CSV export works
- [ ] Can only see own team's data

#### For Super Admins:
- [ ] Login as super admin
- [ ] Click "Ziyarət Tarixçəsi" in sidebar
- [ ] See ALL visits in organization
- [ ] Discussed products display for each visit
- [ ] All filters work
- [ ] CSV export works
- [ ] Statistics show correct counts

---

## 🔧 Troubleshooting

### If discussed products don't load:
1. Check that `add-visit-discussed-products.sql` was run successfully
2. Verify RLS policies are enabled: `SELECT * FROM visit_discussed_products LIMIT 1;`
3. Check browser console for specific errors

### If representatives can't see products:
1. Verify representative has assigned brands in `representative_brands` table
2. Check that brands have products in `products` table
3. Verify RLS policy allows representative to read their brands

### If managers/admins can't access visit history:
1. Check user role is correct in `users` table
2. Verify manager has `manager_id` set correctly in `managers` table
3. Check browser console for auth errors

---

## 📊 Database Schema Reference

### New Table: `visit_discussed_products`
```sql
Columns:
- id (UUID, primary key)
- visit_id (UUID, references visit_logs)
- product_id (UUID, references products)
- created_at (timestamp)
- updated_at (timestamp)

Indexes:
- idx_visit_discussed_products_visit_id
- idx_visit_discussed_products_product_id

Constraints:
- UNIQUE(visit_id, product_id)
```

### New View: `visit_discussed_products_detailed`
```sql
Provides:
- Full product details (name, description, brand)
- Visit context (date, status)
- Representative and doctor names
```

---

## 🎯 Feature Summary

### Discussed Products (Danışılan dərmanlar)
- Representatives select products during visits
- Products filtered by assigned brands
- Multi-select with search
- Saved to database
- Visible in visit history for all roles

### Admin Visit History (Ziyarət Tarixçəsi)
- Managers see team visits
- Super admins see all visits
- Advanced filtering (rep, date, status, doctor)
- Discussed products display
- CSV export
- Statistics dashboard

---

## 🔗 Related Documentation

- `DISCUSSED-PRODUCTS-FEATURE.md` - Discussed products implementation details
- `ADMIN-VISIT-HISTORY-FEATURE.md` - Visit history feature details
- `CREATE-SUPERADMIN-MANUAL.md` - How to create superadmin users

---

## ✅ Deployment Complete

All code changes have been deployed to production. 

**Next Step:** Run the database migration script in Supabase SQL Editor to activate the features.

**Deployment Time:** $(date)
**Commit:** 1cf9ea1
**Branch:** main

