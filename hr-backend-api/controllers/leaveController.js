const db = require('../config/db');

const DEFAULT_LEAVE_APPROVAL_CONFIG = {
    level1: 'Manager',
    level2: 'HR Company',
    level3: 'Central HR',
    escalation_days: 3,
    delegate_role: 'HR Company',
};

const normalizeUserRoles = (user) => {
    const roleList = Array.isArray(user?.roles) && user.roles.length > 0
        ? user.roles
        : [user?.role_name].filter(Boolean);
    return roleList.map((role) => String(role || '').trim()).filter(Boolean);
};

const calculatePendingDays = (createdAtLike) => {
    const createdAt = createdAtLike ? new Date(createdAtLike) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return 0;
    const diffMs = Date.now() - createdAt.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const appendAuditLogSafe = async ({ user_id, username, action, target, ip_address, metadata }) => {
    try {
        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id || null, username || null, action, target || null, ip_address || null, JSON.stringify(metadata || {})]
        );
    } catch (error) {
        // keep transactional flow intact even if audit write fails
        console.error('Leave Audit Log Error:', error.message);
    }
};

async function getLeaveApprovalConfig() {
    try {
        const [flowRows] = await db.query(
            `SELECT level1, level2, level3
             FROM approval_flow_configs
             WHERE module_key = 'leave'
             LIMIT 1`
        );
        const [policyRows] = await db.query(
            `SELECT escalation_days, delegate_role
             FROM approval_flow_policies
             WHERE module_key = 'leave'
             LIMIT 1`
        );

        const flow = flowRows[0] || {};
        const policy = policyRows[0] || {};

        return {
            level1: String(flow.level1 || DEFAULT_LEAVE_APPROVAL_CONFIG.level1),
            level2: String(flow.level2 || DEFAULT_LEAVE_APPROVAL_CONFIG.level2),
            level3: String(flow.level3 || DEFAULT_LEAVE_APPROVAL_CONFIG.level3),
            escalation_days: Math.max(0, Number(policy.escalation_days || DEFAULT_LEAVE_APPROVAL_CONFIG.escalation_days)),
            delegate_role: String(policy.delegate_role || DEFAULT_LEAVE_APPROVAL_CONFIG.delegate_role),
        };
    } catch (error) {
        // Fallback defaults when config tables are not ready yet.
        return { ...DEFAULT_LEAVE_APPROVAL_CONFIG };
    }
}

const canApproveByFlow = ({ userRoles, approvalConfig, pendingDays }) => {
    const level1Role = String(approvalConfig.level1 || '').trim();
    const level2Role = String(approvalConfig.level2 || '').trim();
    const level3Role = String(approvalConfig.level3 || '').trim();
    const delegateRole = String(approvalConfig.delegate_role || '').trim();
    const escalationDays = Math.max(0, Number(approvalConfig.escalation_days || 0));
    const configuredRoles = [level1Role, level2Role, level3Role].filter((r) => r && r !== '-');

    const hasLevel1 = Boolean(level1Role) && userRoles.includes(level1Role);
    const hasHigherLevel = [level2Role, level3Role].some((r) => r && r !== '-' && userRoles.includes(r));
    const hasConfiguredRole = configuredRoles.some((r) => userRoles.includes(r));

    if (hasLevel1) {
        return { allowed: true };
    }

    if (hasHigherLevel) {
        if (pendingDays >= escalationDays) return { allowed: true };
        return {
            allowed: false,
            reason: `คำร้องยังไม่ถึงเกณฑ์ escalation (${pendingDays}/${escalationDays} วัน)`,
        };
    }

    if (!hasConfiguredRole && delegateRole && userRoles.includes(delegateRole)) {
        if (pendingDays >= escalationDays) return { allowed: true };
        return {
            allowed: false,
            reason: `สิทธิ์ delegate ใช้งานได้เมื่อคำร้องค้างอย่างน้อย ${escalationDays} วัน`,
        };
    }

    return { allowed: false, reason: 'บทบาทของคุณไม่อยู่ในสายอนุมัติที่ตั้งค่าไว้' };
};

let leaveTypeCodeSchemaReady = false;

const inferLeaveTypeCodeFromName = (leaveTypeName) => {
    const name = String(leaveTypeName || '').toLowerCase();

    if (name.includes('vacation') || name.includes('annual') || name.includes('พักร้อน') || name.includes('พักผ่อน')) {
        return 'annual';
    }
    if (name.includes('sick') || name.includes('ป่วย')) {
        return 'sick';
    }
    if (name.includes('personal') || name.includes('กิจ')) {
        return 'personal';
    }
    if (name.includes('maternity') || name.includes('คลอด')) {
        return 'maternity';
    }
    return 'other';
};

const buildLeaveTypeCodeSql = (alias = 'lt') => `
    COALESCE(
        NULLIF(${alias}.leave_type_code, ''),
        CASE
            WHEN LOWER(${alias}.name) LIKE '%vacation%' OR LOWER(${alias}.name) LIKE '%annual%' OR ${alias}.name LIKE '%พักร้อน%' OR ${alias}.name LIKE '%พักผ่อน%' THEN 'annual'
            WHEN LOWER(${alias}.name) LIKE '%sick%' OR ${alias}.name LIKE '%ป่วย%' THEN 'sick'
            WHEN LOWER(${alias}.name) LIKE '%personal%' OR ${alias}.name LIKE '%กิจ%' THEN 'personal'
            WHEN LOWER(${alias}.name) LIKE '%maternity%' OR ${alias}.name LIKE '%คลอด%' THEN 'maternity'
            ELSE CONCAT('custom_', ${alias}.id)
        END
    )`;

const ensureLeaveTypeCodeSchema = async () => {
    if (leaveTypeCodeSchemaReady) return;

    await db.query(`ALTER TABLE leave_types ADD COLUMN leave_type_code VARCHAR(32) NULL AFTER name`).catch(() => {});
    await db.query(
        `UPDATE leave_types
         SET leave_type_code = CASE
           WHEN LOWER(name) LIKE '%vacation%' OR LOWER(name) LIKE '%annual%' OR name LIKE '%พักร้อน%' OR name LIKE '%พักผ่อน%' THEN 'annual'
           WHEN LOWER(name) LIKE '%sick%' OR name LIKE '%ป่วย%' THEN 'sick'
           WHEN LOWER(name) LIKE '%personal%' OR name LIKE '%กิจ%' THEN 'personal'
           WHEN LOWER(name) LIKE '%maternity%' OR name LIKE '%คลอด%' THEN 'maternity'
           ELSE CONCAT('custom_', id)
         END
         WHERE leave_type_code IS NULL OR leave_type_code = ''`
    ).catch(() => {});
    await db.query(`ALTER TABLE leave_types MODIFY leave_type_code VARCHAR(32) NOT NULL`).catch(() => {});
    await db.query(`ALTER TABLE leave_types ADD UNIQUE KEY uniq_leave_type_company_code (company_id, leave_type_code)`).catch(() => {});

    leaveTypeCodeSchemaReady = true;
};

const inferDefaultQuotaByLeaveType = (leaveTypeCode, leaveTypeName, vacationDays) => {
    const code = String(leaveTypeCode || '').toLowerCase() || inferLeaveTypeCodeFromName(leaveTypeName);

    if (code === 'annual') {
        return Number(vacationDays || 6);
    }
    if (code === 'sick') {
        return 30;
    }
    if (code === 'personal') {
        return 3;
    }
    if (code === 'maternity') {
        return 98;
    }
    return Number(vacationDays || 6);
};

const buildEmployeeScope = (user, employeeAlias = 'e') => {
    const { user_id, role_level, company_id } = user;
    let clause = '';
    const params = [];

    if (role_level >= 80) {
        // Super Admin & Central HR
    } else if (role_level === 50) {
        clause = ` AND ${employeeAlias}.company_id = ?`;
        params.push(company_id);
    } else if (role_level === 20) {
        clause = ` AND (${employeeAlias}.user_id = ? OR ${employeeAlias}.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
        params.push(user_id, user_id);
    } else {
        clause = ` AND ${employeeAlias}.user_id = ?`;
        params.push(user_id);
    }

    return { clause, params };
};

const ensureLeaveBalancesForYear = async (user, year) => {
    await ensureLeaveTypeCodeSchema();

    const scope = buildEmployeeScope(user, 'e');

    const [employees] = await db.query(
        `SELECT e.id, e.company_id
         FROM employees e
         WHERE 1=1 ${scope.clause}`,
        scope.params
    );

    if (!employees.length) return;

    const [leaveTypes] = await db.query(
        `SELECT id, name, company_id, leave_type_code
         FROM leave_types
         ORDER BY id ASC`
    );

    if (!leaveTypes.length) return;

    const [policyRows] = await db.query(
        `SELECT company_id, vacation_days
         FROM leave_policy_configs
         WHERE is_active = 1`
    );
    const policyByCompany = new Map(policyRows.map((row) => [Number(row.company_id), Number(row.vacation_days || 6)]));

    for (const employee of employees) {
        const employeeId = Number(employee.id);
        const companyId = Number(employee.company_id || 0);
        const vacationDays = policyByCompany.get(companyId) || 6;

        const companyLeaveTypes = leaveTypes.filter((leaveType) => Number(leaveType.company_id || 0) === companyId);
        const globalLeaveTypes = leaveTypes.filter((leaveType) => leaveType.company_id === null || leaveType.company_id === undefined);
        const allowedLeaveTypes =
            companyLeaveTypes.length > 0
                ? companyLeaveTypes
                : globalLeaveTypes.length > 0
                    ? globalLeaveTypes
                    : leaveTypes;

        for (const leaveType of allowedLeaveTypes) {
            const leaveTypeId = Number(leaveType.id);
            const quota = inferDefaultQuotaByLeaveType(leaveType.leave_type_code, leaveType.name, vacationDays);

            await db.query(
                `INSERT INTO leave_balances (employee_id, leave_type_id, year, quota, used, pending, balance)
                 VALUES (?, ?, ?, ?, 0, 0, ?)
                 ON DUPLICATE KEY UPDATE
                    quota = quota`,
                [employeeId, leaveTypeId, year, quota, quota]
            );
        }
    }

    await db.query(
        `UPDATE leave_balances lb
         JOIN (
           SELECT lr.employee_id, lr.leave_type_id,
                  SUM(CASE WHEN lr.status = 'approved' THEN lr.total_days ELSE 0 END) AS used_days,
                  SUM(CASE WHEN lr.status = 'pending' THEN lr.total_days ELSE 0 END) AS pending_days
           FROM leave_requests lr
           WHERE YEAR(lr.start_date) = ?
           GROUP BY lr.employee_id, lr.leave_type_id
         ) req
           ON req.employee_id = lb.employee_id AND req.leave_type_id = lb.leave_type_id
         SET lb.used = COALESCE(req.used_days, 0),
             lb.pending = COALESCE(req.pending_days, 0),
             lb.balance = GREATEST(lb.quota - COALESCE(req.used_days, 0) - COALESCE(req.pending_days, 0), 0)
         WHERE lb.year = ?`,
        [year, year]
    );
};

// 1. ดึงข้อมูลประวัติคำร้องขอลางาน (Leave Requests)
exports.getLeaveRequests = async (req, res) => {
    try {
        await ensureLeaveTypeCodeSchema();

        const { user_id, role_level, company_id } = req.user;
        const leaveApprovalScope = req.user?.module_scopes?.leave_approval_scope;
        
        let sql = `
            SELECT 
                lr.id, 
                lr.start_date, 
                lr.end_date, 
                lr.total_days, 
                lr.reason, 
                lr.status, 
                lr.created_at,
                ${buildLeaveTypeCodeSql('lt')} AS leave_type_code,
                lt.name AS leave_type_name,
                e.user_id,
                e.employee_code, 
                e.firstname_th, 
                e.lastname_th
            FROM leave_requests lr
            JOIN leave_types lt ON lr.leave_type_id = lt.id
            JOIN employees e ON lr.employee_id = e.id
            WHERE 1=1
        `;
        
        const params = [];

        // ⭐️ กรองข้อมูลตามสิทธิ์ (RBAC)
        if (leaveApprovalScope === 'manager') {
            // Overlapping role case: if user is both HR Company + Manager, use manager scope for leave approval queue.
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } else if (role_level >= 80) {
            // Super Admin & Central HR ดูได้หมด
        } else if (role_level === 50) {
            // HR Company ดูได้เฉพาะคนในบริษัทตัวเอง
            sql += ` AND e.company_id = ?`;
            params.push(company_id);
        } else if (role_level === 20) {
            // Manager ดูได้เฉพาะ "ตัวเอง" และ "ลูกทีม" (รออนุมัติ)
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } else {
            // Employee ดูประวัติการลาของตัวเองเท่านั้น
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        sql += ` ORDER BY lr.created_at DESC LIMIT 100`;

        const [requests] = await db.query(sql, params);

        res.status(200).json({ 
            message: 'ดึงข้อมูลประวัติการลาสำเร็จ',
            count: requests.length,
            data: requests 
        });

    } catch (error) {
        console.error('Get Leave Requests Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลา' });
    }
};

// 2. ดึงข้อมูลกระเป๋าวันลาคงเหลือ (Leave Balances) ประจำปี
exports.getLeaveBalances = async (req, res) => {
    try {
        await ensureLeaveTypeCodeSchema();

        const { user_id, role_level, company_id } = req.user;
        const currentYear = new Date().getFullYear(); // ดึงปีปัจจุบัน (เช่น 2026)

        await ensureLeaveBalancesForYear(req.user, currentYear);
        
        let sql = `
            SELECT 
                lb.id, 
                lb.year, 
                lb.quota, 
                lb.used, 
                lb.pending, 
                lb.balance,
                ${buildLeaveTypeCodeSql('lt')} AS leave_type_code,
                lt.name AS leave_type_name,
                e.user_id,
                e.firstname_th, 
                e.lastname_th
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            JOIN employees e ON lb.employee_id = e.id
            WHERE lb.year = ?
        `;
        
        const params = [currentYear];

        // ⭐️ กรองข้อมูลตามสิทธิ์เหมือนเดิมเป๊ะๆ
        if (role_level >= 80) {
            // Pass
        } else if (role_level === 50) {
            sql += ` AND e.company_id = ?`;
            params.push(company_id);
        } else if (role_level === 20) {
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } else {
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        const [balances] = await db.query(sql, params);

        res.status(200).json({ 
            message: `ดึงข้อมูลกระเป๋าวันลาปี ${currentYear} สำเร็จ`,
            data: balances 
        });

    } catch (error) {
        console.error('Get Leave Balances Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงยอดวันลาคงเหลือ' });
    }
};

exports.getLeaveTypes = async (req, res) => {
    try {
        await ensureLeaveTypeCodeSchema();

        const { role_level, company_id, user_id } = req.user;

        let sql = `
            SELECT lt.id, lt.name, ${buildLeaveTypeCodeSql('lt')} AS leave_type_code
            FROM leave_types lt
            WHERE 1=1
        `;
        const params = [];

        if (Number(role_level || 0) >= 80) {
            // Super Admin & Central HR can read all leave types.
        } else if (Number(role_level || 0) === 50) {
            sql += ` AND lt.company_id = ?`;
            params.push(company_id);
        } else {
            const [empRows] = await db.query(
                `SELECT company_id
                 FROM employees
                 WHERE user_id = ?
                 LIMIT 1`,
                [user_id]
            );

            if (!empRows.length) {
                return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงานสำหรับผู้ใช้งานนี้' });
            }

            const employeeCompanyId = empRows[0].company_id;
            if (employeeCompanyId === null || employeeCompanyId === undefined) {
                // Fallback for legacy employee rows without company_id mapping.
                // In this case do not scope by company and return available leave types.
            } else {
                sql += ` AND (lt.company_id = ? OR lt.company_id IS NULL)`;
                params.push(employeeCompanyId);
            }
        }

        sql += ` ORDER BY lt.id ASC`;

        const [rows] = await db.query(sql, params);
        const dedupedByCode = new Map();

        rows.forEach((row) => {
            const code = String(row.leave_type_code || `custom_${row.id}`);
            const existing = dedupedByCode.get(code);
            if (!existing || Number(row.id) < Number(existing.id)) {
                dedupedByCode.set(code, {
                    id: Number(row.id),
                    name: row.name,
                    leave_type_code: code,
                });
            }
        });

        const normalizedRows = Array.from(dedupedByCode.values()).sort((a, b) => a.id - b.id);

        res.status(200).json({
            message: 'ดึงประเภทการลาสำเร็จ',
            count: normalizedRows.length,
            data: normalizedRows,
        });
    } catch (error) {
        console.error('Get Leave Types Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงประเภทการลา' });
    }
};
// 3. สร้างคำร้องขอลางานใหม่ (Create Leave Request)
exports.createLeaveRequest = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { leave_type_id, start_date, end_date, total_days, reason } = req.body;

        // หา employee_id จาก user_id
        const [emp] = await db.query(`SELECT id, manager_id FROM employees WHERE user_id = ?`, [user_id]);
        if (emp.length === 0) return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงาน' });

        const employee_id = emp[0].id;
        const approver_id = emp[0].manager_id; // ดึงหัวหน้ามาเป็นผู้อนุมัติอัตโนมัติ

        // เช็คกระเป๋าวันลา (ตรวจสอบโควต้า)
        const currentYear = new Date().getFullYear();
        const [balance] = await db.query(
            `SELECT balance FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
            [employee_id, leave_type_id, currentYear]
        );

        if (balance.length === 0 || balance[0].balance < total_days) {
            return res.status(400).json({ message: 'โควต้าวันลาไม่เพียงพอ' });
        }

        // บันทึกใบลา
        await db.query(
            `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id]
        );

        res.status(201).json({ message: 'ส่งคำร้องขอลางานเรียบร้อยแล้ว' });

    } catch (error) {
        console.error('Create Leave Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งคำร้องขอลางาน' });
    }
};

// 4. อนุมัติหรือปฏิเสธใบลา (Approve / Reject)
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params; // ID ของใบลา
        const { status } = req.body; // 'approved' หรือ 'rejected'
        const { role_level, user_id, company_id, username } = req.user;
        const leaveApprovalScope = req.user?.module_scopes?.leave_approval_scope;

        if (!['approved', 'rejected'].includes(String(status))) {
            return res.status(400).json({ message: 'สถานะต้องเป็น approved หรือ rejected' });
        }

        // System Admin is support-only and must not directly approve/reject transactional leave.
        if (Number(role_level || 0) >= 99) {
            return res.status(403).json({ message: 'Super Admin ใช้โหมด Support เท่านั้น ไม่สามารถอนุมัติ/ปฏิเสธใบลาโดยตรงได้' });
        }

        // ตรวจสอบสิทธิ์ว่ามีสิทธิ์อนุมัติไหม (ต้องเป็น Manager ขึ้นไป)
        if (role_level < 20) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติวันลา' });
        }

        const [requestRows] = await db.query(
            `SELECT lr.id, lr.status AS current_status, lr.created_at,
                    e.user_id AS employee_user_id, e.manager_id, e.company_id,
                    (SELECT id FROM employees WHERE user_id = ?) AS approver_employee_id
             FROM leave_requests lr
             JOIN employees e ON lr.employee_id = e.id
             WHERE lr.id = ?
             LIMIT 1`,
            [user_id, id]
        );

        if (!requestRows.length) {
            return res.status(404).json({ message: 'ไม่พบคำร้องใบลาที่ต้องการอัปเดต' });
        }

        const requestRow = requestRows[0];

        if (String(requestRow.current_status || '').toLowerCase() !== 'pending') {
            return res.status(400).json({ message: 'อนุมัติ/ปฏิเสธได้เฉพาะคำร้องที่อยู่ในสถานะ pending เท่านั้น' });
        }

        if (Number(role_level || 0) === 50 && Number(company_id || 0) > 0 && Number(requestRow.company_id || 0) !== Number(company_id || 0)) {
            return res.status(403).json({ message: 'HR Company อนุมัติคำร้องได้เฉพาะบริษัทของตนเองเท่านั้น' });
        }

        // For overlapping role (Manager + HR Company), enforce manager-only approval scope.
        if (leaveApprovalScope === 'manager') {
            const approverEmployeeId = Number(requestRow.approver_employee_id || 0);
            const inManagerScope = Number(requestRow.employee_user_id || 0) === Number(user_id || 0)
                || (approverEmployeeId > 0 && Number(requestRow.manager_id || 0) === approverEmployeeId);

            if (!inManagerScope) {
                return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติคำร้องนี้นอกเหนือจากทีมของคุณ' });
            }
        }

        const approvalConfig = await getLeaveApprovalConfig();
        const userRoles = normalizeUserRoles(req.user);
        const pendingDays = calculatePendingDays(requestRow.created_at);
        const flowDecision = canApproveByFlow({ userRoles, approvalConfig, pendingDays });

        if (!flowDecision.allowed) {
            return res.status(403).json({ message: flowDecision.reason || 'คุณไม่มีสิทธิ์อนุมัติคำร้องนี้ตาม Approval Flow ที่ตั้งค่าไว้' });
        }

        // หา ID ของพนักงานที่กดอนุมัติ
        const approver_id = Number(requestRow.approver_employee_id || 0) || null;

        // อัปเดตสถานะใบลา
        await db.query(
            `UPDATE leave_requests SET status = ?, approver_id = ? WHERE id = ?`,
            [status, approver_id, id]
        );

        await appendAuditLogSafe({
            user_id,
            username,
            action: 'UPDATE_LEAVE_STATUS',
            target: `leave_request:${id}`,
            ip_address: req.ip || req.connection?.remoteAddress || null,
            metadata: {
                request_id: Number(id),
                before_status: String(requestRow.current_status || ''),
                after_status: String(status),
                approver_id,
                approval_flow: {
                    level1: approvalConfig.level1,
                    level2: approvalConfig.level2,
                    level3: approvalConfig.level3,
                    escalation_days: approvalConfig.escalation_days,
                    delegate_role: approvalConfig.delegate_role,
                    pending_days: pendingDays,
                },
            },
        });

        // ⭐️ ถ้าอนุมัติ (approved) ให้ไปหักโควต้าในกระเป๋าวันลาด้วย
        if (status === 'approved') {
            const [request] = await db.query(`SELECT employee_id, leave_type_id, total_days FROM leave_requests WHERE id = ?`, [id]);
            const reqData = request[0];
            const currentYear = new Date().getFullYear();

            await db.query(
                `UPDATE leave_balances SET used = used + ?, balance = balance - ? 
                 WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
                [reqData.total_days, reqData.total_days, reqData.employee_id, reqData.leave_type_id, currentYear]
            );
        }

        res.status(200).json({ message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว` });

    } catch (error) {
        console.error('Update Leave Status Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะใบลา' });
    }
};