import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { hasPermission, type Permission } from '../lib/permissions';

interface RoleBasedAccessProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders content based on user permissions
 */
export function RoleBasedAccess({ permission, children, fallback = null }: RoleBasedAccessProps) {
  const { role } = useAuth();

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface ReadOnlyWarningProps {
  resource: string;
  className?: string;
}

/**
 * Warning component for read-only access
 */
export function ReadOnlyWarning({ resource, className = '' }: ReadOnlyWarningProps) {
  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-amber-800">Read-Only Access</h3>
          <p className="text-sm text-amber-700 mt-1">
            As a Manager, you have read-only access to {resource}. 
            Only Super Administrators can create, edit, or delete {resource}.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoleBasedAccess;
