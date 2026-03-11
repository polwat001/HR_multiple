import { UserRole, Permission } from "@/types/roles";

/**
 * Role-to-Permissions Mapping
 * Maps each role to its associated permissions
 */
export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.EMPLOYEE]: [
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.REQUEST_OT,
    Permission.REQUEST_LEAVE,
  ],

  [UserRole.MANAGER]: [
    // Dashboard
    Permission.VIEW_OWN_DASHBOARD,
    // Employees
    Permission.VIEW_OWN_PROFILE,
    Permission.VIEW_DEPARTMENT_EMPLOYEES,
    // Attendance
    Permission.VIEW_DEPARTMENT_ATTENDANCE,
    // OT
    Permission.REQUEST_OT,
    Permission.APPROVE_DEPARTMENT_OT,
    // Leave
    Permission.REQUEST_LEAVE,
    Permission.APPROVE_DEPARTMENT_LEAVE,
    // Reports
    Permission.VIEW_DEPARTMENT_REPORTS,
    Permission.VIEW_HOLIDAYS,
  ],

  [UserRole.HR_COMPANY]: [
    // Dashboard
    Permission.VIEW_COMPANY_DASHBOARD,
    // Employees
    Permission.VIEW_OWN_PROFILE,
    Permission.VIEW_COMPANY_EMPLOYEES,
    Permission.MANAGE_COMPANY_EMPLOYEES,
    // Attendance
    Permission.VIEW_COMPANY_ATTENDANCE,
    Permission.MANAGE_ATTENDANCE,
    // OT
    Permission.REQUEST_OT,
    Permission.MANAGE_COMPANY_OT,
    // Leave
    Permission.REQUEST_LEAVE,
    Permission.MANAGE_COMPANY_LEAVE,
    // Contracts
    Permission.VIEW_COMPANY_CONTRACTS,
    Permission.MANAGE_COMPANY_CONTRACTS,
    // Organization
    Permission.VIEW_COMPANY_ORGANIZATION,
    // Reports
    Permission.VIEW_COMPANY_REPORTS,
    // Holidays
    Permission.VIEW_HOLIDAYS,
    Permission.MANAGE_COMPANY_HOLIDAYS,
  ],

  [UserRole.CENTRAL_HR]: [
    // Dashboard
    Permission.VIEW_HOLDING_DASHBOARD,
    // Employees
    Permission.VIEW_OWN_PROFILE,
    Permission.VIEW_ALL_EMPLOYEES,
    // Attendance
    Permission.VIEW_COMPANY_ATTENDANCE,
    // Contracts
    Permission.MANAGE_CONTRACT_TEMPLATES,
    // Organization
    Permission.VIEW_ALL_ORGANIZATION,
    // Reports
    Permission.VIEW_CONSOLIDATED_REPORTS,
    // Holidays
    Permission.VIEW_HOLIDAYS,
    Permission.MANAGE_ALL_HOLIDAYS,
  ],

  [UserRole.SUPER_ADMIN]: [
    // All permissions
    Permission.VIEW_OWN_DASHBOARD,
    Permission.VIEW_COMPANY_DASHBOARD,
    Permission.VIEW_HOLDING_DASHBOARD,
    Permission.VIEW_OWN_PROFILE,
    Permission.VIEW_DEPARTMENT_EMPLOYEES,
    Permission.VIEW_COMPANY_EMPLOYEES,
    Permission.VIEW_ALL_EMPLOYEES,
    Permission.EDIT_OWN_PROFILE,
    Permission.MANAGE_COMPANY_EMPLOYEES,
    Permission.MANAGE_ALL_EMPLOYEES,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_DEPARTMENT_ATTENDANCE,
    Permission.VIEW_COMPANY_ATTENDANCE,
    Permission.MANAGE_ATTENDANCE,
    Permission.REQUEST_OT,
    Permission.APPROVE_DEPARTMENT_OT,
    Permission.MANAGE_COMPANY_OT,
    Permission.MANAGE_ALL_OT,
    Permission.REQUEST_LEAVE,
    Permission.APPROVE_DEPARTMENT_LEAVE,
    Permission.MANAGE_COMPANY_LEAVE,
    Permission.MANAGE_ALL_LEAVE,
    Permission.VIEW_COMPANY_CONTRACTS,
    Permission.MANAGE_COMPANY_CONTRACTS,
    Permission.MANAGE_CONTRACT_TEMPLATES,
    Permission.VIEW_COMPANY_ORGANIZATION,
    Permission.VIEW_ALL_ORGANIZATION,
    Permission.MANAGE_ORGANIZATION,
    Permission.VIEW_DEPARTMENT_REPORTS,
    Permission.VIEW_COMPANY_REPORTS,
    Permission.VIEW_CONSOLIDATED_REPORTS,
    Permission.VIEW_HOLIDAYS,
    Permission.MANAGE_COMPANY_HOLIDAYS,
    Permission.MANAGE_ALL_HOLIDAYS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.MANAGE_SYSTEM_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
  ],
};

/**
 * Calculate user permissions based on their roles
 * Supports multiple roles per user - returns union of all permissions
 */
export function calculatePermissions(
  roles: UserRole[]
): Permission[] {
  const allPermissions = new Set<Permission>();

  roles.forEach((role) => {
    const perms = rolePermissions[role];
    if (perms) {
      perms.forEach((perm) => allPermissions.add(perm));
    }
  });

  return Array.from(allPermissions);
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((perm) => userPermissions.includes(perm));
}

/**
 * Check if user has all of the required permissions
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
}
