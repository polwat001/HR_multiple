const db = require('../config/db');

// ต้องมีคำว่า exports.getDashboardStats แบบนี้เป๊ะๆ ครับ
exports.getDashboardStats = async (req, res) => {
    try {
        const { user_id, role_level, company_id } = req.user;

        // เงื่อนไขการกรอง (Data Isolation)
        let empCondition = "WHERE 1=1";
        const empParams = [];

        if (role_level === 50) {
            empCondition += " AND company_id = ?";
            empParams.push(company_id);
        } else if (role_level === 20) {
            empCondition += " AND (user_id = ? OR manager_id = (SELECT id FROM employees WHERE user_id = ?))";
            empParams.push(user_id, user_id);
        } else if (role_level === 1) {
            empCondition += " AND user_id = ?";
            empParams.push(user_id);
        }

        // 1. ดึงจำนวนพนักงานทั้งหมด
        const [totalEmp] = await db.query(`SELECT COUNT(id) as total FROM employees ${empCondition} AND status = 'active'`, empParams);

        // 2. ดึงจำนวนใบลาที่รออนุมัติ
        let leaveCondition = "WHERE lr.status = 'pending'";
        if (role_level === 50) leaveCondition += ` AND e.company_id = ${company_id}`;
        else if (role_level === 20) leaveCondition += ` AND (e.manager_id = (SELECT id FROM employees WHERE user_id = ${user_id}))`;
        else if (role_level === 1) leaveCondition += ` AND e.user_id = ${user_id}`;

        const [pendingLeaves] = await db.query(`
            SELECT COUNT(lr.id) as total 
            FROM leave_requests lr
            JOIN employees e ON lr.employee_id = e.id
            ${leaveCondition}
        `);

        // 3. ดึงสถิติมาทำงาน "วันนี้"
        const today = new Date().toISOString().split('T')[0]; 
        
        let attCondition = `WHERE a.work_date = '${today}'`;
        if (role_level === 50) attCondition += ` AND e.company_id = ${company_id}`;
        else if (role_level === 20) attCondition += ` AND (e.manager_id = (SELECT id FROM employees WHERE user_id = ${user_id}))`;
        else if (role_level === 1) attCondition += ` AND e.user_id = ${user_id}`;

        const [attStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent
            FROM attendances a
            JOIN employees e ON a.employee_id = e.id
            ${attCondition}
        `);

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

function buildScopeClause(reqUser, alias = 'e') {
    const { user_id, role_level, company_id } = reqUser;

    if (role_level >= 80) return { clause: '', params: [] };
    if (role_level === 50) return { clause: ` AND ${alias}.company_id = ?`, params: [company_id] };
    if (role_level === 20) {
        return {
            clause: ` AND (${alias}.user_id = ? OR ${alias}.manager_id = (SELECT id FROM employees WHERE user_id = ?))`,
            params: [user_id, user_id],
        };
    }
    return { clause: ` AND ${alias}.user_id = ?`, params: [user_id] };
}

exports.getAttendanceReport = async (req, res) => {
    try {
        const { date_from, date_to, employee_status, department } = req.query;
        const scope = buildScopeClause(req.user, 'e');

        let sql = `
            SELECT
                a.work_date,
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

        if (date_from) {
            sql += ' AND a.work_date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            sql += ' AND a.work_date <= ?';
            params.push(date_to);
        }
        if (employee_status && employee_status !== 'all') {
            sql += ' AND e.status = ?';
            params.push(employee_status);
        }
        if (department && department !== 'all') {
            sql += ' AND LOWER(d.name_th) LIKE ?';
            params.push(`%${String(department).toLowerCase()}%`);
        }

        sql += `${scope.clause} ORDER BY a.work_date DESC, e.employee_code ASC LIMIT 2000`;
        const [rows] = await db.query(sql, [...params, ...scope.params]);

        res.status(200).json({
            message: 'ดึงรายงาน Attendance สำเร็จ',
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('Attendance Report Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายงาน Attendance' });
    }
};

exports.getOtReport = async (req, res) => {
    try {
        const { date_from, date_to, employee_status, department } = req.query;
        const scope = buildScopeClause(req.user, 'e');

        let sql = `
            SELECT
                ot.request_date,
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

        if (date_from) {
            sql += ' AND ot.request_date >= ?';
            params.push(date_from);
        }
        if (date_to) {
            sql += ' AND ot.request_date <= ?';
            params.push(date_to);
        }
        if (employee_status && employee_status !== 'all') {
            sql += ' AND e.status = ?';
            params.push(employee_status);
        }
        if (department && department !== 'all') {
            sql += ' AND LOWER(d.name_th) LIKE ?';
            params.push(`%${String(department).toLowerCase()}%`);
        }

        sql += `${scope.clause} ORDER BY ot.request_date DESC, e.employee_code ASC LIMIT 2000`;
        const [rows] = await db.query(sql, [...params, ...scope.params]);

        res.status(200).json({
            message: 'ดึงรายงาน OT สำเร็จ',
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('OT Report Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายงาน OT' });
    }
};