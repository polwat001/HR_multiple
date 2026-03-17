const db = require('../config/db');

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = `${CURRENT_YEAR}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
const LEAVE_TYPE_DEFAULTS = [
  { code: 'annual', name: 'Annual Leave', defaultQuota: 6, isPaidLeave: 1 },
  { code: 'sick', name: 'Sick Leave', defaultQuota: 30, isPaidLeave: 1 },
  { code: 'personal', name: 'Personal Leave', defaultQuota: 3, isPaidLeave: 0 },
  { code: 'maternity', name: 'Maternity Leave', defaultQuota: 98, isPaidLeave: 1 },
];

const inferLeaveTypeCodeFromName = (name) => {
  const value = String(name || '').toLowerCase();
  if (value.includes('vacation') || value.includes('annual') || value.includes('พักร้อน') || value.includes('พักผ่อน')) return 'annual';
  if (value.includes('sick') || value.includes('ป่วย')) return 'sick';
  if (value.includes('personal') || value.includes('กิจ')) return 'personal';
  if (value.includes('maternity') || value.includes('คลอด')) return 'maternity';
  return null;
};

async function runSafe(query, params = [], label = 'query') {
  try {
    await db.query(query, params);
    return true;
  } catch (error) {
    console.warn(`[seed:mock] skip ${label}: ${error.code || error.message}`);
    return false;
  }
}

async function ensureSupportTables() {
  await runSafe(
    `CREATE TABLE IF NOT EXISTS approval_flow_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      module_key VARCHAR(50) NOT NULL,
      level1 VARCHAR(100) NOT NULL,
      level2 VARCHAR(100) NOT NULL,
      level3 VARCHAR(100) NOT NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_module_key (module_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    'create approval_flow_configs'
  );

  await runSafe(
    `CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value_json JSON NOT NULL,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    'create system_settings'
  );

  await runSafe(
    `CREATE TABLE IF NOT EXISTS leave_policy_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      service_years DECIMAL(6,2) NOT NULL DEFAULT 1,
      vacation_days DECIMAL(6,2) NOT NULL DEFAULT 6,
      sick_cert_required_after_days INT NOT NULL DEFAULT 2,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_leave_policy_company (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    'create leave_policy_configs'
  );

  await runSafe(
    `CREATE TABLE IF NOT EXISTS payroll_employee_settings (
      employee_id INT NOT NULL PRIMARY KEY,
      basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
      bank_name VARCHAR(50) NOT NULL DEFAULT 'SCB',
      bank_account_no VARCHAR(50) NOT NULL DEFAULT '',
      tax_dependent INT NOT NULL DEFAULT 0,
      life_insurance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
      sso_enabled TINYINT(1) NOT NULL DEFAULT 1,
      updated_by INT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    'create payroll_employee_settings'
  );

  await runSafe(
    `CREATE TABLE IF NOT EXISTS contract_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      html_content LONGTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    'create contract_templates'
  );

  await runSafe(
    `CREATE TABLE IF NOT EXISTS approvals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      approval_type VARCHAR(50) NULL,
      request_reason TEXT NULL,
      requested_by INT NOT NULL,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      approved_by INT NULL,
      requested_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      approved_date DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    'create approvals'
  );

  await runSafe(
    `CREATE TABLE IF NOT EXISTS public_holidays (
      id INT AUTO_INCREMENT PRIMARY KEY,
      holiday_date DATE NOT NULL,
      name VARCHAR(255) NOT NULL,
      company_id INT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
    [],
    'create public_holidays'
  );

  await runSafe(
    `ALTER TABLE leave_balances
     ADD UNIQUE KEY uniq_leave_balance_employee_type_year (employee_id, leave_type_id, year);`,
    [],
    'ensure unique leave_balances key'
  );

  await runSafe(
    `ALTER TABLE approvals ADD COLUMN approval_type VARCHAR(50) NULL`,
    [],
    'ensure approvals.approval_type'
  );

  await runSafe(
    `ALTER TABLE approvals ADD COLUMN request_reason TEXT NULL`,
    [],
    'ensure approvals.request_reason'
  );

  await runSafe(
    `ALTER TABLE approvals ADD COLUMN requested_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    [],
    'ensure approvals.requested_date'
  );

  await runSafe(
    `ALTER TABLE leave_types ADD COLUMN leave_type_code VARCHAR(32) NULL AFTER name`,
    [],
    'ensure leave_types.leave_type_code'
  );

  await runSafe(
    `UPDATE leave_types
     SET leave_type_code = CASE
       WHEN LOWER(name) LIKE '%vacation%' OR LOWER(name) LIKE '%annual%' OR name LIKE '%พักร้อน%' OR name LIKE '%พักผ่อน%' THEN 'annual'
       WHEN LOWER(name) LIKE '%sick%' OR name LIKE '%ป่วย%' THEN 'sick'
       WHEN LOWER(name) LIKE '%personal%' OR name LIKE '%กิจ%' THEN 'personal'
       WHEN LOWER(name) LIKE '%maternity%' OR name LIKE '%คลอด%' THEN 'maternity'
       ELSE CONCAT('custom_', id)
     END
     WHERE leave_type_code IS NULL OR leave_type_code = ''`,
    [],
    'backfill leave_types.leave_type_code'
  );

  await runSafe(
    `ALTER TABLE leave_types ADD UNIQUE KEY uniq_leave_type_company_code (company_id, leave_type_code);`,
    [],
    'ensure unique leave_types company+code'
  );
}

async function getCurrentMonthDateRange() {
  const baseDate = new Date(`${CURRENT_MONTH}-01T00:00:00`);
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
  return { startDate, endDate, year, month };
}

async function seedLeaveTypes() {
  const [companies] = await db.query(`SELECT id FROM companies ORDER BY id ASC`);

  for (const company of companies) {
    const companyId = Number(company.id);

    for (const leaveType of LEAVE_TYPE_DEFAULTS) {
      await runSafe(
        `INSERT INTO leave_types (company_id, leave_type_code, name, default_quota, is_paid_leave)
         SELECT ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1
           FROM leave_types
           WHERE company_id = ? AND leave_type_code = ?
         );`,
        [
          companyId,
          leaveType.code,
          leaveType.name,
          leaveType.defaultQuota,
          leaveType.isPaidLeave,
          companyId,
          leaveType.code,
        ],
        `seed leave_type ${leaveType.code} company:${companyId}`
      );
    }
  }
}

async function normalizeLeaveTypesByCode() {
  const [rows] = await db.query(
    `SELECT company_id, leave_type_code, GROUP_CONCAT(id ORDER BY id ASC) AS ids
     FROM leave_types
     WHERE leave_type_code IS NOT NULL AND leave_type_code <> ''
     GROUP BY company_id, leave_type_code
     HAVING COUNT(*) > 1`
  );

  for (const row of rows) {
    const ids = String(row.ids || '')
      .split(',')
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (ids.length <= 1) continue;

    const canonicalId = ids[0];
    const duplicateIds = ids.slice(1);

    for (const duplicateId of duplicateIds) {
      await runSafe(
        `UPDATE leave_balances lb_keep
         JOIN leave_balances lb_dup
           ON lb_keep.employee_id = lb_dup.employee_id
          AND lb_keep.year = lb_dup.year
         SET lb_keep.quota = GREATEST(lb_keep.quota, lb_dup.quota),
             lb_keep.used = GREATEST(lb_keep.used, lb_dup.used),
             lb_keep.pending = GREATEST(lb_keep.pending, lb_dup.pending),
             lb_keep.balance = GREATEST(lb_keep.balance, lb_dup.balance)
         WHERE lb_keep.leave_type_id = ?
           AND lb_dup.leave_type_id = ?`,
        [canonicalId, duplicateId],
        `consolidate leave_balances duplicate leave_type_id ${duplicateId}`
      );

      await runSafe(
        `UPDATE leave_requests SET leave_type_id = ? WHERE leave_type_id = ?`,
        [canonicalId, duplicateId],
        `merge leave_requests duplicate leave_type_id ${duplicateId}`
      );

      await runSafe(
        `UPDATE leave_balances lb
         LEFT JOIN leave_balances lb_keep
           ON lb_keep.employee_id = lb.employee_id
          AND lb_keep.year = lb.year
          AND lb_keep.leave_type_id = ?
         SET lb.leave_type_id = ?
         WHERE lb.leave_type_id = ?
           AND lb_keep.id IS NULL`,
        [canonicalId, canonicalId, duplicateId],
        `move non-overlap leave_balances duplicate leave_type_id ${duplicateId}`
      );

      await runSafe(
        `DELETE FROM leave_balances WHERE leave_type_id = ?`,
        [duplicateId],
        `delete leave_balances duplicate leave_type_id ${duplicateId}`
      );

      await runSafe(
        `DELETE FROM leave_types WHERE id = ?`,
        [duplicateId],
        `delete leave_types duplicate id ${duplicateId}`
      );
    }
  }

  const [leftovers] = await db.query(`SELECT id, name FROM leave_types WHERE leave_type_code IS NULL OR leave_type_code = ''`);
  for (const row of leftovers) {
    const fallbackCode = inferLeaveTypeCodeFromName(row.name) || `custom_${row.id}`;
    await runSafe(
      `UPDATE leave_types SET leave_type_code = ? WHERE id = ?`,
      [fallbackCode, Number(row.id)],
      `patch leave_type_code id:${row.id}`
    );
  }

  await runSafe(
    `ALTER TABLE leave_types ADD UNIQUE KEY uniq_leave_type_company_code (company_id, leave_type_code);`,
    [],
    're-ensure unique leave_types company+code'
  );
}

async function seedApprovalFlows() {
  const rows = [
    ['leave', 'Manager', 'HR Company', 'Central HR'],
    ['ot', 'Manager', 'HR Company', 'Central HR'],
    ['payroll', 'HR Company', 'Central HR', '-'],
  ];

  for (const row of rows) {
    await runSafe(
      `INSERT INTO approval_flow_configs (module_key, level1, level2, level3, updated_by)
       VALUES (?, ?, ?, ?, NULL)
       ON DUPLICATE KEY UPDATE
         level1 = VALUES(level1),
         level2 = VALUES(level2),
         level3 = VALUES(level3),
         updated_at = CURRENT_TIMESTAMP;`,
      row,
      `seed approval_flow ${row[0]}`
    );
  }
}

async function seedSystemSettings() {
  const settings = [
    ['groupName', { value: 'HR Group Holding' }],
    ['defaultTimezone', { value: 'Asia/Bangkok' }],
  ];

  for (const [key, valueJson] of settings) {
    await runSafe(
      `INSERT INTO system_settings (setting_key, setting_value_json, updated_by)
       VALUES (?, ?, NULL)
       ON DUPLICATE KEY UPDATE
         setting_value_json = VALUES(setting_value_json),
         updated_at = CURRENT_TIMESTAMP;`,
      [key, JSON.stringify(valueJson)],
      `seed system_setting ${key}`
    );
  }
}

async function seedLeavePolicies() {
  await runSafe(
    `INSERT INTO leave_policy_configs
      (company_id, service_years, vacation_days, sick_cert_required_after_days, is_active, updated_by)
     SELECT c.id, 1, 6, 2, 1, NULL
     FROM companies c
     WHERE NOT EXISTS (
       SELECT 1 FROM leave_policy_configs lp WHERE lp.company_id = c.id
     );`,
    [],
    'seed leave_policy_configs'
  );
}

async function seedPayrollSettings() {
  await runSafe(
    `INSERT INTO payroll_employee_settings
      (employee_id, basic_salary, bank_name, bank_account_no, tax_dependent, life_insurance_deduction, sso_enabled, updated_by)
     SELECT e.id, 30000, 'SCB', CONCAT('000', LPAD(e.id, 7, '0')), 0, 0, 1, NULL
     FROM employees e
     WHERE NOT EXISTS (
       SELECT 1 FROM payroll_employee_settings ps WHERE ps.employee_id = e.id
     );`,
    [],
    'seed payroll_employee_settings'
  );
}

async function seedContractTemplates() {
  const [companies] = await db.query(`SELECT id FROM companies ORDER BY id ASC`);

  const templates = [
    {
      name: 'Standard Employment Contract',
      content:
        'Employment agreement between {{company_name}} and {{employee_name}} as {{position}} with salary {{salary}} from {{start_date}} to {{end_date}}.',
    },
    {
      name: 'Probation Contract',
      content:
        '{{employee_name}} starts probation role {{position}} at {{company_name}} from {{start_date}} to {{end_date}} with salary {{salary}}.',
    },
  ];

  for (const company of companies) {
    const companyId = Number(company.id);

    for (const tpl of templates) {
      await runSafe(
        `INSERT INTO contract_templates (company_id, name, html_content)
         SELECT ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1
           FROM contract_templates
           WHERE company_id = ? AND name = ?
         );`,
        [companyId, tpl.name, tpl.content, companyId, tpl.name],
        `seed contract_template ${tpl.name} company:${companyId}`
      );
    }
  }
}

async function seedLeaveBalances() {
  await runSafe(
    `INSERT INTO leave_balances (employee_id, leave_type_id, year, quota, used, pending, balance)
     SELECT
       e.id,
       lt.id,
       ?,
       CASE
         WHEN lt.leave_type_code = 'annual' THEN COALESCE(lp.vacation_days, 6)
         WHEN lt.leave_type_code = 'sick' THEN 30
         WHEN lt.leave_type_code = 'personal' THEN 3
         WHEN lt.leave_type_code = 'maternity' THEN 98
         ELSE COALESCE(lp.vacation_days, 6)
       END AS quota,
       0 AS used,
       0 AS pending,
       CASE
         WHEN lt.leave_type_code = 'annual' THEN COALESCE(lp.vacation_days, 6)
         WHEN lt.leave_type_code = 'sick' THEN 30
         WHEN lt.leave_type_code = 'personal' THEN 3
         WHEN lt.leave_type_code = 'maternity' THEN 98
         ELSE COALESCE(lp.vacation_days, 6)
       END AS balance
     FROM employees e
    JOIN leave_types lt ON lt.company_id = e.company_id
     LEFT JOIN leave_policy_configs lp ON lp.company_id = e.company_id AND lp.is_active = 1
     WHERE NOT EXISTS (
       SELECT 1
       FROM leave_balances lb
       WHERE lb.employee_id = e.id
         AND lb.leave_type_id = lt.id
         AND lb.year = ?
     );`,
    [CURRENT_YEAR, CURRENT_YEAR],
    'seed leave_balances'
  );
}

async function seedAttendances() {
  const [employees] = await db.query(`SELECT id FROM employees ORDER BY id ASC`);
  if (!employees.length) return;

  const { year, month } = await getCurrentMonthDateRange();
  const plan = [
    { day: 3, status: 'present', checkIn: '08:58:00', checkOut: '17:35:00' },
    { day: 4, status: 'late', checkIn: '09:17:00', checkOut: '18:02:00' },
    { day: 5, status: 'present', checkIn: '08:55:00', checkOut: '17:42:00' },
    { day: 6, status: 'present', checkIn: '09:01:00', checkOut: '17:48:00' },
    { day: 7, status: 'absent', checkIn: null, checkOut: null },
  ];

  for (const employee of employees) {
    for (const row of plan) {
      const workDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`;

      await runSafe(
        `INSERT INTO attendances (employee_id, work_date, check_in_time, check_out_time, status, is_manual_edit)
         SELECT ?, ?, ?, ?, ?, 0
         WHERE NOT EXISTS (
           SELECT 1
           FROM attendances
           WHERE employee_id = ? AND work_date = ?
         );`,
        [
          Number(employee.id),
          workDate,
          row.checkIn ? `${workDate} ${row.checkIn}` : null,
          row.checkOut ? `${workDate} ${row.checkOut}` : null,
          row.status,
          Number(employee.id),
          workDate,
        ],
        `seed attendance employee:${employee.id} ${workDate}`
      );
    }
  }
}

async function seedLeaveRequests() {
  const [employees] = await db.query(
    `SELECT id, company_id, manager_id
     FROM employees
     ORDER BY id ASC
     LIMIT 6`
  );

  for (const employee of employees) {
    const employeeId = Number(employee.id);
    const companyId = Number(employee.company_id || 0);

    const [leaveTypes] = await db.query(
      `SELECT id, name, leave_type_code
       FROM leave_types
       WHERE company_id = ?
       ORDER BY id ASC`,
      [companyId]
    );

    if (!leaveTypes.length) continue;

    const vacationType = leaveTypes.find((lt) => String(lt.leave_type_code || '') === 'annual') || leaveTypes[0];
    const sickType = leaveTypes.find((lt) => String(lt.leave_type_code || '') === 'sick') || leaveTypes[0];
    const approverId = Number(employee.manager_id || 0) || null;

    const rows = [
      {
        leaveTypeId: Number(vacationType.id),
        startDate: `${CURRENT_YEAR}-03-12`,
        endDate: `${CURRENT_YEAR}-03-12`,
        totalDays: 1,
        reason: 'Annual leave for personal errands',
        status: 'approved',
      },
      {
        leaveTypeId: Number(sickType.id),
        startDate: `${CURRENT_YEAR}-03-24`,
        endDate: `${CURRENT_YEAR}-03-24`,
        totalDays: 1,
        reason: 'Medical appointment',
        status: 'pending',
      },
    ];

    for (const row of rows) {
      await runSafe(
        `INSERT INTO leave_requests
          (employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id, status)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1
           FROM leave_requests
           WHERE employee_id = ?
             AND leave_type_id = ?
             AND start_date = ?
             AND end_date = ?
         );`,
        [
          employeeId,
          row.leaveTypeId,
          row.startDate,
          row.endDate,
          row.totalDays,
          row.reason,
          approverId,
          row.status,
          employeeId,
          row.leaveTypeId,
          row.startDate,
          row.endDate,
        ],
        `seed leave_request employee:${employeeId} ${row.startDate}`
      );
    }
  }
}

async function seedOtRequests() {
  const [employees] = await db.query(
    `SELECT id, manager_id
     FROM employees
     ORDER BY id ASC
     LIMIT 6`
  );

  for (const employee of employees) {
    const employeeId = Number(employee.id);
    const approverId = Number(employee.manager_id || 0) || null;

    const rows = [
      {
        requestDate: `${CURRENT_YEAR}-03-11`,
        startTime: `${CURRENT_YEAR}-03-11 18:00:00`,
        endTime: `${CURRENT_YEAR}-03-11 20:00:00`,
        totalHours: 2,
        reason: 'Support production release',
        status: 'approved',
      },
      {
        requestDate: `${CURRENT_YEAR}-03-20`,
        startTime: `${CURRENT_YEAR}-03-20 18:30:00`,
        endTime: `${CURRENT_YEAR}-03-20 20:00:00`,
        totalHours: 1.5,
        reason: 'Client urgent request',
        status: 'pending',
      },
    ];

    for (const row of rows) {
      await runSafe(
        `INSERT INTO ot_requests
          (employee_id, request_date, start_time, end_time, total_hours, reason, approver_id, status)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1
           FROM ot_requests
           WHERE employee_id = ?
             AND request_date = ?
             AND start_time = ?
         );`,
        [
          employeeId,
          row.requestDate,
          row.startTime,
          row.endTime,
          row.totalHours,
          row.reason,
          approverId,
          row.status,
          employeeId,
          row.requestDate,
          row.startTime,
        ],
        `seed ot_request employee:${employeeId} ${row.requestDate}`
      );
    }
  }
}

async function seedApprovals() {
  const [users] = await db.query(
    `SELECT id
     FROM users
     ORDER BY id ASC
     LIMIT 6`
  );

  if (!users.length) return;

  const rows = [
    { approvalType: 'leave', requestReason: 'Leave request pending approval', status: 'pending', day: 10 },
    { approvalType: 'ot', requestReason: 'OT request waiting for manager', status: 'pending', day: 15 },
    { approvalType: 'leave', requestReason: 'Leave request approved', status: 'approved', day: 5 },
  ];

  for (let i = 0; i < rows.length; i += 1) {
    const userId = Number(users[i % users.length].id);
    const row = rows[i];
    const requestedDate = `${CURRENT_YEAR}-03-${String(row.day).padStart(2, '0')} 09:00:00`;

    await runSafe(
      `INSERT INTO approvals
        (approval_type, request_reason, requested_by, status, approved_by, requested_date, approved_date)
       SELECT ?, ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1
         FROM approvals
         WHERE requested_by = ?
           AND approval_type = ?
           AND requested_date = ?
       );`,
      [
        row.approvalType,
        row.requestReason,
        userId,
        row.status,
        row.status === 'approved' ? userId : null,
        requestedDate,
        row.status === 'approved' ? requestedDate : null,
        userId,
        row.approvalType,
        requestedDate,
      ],
      `seed approvals ${row.approvalType} ${row.status}`
    );
  }
}

async function seedPublicHolidays() {
  const rows = [
    { date: `${CURRENT_YEAR}-04-06`, name: 'Chakri Memorial Day' },
    { date: `${CURRENT_YEAR}-04-13`, name: 'Songkran Festival Day 1' },
    { date: `${CURRENT_YEAR}-05-01`, name: 'National Labour Day' },
  ];

  for (const row of rows) {
    await runSafe(
      `INSERT INTO public_holidays (holiday_date, name, company_id)
       SELECT ?, ?, NULL
       WHERE NOT EXISTS (
         SELECT 1
         FROM public_holidays
         WHERE holiday_date = ?
           AND name = ?
       );`,
      [row.date, row.name, row.date, row.name],
      `seed public_holiday ${row.date}`
    );
  }
}

async function normalizeLeaveBalances() {
  await runSafe(
    `UPDATE leave_balances
     SET used = 0,
         pending = 0,
         balance = quota`,
    [],
    'reset leave_balances totals'
  );

  await runSafe(
    `UPDATE leave_balances lb
     LEFT JOIN (
       SELECT
         employee_id,
         leave_type_id,
         YEAR(start_date) AS req_year,
         SUM(CASE WHEN status = 'approved' THEN total_days ELSE 0 END) AS used_days,
         SUM(CASE WHEN status = 'pending' THEN total_days ELSE 0 END) AS pending_days
       FROM leave_requests
       GROUP BY employee_id, leave_type_id, YEAR(start_date)
     ) req
       ON req.employee_id = lb.employee_id
      AND req.leave_type_id = lb.leave_type_id
      AND req.req_year = lb.year
     SET lb.used = COALESCE(req.used_days, 0),
         lb.pending = COALESCE(req.pending_days, 0),
         lb.balance = GREATEST(lb.quota - COALESCE(req.used_days, 0) - COALESCE(req.pending_days, 0), 0)`,
    [],
    'normalize leave_balances totals'
  );
}

async function main() {
  console.log('[seed:mock] start');

  await ensureSupportTables();
  await seedLeaveTypes();
  await normalizeLeaveTypesByCode();
  await seedApprovalFlows();
  await seedSystemSettings();
  await seedLeavePolicies();
  await seedPayrollSettings();
  await seedContractTemplates();
  await seedLeaveBalances();
  await seedAttendances();
  await seedLeaveRequests();
  await seedOtRequests();
  await seedApprovals();
  await seedPublicHolidays();
  await normalizeLeaveBalances();

  console.log(`[seed:mock] done for year ${CURRENT_YEAR}`);
  await db.end();
}

main().catch(async (error) => {
  console.error('[seed:mock] failed:', error);
  try {
    await db.end();
  } catch (endError) {
    // ignore
  }
  process.exit(1);
});
