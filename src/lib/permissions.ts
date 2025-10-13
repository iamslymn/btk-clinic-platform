import type { UserRole } from '../types';

// Role-based permissions configuration
export const PERMISSIONS = {
  // Doctor management
  CREATE_DOCTOR: ['super_admin'],
  EDIT_DOCTOR: ['super_admin'],
  DELETE_DOCTOR: ['super_admin'],
  VIEW_DOCTORS: ['super_admin', 'manager', 'rep'],

  // Brand management  
  CREATE_BRAND: ['super_admin'],
  EDIT_BRAND: ['super_admin'],
  DELETE_BRAND: ['super_admin'],
  VIEW_BRANDS: ['super_admin', 'manager', 'rep'],

  // Product management
  CREATE_PRODUCT: ['super_admin'],
  EDIT_PRODUCT: ['super_admin'], 
  DELETE_PRODUCT: ['super_admin'],
  VIEW_PRODUCTS: ['super_admin', 'manager', 'rep'],

  // Assignment management
  CREATE_ASSIGNMENT: ['super_admin', 'manager'],
  EDIT_ASSIGNMENT: ['super_admin', 'manager'],
  DELETE_ASSIGNMENT: ['super_admin', 'manager'],
  VIEW_ASSIGNMENTS: ['super_admin', 'manager', 'rep'],

  // Representative management
  CREATE_REPRESENTATIVE: ['super_admin', 'manager'],
  EDIT_REPRESENTATIVE: ['super_admin', 'manager'],
  DELETE_REPRESENTATIVE: ['super_admin', 'manager'],
  VIEW_REPRESENTATIVES: ['super_admin', 'manager'],

  // Manager management
  CREATE_MANAGER: ['super_admin'],
  EDIT_MANAGER: ['super_admin'],
  DELETE_MANAGER: ['super_admin'],
  VIEW_MANAGERS: ['super_admin'],

  // Reports and analytics
  VIEW_REPORTS: ['super_admin', 'manager'],
  VIEW_ANALYTICS: ['super_admin', 'manager'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(userRole: UserRole | null, permission: Permission): boolean {
  if (!userRole) return false;
  return PERMISSIONS[permission].includes(userRole);
}

/**
 * Check if user can create/edit/delete doctors
 */
export function canManageDoctors(userRole: UserRole | null): boolean {
  return hasPermission(userRole, 'CREATE_DOCTOR');
}

/**
 * Check if user can create/edit/delete brands
 */
export function canManageBrands(userRole: UserRole | null): boolean {
  return hasPermission(userRole, 'CREATE_BRAND');
}

/**
 * Check if user can create/edit/delete products
 */
export function canManageProducts(userRole: UserRole | null): boolean {
  return hasPermission(userRole, 'CREATE_PRODUCT');
}

/**
 * Check if user can create/edit/delete assignments
 */
export function canManageAssignments(userRole: UserRole | null): boolean {
  return hasPermission(userRole, 'CREATE_ASSIGNMENT');
}

/**
 * Check if user can create/edit/delete representatives
 */
export function canManageRepresentatives(userRole: UserRole | null): boolean {
  return hasPermission(userRole, 'CREATE_REPRESENTATIVE');
}

/**
 * Check if user can create/edit/delete managers
 */
export function canManageManagers(userRole: UserRole | null): boolean {
  return hasPermission(userRole, 'CREATE_MANAGER');
}

/**
 * Check if user has read-only access to a resource
 */
export function hasReadOnlyAccess(userRole: UserRole | null, resource: 'doctors' | 'brands' | 'products'): boolean {
  const viewPermission = resource === 'doctors' ? 'VIEW_DOCTORS' :
                        resource === 'brands' ? 'VIEW_BRANDS' : 'VIEW_PRODUCTS';
  const managePermission = resource === 'doctors' ? 'CREATE_DOCTOR' :
                          resource === 'brands' ? 'CREATE_BRAND' : 'CREATE_PRODUCT';
  
  return hasPermission(userRole, viewPermission) && !hasPermission(userRole, managePermission);
}

/**
 * Get appropriate error message for unauthorized access
 */
export function getUnauthorizedMessage(action: string): string {
  return `You don't have permission to ${action}. This action is restricted to Super Administrators.`;
}

/**
 * React hook for role-based UI rendering
 */
export function usePermissions(userRole: UserRole | null) {
  return {
    canManageDoctors: canManageDoctors(userRole),
    canManageBrands: canManageBrands(userRole),
    canManageProducts: canManageProducts(userRole),
    canManageAssignments: canManageAssignments(userRole),
    canManageRepresentatives: canManageRepresentatives(userRole),
    canManageManagers: canManageManagers(userRole),
    hasReadOnlyDoctors: hasReadOnlyAccess(userRole, 'doctors'),
    hasReadOnlyBrands: hasReadOnlyAccess(userRole, 'brands'),
    hasReadOnlyProducts: hasReadOnlyAccess(userRole, 'products'),
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
  };
}
