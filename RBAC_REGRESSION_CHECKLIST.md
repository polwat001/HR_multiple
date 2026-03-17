# RBAC Regression Checklist (5 Roles x All Modules)

Use this checklist after RBAC/security changes to validate both UI access and backend data scope.

## Test Roles
- Employee (role_level=1)
- Manager (role_level=20)
- HR Company (role_level=50)
- Central HR (role_level=80)
- Super Admin (role_level=99)

## Expected Module Visibility (Frontend)

| Module | Employee | Manager | HR Company | Central HR | Super Admin |
|---|---|---|---|---|---|
| Dashboard | Yes | Yes | Yes | Yes | Yes |
| Self-Service | Yes | Yes | Yes | Yes | Yes |
| Organization | No | No | Yes | Yes | Yes |
| Position Master | No | No | Yes | Yes | Yes |
| Employee | No | Yes | Yes | Yes | Yes |
| Time & Attendance | Yes | Yes | Yes | Yes | Yes |
| Leave | Yes | Yes | Yes | Yes | Yes |
| Contact Directory | Yes | Yes | Yes | Yes | Yes |
| Contract | No | No | Yes | Yes | Yes |
| Holiday | No | No | Yes | Yes | Yes |
| Reports | No | Yes | Yes | Yes | Yes |
| Payroll Management | No | No | Yes | Yes | Yes |
| Approval Flow | No | No | No | Yes | Yes |
| User & Permission | No | No | No | No | Yes |
| System Settings | No | No | No | No | Yes |
| Audit Logs | No | No | Yes | Yes | Yes |

## Data Scope Rules (Backend)
- Employee: own records only.
- Manager: self + direct team only.
- HR Company: same company only.
- Central HR: all companies.
- Super Admin: all companies.

## API Regression Matrix

### 1) Employees
- [ ] GET /api/employees
- [ ] GET /api/employees/:id
- [ ] POST /api/employees
- [ ] PUT /api/employees/:id
- [ ] DELETE /api/employees/:id

Checks:
- [ ] Employee cannot access list/details outside own record.
- [ ] Manager cannot access non-team employee.
- [ ] HR Company cannot create/update/delete employee in another company.
- [ ] Central HR/Super Admin can access all.

### 2) Attendance
- [ ] GET /api/attendance
- [ ] POST /api/attendance/check-in
- [ ] POST /api/attendance/check-out

Checks:
- [ ] Employee sees own only.
- [ ] Manager sees self + team.
- [ ] HR Company sees own company only.

### 3) Leave
- [ ] GET /api/leaves/requests
- [ ] GET /api/leaves/balances
- [ ] GET /api/leaves/types
- [ ] POST /api/leaves/request
- [ ] PUT /api/leaves/:id/status

Checks:
- [ ] Employee cannot approve leave.
- [ ] Manager approves only team scope.
- [ ] HR Company approves only company scope.

### 4) OT
- [ ] GET /api/ot/requests
- [ ] GET /api/ot/summary
- [ ] POST /api/ot/request
- [ ] PUT /api/ot/:id/status

Checks:
- [ ] Employee cannot approve OT.
- [ ] Manager approves only team scope.
- [ ] HR Company approves only company scope.

### 5) Organization
- [ ] GET /api/organization/companies
- [ ] GET /api/organization/departments
- [ ] POST /api/organization/departments
- [ ] PUT /api/organization/departments/:id
- [ ] DELETE /api/organization/departments/:id
- [ ] GET /api/organization/positions
- [ ] POST /api/organization/positions
- [ ] PUT /api/organization/positions/:id
- [ ] DELETE /api/organization/positions/:id

Checks:
- [ ] Non-HR roles cannot mutate org.
- [ ] HR Company mutates own company only.

### 6) Contracts
- [ ] GET /api/contracts
- [ ] GET /api/contracts/templates
- [ ] POST /api/contracts/templates

Checks:
- [ ] HR Company reads/creates templates in own company only.
- [ ] Central HR/Super Admin can operate across companies.

### 7) Holidays
- [ ] GET /api/holidays
- [ ] GET /api/holidays/upcoming
- [ ] POST /api/holidays
- [ ] PUT /api/holidays/:id
- [ ] DELETE /api/holidays/:id

Checks:
- [ ] HR Company cannot edit/delete holidays outside company scope.

### 8) Reports
- [ ] GET /api/reports/dashboard
- [ ] GET /api/reports/attendance
- [ ] GET /api/reports/ot

Checks:
- [ ] Scope follows role policy (self/team/company/all).

### 9) Admin
- [ ] GET /api/admin/audit-logs
- [ ] GET /api/admin/approval-flows
- [ ] PUT /api/admin/approval-flows
- [ ] GET /api/admin/leave-policies
- [ ] PUT /api/admin/leave-policies
- [ ] GET /api/admin/system-settings
- [ ] PUT /api/admin/system-settings
- [ ] POST /api/admin/system-actions/:actionKey
- [ ] GET /api/admin/payroll-settings
- [ ] PUT /api/admin/payroll-settings/:employeeId
- [ ] GET /api/admin/permission-matrix
- [ ] PUT /api/admin/permission-matrix/:roleName

Checks:
- [ ] HR Company audit/payroll/leave policy reads are company-scoped.
- [ ] Approval Flow read/write restricted by policy.
- [ ] System Settings read/write restricted by policy.
- [ ] Permission Matrix restricted to Super Admin.

### 10) Users & Role Assignment
- [ ] GET /api/users
- [ ] GET /api/users/:id
- [ ] POST /api/users
- [ ] PUT /api/users/:id
- [ ] DELETE /api/users/:id
- [ ] POST /api/users/:id/assign-role
- [ ] DELETE /api/users/:id/remove-role

Checks:
- [ ] Manager/Employee denied.
- [ ] HR Company cannot affect users outside own company scope.

## Negative Security Cases (Must Fail)
- [ ] HR Company updates employee from another company by direct ID.
- [ ] HR Company updates payroll setting for another company employee.
- [ ] HR Company reads all contract templates by bypassing UI.
- [ ] Employee calls admin endpoints directly.
- [ ] Manager approves leave/OT of non-team user.

## Execution Notes
- Run each case with real JWT from each role.
- Verify both HTTP status and response rows (not just status code).
- Keep at least 2 companies and 2 departments populated to validate isolation.
