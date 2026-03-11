const db = require('../config/db');

const OT_RATE_PER_HOUR = 600;

function buildScopeCondition(user) {
    const { user_id, role_level, company_id } = user;

    if (role_level >= 80) {
        return { clause: '', params: [] };
    }

    if (role_level === 50) {
        return { clause: ' AND e.company_id = ?', params: [company_id] };
    }

    if (role_level === 20) {
        return {
            clause: ' AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))',
            params: [user_id, user_id],
        };
    }

    return { clause: ' AND e.user_id = ?', params: [user_id] };
}

exports.getOtRequests = async (req, res) => {
    try {
        const scope = buildScopeCondition(req.user);
        const month = String(req.query.month || '').trim();
        const monthPattern = /^\d{4}-\d{2}$/;

        let monthClause = '';
        const monthParams = [];
        if (monthPattern.test(month)) {
            const monthDate = new Date(`${month}-01T00:00:00`);
            const y = monthDate.getFullYear();
            const m = monthDate.getMonth();
            const startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
            const endDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
            monthClause = ' AND ot.request_date BETWEEN ? AND ?';
            monthParams.push(startDate, endDate);
        }

        const sql = `
            SELECT
                ot.id,
                ot.request_date,
                ot.start_time,
                ot.end_time,
                ot.total_hours,
                ot.reason,
                ot.status,
                ot.created_at,
                ROUND(COALESCE(ot.total_hours, 0) * ?, 2) AS amount,
                e.employee_code,
                e.firstname_th,
                e.lastname_th,
                d.name_th AS department_name,
                c.name_th AS company_name
            FROM ot_requests ot
            JOIN employees e ON ot.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN companies c ON e.company_id = c.id
            WHERE 1=1
            ${monthClause}
            ${scope.clause}
            ORDER BY ot.request_date DESC, ot.id DESC
            LIMIT 100
        `;

        const [rows] = await db.query(sql, [OT_RATE_PER_HOUR, ...monthParams, ...scope.params]);

        res.status(200).json({
            message: 'ดึงข้อมูล OT สำเร็จ',
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('Get OT Requests Error:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({ message: 'ยังไม่พบตาราง OT ในระบบ', count: 0, data: [] });
        }
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล OT' });
    }
};

exports.getOtSummary = async (req, res) => {
    try {
        const month = String(req.query.month || '').trim();
        const monthPattern = /^\d{4}-\d{2}$/;

        const baseDate = monthPattern.test(month) ? new Date(`${month}-01T00:00:00`) : new Date();
        const year = baseDate.getFullYear();
        const m = baseDate.getMonth();
        const startDate = `${year}-${String(m + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(m + 1).padStart(2, '0')}-${String(new Date(year, m + 1, 0).getDate()).padStart(2, '0')}`;

        const scope = buildScopeCondition(req.user);

        const sql = `
            SELECT
                COALESCE(SUM(ot.total_hours), 0) AS total_hours,
                COALESCE(SUM(CASE WHEN ot.status = 'approved' THEN ot.total_hours ELSE 0 END), 0) AS approved_hours,
                COUNT(*) AS total_requests,
                SUM(CASE WHEN ot.status = 'pending' THEN 1 ELSE 0 END) AS pending_requests,
                SUM(CASE WHEN ot.status = 'approved' THEN 1 ELSE 0 END) AS approved_requests,
                SUM(CASE WHEN ot.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_requests
            FROM ot_requests ot
            JOIN employees e ON ot.employee_id = e.id
            WHERE ot.request_date BETWEEN ? AND ?
            ${scope.clause}
        `;

        const [rows] = await db.query(sql, [startDate, endDate, ...scope.params]);
        const summary = rows[0] || {};

        const approvedHours = Number(summary.approved_hours || 0);
        const totalHours = Number(summary.total_hours || 0);

        res.status(200).json({
            message: 'ดึงสรุป OT สำเร็จ',
            data: {
                month: `${year}-${String(m + 1).padStart(2, '0')}`,
                total_hours: totalHours,
                approved_hours: approvedHours,
                total_requests: Number(summary.total_requests || 0),
                pending_requests: Number(summary.pending_requests || 0),
                approved_requests: Number(summary.approved_requests || 0),
                rejected_requests: Number(summary.rejected_requests || 0),
                estimated_amount: Math.round(approvedHours * OT_RATE_PER_HOUR),
                estimated_total_amount: Math.round(totalHours * OT_RATE_PER_HOUR),
            },
        });
    } catch (error) {
        console.error('Get OT Summary Error:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(200).json({
                message: 'ยังไม่พบตาราง OT ในระบบ',
                data: {
                    month: String(req.query.month || ''),
                    total_hours: 0,
                    approved_hours: 0,
                    total_requests: 0,
                    pending_requests: 0,
                    approved_requests: 0,
                    rejected_requests: 0,
                    estimated_amount: 0,
                    estimated_total_amount: 0,
                },
            });
        }
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสรุป OT' });
    }
};

exports.createOtRequest = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { request_date, start_time, end_time, reason } = req.body;

        if (!request_date || !start_time || !end_time || !reason) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูล OT ให้ครบถ้วน' });
        }

        const [empRows] = await db.query(
            'SELECT id, manager_id FROM employees WHERE user_id = ? LIMIT 1',
            [user_id]
        );

        if (empRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงานของผู้ใช้งานนี้' });
        }

        const employeeId = empRows[0].id;
        const approverId = empRows[0].manager_id || null;

        const [sh, sm] = String(start_time).split(':').map(Number);
        const [eh, em] = String(end_time).split(':').map(Number);
        if ([sh, sm, eh, em].some(Number.isNaN)) {
            return res.status(400).json({ message: 'รูปแบบเวลาไม่ถูกต้อง' });
        }

        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        if (endMinutes <= startMinutes) {
            return res.status(400).json({ message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' });
        }

        const totalHours = Math.round(((endMinutes - startMinutes) / 60) * 10) / 10;

        await db.query(
            `INSERT INTO ot_requests
                (employee_id, request_date, start_time, end_time, total_hours, reason, approver_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [employeeId, request_date, start_time, end_time, totalHours, reason, approverId]
        );

        res.status(201).json({ message: 'ส่งคำขอ OT เรียบร้อยแล้ว', data: { total_hours: totalHours } });
    } catch (error) {
        console.error('Create OT Request Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกคำขอ OT' });
    }
};

exports.updateOtStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const { user_id, role_level } = req.user;

        if (!['approved', 'rejected'].includes(String(status))) {
            return res.status(400).json({ message: 'สถานะต้องเป็น approved หรือ rejected' });
        }

        if (role_level < 20) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติ OT' });
        }

        if (role_level === 20) {
            const [scopeRows] = await db.query(
                `SELECT ot.id
                 FROM ot_requests ot
                 JOIN employees e ON ot.employee_id = e.id
                 WHERE ot.id = ?
                   AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`,
                [id, user_id, user_id]
            );

            if (scopeRows.length === 0) {
                return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติคำขอ OT นี้นอกทีมของคุณ' });
            }
        }

        const [approverRows] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [user_id]);
        const approverId = approverRows[0]?.id || null;

        const [result] = await db.query(
            'UPDATE ot_requests SET status = ?, approver_id = ? WHERE id = ?',
            [status, approverId, id]
        );

        if (!result || result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบคำขอ OT ที่ต้องการอัปเดต' });
        }

        res.status(200).json({ message: `อัปเดตสถานะ OT เป็น ${status} เรียบร้อยแล้ว` });
    } catch (error) {
        console.error('Update OT Status Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ OT' });
    }
};
