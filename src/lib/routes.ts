/**
 * Centralized route constants for type safety and consistency
 */

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',

  // Super Admin - canonical URLs without /dashboard prefix
  SUPER_ADMIN_DASHBOARD: '/super-admin/dashboard',
  SUPER_ADMIN_MANAGERS: '/super-admin/managers',
  SUPER_ADMIN_DOCTORS: '/super-admin/doctors', 
  SUPER_ADMIN_BRANDS: '/super-admin/brands',
  SUPER_ADMIN_PRODUCTS: '/super-admin/products',
  SUPER_ADMIN_CLINICS: '/super-admin/clinics',
  SUPER_ADMIN_SPECIALIZATIONS: '/super-admin/specializations',
  SUPER_ADMIN_REPORTS: '/super-admin/reports',

  // Manager - keep existing structure
  MANAGER_DASHBOARD: '/dashboard/manager',
  MANAGER_DOCTORS: '/doctors',
  MANAGER_REPRESENTATIVES: '/representatives',
  MANAGER_ASSIGNMENTS: '/assignments',
  MANAGER_BRANDS: '/brands',
  MANAGER_PRODUCTS: '/products',
  MANAGER_REPORTS: '/reports',

  // Representative - keep existing structure
  REP_DASHBOARD: '/dashboard/rep',
  REP_SCHEDULE: '/schedule',
  REP_VISITS: '/visits',
} as const;

/**
 * Helper to check if a path is active for navigation
 */
export const isRouteActive = (currentPath: string, targetPath: string, exact = false): boolean => {
  if (exact) {
    return currentPath === targetPath;
  }
  return currentPath.startsWith(targetPath);
};

/**
 * Helper to get the appropriate dashboard path for a role
 */
export const getDashboardPath = (role: string): string => {
  switch (role) {
    case 'super_admin':
      return ROUTES.SUPER_ADMIN_DASHBOARD;
    case 'manager':
      return ROUTES.MANAGER_DASHBOARD;
    case 'rep':
      return ROUTES.REP_DASHBOARD;
    default:
      return ROUTES.LOGIN;
  }
};
