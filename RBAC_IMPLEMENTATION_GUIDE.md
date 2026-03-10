# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document explains the complete role-based access control system implemented for the HR Management System.

## Architecture

### 1. Role Definitions (`src/types/roles.ts`)

The system defines 5 core roles:

- **Employee**: Basic employee with personal data access only
- **Manager**: Department head with team management capabilities
- **HR Company**: HR specialist for a specific company
- **Central HR**: Head office HR with multi-company visibility
- **Super Admin**: System administrator with full access

### 2. Permission System

Each role is mapped to a set of permissions in `src/lib/permissions.ts`

### 3. Auth Context (`src/contexts/AuthContext.tsx`)

Centralized authentication and permission management using React Context

## Usage Patterns

### Pattern 1: Check Permission in Component

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/types/roles";

function MyComponent() {
  const { hasPermission } = useAuth();

  if (!hasPermission(Permission.MANAGE_COMPANY_EMPLOYEES)) {
    return <div>You don't have access to this feature</div>;
  }

  return <div>Employee Management Panel</div>;
}
```

### Pattern 2: Check Multiple Permissions (ANY)

```tsx
const { hasAnyPermission } = useAuth();

if (hasAnyPermission([
  Permission.MANAGE_COMPANY_EMPLOYEES,
  Permission.MANAGE_ALL_EMPLOYEES
])) {
  // User has at least one of these permissions
}
```

### Pattern 3: Check Multiple Permissions (ALL)

```tsx
const { hasAllPermissions } = useAuth();

if (hasAllPermissions([
  Permission.VIEW_COMPANY_EMPLOYEES,
  Permission.MANAGE_COMPANY_EMPLOYEES
])) {
  // User has ALL these permissions
}
```

### Pattern 4: Check Role

```tsx
import { UserRole } from "@/types/roles";
const { hasRole } = useAuth();

if (hasRole(UserRole.HR_COMPANY)) {
  // Show HR Company specific UI
}
```

### Pattern 5: Use RoleGuard Component

```tsx
import { RoleGuard } from "@/components/RoleGuard";
import { Permission, UserRole } from "@/types/roles";

<RoleGuard
  requiredPermissions={[Permission.MANAGE_COMPANY_EMPLOYEES]}
  fallback={<div>Access Denied</div>}
>
  <EmployeeManagementPanel />
</RoleGuard>
```

### Pattern 6: Guard with Specific Role

```tsx
<RoleGuard requiredRoles={[UserRole.SUPER_ADMIN]}>
  <SystemSettings />
</RoleGuard>
```

### Pattern 7: Require ALL Permissions

```tsx
<RoleGuard
  requiredPermissions={[
    Permission.VIEW_COMPANY_EMPLOYEES,
    Permission.MANAGE_COMPANY_EMPLOYEES
  ]}
  requireAll={true}
>
  <AdvancedEmployeeOperations />
</RoleGuard>
```

## Menu Navigation Integration

The AppLayout component automatically filters menu items based on user permissions:

```tsx
// In AppLayout.tsx, navigation items have permission requirements:
const navItems: NavItem[] = [
  {
    icon: Shield,
    label: "User & Permission",
    path: "/permissions",
    roles: [UserRole.SUPER_ADMIN]  // Only Super Admin sees this
  },
  {
    icon: Users,
    label: "Employee",
    path: "/employees",
    permissions: [
      Permission.VIEW_OWN_PROFILE,
      Permission.VIEW_DEPARTMENT_EMPLOYEES,
      Permission.VIEW_COMPANY_EMPLOYEES,
      Permission.VIEW_ALL_EMPLOYEES
    ]  // Multiple permission options
  }
];

// Automatically filters visible items
const visibleNavItems = navItems.filter((item) => {
  if (item.roles && item.roles.length > 0) {
    return item.roles.some((role) => hasRole(role));
  }
  if (item.permissions && item.permissions.length > 0) {
    return hasAnyPermission(item.permissions);
  }
  return true;
});
```

## User Role Mapping

### Employee
- **Data Scope**: Own data only
- **Can View**: Own dashboard, profile, attendance, leave history
- **Can Submit**: OT requests, leave requests
- **Cannot Access**: Organization, Contract, Reports menus

### Manager
- **Data Scope**: Own data + department team
- **Can View**: Department dashboard, team profiles, team attendance
- **Can Approve**: Team OT requests, team leave requests
- **Can Access**: Reports (team only)
- **Cannot Access**: Contract, Admin menus

### HR Company
- **Data Scope**: Limited to own company
- **Can Manage**: Employees, attendance, OT, leave, contracts (company-wide)
- **Can Edit**: Company holidays, organization structure
- **Cannot Access**: Other companies' data, Admin menus
- **Note**: Company isolation is enforced - visibility restricted to companyId filter

### Central HR
- **Data Scope**: All companies (read-mostly)
- **Can View**: All employees, reports from all companies
- **Can Create**: Contract templates for other HRs to use
- **Can Edit**: Holiday calendar (affects all companies)
- **Can Cross-Transfer**: Move employees between companies
- **Cannot Edit**: Daily employee data (HR Company's responsibility)

### Super Admin
- **Data Scope**: Full system access
- **Can Manage**: Users, roles, system settings, all data
- **Can View**: Audit logs
- **Unrestricted**: All menus and operations

## Multi-Role Support

Users can have multiple roles simultaneously. The system applies "Highest Privilege Wins" logic:

```tsx
// Example: User is both Manager (Accounting) and HR Company (Company A)
// Roles: [Manager, HR Company]
// Departments: Accounting
// Company: Company A

// Dashboard: Shows company-wide data (uses HR Company privilege)
// Leave Approvals: Filter to show Accounting team only (uses Manager privilege)
// Reports: Can export company-wide reports (uses HR Company privilege)
```

### Permission Resolution Logic:

1. **Collect all permissions** from all assigned roles
2. **For data filtering**: Use the most restricting role that applies
3. **For feature access**: Use union of all role permissions
4. **For approval workflows**: Apply role-specific filters

## Implementing Role Checks in Pages

```tsx
// File: src/pages/employees.tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/components/RoleGuard";
import { Permission, UserRole } from "@/types/roles";
import EmployeeList from "@/routes/EmployeeList";

export default function EmployeesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RoleGuard
          requiredPermissions={[
            Permission.VIEW_OWN_PROFILE,
            Permission.VIEW_DEPARTMENT_EMPLOYEES,
            Permission.VIEW_COMPANY_EMPLOYEES,
            Permission.VIEW_ALL_EMPLOYEES
          ]}
          fallback={
            <div className="p-4 text-destructive">
              You don't have permission to access this page.
            </div>
          }
        >
          <EmployeeList />
        </RoleGuard>
      </AppLayout>
    </ProtectedRoute>
  );
}
```

## Data Filtering by Role

When fetching data, filter based on user role and scope:

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { UserRole, Permission } from "@/types/roles";

function EmployeeList() {
  const { userPermissions, hasPermission, hasRole } = useAuth();

  useEffect(() => {
    const fetchEmployees = async () => {
      let endpoint = "/employees";

      if (hasRole(UserRole.EMPLOYEE)) {
        // Employee sees only themselves
        endpoint = `/employees/me`;
      } else if (hasRole(UserRole.MANAGER)) {
        // Manager sees team members
        const deptId = userPermissions?.departmentId;
        endpoint = `/employees?department=${deptId}`;
      } else if (hasRole(UserRole.HR_COMPANY)) {
        // HR sees their company
        const companyId = userPermissions?.companyId;
        endpoint = `/employees?company=${companyId}`;
      } else if (hasRole(UserRole.CENTRAL_HR) || hasRole(UserRole.SUPER_ADMIN)) {
        // Central HR and Super Admin see all
        endpoint = `/employees`;
      }

      const data = await apiGet(endpoint);
      setEmployees(data);
    };

    fetchEmployees();
  }, [userPermissions]);
}
```

## Backend Integration

The backend should:

1. Return user roles in login response:
```json
{
  "user_id": 1,
  "username": "john.doe",
  "roles": ["Manager", "HR Company"],
  "company_id": "COMP001",
  "department_id": "ACC",
  "role": "Manager"  // Primary role
}
```

2. Enforce permissions on API endpoints:
```javascript
// Express middleware example
const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!permissions.some(p => req.user.permissions.includes(p))) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// Usage
router.get("/employees",
  requirePermission(["view_company_employees"]),
  employeeController.getEmployees
);
```

3. Filter data based on user scope:
```javascript
const getEmployees = async (req, res) => {
  let query = {};

  if (req.user.role === "Manager") {
    query.departmentId = req.user.department_id;
  } else if (req.user.role === "HR Company") {
    query.companyId = req.user.company_id;
  }
  // Central HR and Super Admin: no filter

  const employees = await Employee.find(query);
  res.json(employees);
};
```

## Testing Permissions

```tsx
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";

function PermissionTest() {
  const {
    user,
    userPermissions,
    hasPermission,
    hasRole,
    hasAnyPermission,
  } = useAuth();

  return (
    <div className="p-4 space-y-2">
      <p>User: {user?.username}</p>
      <p>Roles: {userPermissions?.roles.join(", ")}</p>
      <p>Company: {userPermissions?.companyId}</p>
      <p>Department: {userPermissions?.departmentId}</p>
      <p>Permissions: {userPermissions?.permissions.length}</p>

      <hr />

      <p>Can manage employees? {hasPermission(Permission.MANAGE_COMPANY_EMPLOYEES) ? "✅" : "❌"}</p>
      <p>Is Manager? {hasRole(UserRole.MANAGER) ? "✅" : "❌"}</p>
      <p>Can do approval? {hasAnyPermission([
        Permission.APPROVE_DEPARTMENT_LEAVE,
        Permission.MANAGE_ALL_LEAVE
      ]) ? "✅" : "❌"}</p>
    </div>
  );
}
```

## Summary

This RBAC system provides:

✅ Flexible role and permission management
✅ Multi-role support per user
✅ Component-level access control
✅ Automatic menu filtering
✅ Data scope isolation
✅ Backend integration ready
✅ Easy to extend with new roles/permissions
