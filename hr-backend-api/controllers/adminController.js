const db = require('../config/db');

const MATRIX_MODULES = [
    'dashboard',
    'organization',
    'employee',
    'attendance',
    'leave',
    'contract',
    'reports',
    'payroll',
    'approval_flow',
    'permissions',
    'system_settings',
    'holidays',
    'audit_log',
];

const APPROVAL_MODULES = ['leave', 'ot', 'payroll'];

const DEFAULT_APPROVAL_FLOW = {
    leave: { level1: 'Manager', level2: 'HR Company', level3: 'Central HR', escalation_days: 3, delegate_role: 'HR Company' },
    ot: { level1: 'Manager', level2: 'HR Company', level3: 'Central HR', escalation_days: 2, delegate_role: 'HR Company' },
    payroll: { level1: 'HR Company', level2: 'Central HR', level3: '-', escalation_days: 5, delegate_role: 'Central HR' },
};

const DEFAULT_SYSTEM_SETTINGS = {
    groupName: 'HR Group Holding',
    defaultTimezone: 'Asia/Bangkok',
};

const defaultMatrix = () => {
    const matrix = {};
    MATRIX_MODULES.forEach((moduleName) => {
        matrix[moduleName] = {
            view: true,
            create: !['dashboard', 'reports', 'payroll', 'approval_flow', 'permissions', 'system_settings', 'audit_log'].includes(moduleName),
            edit: !['dashboard', 'reports', 'payroll', 'audit_log'].includes(moduleName),
            delete: ['employee', 'contract', 'permissions'].includes(moduleName),
        };
    });
    return matrix;
};

async function ensureAdminTables() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS role_permission_matrix (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_name VARCHAR(100) NOT NULL,
            module_key VARCHAR(100) NOT NULL,
            can_view TINYINT(1) NOT NULL DEFAULT 0,
            can_create TINYINT(1) NOT NULL DEFAULT 0,
            can_edit TINYINT(1) NOT NULL DEFAULT 0,
            can_delete TINYINT(1) NOT NULL DEFAULT 0,
            updated_by INT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_role_module (role_name, module_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            username VARCHAR(255) NULL,
            action VARCHAR(100) NOT NULL,
            target VARCHAR(255) NULL,
            ip_address VARCHAR(64) NULL,
            metadata_json JSON NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_action (action),
            KEY idx_created_at (created_at),
            KEY idx_username (username),
            KEY idx_ip (ip_address)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS approval_flow_configs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            module_key VARCHAR(50) NOT NULL,
            level1 VARCHAR(100) NOT NULL,
            level2 VARCHAR(100) NOT NULL,
            level3 VARCHAR(100) NOT NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_module_key (module_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS approval_flow_policies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            module_key VARCHAR(50) NOT NULL,
            escalation_days INT NOT NULL DEFAULT 0,
            delegate_role VARCHAR(100) NOT NULL DEFAULT '',
            updated_by INT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_policy_module_key (module_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
            setting_value_json JSON NOT NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS leave_policy_configs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT NOT NULL,
            service_years DECIMAL(6,2) NOT NULL DEFAULT 1,
            vacation_days DECIMAL(6,2) NOT NULL DEFAULT 6,
            sick_cert_required_after_days INT NOT NULL DEFAULT 2,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            updated_by INT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_leave_policy_company (company_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS payroll_employee_settings (
            employee_id INT NOT NULL PRIMARY KEY,
            basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
            bank_name VARCHAR(50) NOT NULL DEFAULT 'SCB',
            bank_account_no VARCHAR(50) NOT NULL DEFAULT '',
            tax_dependent INT NOT NULL DEFAULT 0,
            life_insurance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
            sso_enabled TINYINT(1) NOT NULL DEFAULT 1,
            updated_by INT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || null;
}

function getAuthCompanyId(req) {
    const companyId = Number(req.user?.company_id || req.user?.companyId || 0);
    return Number.isFinite(companyId) && companyId > 0 ? companyId : null;
}

exports.getPermissionMatrix = async (req, res) => {
    try {
        const { role_level } = req.user;
        const roleName = String(req.query.role || '').trim();

        if (role_level < 99) {
            return res.status(403).json({ message: 'เฉพาะ Super Admin เท่านั้นที่เข้าถึง Permission Matrix ได้' });
        }
        if (!roleName) {
            return res.status(400).json({ message: 'กรุณาระบุ role ใน query string' });
        }

        await ensureAdminTables();

        const [rows] = await db.query(
            `SELECT module_key, can_view, can_create, can_edit, can_delete
             FROM role_permission_matrix
             WHERE role_name = ?`,
            [roleName]
        );

        const matrix = defaultMatrix();
        rows.forEach((row) => {
            matrix[row.module_key] = {
                view: Boolean(row.can_view),
                create: Boolean(row.can_create),
                edit: Boolean(row.can_edit),
                delete: Boolean(row.can_delete),
            };
        });

        res.status(200).json({ message: 'ดึง Permission Matrix สำเร็จ', role: roleName, data: matrix });
    } catch (error) {
        console.error('Get Permission Matrix Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง Permission Matrix' });
    }
};

exports.updatePermissionMatrix = async (req, res) => {
    try {
        const { role_level, user_id, username } = req.user;
        const roleName = String(req.params.roleName || '').trim();
        const matrix = req.body?.matrix;

        if (role_level < 99) {
            return res.status(403).json({ message: 'เฉพาะ Super Admin เท่านั้นที่แก้ไข Permission Matrix ได้' });
        }
        if (!roleName) {
            return res.status(400).json({ message: 'กรุณาระบุ roleName' });
        }
        if (!matrix || typeof matrix !== 'object') {
            return res.status(400).json({ message: 'รูปแบบ matrix ไม่ถูกต้อง' });
        }

        await ensureAdminTables();

        for (const moduleKey of MATRIX_MODULES) {
            const row = matrix[moduleKey] || {};
            await db.query(
                `INSERT INTO role_permission_matrix
                    (role_name, module_key, can_view, can_create, can_edit, can_delete, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    can_view = VALUES(can_view),
                    can_create = VALUES(can_create),
                    can_edit = VALUES(can_edit),
                    can_delete = VALUES(can_delete),
                    updated_by = VALUES(updated_by),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    roleName,
                    moduleKey,
                    row.view ? 1 : 0,
                    row.create ? 1 : 0,
                    row.edit ? 1 : 0,
                    row.delete ? 1 : 0,
                    user_id,
                ]
            );
        }

        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, 'UPDATE_PERMISSION_MATRIX', ?, ?, ?)` ,
            [
                user_id,
                username || null,
                `role:${roleName}`,
                getClientIp(req),
                JSON.stringify({ role: roleName }),
            ]
        );

        res.status(200).json({ message: 'บันทึก Permission Matrix สำเร็จ' });
    } catch (error) {
        console.error('Update Permission Matrix Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก Permission Matrix' });
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const { role_level } = req.user;
        const roleLevel = Number(role_level || 0);
        if (roleLevel < 50) {
            return res.status(403).json({ message: 'เฉพาะ HR Company, Central HR และ Super Admin เท่านั้นที่เข้าถึง Audit Logs ได้' });
        }

        await ensureAdminTables();

        const {
            user: userFilter,
            action,
            ip,
            date_from: dateFrom,
            date_to: dateTo,
            limit: rawLimit,
            offset: rawOffset,
        } = req.query;

        const limit = Math.min(Math.max(Number(rawLimit || 100), 1), 1000);
        const offset = Math.max(Number(rawOffset || 0), 0);

        let where = 'WHERE 1=1';
        const params = [];

        if (roleLevel === 50) {
            const companyId = req.user.company_id || req.user.companyId;
            if (!companyId) {
                return res.status(403).json({ message: 'ไม่สามารถกำหนดขอบเขตบริษัทของผู้ใช้งานได้' });
            }

            where += ` AND EXISTS (
                SELECT 1
                FROM user_roles ur
                WHERE ur.user_id = audit_logs.user_id
                  AND ur.company_id = ?
            )`;
            params.push(companyId);
        }

        if (userFilter) {
            where += ' AND (username LIKE ? OR CAST(user_id AS CHAR) LIKE ?)';
            params.push(`%${userFilter}%`, `%${userFilter}%`);
        }
        if (action) {
            where += ' AND action = ?';
            params.push(String(action));
        }
        if (ip) {
            where += ' AND ip_address LIKE ?';
            params.push(`%${ip}%`);
        }
        if (dateFrom) {
            where += ' AND created_at >= ?';
            params.push(`${dateFrom} 00:00:00`);
        }
        if (dateTo) {
            where += ' AND created_at <= ?';
            params.push(`${dateTo} 23:59:59`);
        }

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM audit_logs ${where}`,
            params
        );

        const [rows] = await db.query(
            `SELECT id, user_id, username, action, target, ip_address, created_at
             FROM audit_logs
             ${where}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.status(200).json({
            message: 'ดึง Audit Logs สำเร็จ',
            total: Number(countRows[0]?.total || 0),
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('Get Audit Logs Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง Audit Logs' });
    }
};

exports.getApprovalFlows = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        if (roleLevel < 80) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึง Approval Flow' });
        }

        await ensureAdminTables();

        const [rows] = await db.query(
            `SELECT module_key, level1, level2, level3 FROM approval_flow_configs`
        );
        const [policyRows] = await db.query(
            `SELECT module_key, escalation_days, delegate_role FROM approval_flow_policies`
        );

        const policyMap = new Map(
            policyRows.map((row) => [
                String(row.module_key),
                {
                    escalation_days: Number(row.escalation_days || 0),
                    delegate_role: String(row.delegate_role || ''),
                },
            ])
        );

        const mapped = {};
        APPROVAL_MODULES.forEach((moduleKey) => {
            const found = rows.find((row) => row.module_key === moduleKey);
            const policy = policyMap.get(moduleKey);
            mapped[moduleKey] = found
                ? {
                    level1: found.level1,
                    level2: found.level2,
                    level3: found.level3,
                    escalation_days: policy ? policy.escalation_days : Number(DEFAULT_APPROVAL_FLOW[moduleKey].escalation_days || 0),
                    delegate_role: policy ? policy.delegate_role : String(DEFAULT_APPROVAL_FLOW[moduleKey].delegate_role || ''),
                }
                : DEFAULT_APPROVAL_FLOW[moduleKey];
        });

        res.status(200).json({ message: 'ดึง Approval Flow สำเร็จ', data: mapped });
    } catch (error) {
        console.error('Get Approval Flows Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง Approval Flow' });
    }
};

exports.updateApprovalFlows = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        const userId = Number(req.user?.user_id || 0) || null;
        const username = req.user?.username || null;

        if (roleLevel < 99) {
            return res.status(403).json({ message: 'เฉพาะ Super Admin เท่านั้นที่แก้ไข Approval Flow ได้' });
        }

        const flowMap = req.body?.flowMap;
        if (!flowMap || typeof flowMap !== 'object') {
            return res.status(400).json({ message: 'รูปแบบ flowMap ไม่ถูกต้อง' });
        }

        await ensureAdminTables();

        for (const moduleKey of APPROVAL_MODULES) {
            const row = flowMap[moduleKey] || {};
            await db.query(
                `INSERT INTO approval_flow_configs (module_key, level1, level2, level3, updated_by)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    level1 = VALUES(level1),
                    level2 = VALUES(level2),
                    level3 = VALUES(level3),
                    updated_by = VALUES(updated_by),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    moduleKey,
                    String(row.level1 || DEFAULT_APPROVAL_FLOW[moduleKey].level1),
                    String(row.level2 || DEFAULT_APPROVAL_FLOW[moduleKey].level2),
                    String(row.level3 || DEFAULT_APPROVAL_FLOW[moduleKey].level3),
                    userId,
                ]
            );

            await db.query(
                `INSERT INTO approval_flow_policies (module_key, escalation_days, delegate_role, updated_by)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    escalation_days = VALUES(escalation_days),
                    delegate_role = VALUES(delegate_role),
                    updated_by = VALUES(updated_by),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    moduleKey,
                    Math.max(0, Number(row.escalation_days || DEFAULT_APPROVAL_FLOW[moduleKey].escalation_days || 0)),
                    String(row.delegate_role || DEFAULT_APPROVAL_FLOW[moduleKey].delegate_role || ''),
                    userId,
                ]
            );
        }

        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, 'UPDATE_APPROVAL_FLOW', ?, ?, ?)`,
            [userId, username, 'approval-flow', getClientIp(req), JSON.stringify({ modules: APPROVAL_MODULES })]
        );

        res.status(200).json({ message: 'บันทึก Approval Flow สำเร็จ' });
    } catch (error) {
        console.error('Update Approval Flows Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก Approval Flow' });
    }
};

exports.getLeavePolicies = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        if (roleLevel < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึง Leave Policy' });
        }

        await ensureAdminTables();

        let sql = `SELECT
                c.id AS company_id,
                c.code AS company_code,
                c.name_th AS company_name,
                COALESCE(lp.service_years, 1) AS service_years,
                COALESCE(lp.vacation_days, 6) AS vacation_days,
                COALESCE(lp.sick_cert_required_after_days, 2) AS sick_cert_required_after_days
             FROM companies c
             LEFT JOIN leave_policy_configs lp ON lp.company_id = c.id
             WHERE 1=1`;
        const params = [];

        if (roleLevel === 50) {
            const companyId = getAuthCompanyId(req);
            if (!companyId) {
                return res.status(403).json({ message: 'ไม่สามารถกำหนดขอบเขตบริษัทของผู้ใช้งานได้' });
            }
            sql += ' AND c.id = ?';
            params.push(companyId);
        }

        sql += ' ORDER BY c.id ASC';
        const [rows] = await db.query(sql, params);

        res.status(200).json({ message: 'ดึง Leave Policy สำเร็จ', data: rows });
    } catch (error) {
        console.error('Get Leave Policies Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง Leave Policy' });
    }
};

exports.updateLeavePolicies = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        const userId = Number(req.user?.user_id || 0) || null;
        const username = req.user?.username || null;
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

        if (roleLevel < 80) {
            return res.status(403).json({ message: 'เฉพาะ Central HR หรือ Super Admin เท่านั้นที่แก้ไข Leave Policy ได้' });
        }

        await ensureAdminTables();

        for (const row of rows) {
            const companyId = Number(row.company_id || 0);
            if (!companyId) continue;

            await db.query(
                `INSERT INTO leave_policy_configs
                    (company_id, service_years, vacation_days, sick_cert_required_after_days, updated_by)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    service_years = VALUES(service_years),
                    vacation_days = VALUES(vacation_days),
                    sick_cert_required_after_days = VALUES(sick_cert_required_after_days),
                    updated_by = VALUES(updated_by),
                    updated_at = CURRENT_TIMESTAMP`,
                [
                    companyId,
                    Number(row.service_years || 0),
                    Number(row.vacation_days || 0),
                    Number(row.sick_cert_required_after_days || 0),
                    userId,
                ]
            );
        }

        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, 'UPDATE_LEAVE_POLICY', ?, ?, ?)`,
            [userId, username, 'leave-policy', getClientIp(req), JSON.stringify({ count: rows.length })]
        );

        res.status(200).json({ message: 'บันทึก Leave Policy สำเร็จ' });
    } catch (error) {
        console.error('Update Leave Policies Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก Leave Policy' });
    }
};

exports.getSystemSettings = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        if (roleLevel < 80) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึง System Settings' });
        }

        await ensureAdminTables();

        const [rows] = await db.query(`SELECT setting_key, setting_value_json FROM system_settings`);
        const data = { ...DEFAULT_SYSTEM_SETTINGS };
        rows.forEach((row) => {
            try {
                const parsed = typeof row.setting_value_json === 'string'
                    ? JSON.parse(row.setting_value_json)
                    : row.setting_value_json;
                data[row.setting_key] = parsed?.value;
            } catch (error) {
                // ignore malformed row and keep default
            }
        });

        res.status(200).json({ message: 'ดึง System Settings สำเร็จ', data });
    } catch (error) {
        console.error('Get System Settings Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง System Settings' });
    }
};

exports.updateSystemSettings = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        const userId = Number(req.user?.user_id || 0) || null;
        const username = req.user?.username || null;

        if (roleLevel < 80) {
            return res.status(403).json({ message: 'เฉพาะ Central HR หรือ Super Admin เท่านั้นที่แก้ไข System Settings ได้' });
        }

        const payload = req.body?.settings;
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ message: 'รูปแบบ settings ไม่ถูกต้อง' });
        }

        await ensureAdminTables();

        for (const [key, value] of Object.entries(payload)) {
            await db.query(
                `INSERT INTO system_settings (setting_key, setting_value_json, updated_by)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    setting_value_json = VALUES(setting_value_json),
                    updated_by = VALUES(updated_by),
                    updated_at = CURRENT_TIMESTAMP`,
                [key, JSON.stringify({ value }), userId]
            );
        }

        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, 'UPDATE_SYSTEM_SETTINGS', ?, ?, ?)`,
            [userId, username, 'system-settings', getClientIp(req), JSON.stringify({ keys: Object.keys(payload) })]
        );

        res.status(200).json({ message: 'บันทึก System Settings สำเร็จ' });
    } catch (error) {
        console.error('Update System Settings Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก System Settings' });
    }
};

exports.runSystemAction = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        const userId = Number(req.user?.user_id || 0) || null;
        const username = req.user?.username || null;
        const actionKey = String(req.params.actionKey || '').trim();

        if (roleLevel < 80) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์รันงานดูแลระบบ' });
        }

        if (!actionKey) {
            return res.status(400).json({ message: 'กรุณาระบุ actionKey' });
        }

        await ensureAdminTables();
        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, 'RUN_SYSTEM_ACTION', ?, ?, ?)`,
            [userId, username, actionKey, getClientIp(req), JSON.stringify({ action: actionKey })]
        );

        res.status(200).json({ message: 'สั่งงานระบบสำเร็จ', data: { action: actionKey } });
    } catch (error) {
        console.error('Run System Action Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสั่งงานระบบ' });
    }
};

exports.getPayrollSettings = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        if (roleLevel < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึง Payroll Settings' });
        }

        await ensureAdminTables();

        let sql = `SELECT
                e.id AS employee_id,
                e.employee_code,
                e.firstname_th,
                e.lastname_th,
                e.company_id,
                COALESCE(ps.basic_salary, 0) AS basic_salary,
                COALESCE(ps.bank_name, 'SCB') AS bank_name,
                COALESCE(ps.bank_account_no, '') AS bank_account_no,
                COALESCE(ps.tax_dependent, 0) AS tax_dependent,
                COALESCE(ps.life_insurance_deduction, 0) AS life_insurance_deduction,
                COALESCE(ps.sso_enabled, 1) AS sso_enabled
             FROM employees e
             LEFT JOIN payroll_employee_settings ps ON ps.employee_id = e.id
             WHERE 1=1`;
        const params = [];

        if (roleLevel === 50) {
            const companyId = getAuthCompanyId(req);
            if (!companyId) {
                return res.status(403).json({ message: 'ไม่สามารถกำหนดขอบเขตบริษัทของผู้ใช้งานได้' });
            }
            sql += ' AND e.company_id = ?';
            params.push(companyId);
        }

        sql += ' ORDER BY e.id ASC';
        const [rows] = await db.query(sql, params);

        res.status(200).json({ message: 'ดึง Payroll Settings สำเร็จ', data: rows });
    } catch (error) {
        console.error('Get Payroll Settings Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึง Payroll Settings' });
    }
};

exports.updatePayrollSetting = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        const userId = Number(req.user?.user_id || 0) || null;
        const username = req.user?.username || null;
        const employeeId = Number(req.params.employeeId || 0);

        if (roleLevel < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไข Payroll Settings' });
        }
        if (!employeeId) {
            return res.status(400).json({ message: 'employeeId ไม่ถูกต้อง' });
        }

        if (roleLevel === 50) {
            const companyId = getAuthCompanyId(req);
            if (!companyId) {
                return res.status(403).json({ message: 'ไม่สามารถกำหนดขอบเขตบริษัทของผู้ใช้งานได้' });
            }

            const [scopeRows] = await db.query(
                `SELECT id FROM employees WHERE id = ? AND company_id = ? LIMIT 1`,
                [employeeId, companyId]
            );

            if (!scopeRows.length) {
                return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไข Payroll ของพนักงานต่างบริษัท' });
            }
        }

        const payload = req.body || {};

        await ensureAdminTables();
        await db.query(
            `INSERT INTO payroll_employee_settings
                (employee_id, basic_salary, bank_name, bank_account_no, tax_dependent, life_insurance_deduction, sso_enabled, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                basic_salary = VALUES(basic_salary),
                bank_name = VALUES(bank_name),
                bank_account_no = VALUES(bank_account_no),
                tax_dependent = VALUES(tax_dependent),
                life_insurance_deduction = VALUES(life_insurance_deduction),
                sso_enabled = VALUES(sso_enabled),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP`,
            [
                employeeId,
                Number(payload.basic_salary || 0),
                String(payload.bank_name || 'SCB'),
                String(payload.bank_account_no || ''),
                Number(payload.tax_dependent || 0),
                Number(payload.life_insurance_deduction || 0),
                payload.sso_enabled ? 1 : 0,
                userId,
            ]
        );

        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, 'UPDATE_PAYROLL_SETTING', ?, ?, ?)`,
            [userId, username, `employee:${employeeId}`, getClientIp(req), JSON.stringify({ employee_id: employeeId })]
        );

        res.status(200).json({ message: 'บันทึก Payroll Setting สำเร็จ' });
    } catch (error) {
        console.error('Update Payroll Setting Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึก Payroll Setting' });
    }
};
