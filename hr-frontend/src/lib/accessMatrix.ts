import { UserRole } from "@/types/roles";

export type RoleViewKey = "employee" | "manager" | "hr_company" | "central_hr" | "super_admin" | "unknown";

type RoleResolutionInput = {
  role_level?: number | string | null;
  role_name?: string | null;
  role?: string | null;
  roles?: Array<UserRole | string> | null;
};

const ROLE_LEVEL_MAP: Record<number, UserRole> = {
  1: UserRole.EMPLOYEE,
  20: UserRole.MANAGER,
  50: UserRole.HR_COMPANY,
  80: UserRole.CENTRAL_HR,
  99: UserRole.SUPER_ADMIN,
};

const ROLE_PRIORITY: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.CENTRAL_HR,
  UserRole.HR_COMPANY,
  UserRole.MANAGER,
  UserRole.EMPLOYEE,
];

function normalizeRoleName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function parseRoleName(raw: string): UserRole | null {
  const normalized = normalizeRoleName(raw);

  if (normalized === "super admin") return UserRole.SUPER_ADMIN;
  if (normalized === "central hr" || normalized === "center hr") return UserRole.CENTRAL_HR;
  if (normalized === "hr company" || normalized === "company hr") return UserRole.HR_COMPANY;
  if (normalized === "manager") return UserRole.MANAGER;
  if (normalized === "employee") return UserRole.EMPLOYEE;

  return null;
}

export function resolvePrimaryRole(userLike?: RoleResolutionInput | null): UserRole | null {
  if (!userLike) return null;

  const roleLevel = Number(userLike.role_level || 0);
  if (roleLevel in ROLE_LEVEL_MAP) {
    return ROLE_LEVEL_MAP[roleLevel];
  }

  const fromRoleName = userLike.role_name ? parseRoleName(String(userLike.role_name)) : null;
  if (fromRoleName) return fromRoleName;

  const fromRole = userLike.role ? parseRoleName(String(userLike.role)) : null;
  if (fromRole) return fromRole;

  const roleCandidates = Array.isArray(userLike.roles)
    ? userLike.roles
        .map((role) => parseRoleName(String(role)))
        .filter((role): role is UserRole => Boolean(role))
    : [];

  if (roleCandidates.length === 0) return null;

  return ROLE_PRIORITY.find((role) => roleCandidates.includes(role)) || roleCandidates[0] || null;
}

export function resolveRoleViewKey(userLike?: RoleResolutionInput | null): RoleViewKey {
  const role = resolvePrimaryRole(userLike);

  switch (role) {
    case UserRole.EMPLOYEE:
      return "employee";
    case UserRole.MANAGER:
      return "manager";
    case UserRole.HR_COMPANY:
      return "hr_company";
    case UserRole.CENTRAL_HR:
      return "central_hr";
    case UserRole.SUPER_ADMIN:
      return "super_admin";
    default:
      return "unknown";
  }
}

export type ModuleKey =
  | "dashboard"
  | "selfService"
  | "organization"
  | "positions"
  | "employees"
  | "attendance"
  | "leave"
  | "contracts"
  | "holidays"
  | "reports"
  | "payroll"
  | "approvalFlow"
  | "permissions"
  | "systemSettings"
  | "auditLog";

export interface ModuleAccessConfig {
  key: ModuleKey;
  label: string;
  path: string;
  roles: UserRole[];
  showInNav: boolean;
}

export const MODULE_ACCESS_MATRIX: Record<ModuleKey, ModuleAccessConfig> = {
  dashboard: {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  selfService: {
    key: "selfService",
    label: "Self-Service",
    path: "/self-service",
    roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  organization: {
    key: "organization",
    label: "Organization",
    path: "/organization",
    roles: [UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  positions: {
    key: "positions",
    label: "Position Master",
    path: "/positions",
    roles: [UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  employees: {
    key: "employees",
    label: "Employee",
    path: "/employees",
    roles: [UserRole.MANAGER, UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  attendance: {
    key: "attendance",
    label: "Time & Attendance",
    path: "/attendance",
    roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  leave: {
    key: "leave",
    label: "Leave",
    path: "/leave",
    roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  contracts: {
    key: "contracts",
    label: "Contract",
    path: "/contracts",
    roles: [UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  holidays: {
    key: "holidays",
    label: "Holiday",
    path: "/holidays",
    roles: [UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  reports: {
    key: "reports",
    label: "Reports",
    path: "/reports",
    roles: [UserRole.MANAGER, UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  payroll: {
    key: "payroll",
    label: "Payroll Management",
    path: "/payroll",
    roles: [UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  approvalFlow: {
    key: "approvalFlow",
    label: "Approval Flow",
    path: "/approval-flow",
    roles: [UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  permissions: {
    key: "permissions",
    label: "User & Permission",
    path: "/permissions",
    roles: [UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  systemSettings: {
    key: "systemSettings",
    label: "System Settings",
    path: "/system-settings",
    roles: [UserRole.SUPER_ADMIN],
    showInNav: true,
  },
  auditLog: {
    key: "auditLog",
    label: "Audit Logs",
    path: "/audit-log",
    roles: [UserRole.HR_COMPANY, UserRole.CENTRAL_HR, UserRole.SUPER_ADMIN],
    showInNav: true,
  },
};

export const NAV_MODULE_ORDER: ModuleKey[] = [
  "dashboard",
  "selfService",
  "organization",
  "positions",
  "employees",
  "attendance",
  "leave",
  "contracts",
  "holidays",
  "reports",
  "payroll",
  "approvalFlow",
  "permissions",
  "systemSettings",
  "auditLog",
];

export function canAccessModule(roles: UserRole[], moduleKey: ModuleKey): boolean {
  const config = MODULE_ACCESS_MATRIX[moduleKey];
  return config.roles.some((r) => roles.includes(r));
}
