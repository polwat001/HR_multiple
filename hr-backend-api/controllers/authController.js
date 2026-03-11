const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const roleLevelMap = {
    'Employee': 1,
    'Manager': 20,
    'HR Company': 50,
    'Central HR': 80,
    'Super Admin': 99,
};

const DEFAULT_JWT_SECRET = 'super_secret_key_for_hr_system_2026';

async function appendAuditLog({ user_id, username, action, target, ip_address, metadata }) {
    try {
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

        await db.query(
            `INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id || null, username || null, action, target || null, ip_address || null, JSON.stringify(metadata || {})]
        );
    } catch (error) {
        console.error('Append Audit Log Error:', error.message);
    }
}

function buildUserRoleContexts(rows) {
    return rows
        .filter((r) => r.role_name)
        .map((r) => ({
            role_name: r.role_name,
            role_level: Number(r.role_level || roleLevelMap[r.role_name] || 0),
            company_id: r.company_id ?? null,
            department_id: r.department_id ?? null,
        }));
}

exports.login = async (req, res) => {
    try {
        const usernameInput = String(req.body?.username || '').trim();
        const password = String(req.body?.password || '');

        if (!usernameInput || !password) {
            return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
        }

        const sql = `
            SELECT
                u.id AS user_id,
                u.username,
                u.password_hash,
                u.status,
                e.employee_code,
                e.firstname_th,
                e.lastname_th,
                p.title_th AS position_name,
                ur.company_id,
                ur.department_id,
                r.role_name,
                r.role_level
            FROM users u
            LEFT JOIN employees e ON e.user_id = u.id
            LEFT JOIN positions p ON e.position_id = p.id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE LOWER(u.username) = LOWER(?)
        `;

        const [users] = await db.query(sql, [usernameInput]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
        }

        const user = users[0];
        const roleContexts = buildUserRoleContexts(users);
        const roles = roleContexts.map((r) => r.role_name);
        const highestRole = roleContexts.reduce(
            (max, r) => (r.role_level > max.role_level ? r : max),
            roleContexts[0] || { role_name: 'Employee', role_level: 1, company_id: null, department_id: null }
        );

        const hasManagerRole = roles.includes('Manager');
        const hasHrCompanyRole = roles.includes('HR Company');
        const leaveApprovalScope = hasManagerRole && hasHrCompanyRole
            ? 'manager'
            : hasHrCompanyRole
                ? 'company'
                : hasManagerRole
                    ? 'manager'
                    : 'self';

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อ HR' });
        }

        let isMatch = false;
        if (typeof user.password_hash === 'string' && user.password_hash.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, user.password_hash);
        } else {
            isMatch = password === user.password_hash;
        }

        if (!isMatch) {
            return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
        }

        const displayName = [user.firstname_th, user.lastname_th].filter(Boolean).join(' ').trim() || user.username;

        const payload = {
            user_id: user.user_id,
            username: user.username,
            display_name: displayName,
            position_name: user.position_name || null,
            role_level: highestRole.role_level,
            role_name: highestRole.role_name,
            company_id: highestRole.company_id,
            department_id: highestRole.department_id,
            roles,
            role_contexts: roleContexts,
            module_scopes: {
                dashboard_scope: highestRole.role_level >= 50 ? 'company' : hasManagerRole ? 'department' : 'self',
                reports_scope: highestRole.role_level >= 50 ? 'company' : hasManagerRole ? 'department' : 'self',
                leave_approval_scope: leaveApprovalScope,
            },
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                display_name: displayName,
                employee_code: user.employee_code || null,
                position_name: user.position_name || null,
                role: highestRole.role_name,
                role_level: highestRole.role_level,
                company_id: highestRole.company_id,
                department_id: highestRole.department_id,
                roles,
                role_contexts: roleContexts,
                module_scopes: payload.module_scopes,
            }
        });

        await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.user_id]);
        await appendAuditLog({
            user_id: user.user_id,
            username: user.username,
            action: 'LOGIN',
            target: 'System',
            ip_address: req.ip || req.connection?.remoteAddress || null,
            metadata: { role: highestRole.role_name },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
};

exports.getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้งาน' });
        }

        const [profileRows] = await db.query(
            `
                SELECT
                    e.employee_code,
                    e.firstname_th,
                    e.lastname_th,
                    p.title_th AS position_name
                FROM employees e
                LEFT JOIN positions p ON e.position_id = p.id
                WHERE e.user_id = ?
                LIMIT 1
            `,
            [req.user.user_id]
        );

        const profile = profileRows[0] || {};
        const displayName = [profile.firstname_th, profile.lastname_th].filter(Boolean).join(' ').trim() || req.user.username;

        res.status(200).json({
            message: 'ดึงข้อมูลโปรไฟล์สำเร็จ',
            user: {
                user_id: req.user.user_id,
                username: req.user.username,
                display_name: displayName,
                employee_code: profile.employee_code || null,
                position_name: profile.position_name || null,
                role_name: req.user.role_name,
                role_level: req.user.role_level,
                company_id: req.user.company_id,
                department_id: req.user.department_id,
                roles: req.user.roles || [req.user.role_name],
                role_contexts: req.user.role_contexts || [],
                module_scopes: req.user.module_scopes || {},
            }
        });
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลส่วนตัว' });
    }
};
