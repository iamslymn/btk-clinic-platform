# Discussed Products Feature

## Overview
The "Discussed Products" (Danışılan dərmanlar) feature allows representatives to record which specific products/drugs they discussed during each doctor visit, replacing the old text-based notes system with a structured, searchable catalog.

## Implementation Summary

### 1. Database Schema
- **Table**: `visit_discussed_products`
  - `id`: UUID primary key
  - `visit_id`: References `visit_logs(id)`
  - `product_id`: References `products(id)`
  - `created_at`, `updated_at`: Timestamps
  - Unique constraint on (visit_id, product_id)

- **View**: `visit_discussed_products_detailed`
  - Joins products, brands, visit logs, representatives, and doctors
  - Provides full context for reporting

- **RLS Policies**:
  - Super admins can view all
  - Managers can view their representatives' discussed products
  - Representatives can view, insert, and delete their own discussed products

### 2. API Functions (`src/lib/api/discussed-products.ts`)
- `getAvailableProductsForRep(repId)` - Get products from rep's assigned brands
- `getDiscussedProductsForVisit(visitId)` - Get discussed products with full details
- `getDiscussedProductIds(visitId)` - Get just IDs for selection state
- `updateDiscussedProducts(visitId, productIds[])` - Replace all selections
- `addDiscussedProduct(visitId, productId)` - Add single product
- `removeDiscussedProduct(visitId, productId)` - Remove single product
- `getDiscussedProductsSummary(visitIds[])` - Get summary for multiple visits (for reports)

### 3. UI Components

#### DiscussedProductsSelector (`src/components/DiscussedProductsSelector.tsx`)
- Multi-selection interface with checkboxes
- Search and filter by product name, brand, or dosage form
- Select All / Clear All quick actions
- Displays product name, dosage form, and brand
- Save/Cancel buttons
- Read-only mode for completed visits
- Fully localized in Azerbaijani

### 4. Integration Points

#### Representative Dashboard (`src/pages/RepresentativeDashboard.tsx`)
- **Active Meeting Card**: Shows "Danışılan dərmanlar" button during active visits
- Opens modal with `DiscussedProductsSelector` component
- Representatives can select products while visit is in progress
- Selections saved to database immediately

#### Visits Page (`src/pages/VisitsPage.tsx`)
- **Visit History**: Each visit card displays discussed products as badges
- Products shown as: "Product Name (Dosage Form)"
- Styled with blue badges for visual distinction
- Visible to representatives, managers, and super admins

#### Reports Page (`src/pages/ReportsPage.tsx`)
- Discussed products are available in the database for detailed analysis
- Can be queried using `getDiscussedProductsSummary()` API
- Future enhancement: Add detailed view or separate tab for product analysis

### 5. Permissions

| Role | View | Select/Edit | Delete |
|------|------|-------------|--------|
| Representative | Own visits only | Own active visits | Own visits |
| Manager | Team visits | ❌ | ❌ |
| Super Admin | All visits | ❌ | ❌ |

### 6. Localization
All UI text is in Azerbaijani (`src/lib/i18n.ts`):
- `representative.dashboard.discussedProducts.title`: "Danışılan dərmanlar"
- `representative.dashboard.discussedProducts.selectProducts`: "Məhsulları seçin"
- `representative.dashboard.discussedProducts.save`: "Yadda saxla"
- `representative.dashboard.discussedProducts.search`: "Axtarış"
- And many more...

### 7. User Workflow

#### For Representatives:
1. Start a visit (scheduled or instant)
2. During active visit, click "Danışılan dərmanlar" button
3. Select products from the catalog (filtered by assigned brands)
4. Use search to quickly find products
5. Click "Yadda saxla" to save selections
6. Selections are linked to the visit in the database
7. End the visit when done

#### For Managers/Super Admins:
1. Go to Visits page (Ziyarətlər) or Reports
2. View visit details - discussed products appear as badges
3. See exactly which products were discussed with each doctor
4. Use for performance analysis and reporting

### 8. Database Migration
Run this SQL script to set up the feature:
```bash
# In Supabase SQL Editor
/btk-clinic-platform/add-visit-discussed-products.sql
```

### 9. Testing Checklist
- [ ] Representative can select products during active visit
- [ ] Products filtered by representative's assigned brands only
- [ ] Search function works correctly
- [ ] Select All / Clear All buttons work
- [ ] Discussed products saved to database
- [ ] Discussed products visible in visit history
- [ ] Managers can view their team's discussed products
- [ ] Super admins can view all discussed products
- [ ] RLS policies prevent unauthorized access
- [ ] All text appears in Azerbaijani
- [ ] Read-only mode works for completed visits

### 10. Future Enhancements
- [ ] Add discussed products analysis to Reports page
- [ ] Export discussed products in CSV/Excel reports
- [ ] Filter visits by discussed products
- [ ] Product popularity metrics
- [ ] Doctor-product preference analysis
- [ ] Time-series analysis of product discussions

## Technical Notes

### Performance Considerations
- Indexes on `visit_id` and `product_id` for fast lookups
- `getDiscussedProductsSummary()` batches queries for multiple visits
- Product catalog loaded once per modal open

### Security
- All data access governed by Row Level Security (RLS)
- Representatives cannot access other representatives' data
- Managers scoped to their team only
- Cascade delete ensures data integrity

### Data Integrity
- Unique constraint prevents duplicate product entries per visit
- Foreign keys ensure referential integrity
- Cascade deletes handle cleanup automatically

## Support
For questions or issues, refer to:
- API documentation: `src/lib/api/discussed-products.ts`
- Component documentation: `src/components/DiscussedProductsSelector.tsx`
- Database schema: `add-visit-discussed-products.sql`

