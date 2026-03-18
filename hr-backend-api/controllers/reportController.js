const db = require('../config/db');

function getRoleLevel(reqUser) {
    return Number(reqUser?.role_level || 0);
}

function toISODateOnly(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
}

function isDateRangeTooWide(dateFrom, dateTo, maxDays) {
    if (!dateFrom || !dateTo) return false;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
    const diffMs = to.getTime() - from.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > maxDays;
}

function getRoleReportPolicy(roleLevel) {
    if (roleLevel >= 80) {
        return { maxRows: 5000, maxDays: 3660 };
    }
    if (roleLevel === 50) {
        return { maxRows: 3000, maxDays: 1095 };
    }
    if (roleLevel === 20) {
        return { maxRows: 2000, maxDays: 365 };
    }
    return { maxRows: 1000, maxDays: 180 };
}

function maskReportRows(rows, reportType, roleLevel) {
    if (roleLevel >= 20) return rows;

    // Employee role: return minimum fields required for self-service insights/export.
    if (reportType === 'attendance') {
        return rows.map((row) => ({
            work_date: row.work_date,
            check_in_time: row.check_in_time,
            check_out_time: row.check_out_time,
            status: row.status,
        }));
    }

    if (reportType === 'ot') {
        return rows.map((row) => ({
            request_date: row.request_date,
            start_time: row.start_time,
            end_time: row.end_time,
            total_hours: row.total_hours,
            status: row.status,
            amount: row.amount,
        }));
    }

    return rows;
}

function buildScopeClause(reqUser, alias = 'e') {
    const roleLevel = getRoleLevel(reqUser);
    const userId = Number(reqUser?.user_id || 0);
    const companyId = Number(reqUser?.company_id || 0);

    if (roleLevel >= 80) return { clause: '', params: [] };

    if (roleLevel === 50) {
        return { clause: ` AND ${alias}.company_id = ?`, params: [companyId] };
    }

    if (roleLevel === 20) {
        return {
            clause: ` AND (${alias}.user_id = ? OR ${alias}.manager_id = (SELECT id FROM employees WHERE user_id = ?))`,
            params: [userId, userId],
        };
    }

    return { clause: ` AND ${alias}.user_id = ?`, params: [userId] };
}

// ต้องมีคำว่า exports.getDashboardStats แบบนี้เป๊ะๆ ครับ
exports.getDashboardStats = async (req, res) => {
    try {
        const roleLevel = getRoleLevel(req.user);

        // เงื่อนไขการกรอง (Data Isolation)
        let empCondition = "WHERE 1=1";
        const empParams = [];
        const scope = buildScopeClause(req.user, 'e');

        if (roleLevel >= 80) {
            // no extra condition
        } else if (roleLevel === 50) {
            empCondition += " AND company_id = ?";
            empParams.push(scope.params[0]);
        } else if (roleLevel === 20) {
            empCondition += " AND (user_id = ? OR manager_id = (SELECT id FROM employees WHERE user_id = ?))";
            empParams.push(scope.params[0], scope.params[1]);
        } else {
            empCondition += " AND user_id = ?";
            empParams.push(scope.params[0]);
        }

        // 1. ดึงจำนวนพนักงานทั้งหมด
        const [totalEmp] = await db.query(`SELECT COUNT(id) as total FROM employees ${empCondition} AND status = 'active'`, empParams);

        // 2. ดึงจำนวนใบลาที่รออนุมัติ
        let leaveCondition = "WHERE lr.status = 'pending'";
        const leaveParams = [];
        leaveCondition += scope.clause;
        leaveParams.push(...scope.params);

        const [pendingLeaves] = await db.query(`
            SELECT COUNT(lr.id) as total 
            FROM leave_requests lr
            JOIN employees e ON lr.employee_id = e.id
            ${leaveCondition}
        `, leaveParams);

        // 3. ดึงสถิติมาทำงาน "วันนี้"
        const today = new Date().toISOString().split('T')[0]; 
        
        let attCondition = 'WHERE a.work_date = ?';
        const attParams = [today, ...scope.params];
        attCondition += scope.clause;

        const [attStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent
            FROM attendances a
            JOIN employees e ON a.employee_id = e.id
            ${attCondition}
        `, attParams);

        res.status(200).json({
            message: 'ดึงข้อมูล Dashboard สำเร็จ',
            data: {
                total_employees: totalEmp[0].total || 0,
                pending_leave_requests: pendingLeaves[0].total || 0,
                attendance_today: {
                    present: attStats[0].present || 0,
                    late: attStats[0].late || 0,
                    absent: attStats[0].absent || 0
                }
            }
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสถิติ Dashboard' });
    }
};

exports.getAttendanceReport = async (req, res) => {
    try {
        const { date_from, date_to, employee_status, department } = req.query;
        const roleLevel = getRoleLevel(req.user);
        const policy = getRoleReportPolicy(roleLevel);
        const scope = buildScopeClause(req.user, 'e');

        let sql = `
            SELECT
                a.work_date,
                e.user_id,
                e.employee_code,
                e.firstname_th,
                e.lastname_th,
                d.name_th AS department_name,
                a.check_in_time,
                a.check_out_time,
                a.status
            FROM attendances a
            JOIN employees e ON a.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE 1=1
        `;
        const params = [];

        const normalizedDateFrom = toISODateOnly(date_from);
        const normalizedDateTo = toISODateOnly(date_to);

        if (normalizedDateFrom) {
            sql += ' AND a.work_date >= ?';
            params.push(normalizedDateFrom);
        }
        if (normalizedDateTo) {
            sql += ' AND a.work_date <= ?';
            params.push(normalizedDateTo);
        }

        if (isDateRangeTooWide(normalizedDateFrom, normalizedDateTo, policy.maxDays)) {
            return res.status(400).json({
                message: `ช่วงวันที่ยาวเกินนโยบายรายงานของสิทธิ์นี้ (สูงสุด ${policy.maxDays} วัน)`,
            });
        }
        if (employee_status && employee_status !== 'all') {
            sql += ' AND e.status = ?';
            params.push(employee_status);
        }
        if (department && department !== 'all') {
            sql += ' AND LOWER(d.name_th) LIKE ?';
            params.push(`%${String(department).toLowerCase()}%`);
        }

        sql += `${scope.clause} ORDER BY a.work_date DESC, e.employee_code ASC LIMIT ?`;
        const [rows] = await db.query(sql, [...params, ...scope.params, policy.maxRows]);
        const maskedRows = maskReportRows(rows, 'attendance', roleLevel);

        res.status(200).json({
            message: 'ดึงรายงาน Attendance สำเร็จ',
            count: maskedRows.length,
            data: maskedRows,
            policy: {
                max_rows: policy.maxRows,
                max_days: policy.maxDays,
            },
        });
    } catch (error) {
        console.error('Attendance Report Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายงาน Attendance' });
    }
};

exports.getOtReport = async (req, res) => {
    try {
        const { date_from, date_to, employee_status, department } = req.query;
        const roleLevel = getRoleLevel(req.user);
        const policy = getRoleReportPolicy(roleLevel);
        const scope = buildScopeClause(req.user, 'e');

        let sql = `
            SELECT
                ot.request_date,
                e.user_id,
                e.employee_code,
                e.firstname_th,
                e.lastname_th,
                d.name_th AS department_name,
                ot.start_time,
                ot.end_time,
                ot.total_hours,
                ot.status,
                ROUND(COALESCE(ot.total_hours, 0) * 600, 2) AS amount
            FROM ot_requests ot
            JOIN employees e ON ot.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE 1=1
        `;
        const params = [];

        const normalizedDateFrom = toISODateOnly(date_from);
        const normalizedDateTo = toISODateOnly(date_to);

        if (normalizedDateFrom) {
            sql += ' AND ot.request_date >= ?';
            params.push(normalizedDateFrom);
        }
        if (normalizedDateTo) {
            sql += ' AND ot.request_date <= ?';
            params.push(normalizedDateTo);
        }

        if (isDateRangeTooWide(normalizedDateFrom, normalizedDateTo, policy.maxDays)) {
            return res.status(400).json({
                message: `ช่วงวันที่ยาวเกินนโยบายรายงานของสิทธิ์นี้ (สูงสุด ${policy.maxDays} วัน)`,
            });
        }
        if (employee_status && employee_status !== 'all') {
            sql += ' AND e.status = ?';
            params.push(employee_status);
        }
        if (department && department !== 'all') {
            sql += ' AND LOWER(d.name_th) LIKE ?';
            params.push(`%${String(department).toLowerCase()}%`);
        }

        sql += `${scope.clause} ORDER BY ot.request_date DESC, e.employee_code ASC LIMIT ?`;
        const [rows] = await db.query(sql, [...params, ...scope.params, policy.maxRows]);
        const maskedRows = maskReportRows(rows, 'ot', roleLevel);

        res.status(200).json({
            message: 'ดึงรายงาน OT สำเร็จ',
            count: maskedRows.length,
            data: maskedRows,
            policy: {
                max_rows: policy.maxRows,
                max_days: policy.maxDays,
            },
        });
    } catch (error) {
        console.error('OT Report Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายงาน OT' });
    }
};