const db = require('../config/db');

const OT_RATE_PER_HOUR = 600;

const DEFAULT_OT_APPROVAL_CONFIG = {
    level1: 'Manager',
    level2: 'HR Company',
    level3: 'Central HR',
    escalation_days: 2,
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
        console.error('OT Audit Log Error:', error.message);
    }
};

async function getOtApprovalConfig() {
    try {
        const [flowRows] = await db.query(
            `SELECT level1, level2, level3
             FROM approval_flow_configs
             WHERE module_key = 'ot'
             LIMIT 1`
        );
        const [policyRows] = await db.query(
            `SELECT escalation_days, delegate_role
             FROM approval_flow_policies
             WHERE module_key = 'ot'
             LIMIT 1`
        );

        const flow = flowRows[0] || {};
        const policy = policyRows[0] || {};

        return {
            level1: String(flow.level1 || DEFAULT_OT_APPROVAL_CONFIG.level1),
            level2: String(flow.level2 || DEFAULT_OT_APPROVAL_CONFIG.level2),
            level3: String(flow.level3 || DEFAULT_OT_APPROVAL_CONFIG.level3),
            escalation_days: Math.max(0, Number(policy.escalation_days || DEFAULT_OT_APPROVAL_CONFIG.escalation_days)),
            delegate_role: String(policy.delegate_role || DEFAULT_OT_APPROVAL_CONFIG.delegate_role),
        };
    } catch (error) {
        return { ...DEFAULT_OT_APPROVAL_CONFIG };
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
                e.user_id,
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
        const { user_id, role_level, company_id, username } = req.user;

        if (!['approved', 'rejected'].includes(String(status))) {
            return res.status(400).json({ message: 'สถานะต้องเป็น approved หรือ rejected' });
        }

        if (role_level < 20) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติ OT' });
        }

        // System Admin is support-only and must not directly approve/reject OT.
        if (Number(role_level || 0) >= 99) {
            return res.status(403).json({ message: 'Super Admin ใช้โหมด Support เท่านั้น ไม่สามารถอนุมัติ/ปฏิเสธ OT โดยตรงได้' });
        }

        const [requestRows] = await db.query(
            `SELECT ot.id, ot.status AS current_status, ot.created_at,
                    e.user_id AS employee_user_id, e.manager_id, e.company_id,
                    (SELECT id FROM employees WHERE user_id = ?) AS approver_employee_id
             FROM ot_requests ot
             JOIN employees e ON ot.employee_id = e.id
             WHERE ot.id = ?
             LIMIT 1`,
            [user_id, id]
        );

        if (!requestRows.length) {
            return res.status(404).json({ message: 'ไม่พบคำขอ OT ที่ต้องการอัปเดต' });
        }

        const requestRow = requestRows[0];

        if (String(requestRow.current_status || '').toLowerCase() !== 'pending') {
            return res.status(400).json({ message: 'อนุมัติ/ปฏิเสธได้เฉพาะคำขอที่อยู่ในสถานะ pending เท่านั้น' });
        }

        if (Number(role_level || 0) === 50 && Number(company_id || 0) > 0 && Number(requestRow.company_id || 0) !== Number(company_id || 0)) {
            return res.status(403).json({ message: 'HR Company อนุมัติ OT ได้เฉพาะบริษัทของตนเองเท่านั้น' });
        }

        if (role_level === 20) {
            const approverEmployeeId = Number(requestRow.approver_employee_id || 0);
            const inManagerScope = Number(requestRow.employee_user_id || 0) === Number(user_id || 0)
                || (approverEmployeeId > 0 && Number(requestRow.manager_id || 0) === approverEmployeeId);

            if (!inManagerScope) {
                return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติคำขอ OT นี้นอกทีมของคุณ' });
            }
        }

        const approvalConfig = await getOtApprovalConfig();
        const userRoles = normalizeUserRoles(req.user);
        const pendingDays = calculatePendingDays(requestRow.created_at);
        const flowDecision = canApproveByFlow({ userRoles, approvalConfig, pendingDays });

        if (!flowDecision.allowed) {
            return res.status(403).json({ message: flowDecision.reason || 'คุณไม่มีสิทธิ์อนุมัติคำขอ OT นี้ตาม Approval Flow ที่ตั้งค่าไว้' });
        }

        const approverId = Number(requestRow.approver_employee_id || 0) || null;

        const [result] = await db.query(
            'UPDATE ot_requests SET status = ?, approver_id = ? WHERE id = ?',
            [status, approverId, id]
        );

        if (!result || result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบคำขอ OT ที่ต้องการอัปเดต' });
        }

        await appendAuditLogSafe({
            user_id,
            username,
            action: 'UPDATE_OT_STATUS',
            target: `ot_request:${id}`,
            ip_address: req.ip || req.connection?.remoteAddress || null,
            metadata: {
                request_id: Number(id),
                before_status: String(requestRow.current_status || ''),
                after_status: String(status),
                approver_id: approverId,
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

        res.status(200).json({ message: `อัปเดตสถานะ OT เป็น ${status} เรียบร้อยแล้ว` });
    } catch (error) {
        console.error('Update OT Status Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ OT' });
    }
};
