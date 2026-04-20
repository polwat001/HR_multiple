import { UserRole } from "@/types/roles";

type JsonRecord = Record<string, unknown>;

type MockEmployee = {
  id: number;
  user_id: number;
  employee_code: string;
  username: string;
  display_name: string;
  role: UserRole;
  role_level: number;
  company_id: string;
  company_name: string;
  department_id: string;
  department_name: string;
  position_id: string;
  position_name: string;
  status: string;
  joined_date: string;
  salary: number;
  email: string;
};

type MockLeaveRequest = {
  id: number;
  employee_id: number;
  employee_name: string;
  department_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type MockOtRequest = {
  id: number;
  employee_id: number;
  employee_name: string;
  department_name: string;
  work_date: string;
  hours: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
};

type MockUser = {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  role: UserRole;
  role_name: UserRole;
  role_level: number;
  company_id: string;
  department_id: string;
  status: "active" | "inactive";
  email: string;
};

type MockDatabase = {
  companies: Array<{ id: string; company_name: string; company_code: string }>;
  departments: Array<{ id: string; department_name: string; company_id: string }>;
  positions: Array<{ id: string; position_name: string; department_id: string; level: string }>;
  employees: MockEmployee[];
  users: MockUser[];
  userRoles: Array<{ role_id: number; role_name: UserRole; role_level: number }>;
  permissionMatrix: Record<string, string[]>;
  contracts: Array<{ id: number; employee_id: number; contract_type: string; start_date: string; end_date: string; status: string }>;
  contractTemplates: Array<{ id: number; name: string; category: string; updated_at: string }>;
  holidays: Array<{ id: number; holiday_date: string; holiday_name_th: string; is_paid: number; company_id: string | null }>;
  leaveTypes: Array<{ id: number; leave_type: string; default_days: number }>;
  leaveBalances: Array<{ employee_id: number; leave_type: string; balance: number }>;
  leaveRequests: MockLeaveRequest[];
  leavePolicies: Array<{ leave_type: string; max_days: number; carry_forward: boolean }>;
  otRequests: MockOtRequest[];
  shifts: Array<{ id: number; name: string; start_time: string; end_time: string }>;
  schedules: Array<{ id: number; name: string; shift_id: number; employee_ids: number[] }>;
  attendance: Array<{ id: number; employee_id: number; employee_name: string; department_name: string; work_date: string; status: string; check_in: string | null; check_out: string | null }>;
  approvalFlows: Record<string, string[]>;
  payrollSettings: Array<{ id: number; key: string; value: string; description: string }>;
  systemSettings: { fiscal_year_start: string; payroll_cutoff_day: number; timezone: string };
  auditLogs: Array<{ id: number; action: string; actor: string; target: string; created_at: string }>;
};

const STORAGE_KEY = "mock.hr.db.v1";
const SESSION_TOKEN_KEY = "token";

const DEFAULT_PASSWORD = "1234";

const roleLevelMap: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.MANAGER]: 20,
  [UserRole.HR_COMPANY]: 50,
  [UserRole.CENTRAL_HR]: 80,
  [UserRole.SUPER_ADMIN]: 99,
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function baseDb(): MockDatabase {
  const companies = [
    { id: "c1", company_name: "Holding HQ", company_code: "HQ" },
    { id: "c2", company_name: "Tech Co", company_code: "TECH" },
    { id: "c3", company_name: "Retail Co", company_code: "RTL" },
  ];

  const departments = [
    { id: "d1", department_name: "IT", company_id: "c2" },
    { id: "d2", department_name: "HR", company_id: "c2" },
    { id: "d3", department_name: "Operations", company_id: "c3" },
  ];

  const positions = [
    { id: "p1", position_name: "Software Engineer", department_id: "d1", level: "L2" },
    { id: "p2", position_name: "IT Manager", department_id: "d1", level: "L4" },
    { id: "p3", position_name: "HR Officer", department_id: "d2", level: "L3" },
    { id: "p4", position_name: "Operations Manager", department_id: "d3", level: "L4" },
  ];

  const employees: MockEmployee[] = [
    {
      id: 1,
      user_id: 1,
      employee_code: "EMP-0001",
      username: "Super_Admin",
      display_name: "Super Admin",
      role: UserRole.SUPER_ADMIN,
      role_level: 99,
      company_id: "c1",
      company_name: "Holding HQ",
      department_id: "d2",
      department_name: "HR",
      position_id: "p3",
      position_name: "HR Officer",
      status: "active",
      joined_date: "2022-01-01",
      salary: 120000,
      email: "super.admin@mock.local",
    },
    {
      id: 2,
      user_id: 2,
      employee_code: "EMP-0002",
      username: "admin_central",
      display_name: "Central HR",
      role: UserRole.CENTRAL_HR,
      role_level: 80,
      company_id: "c1",
      company_name: "Holding HQ",
      department_id: "d2",
      department_name: "HR",
      position_id: "p3",
      position_name: "HR Officer",
      status: "active",
      joined_date: "2023-02-10",
      salary: 90000,
      email: "central.hr@mock.local",
    },
    {
      id: 3,
      user_id: 3,
      employee_code: "EMP-0003",
      username: "hr_tech",
      display_name: "HR Tech",
      role: UserRole.HR_COMPANY,
      role_level: 50,
      company_id: "c2",
      company_name: "Tech Co",
      department_id: "d2",
      department_name: "HR",
      position_id: "p3",
      position_name: "HR Officer",
      status: "active",
      joined_date: "2023-03-15",
      salary: 70000,
      email: "hr.tech@mock.local",
    },
    {
      id: 4,
      user_id: 4,
      employee_code: "EMP-0004",
      username: "manager_it",
      display_name: "IT Manager",
      role: UserRole.MANAGER,
      role_level: 20,
      company_id: "c2",
      company_name: "Tech Co",
      department_id: "d1",
      department_name: "IT",
      position_id: "p2",
      position_name: "IT Manager",
      status: "active",
      joined_date: "2023-07-01",
      salary: 80000,
      email: "manager.it@mock.local",
    },
    {
      id: 5,
      user_id: 5,
      employee_code: "EMP-0005",
      username: "emp_somchai",
      display_name: "Somchai",
      role: UserRole.EMPLOYEE,
      role_level: 1,
      company_id: "c2",
      company_name: "Tech Co",
      department_id: "d1",
      department_name: "IT",
      position_id: "p1",
      position_name: "Software Engineer",
      status: "active",
      joined_date: "2024-01-01",
      salary: 45000,
      email: "somchai@mock.local",
    },
  ];

  const users: MockUser[] = employees.map((employee) => ({
    id: employee.user_id,
    user_id: employee.user_id,
    username: employee.username,
    display_name: employee.display_name,
    role: employee.role,
    role_name: employee.role,
    role_level: employee.role_level,
    company_id: employee.company_id,
    department_id: employee.department_id,
    status: "active",
    email: employee.email,
  }));

  return {
    companies,
    departments,
    positions,
    employees,
    users,
    userRoles: [
      { role_id: 1, role_name: UserRole.EMPLOYEE, role_level: 1 },
      { role_id: 2, role_name: UserRole.MANAGER, role_level: 20 },
      { role_id: 3, role_name: UserRole.HR_COMPANY, role_level: 50 },
      { role_id: 4, role_name: UserRole.CENTRAL_HR, role_level: 80 },
      { role_id: 5, role_name: UserRole.SUPER_ADMIN, role_level: 99 },
    ],
    permissionMatrix: {},
    contracts: [
      { id: 1, employee_id: 5, contract_type: "Permanent", start_date: "2024-01-01", end_date: "2026-12-31", status: "active" },
      { id: 2, employee_id: 4, contract_type: "Permanent", start_date: "2023-07-01", end_date: "2027-06-30", status: "active" },
    ],
    contractTemplates: [
      { id: 1, name: "Permanent Employment", category: "employment", updated_at: new Date().toISOString() },
    ],
    holidays: [
      { id: 1, holiday_date: plusDays(7), holiday_name_th: "วันหยุดบริษัท", is_paid: 1, company_id: null },
      { id: 2, holiday_date: plusDays(14), holiday_name_th: "วันหยุดพิเศษ", is_paid: 1, company_id: "c2" },
    ],
    leaveTypes: [
      { id: 1, leave_type: "Sick Leave", default_days: 30 },
      { id: 2, leave_type: "Vacation", default_days: 10 },
      { id: 3, leave_type: "Personal Leave", default_days: 5 },
    ],
    leaveBalances: [
      { employee_id: 5, leave_type: "Sick Leave", balance: 25 },
      { employee_id: 5, leave_type: "Vacation", balance: 8 },
      { employee_id: 4, leave_type: "Vacation", balance: 7 },
    ],
    leaveRequests: [
      {
        id: 1,
        employee_id: 5,
        employee_name: "Somchai",
        department_name: "IT",
        leave_type: "Vacation",
        start_date: plusDays(3),
        end_date: plusDays(4),
        days: 2,
        reason: "Family trip",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ],
    leavePolicies: [
      { leave_type: "Sick Leave", max_days: 30, carry_forward: false },
      { leave_type: "Vacation", max_days: 10, carry_forward: true },
      { leave_type: "Personal Leave", max_days: 5, carry_forward: false },
    ],
    otRequests: [
      {
        id: 1,
        employee_id: 5,
        employee_name: "Somchai",
        department_name: "IT",
        work_date: todayIso(),
        hours: 2,
        reason: "Release deployment",
        status: "pending",
      },
    ],
    shifts: [{ id: 1, name: "Default Shift", start_time: "09:00", end_time: "18:00" }],
    schedules: [{ id: 1, name: "IT Weekday", shift_id: 1, employee_ids: [4, 5] }],
    attendance: [
      {
        id: 1,
        employee_id: 5,
        employee_name: "Somchai",
        department_name: "IT",
        work_date: todayIso(),
        status: "present",
        check_in: "09:05",
        check_out: null,
      },
    ],
    approvalFlows: {
      Vacation: [UserRole.MANAGER, UserRole.HR_COMPANY],
      "Sick Leave": [UserRole.MANAGER],
    },
    payrollSettings: [
      { id: 1, key: "ot_multiplier", value: "1.5", description: "OT multiplier" },
      { id: 2, key: "social_security_rate", value: "5", description: "Social Security %" },
    ],
    systemSettings: {
      fiscal_year_start: "01-01",
      payroll_cutoff_day: 25,
      timezone: "Asia/Bangkok",
    },
    auditLogs: [
      {
        id: 1,
        action: "system_bootstrap",
        actor: "mock_engine",
        target: "frontend",
        created_at: new Date().toISOString(),
      },
    ],
  };
}

function loadDb(): MockDatabase {
  const storage = ensureLocalStorage();
  if (!storage) return baseDb();

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    const db = baseDb();
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }

  try {
    return JSON.parse(raw) as MockDatabase;
  } catch {
    const db = baseDb();
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }
}

function saveDb(db: MockDatabase): void {
  const storage = ensureLocalStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function nowToken(username: string): string {
  return `mock-token-${username}-${Date.now()}`;
}

function withLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 80);
  });
}

function parseEndpoint(endpoint: string): { path: string; query: URLSearchParams } {
  const [path, rawQuery] = endpoint.split("?");
  return { path, query: new URLSearchParams(rawQuery || "") };
}

function getCurrentUser(db: MockDatabase): MockUser {
  const storage = ensureLocalStorage();
  const userRaw = storage?.getItem("userData");
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw) as Partial<MockUser>;
      const found = db.users.find((u) => u.username === user.username);
      if (found) return found;
    } catch {
      // no-op
    }
  }
  return db.users[0];
}

function nextId(list: Array<{ id: number }>): number {
  return list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1;
}

async function mockGet<T>(endpoint: string): Promise<T> {
  const db = loadDb();
  const { path, query } = parseEndpoint(endpoint);

  if (path === "/auth/me") {
    return withLatency(clone({ user: getCurrentUser(db) }) as T);
  }

  if (path === "/employees") return withLatency(clone(db.employees) as T);
  if (path.startsWith("/employees/")) {
    const id = Number(path.split("/")[2]);
    const employee = db.employees.find((item) => item.id === id);
    return withLatency(clone(employee || null) as T);
  }

  if (path === "/organization/companies") return withLatency(clone(db.companies) as T);
  if (path === "/organization/departments") return withLatency(clone(db.departments) as T);
  if (path === "/organization/positions") return withLatency(clone(db.positions) as T);

  if (path === "/contracts") return withLatency(clone(db.contracts) as T);
  if (path === "/contracts/templates") return withLatency(clone(db.contractTemplates) as T);

  if (path === "/holidays") return withLatency(clone(db.holidays) as T);
  if (path === "/holidays/upcoming") {
    const days = Number(query.get("days") || "30");
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days);
    const rows = db.holidays.filter((h) => new Date(h.holiday_date) <= maxDate);
    return withLatency(clone(rows) as T);
  }

  if (path === "/leaves/types") return withLatency(clone(db.leaveTypes) as T);
  if (path === "/leaves/balances") return withLatency(clone(db.leaveBalances) as T);
  if (path === "/leaves/requests") return withLatency(clone(db.leaveRequests) as T);

  if (path === "/ot/requests") {
    const month = query.get("month");
    const rows = month
      ? db.otRequests.filter((r) => r.work_date.startsWith(month))
      : db.otRequests;
    return withLatency(clone(rows) as T);
  }
  if (path === "/ot/summary") {
    const month = query.get("month") || new Date().toISOString().slice(0, 7);
    const total = db.otRequests
      .filter((row) => row.work_date.startsWith(month) && row.status === "approved")
      .reduce((sum, row) => sum + row.hours, 0);
    return withLatency(clone({ data: { total_hours: total } }) as T);
  }

  if (path === "/attendance") return withLatency(clone(db.attendance) as T);
  if (path === "/approvals/pending") {
    const rows = [...db.leaveRequests.filter((row) => row.status === "pending"), ...db.otRequests.filter((row) => row.status === "pending")];
    return withLatency(clone(rows) as T);
  }
  if (path === "/approvals") {
    return withLatency(clone({
      leaves: db.leaveRequests,
      ot: db.otRequests,
    }) as T);
  }

  if (path === "/shifts") return withLatency(clone(db.shifts) as T);
  if (path === "/schedules") return withLatency(clone(db.schedules) as T);
  if (path.match(/^\/schedules\/\d+\/employees$/)) {
    const id = Number(path.split("/")[2]);
    const schedule = db.schedules.find((row) => row.id === id);
    const rows = db.employees.filter((e) => schedule?.employee_ids.includes(e.id));
    return withLatency(clone(rows) as T);
  }

  if (path === "/users") return withLatency(clone(db.users) as T);
  if (path === "/users/roles") return withLatency(clone(db.userRoles) as T);
  if (path.startsWith("/users/")) {
    const id = Number(path.split("/")[2]);
    const user = db.users.find((row) => row.user_id === id || row.id === id);
    return withLatency(clone(user || null) as T);
  }

  if (path === "/admin/permission-matrix") {
    const role = decodeURIComponent(query.get("role") || "");
    return withLatency(clone({ matrix: db.permissionMatrix[role] || [] }) as T);
  }

  if (path === "/admin/leave-policies") return withLatency(clone(db.leavePolicies) as T);
  if (path === "/admin/approval-flows") return withLatency(clone(db.approvalFlows) as T);
  if (path === "/admin/payroll-settings") return withLatency(clone(db.payrollSettings) as T);
  if (path === "/admin/system-settings") return withLatency(clone(db.systemSettings) as T);
  if (path === "/admin/audit-logs") return withLatency(clone({ data: db.auditLogs }) as T);

  if (path === "/reports/dashboard") {
    const data = {
      total_employees: db.employees.length,
      pending_leave_requests: db.leaveRequests.filter((r) => r.status === "pending").length,
      pending_ot_requests: db.otRequests.filter((r) => r.status === "pending").length,
    };
    return withLatency(clone({ data }) as T);
  }

  if (path === "/reports/attendance") return withLatency(clone({ data: db.attendance }) as T);
  if (path === "/reports/ot") return withLatency(clone({ data: db.otRequests }) as T);

  return withLatency(clone({}) as T);
}

function pushAudit(db: MockDatabase, action: string, target: string): void {
  db.auditLogs.unshift({
    id: nextId(db.auditLogs),
    action,
    actor: getCurrentUser(db).username,
    target,
    created_at: new Date().toISOString(),
  });
}

async function mockPost<T>(endpoint: string, data: JsonRecord): Promise<T> {
  const db = loadDb();
  const { path } = parseEndpoint(endpoint);

  if (path === "/auth/login") {
    const username = String(data.username || "").trim();
    const password = String(data.password || "").trim();
    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user || password !== DEFAULT_PASSWORD) {
      throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }

    const response = {
      message: "Login success",
      token: nowToken(user.username),
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        role_name: user.role_name,
        role_level: user.role_level,
        company_id: user.company_id,
        department_id: user.department_id,
      },
    };

    pushAudit(db, "login", user.username);
    saveDb(db);
    return withLatency(clone(response) as T);
  }

  if (path === "/employees") {
    const id = nextId(db.employees);
    const companyId = String(data.company_id || "c2");
    const departmentId = String(data.department_id || "d1");
    const role = (String(data.role || UserRole.EMPLOYEE) as UserRole);
    const employee: MockEmployee = {
      id,
      user_id: id,
      employee_code: `EMP-${String(id).padStart(4, "0")}`,
      username: String(data.username || `emp_${id}`),
      display_name: String(data.display_name || data.name || `Employee ${id}`),
      role,
      role_level: roleLevelMap[role] || 1,
      company_id: companyId,
      company_name: db.companies.find((c) => c.id === companyId)?.company_name || "Tech Co",
      department_id: departmentId,
      department_name: db.departments.find((d) => d.id === departmentId)?.department_name || "IT",
      position_id: String(data.position_id || "p1"),
      position_name: db.positions.find((p) => p.id === String(data.position_id || "p1"))?.position_name || "Software Engineer",
      status: "active",
      joined_date: String(data.joined_date || todayIso()),
      salary: Number(data.salary || 30000),
      email: String(data.email || `employee${id}@mock.local`),
    };
    db.employees.unshift(employee);
    db.users.unshift({
      id,
      user_id: id,
      username: employee.username,
      display_name: employee.display_name,
      role,
      role_name: role,
      role_level: employee.role_level,
      company_id: employee.company_id,
      department_id: employee.department_id,
      status: "active",
      email: employee.email,
    });
    pushAudit(db, "create_employee", employee.username);
    saveDb(db);
    return withLatency(clone(employee) as T);
  }

  if (path === "/organization/departments") {
    const id = `d${Date.now()}`;
    const row = {
      id,
      department_name: String(data.department_name || "New Department"),
      company_id: String(data.company_id || "c2"),
    };
    db.departments.push(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path === "/organization/positions") {
    const id = `p${Date.now()}`;
    const row = {
      id,
      position_name: String(data.position_name || "New Position"),
      department_id: String(data.department_id || "d1"),
      level: String(data.level || "L1"),
    };
    db.positions.push(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path === "/holidays") {
    const row = {
      id: nextId(db.holidays),
      holiday_date: String(data.date || data.holiday_date || plusDays(10)),
      holiday_name_th: String(data.holiday_name_th || data.name || "Holiday"),
      is_paid: Number(data.is_paid || 1),
      company_id: (data.company_id ? String(data.company_id) : null),
    };
    db.holidays.push(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path === "/leaves/request") {
    const employee = getCurrentUser(db);
    const row: MockLeaveRequest = {
      id: nextId(db.leaveRequests),
      employee_id: employee.user_id,
      employee_name: employee.display_name,
      department_name: db.departments.find((d) => d.id === employee.department_id)?.department_name || "IT",
      leave_type: String(data.leave_type || "Vacation"),
      start_date: String(data.start_date || todayIso()),
      end_date: String(data.end_date || todayIso()),
      days: Number(data.days || 1),
      reason: String(data.reason || "-") ,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    db.leaveRequests.unshift(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path === "/contracts/templates") {
    const row = {
      id: nextId(db.contractTemplates),
      name: String(data.name || "New Template"),
      category: String(data.category || "general"),
      updated_at: new Date().toISOString(),
    };
    db.contractTemplates.unshift(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path === "/users") {
    const id = nextId(db.users);
    const role = (String(data.role || UserRole.EMPLOYEE) as UserRole);
    const row: MockUser = {
      id,
      user_id: id,
      username: String(data.username || `user_${id}`),
      display_name: String(data.display_name || data.username || `User ${id}`),
      role,
      role_name: role,
      role_level: roleLevelMap[role] || 1,
      company_id: String(data.company_id || "c2"),
      department_id: String(data.department_id || "d1"),
      status: "active",
      email: String(data.email || `user${id}@mock.local`),
    };
    db.users.unshift(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path.match(/^\/users\/\d+\/assign-role$/)) {
    const userId = Number(path.split("/")[2]);
    const role = String(data.role_name || data.role || UserRole.EMPLOYEE) as UserRole;
    const user = db.users.find((u) => u.user_id === userId || u.id === userId);
    if (user) {
      user.role = role;
      user.role_name = role;
      user.role_level = roleLevelMap[role] || 1;
      const employee = db.employees.find((e) => e.user_id === userId);
      if (employee) {
        employee.role = role;
        employee.role_level = user.role_level;
      }
      saveDb(db);
    }
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/admin\/system-actions\//)) {
    const action = path.split("/").pop() || "run";
    pushAudit(db, "system_action", action);
    saveDb(db);
    return withLatency(clone({ success: true, action }) as T);
  }

  if (path === "/shifts") {
    const row = {
      id: nextId(db.shifts),
      name: String(data.name || `Shift ${db.shifts.length + 1}`),
      start_time: String(data.start_time || "09:00"),
      end_time: String(data.end_time || "18:00"),
    };
    db.shifts.push(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path === "/schedules") {
    const row = {
      id: nextId(db.schedules),
      name: String(data.name || `Schedule ${db.schedules.length + 1}`),
      shift_id: Number(data.shift_id || 1),
      employee_ids: Array.isArray(data.employee_ids)
        ? data.employee_ids.map((v) => Number(v))
        : [getCurrentUser(db).user_id],
    };
    db.schedules.push(row);
    saveDb(db);
    return withLatency(clone(row) as T);
  }

  if (path.match(/^\/approvals\/\d+\/(approve|reject)$/)) {
    const id = Number(path.split("/")[2]);
    const action = path.split("/")[3];
    const status: "approved" | "rejected" = action === "approve" ? "approved" : "rejected";

    const leave = db.leaveRequests.find((row) => row.id === id);
    if (leave) leave.status = status;

    const ot = db.otRequests.find((row) => row.id === id);
    if (ot) ot.status = status;

    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/(attendance|ot)\/\d+\/(checkin|checkout|approve|reject)$/)) {
    return withLatency(clone({ success: true }) as T);
  }

  return withLatency(clone({ success: true }) as T);
}

async function mockPut<T>(endpoint: string, data: JsonRecord): Promise<T> {
  const db = loadDb();
  const { path } = parseEndpoint(endpoint);

  if (path.match(/^\/employees\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const row = db.employees.find((e) => e.id === id);
    if (row) {
      Object.assign(row, data);
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path.match(/^\/holidays\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const row = db.holidays.find((h) => h.id === id);
    if (row) {
      row.holiday_date = String(data.date || data.holiday_date || row.holiday_date);
      row.holiday_name_th = String(data.holiday_name_th || row.holiday_name_th);
      row.is_paid = Number(data.is_paid ?? row.is_paid);
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path.match(/^\/organization\/departments\/.+$/)) {
    const id = path.split("/")[3];
    const row = db.departments.find((d) => d.id === id);
    if (row) {
      row.department_name = String(data.department_name || row.department_name);
      row.company_id = String(data.company_id || row.company_id);
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path.match(/^\/organization\/positions\/.+$/)) {
    const id = path.split("/")[3];
    const row = db.positions.find((p) => p.id === id);
    if (row) {
      row.position_name = String(data.position_name || row.position_name);
      row.department_id = String(data.department_id || row.department_id);
      row.level = String(data.level || row.level);
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path === "/admin/leave-policies") {
    const rows = Array.isArray(data.rows) ? (data.rows as MockDatabase["leavePolicies"]) : [];
    db.leavePolicies = rows;
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/leaves\/\d+\/status$/)) {
    const id = Number(path.split("/")[2]);
    const row = db.leaveRequests.find((leave) => leave.id === id);
    if (row) {
      const nextStatus = String(data.status || row.status);
      if (nextStatus === "approved" || nextStatus === "rejected" || nextStatus === "pending") {
        row.status = nextStatus;
      }
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path.match(/^\/ot\/\d+\/status$/)) {
    const id = Number(path.split("/")[2]);
    const row = db.otRequests.find((ot) => ot.id === id);
    if (row) {
      const nextStatus = String(data.status || row.status);
      if (nextStatus === "approved" || nextStatus === "rejected" || nextStatus === "pending") {
        row.status = nextStatus;
      }
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path.match(/^\/users\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const row = db.users.find((u) => u.user_id === id || u.id === id);
    if (row) {
      if (data.status === "active" || data.status === "inactive") {
        row.status = data.status;
      }
      if (typeof data.display_name === "string") row.display_name = data.display_name;
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path.match(/^\/users\/\d+\/change-password$/)) {
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/admin\/permission-matrix\//)) {
    const roleName = decodeURIComponent(path.split("/").slice(-1)[0]);
    db.permissionMatrix[roleName] = Array.isArray(data.matrix)
      ? data.matrix.map((item) => String(item))
      : [];
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path === "/admin/approval-flows") {
    db.approvalFlows = (data.flowMap as Record<string, string[]>) || {};
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/admin\/payroll-settings\/\d+$/)) {
    const id = Number(path.split("/")[3]);
    const row = db.payrollSettings.find((s) => s.id === id);
    if (row) {
      row.value = String(data.value || row.value);
      row.description = String(data.description || row.description);
      saveDb(db);
      return withLatency(clone(row) as T);
    }
  }

  if (path === "/admin/system-settings") {
    db.systemSettings = {
      ...db.systemSettings,
      ...data,
    };
    saveDb(db);
    return withLatency(clone(db.systemSettings) as T);
  }

  return withLatency(clone({ success: true }) as T);
}

async function mockDelete<T>(endpoint: string): Promise<T> {
  const db = loadDb();
  const { path } = parseEndpoint(endpoint);

  if (path.match(/^\/employees\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    db.employees = db.employees.filter((e) => e.id !== id);
    db.users = db.users.filter((u) => u.user_id !== id && u.id !== id);
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/holidays\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    db.holidays = db.holidays.filter((h) => h.id !== id);
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/organization\/departments\/.+$/)) {
    const id = path.split("/")[3];
    db.departments = db.departments.filter((d) => d.id !== id);
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/organization\/positions\/.+$/)) {
    const id = path.split("/")[3];
    db.positions = db.positions.filter((p) => p.id !== id);
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  if (path.match(/^\/users\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    db.users = db.users.filter((u) => u.user_id !== id && u.id !== id);
    saveDb(db);
    return withLatency(clone({ success: true }) as T);
  }

  return withLatency(clone({ success: true }) as T);
}

export function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userData");
}

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = String(options.method || "GET").toUpperCase();
  const body = options.body ? (JSON.parse(String(options.body)) as JsonRecord) : {};

  if (method === "GET") return mockGet<T>(endpoint);
  if (method === "POST") return mockPost<T>(endpoint, body);
  if (method === "PUT") return mockPut<T>(endpoint, body);
  if (method === "DELETE") return mockDelete<T>(endpoint);

  throw new Error(`Unsupported mock method: ${method}`);
}

export function apiGet<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: "GET" });
}

export function apiPost<T>(endpoint: string, data: JsonRecord): Promise<T> {
  return apiCall<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function apiPut<T>(endpoint: string, data: JsonRecord): Promise<T> {
  return apiCall<T>(endpoint, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiCall<T>(endpoint, { method: "DELETE" });
}

export function apiDeleteWithBody<T>(endpoint: string, data: JsonRecord): Promise<T> {
  void data;
  return apiDelete<T>(endpoint);
}

export function logout(): void {
  clearAuthStorage();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function resetMockDatabase(): void {
  const storage = ensureLocalStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(SESSION_TOKEN_KEY);
}
