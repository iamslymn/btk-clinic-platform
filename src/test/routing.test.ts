/**
 * Basic test to verify route constants and navigation logic
 * Run with: npm test routing.test.ts
 */

import { ROUTES, isRouteActive, getDashboardPath } from '../lib/routes';

describe('Route Constants and Helpers', () => {
  test('route constants are defined correctly', () => {
    expect(ROUTES.SUPER_ADMIN_DASHBOARD).toBe('/super-admin/dashboard');
    expect(ROUTES.SUPER_ADMIN_MANAGERS).toBe('/super-admin/managers');
    expect(ROUTES.SUPER_ADMIN_DOCTORS).toBe('/super-admin/doctors');
  });

  test('getDashboardPath returns correct paths for roles', () => {
    expect(getDashboardPath('super_admin')).toBe('/super-admin/dashboard');
    expect(getDashboardPath('manager')).toBe('/dashboard/manager');
    expect(getDashboardPath('rep')).toBe('/dashboard/rep');
    expect(getDashboardPath('unknown')).toBe('/login');
  });

  test('isRouteActive works correctly with exact matching', () => {
    // Exact matching for dashboard
    expect(isRouteActive('/super-admin/dashboard', '/super-admin/dashboard', true)).toBe(true);
    expect(isRouteActive('/super-admin/managers', '/super-admin/dashboard', true)).toBe(false);
    
    // Non-exact matching for other routes
    expect(isRouteActive('/super-admin/managers', '/super-admin/managers', false)).toBe(true);
    expect(isRouteActive('/super-admin/managers/new', '/super-admin/managers', false)).toBe(true);
    expect(isRouteActive('/super-admin/doctors', '/super-admin/managers', false)).toBe(false);
  });
});

/**
 * Manual QA Checklist (to run in browser):
 * 
 * ✅ Navigate to /super-admin/dashboard → Dashboard tab is active
 * ✅ Navigate to /super-admin/managers → Managers tab is active, Dashboard is not
 * ✅ Click Dashboard tab → URL changes to /super-admin/dashboard
 * ✅ Click Managers tab → URL changes to /super-admin/managers  
 * ✅ Refresh page on /super-admin/managers → Managers tab stays active
 * ✅ Direct link to /dashboard/super-admin/* → Redirects to /super-admin/dashboard
 * ✅ Visit /super-admin → Redirects to /super-admin/dashboard
 * ✅ Login as super_admin → Redirects to /super-admin/dashboard (not old path)
 */
