# Admin/Manager Visit History Feature

## Overview
Extended the Visit History (Ziyarət Tarixçəsi) functionality to Managers and Super Admins, providing organization-wide visibility into all visits with advanced filtering, discussed products display, and export capabilities.

## Features Implemented

### 1. Multi-Role Access
- **Representatives**: See only their own visit history (existing functionality preserved)
- **Managers**: See all visits from their assigned representatives
- **Super Admins**: See all visits across the entire organization

### 2. Advanced Filtering System
Filter visits by:
- **Representative**: Dropdown showing all representatives (scoped by manager if applicable)
- **Date Range**: Start and end date pickers
- **Visit Status**: All, Completed, In Progress, Postponed, Missed
- **Doctor Search**: Text search by doctor name

Filters are:
- Fully combinable (e.g., filter by date AND representative AND status)
- Applied server-side for performance
- Respect role-based access control

### 3. Comprehensive Visit Cards
Each visit displays:
- ✅ **Representative Name** (new - only for managers/admins)
- ✅ **Doctor Name & Specialty**
- ✅ **Visit Date** (localized in Azerbaijani)
- ✅ **Status Badge** (color-coded)
- ✅ **Clinic/Location** (if available)
- ✅ **Discussed Products** (from new discussed-products feature)
- ✅ **Postpone Reason** (if applicable)

### 4. Discussed Products Integration
- Shows all products discussed during each visit
- Displayed as blue badges for visual clarity
- Shows "Bu görüşdə dərman qeyd olunmayıb" when no products were recorded
- Uses data from `visit_discussed_products` table

### 5. Statistics Dashboard
Real-time stats cards showing:
- Total visits (all time)
- Completed visits (with % completion this month)
- Postponed visits
- Missed/incomplete visits

Stats are scoped appropriately:
- Managers see only their team's stats
- Super admins see organization-wide stats

### 6. Export Functionality
- **CSV Export**: Export filtered visit data to CSV
- **Includes Columns**:
  - Date
  - Representative
  - Doctor
  - Specialty
  - Status
  - Discussed Products (comma-separated)
  - Notes/Reason
- Export respects current filters

### 7. Full Azerbaijani Localization
All UI text is in Azerbaijani:
- "Ziyarət Tarixçəsi"
- "Filtrlər"
- "Nümayəndə"
- "Danışılan dərmanlar"
- "Bu görüşdə dərman qeyd olunmayıb"
- "Filtrləri tətbiq et"
- "Filtrləri sıfırla"
- "Məlumatı ixrac et"

## Implementation Details

### API Functions (`src/lib/api/visits.ts`)

#### `getAllVisitHistory(filters)`
```typescript
export const getAllVisitHistory = async (
  filters: VisitHistoryFilters = {}
): Promise<VisitLogWithRepresentative[]>
```
- Fetches all visits with representative and doctor details
- Applies server-side filtering for performance
- Supports manager scoping via `managerId` filter
- Client-side doctor name search for flexibility

#### `getVisitStatsForAdmin(managerId?)`
```typescript
export const getVisitStatsForAdmin = async (
  managerId?: string
)
```
- Calculates visit statistics
- Scoped to manager's team if `managerId` provided
- Returns weekly, monthly, and all-time metrics

### Component (`src/pages/AdminVisitHistoryPage.tsx`)

**State Management:**
- Visits data with full details
- Discussed products lookup map
- Filter state for all parameters
- Statistics for dashboard cards
- Representatives list for filter dropdown

**Key Features:**
- Collapsible filter panel
- Real-time filter updates
- Export to CSV button
- Responsive grid layout
- Color-coded status badges
- Loading states

### Routes Added

**Super Admin:**
```
/super-admin/visit-history → AdminVisitHistoryPage
```

**Manager:**
```
/manager/visit-history → AdminVisitHistoryPage
```

Both use the same component, with role-based data scoping handled by the API.

### Sidebar Integration (`src/components/Sidebar.tsx`)
- Added "Ziyarət Tarixçəsi" navigation item
- Uses `History` icon from lucide-react
- Visible to managers and super_admins only
- Positioned between Products and Reports for logical grouping

## User Workflows

### For Managers:
1. Click "Ziyarət Tarixçəsi" in sidebar
2. See all visits from their team representatives
3. Apply filters (representative, date, status, doctor)
4. View discussed products for each visit
5. Export filtered data to CSV
6. Monitor team performance via stats cards

### For Super Admins:
1. Click "Ziyarət Tarixçəsi" in sidebar
2. See ALL visits across the organization
3. Filter by any representative in the system
4. Apply date/status/doctor filters
5. View discussed products for each visit
6. Export complete or filtered data
7. Monitor organization-wide visit metrics

## Database Queries

### Visit History Query
```sql
SELECT 
  vl.*,
  d.first_name, d.last_name, d.specialty, d.address,
  r.full_name, r.first_name, r.last_name
FROM visit_logs vl
JOIN doctors d ON d.id = vl.doctor_id
JOIN representatives r ON r.id = vl.rep_id
WHERE vl.scheduled_date >= ?
  AND vl.scheduled_date <= ?
  AND vl.rep_id IN (manager's representatives)
ORDER BY vl.scheduled_date DESC
```

### Discussed Products Fetch
Uses existing `getDiscussedProductsSummary(visitIds[])` API to batch-fetch all discussed products for displayed visits.

## Security & Permissions

### Row Level Security (RLS)
- All queries respect existing RLS policies
- Managers cannot see other managers' data
- Representatives cannot access admin/manager endpoints

### Role Checks
- Page protected by `ProtectedRoute` component
- Requires 'manager' or 'super_admin' role
- API enforces manager scoping server-side

## Testing Checklist
- [x] Manager can view their team's visit history
- [x] Super admin can view all visit history
- [x] Representative filter works correctly
- [x] Date range filter works correctly
- [x] Status filter works correctly
- [x] Doctor search works correctly
- [x] Filters can be combined
- [x] Reset filters button works
- [x] Discussed products display correctly
- [x] Export to CSV includes all data
- [x] Statistics cards show correct counts
- [x] Manager scoping prevents cross-team access
- [x] All text is in Azerbaijani
- [x] Responsive layout works on mobile

## Future Enhancements
- [ ] Excel export (XLSX format)
- [ ] Advanced analytics (visit duration, product popularity)
- [ ] Bulk operations (approve, export multiple)
- [ ] Visit timeline visualization
- [ ] Representative performance comparison
- [ ] Pagination for large datasets
- [ ] Real-time updates via Supabase subscriptions

## Files Modified

### New Files:
- `src/pages/AdminVisitHistoryPage.tsx` - Main component
- `ADMIN-VISIT-HISTORY-FEATURE.md` - This documentation

### Modified Files:
- `src/lib/api/visits.ts` - Added `getAllVisitHistory()` and `getVisitStatsForAdmin()`
- `src/lib/i18n.ts` - Added `adminVisitHistory` translations
- `src/components/Sidebar.tsx` - Added visit history nav items
- `src/App.tsx` - Added routes for both roles

## Related Features
This feature integrates with:
- **Discussed Products Feature** - Displays products discussed during visits
- **Notifications System** - Can link to specific visits
- **Reports Module** - Provides detailed visit data for analysis
- **Role-Based Access Control** - Enforces data scoping

## Support
For questions or modifications:
- Component: `src/pages/AdminVisitHistoryPage.tsx`
- API: `src/lib/api/visits.ts` (lines 585-791)
- Translations: `src/lib/i18n.ts` (representative.adminVisitHistory)

