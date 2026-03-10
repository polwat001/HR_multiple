import React from "react";
import { Permission, UserRole } from "@/types/roles";
import { useAuth } from "@/contexts/AuthContext";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

/**
 * RoleGuard Component
 * Shows children only if user has required roles or permissions
 *
 * @param requiredRoles - User must have at least one of these roles (default: any)
 * @param requiredPermissions - User must have at least one of these permissions (unless requireAll is true)
 * @param requireAll - If true, user must have ALL permissions (default: false)
 * @param fallback - Component to show if user doesn't have access (default: null)
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
  requireAll = false,
  fallback = null,
}) => {
  const { userPermissions, hasRole, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  if (!userPermissions) {
    return <>{fallback}</>;
  }

  // Check roles
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return <>{fallback}</>;
    }
  }

  // Check permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasRequiredPermission = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasRequiredPermission) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

export default RoleGuard;
