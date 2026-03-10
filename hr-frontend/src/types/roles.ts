/**
 * Role definitions for the HR Management System
 */

export enum UserRole {
  EMPLOYEE = "Employee",
  MANAGER = "Manager",
  HR_COMPANY = "HR Company",
  CENTRAL_HR = "Central HR",
  SUPER_ADMIN = "Super Admin",
}

export enum Permission {
  // Dashboard
  VIEW_OWN_DASHBOARD = "view_own_dashboard",
  VIEW_COMPANY_DASHBOARD = "view_company_dashboard",
  VIEW_HOLDING_DASHBOARD = "view_holding_dashboard",

  // Employee Management
  VIEW_OWN_PROFILE = "view_own_profile",
  VIEW_DEPARTMENT_EMPLOYEES = "view_department_employees",
  VIEW_COMPANY_EMPLOYEES = "view_company_employees",
  VIEW_ALL_EMPLOYEES = "view_all_employees",
  EDIT_OWN_PROFILE = "edit_own_profile",
  MANAGE_COMPANY_EMPLOYEES = "manage_company_employees",
  MANAGE_ALL_EMPLOYEES = "manage_all_employees",

  // Time & Attendance
  VIEW_OWN_ATTENDANCE = "view_own_attendance",
  VIEW_DEPARTMENT_ATTENDANCE = "view_department_attendance",
  VIEW_COMPANY_ATTENDANCE = "view_company_attendance",
  MANAGE_ATTENDANCE = "manage_attendance",

  // OT Management
  REQUEST_OT = "request_ot",
  APPROVE_DEPARTMENT_OT = "approve_department_ot",
  MANAGE_COMPANY_OT = "manage_company_ot",
  MANAGE_ALL_OT = "manage_all_ot",

  // Leave Management
  REQUEST_LEAVE = "request_leave",
  APPROVE_DEPARTMENT_LEAVE = "approve_department_leave",
  MANAGE_COMPANY_LEAVE = "manage_company_leave",
  MANAGE_ALL_LEAVE = "manage_all_leave",

  // Contract Management
  VIEW_COMPANY_CONTRACTS = "view_company_contracts",
  MANAGE_COMPANY_CONTRACTS = "manage_company_contracts",
  MANAGE_CONTRACT_TEMPLATES = "manage_contract_templates",

  // Organization
  VIEW_COMPANY_ORGANIZATION = "view_company_organization",
  VIEW_ALL_ORGANIZATION = "view_all_organization",
  MANAGE_ORGANIZATION = "manage_organization",

  // Reporting
  VIEW_DEPARTMENT_REPORTS = "view_department_reports",
  VIEW_COMPANY_REPORTS = "view_company_reports",
  VIEW_CONSOLIDATED_REPORTS = "view_consolidated_reports",

  // Holiday Management
  VIEW_HOLIDAYS = "view_holidays",
  MANAGE_COMPANY_HOLIDAYS = "manage_company_holidays",
  MANAGE_ALL_HOLIDAYS = "manage_all_holidays",

  // Admin
  MANAGE_USERS = "manage_users",
  MANAGE_ROLES = "manage_roles",
  MANAGE_SYSTEM_SETTINGS = "manage_system_settings",
  VIEW_AUDIT_LOGS = "view_audit_logs",
}

export interface UserPermissions {
  roles: UserRole[];
  permissions: Permission[];
  companyId?: string | null; // For HR Company - locked to specific company
  departmentId?: string | null; // For Manager - locked to specific department
}

export interface User {
  user_id: number;
  username: string;
  display_name?: string;
  position_name?: string | null;
  role: string;
  roles?: UserRole[];
  company_id?: string | null;
  department_id?: string | null;
  email?: string;
}

export interface AuthContext {
  user: User | null;
  userPermissions: UserPermissions | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
}
