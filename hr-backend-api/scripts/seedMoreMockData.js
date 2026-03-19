const db = require('../config/db');

const DEFAULT_COUNT = 12;

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function pad(num, width) {
  return String(num).padStart(width, '0');
}

function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = pad(dateObj.getMonth() + 1, 2);
  const d = pad(dateObj.getDate(), 2);
  return `${y}-${m}-${d}`;
}

async function getLookups() {
  const [[roles], [companies], [departments], [positions], [managers], [maxCodeRows]] = await Promise.all([
    db.query('SELECT id, role_name FROM roles'),
    db.query('SELECT id FROM companies ORDER BY id ASC'),
    db.query('SELECT id, company_id FROM departments ORDER BY id ASC'),
    db.query('SELECT id, company_id FROM positions ORDER BY id ASC'),
    db.query(
      `SELECT e.id, e.company_id
       FROM employees e
       JOIN user_roles ur ON ur.user_id = e.user_id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.role_level >= 20 AND e.status = 'active'
       ORDER BY e.id ASC`
    ),
    db.query(
      `SELECT employee_code
       FROM employees
       WHERE employee_code REGEXP '^E[0-9]+$'
       ORDER BY CAST(SUBSTRING(employee_code, 2) AS UNSIGNED) DESC
       LIMIT 1`
    ),
  ]);

  const roleIdByName = new Map(roles.map((r) => [String(r.role_name), Number(r.id)]));
  const companyIds = companies.map((c) => Number(c.id));
  const deptByCompany = new Map();
  const positionByCompany = new Map();
  const managerByCompany = new Map();

  for (const d of departments) {
    const cId = Number(d.company_id);
    if (!deptByCompany.has(cId)) deptByCompany.set(cId, []);
    deptByCompany.get(cId).push(Number(d.id));
  }

  for (const p of positions) {
    const cId = Number(p.company_id);
    if (!positionByCompany.has(cId)) positionByCompany.set(cId, []);
    positionByCompany.get(cId).push(Number(p.id));
  }

  for (const m of managers) {
    const cId = Number(m.company_id);
    if (!managerByCompany.has(cId)) managerByCompany.set(cId, []);
    managerByCompany.get(cId).push(Number(m.id));
  }

  const maxCodeText = maxCodeRows[0]?.employee_code || 'E0000';
  const maxCodeNum = Number(String(maxCodeText).replace(/^E/, '')) || 0;

  return {
    roleIdByName,
    companyIds,
    deptByCompany,
    positionByCompany,
    managerByCompany,
    nextEmployeeCodeNum: maxCodeNum + 1,
  };
}

async function seedMore() {
  const count = toInt(process.argv[2], DEFAULT_COUNT);
  const batchTag = `${Date.now()}`.slice(-8);
  const now = new Date();
  const today = formatDate(now);
  const leaveDate = formatDate(new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5));

  const lookups = await getLookups();
  const employeeRoleId = lookups.roleIdByName.get('Employee');
  if (!employeeRoleId) {
    throw new Error('Role "Employee" not found');
  }
  if (!lookups.companyIds.length) {
    throw new Error('No companies found');
  }

  const createdEmployees = [];
  let codeNum = lookups.nextEmployeeCodeNum;

  for (let i = 0; i < count; i += 1) {
    const companyId = lookups.companyIds[i % lookups.companyIds.length];
    const deptPool = lookups.deptByCompany.get(companyId) || [];
    const posPool = lookups.positionByCompany.get(companyId) || [];
    const managerPool = lookups.managerByCompany.get(companyId) || [];

    const departmentId = deptPool.length ? deptPool[i % deptPool.length] : null;
    const positionId = posPool.length ? posPool[i % posPool.length] : null;
    const managerId = managerPool.length ? managerPool[i % managerPool.length] : null;

    const rowNo = i + 1;
    const username = `mock_${batchTag}_${pad(rowNo, 3)}`;
    const employeeCode = `E${pad(codeNum, 4)}`;
    codeNum += 1;

    const [userInsert] = await db.query(
      `INSERT INTO users (username, password_hash, status)
       VALUES (?, '1234', 'active')`,
      [username]
    );

    const userId = Number(userInsert.insertId);
    const firstName = `Mock${pad(rowNo, 2)}`;
    const lastName = `Data${batchTag}`;

    const [employeeInsert] = await db.query(
      `INSERT INTO employees
        (user_id, employee_code, firstname_th, lastname_th, company_id, department_id, position_id, manager_id, hire_date, employment_type, status, phone, email)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, 'full_time', 'active', ?, ?)`,
      [
        userId,
        employeeCode,
        firstName,
        lastName,
        companyId,
        departmentId,
        positionId,
        managerId,
        today,
        `08${pad((30000000 + rowNo) % 100000000, 8)}`,
        `${username}@mock.local`,
      ]
    );

    const employeeId = Number(employeeInsert.insertId);

    await db.query(
      `INSERT INTO user_roles (user_id, role_id, company_id, department_id)
       VALUES (?, ?, ?, ?)`,
      [userId, employeeRoleId, companyId, departmentId]
    );

    createdEmployees.push({ employeeId, userId, companyId, managerId, username });
  }

  // Ensure leave balances for new employees in current year.
  const currentYear = new Date().getFullYear();
  for (const item of createdEmployees) {
    const [leaveTypes] = await db.query(
      `SELECT id, leave_type_code
       FROM leave_types
       WHERE company_id = ?
       ORDER BY id ASC`,
      [item.companyId]
    );

    for (const lt of leaveTypes) {
      const code = String(lt.leave_type_code || '').toLowerCase();
      const quota = code === 'annual' ? 6 : code === 'sick' ? 30 : code === 'personal' ? 3 : code === 'maternity' ? 98 : 6;
      await db.query(
        `INSERT INTO leave_balances (employee_id, leave_type_id, year, quota, used, pending, balance)
         VALUES (?, ?, ?, ?, 0, 0, ?)
         ON DUPLICATE KEY UPDATE quota = VALUES(quota), balance = GREATEST(balance, VALUES(balance))`,
        [item.employeeId, Number(lt.id), currentYear, quota, quota]
      );
    }

    if (leaveTypes.length > 0) {
      const annual = leaveTypes.find((lt) => String(lt.leave_type_code || '').toLowerCase() === 'annual') || leaveTypes[0];
      await db.query(
        `INSERT INTO leave_requests
          (employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id, status)
         VALUES (?, ?, ?, ?, 1, ?, ?, 'pending')`,
        [item.employeeId, Number(annual.id), leaveDate, leaveDate, `Extra mock leave ${batchTag}`, item.managerId]
      );
    }

    await db.query(
      `INSERT INTO ot_requests
        (employee_id, request_date, start_time, end_time, total_hours, reason, approver_id, status)
       VALUES (?, ?, ?, ?, 2, ?, ?, 'pending')`,
      [
        item.employeeId,
        today,
        `${today} 18:00:00`,
        `${today} 20:00:00`,
        `Extra mock OT ${batchTag}`,
        item.managerId,
      ]
    );

    for (let d = 1; d <= 3; d += 1) {
      const dt = new Date(now.getTime() - 1000 * 60 * 60 * 24 * d);
      const workDate = formatDate(dt);
      await db.query(
        `INSERT INTO attendances (employee_id, work_date, check_in_time, check_out_time, status, is_manual_edit)
         VALUES (?, ?, ?, ?, 'present', 0)`,
        [item.employeeId, workDate, `${workDate} 09:00:00`, `${workDate} 18:00:00`]
      );
    }
  }

  console.log(`[seed:mock:more] added users/employees: ${createdEmployees.length}`);
  console.log(`[seed:mock:more] batch tag: ${batchTag}`);
}

seedMore()
  .then(async () => {
    await db.query('SELECT 1');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[seed:mock:more] failed:', error.code || error.message);
    process.exit(1);
  });
