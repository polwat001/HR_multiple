const db = require('../config/db');

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

        const allowedLeaveTypes = leaveTypes.filter((leaveType) => Number(leaveType.company_id || 0) === companyId);

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

            sql += ` AND lt.company_id = ?`;
            params.push(empRows[0].company_id);
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
        const { role_level, user_id } = req.user;
        const leaveApprovalScope = req.user?.module_scopes?.leave_approval_scope;

        // ตรวจสอบสิทธิ์ว่ามีสิทธิ์อนุมัติไหม (ต้องเป็น Manager ขึ้นไป)
        if (role_level < 20) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติวันลา' });
        }

        // For overlapping role (Manager + HR Company), enforce manager-only approval scope.
        if (leaveApprovalScope === 'manager') {
            const [scopeRows] = await db.query(
                `SELECT lr.id
                 FROM leave_requests lr
                 JOIN employees e ON lr.employee_id = e.id
                 WHERE lr.id = ?
                   AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`,
                [id, user_id, user_id]
            );

            if (scopeRows.length === 0) {
                return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติคำร้องนี้นอกเหนือจากทีมของคุณ' });
            }
        }

        // หา ID ของพนักงานที่กดอนุมัติ
        const [approver] = await db.query(`SELECT id FROM employees WHERE user_id = ?`, [user_id]);
        const approver_id = approver[0].id;

        // อัปเดตสถานะใบลา
        await db.query(
            `UPDATE leave_requests SET status = ?, approver_id = ? WHERE id = ?`,
            [status, approver_id, id]
        );

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