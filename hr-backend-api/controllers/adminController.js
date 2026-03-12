const db = require('../config/db');

const MATRIX_MODULES = [
    'dashboard',
    'organization',
    'employee',
    'attendance',
    'leave',
    'contract',
    'reports',
    'permissions',
    'holidays',
    'audit_log',
];

const defaultMatrix = () => {
    const matrix = {};
    MATRIX_MODULES.forEach((moduleName) => {
        matrix[moduleName] = {
            view: true,
            create: moduleName !== 'dashboard' && moduleName !== 'reports' && moduleName !== 'audit_log',
            edit: moduleName !== 'dashboard' && moduleName !== 'reports',
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
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.connection?.remoteAddress || null;
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
