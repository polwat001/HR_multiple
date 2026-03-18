const db = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * GET /api/users
 * ดึงข้อมูลผู้ใช้งานทั้งหมด (มีการกรองตามสิทธิ)
 */
exports.getUsers = async (req, res) => {
    try {
        const { role_level, company_id } = req.user;

        // บล็อคไม่ให้ Manager และ Employee เข้าถึงเมนูตั้งค่า Users
        if (role_level < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลบัญชีผู้ใช้งาน' });
        }

        let sql = `
            SELECT 
                u.id, 
                u.username, 
                u.email,
                u.status, 
                u.last_login,
                u.created_at,
                GROUP_CONCAT(DISTINCT r.role_name SEPARATOR ', ') AS roles,
                GROUP_CONCAT(DISTINCT c.name_th SEPARATOR ', ') AS companies
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            LEFT JOIN companies c ON ur.company_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // HR Company เห็นเฉพาะบัญชีในบริษัทตัวเอง
        if (role_level === 50) {
            sql += ` AND ur.company_id = ?`;
            params.push(company_id);
        }

        sql += ` GROUP BY u.id ORDER BY u.created_at DESC`;

        const [users] = await db.query(sql, params);
        res.status(200).json({ 
            message: 'ดึงข้อมูลบัญชีผู้ใช้งานสำเร็จ', 
            data: users,
            count: users.length 
        });

    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน' });
    }
};

/**
 * GET /api/users/:id
 * ดึงข้อมูลผู้ใช้งานรายคนพอพอดี
 */
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_level, company_id } = req.user;

        if (role_level < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึง' });
        }

        const sql = `
            SELECT 
                u.id, 
                u.username, 
                u.email,
                u.status, 
                u.last_login,
                u.created_at,
                GROUP_CONCAT(DISTINCT ur.role_id) AS role_ids,
                GROUP_CONCAT(DISTINCT r.role_name SEPARATOR ', ') AS roles,
                GROUP_CONCAT(DISTINCT ur.company_id) AS company_ids
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = ?
            GROUP BY u.id
        `;

        const [users] = await db.query(sql, [id]);

        if (!users.length) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        res.status(200).json({ 
            message: 'ดึงข้อมูลสำเร็จ', 
            data: users[0]
        });

    } catch (error) {
        console.error('Get User By ID Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
};

/**
 * POST /api/users
 * สร้างผู้ใช้งานใหม่
 */
exports.createUser = async (req, res) => {
    try {
        const { username, email, password, status = 'active', roles = [] } = req.body;
        const { role_level, company_id } = req.user;

        // ตรวจสิทธิ์
        if (role_level < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์สร้างผู้ใช้งาน' });
        }

        // ตรวจสอบข้อมูลจำเป็น
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email และ password เป็นข้อมูลจำเป็น' });
        }

        // ตรวจสอบว่า username มีอยู่แล้วหรือไม่
        const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Username หรือ Email นี้มีอยู่แล้ว' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // เพิ่มผู้ใช้งาน
        const [result] = await db.query(
            'INSERT INTO users (username, email, password_hash, status) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, status]
        );

        const userId = result.insertId;

        // Assign roles
        if (roles && roles.length > 0) {
            for (const roleId of roles) {
                await db.query(
                    'INSERT INTO user_roles (user_id, role_id, company_id) VALUES (?, ?, ?)',
                    [userId, roleId, company_id]
                );
            }
        }

        res.status(201).json({ 
            message: 'สร้างผู้ใช้งานสำเร็จ',
            data: { id: userId, username, email, status }
        });

    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน' });
    }
};

/**
 * PUT /api/users/:id
 * อัปเดตข้อมูลผู้ใช้งาน
 */
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, status } = req.body;
        const { role_level } = req.user;

        if (role_level < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไข' });
        }

        // ตรวจสอบว่าผู้ใช้มีอยู่
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (!users.length) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        // อัปเดต
        const updates = [];
        const params = [];

        if (username) {
            updates.push('username = ?');
            params.push(username);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องแก้ไข' });
        }

        params.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await db.query(sql, params);

        res.status(200).json({ message: 'อัปเดตไข่มูลสำเร็จ' });

    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดต' });
    }
};

/**
 * DELETE /api/users/:id
 * ลบผู้ใช้งาน
 */
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_level } = req.user;

        if (role_level !== 99) {
            return res.status(403).json({ message: 'เฉพาะ Super Admin เท่านั้นซี่รสามารถลบผู้ใช้งาน' });
        }

        // ตรวจสอบว่าผู้ใช้มีอยู่
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (!users.length) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        // ลบอันดับแรก user_roles
        await db.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
        // จากนั้นลบ users
        await db.query('DELETE FROM users WHERE id = ?', [id]);

        res.status(200).json({ message: 'ลบผู้ใช้งานสำเร็จ' });

    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้งาน' });
    }
};

/**
 * POST /api/users/:id/assign-role
 * กำหนด role ให้ผู้ใช้งาน
 */
exports.assignRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_id, company_id } = req.body;
        const { role_level, company_id: userCompanyId } = req.user;

        if (role_level < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์กำหนด role' });
        }

        if (!role_id) {
            return res.status(400).json({ message: 'role_id เป็นข้อมูลจำเป็น' });
        }

        // ตรวจสอบ role
        const [roles] = await db.query('SELECT id FROM roles WHERE id = ?', [role_id]);
        if (!roles.length) {
            return res.status(404).json({ message: 'ไม่พบ role นี้' });
        }

        // ตรวจสอบผู้ใช้
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
        if (!users.length) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        // เพิ่ม role
        await db.query(
            'INSERT IGNORE INTO user_roles (user_id, role_id, company_id) VALUES (?, ?, ?)',
            [id, role_id, company_id || userCompanyId]
        );

        res.status(200).json({ message: 'กำหนด role สำเร็จ' });

    } catch (error) {
        console.error('Assign Role Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการกำหนด role' });
    }
};

/**
 * DELETE /api/users/:id/remove-role
 * เอา role ออกจากผู้ใช้งาน
 */
exports.removeRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_id } = req.body;
        const { role_level } = req.user;

        if (role_level < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เอา role ออก' });
        }

        if (!role_id) {
            return res.status(400).json({ message: 'role_id เป็นข้อมูลจำเป็น' });
        }

        await db.query('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [id, role_id]);

        res.status(200).json({ message: 'เอา role ออกสำเร็จ' });

    } catch (error) {
        console.error('Remove Role Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเอา role ออก' });
    }
};

/**
 * PUT /api/users/:id/change-password
 * เปลี่ยนรหัสผ่านผู้ใช้งาน
 */
exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { oldPassword, newPassword } = req.body;
        const { user_id } = req.user;

        // Users can only change their own password
        if (user_id !== parseInt(id)) {
            return res.status(403).json({ message: 'คุณสามารถเปลี่ยนเฉพาะรหัสผ่านของตัวเองได้เท่านั้น' });
        }

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'กรุณากรอก password เก่าและใหม่' });
        }

        // ดึงผู้ใช้
        const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [id]);
        if (!users.length) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        }

        // ตรวจสอบ password เก่า
        const isMatch = await bcrypt.compare(oldPassword, users[0].password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'รหัสผ่านเก่าไม่ถูกต้อง' });
        }

        // Hash password ใหม่
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, id]);

        res.status(200).json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ' });

    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
    }
};

/**
 * GET /api/users/roles
 * ดึงรายการ role ทั้งหมดจากฐานข้อมูล
 */
exports.getRolesCatalog = async (req, res) => {
    try {
        const { role_level } = req.user;
        if (Number(role_level || 0) < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงรายการบทบาท' });
        }

        const [rows] = await db.query(
            `SELECT id, role_name, role_level
             FROM roles
             ORDER BY role_level DESC, id ASC`
        );

        res.status(200).json({
            message: 'ดึงรายการบทบาทสำเร็จ',
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('Get Roles Catalog Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการบทบาท' });
    }
};