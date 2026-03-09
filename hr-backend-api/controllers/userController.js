const db = require('../config/db');

exports.getUsers = async (req, res) => {
    try {
        const { role_level, company_id } = req.user;

        // บล็อคไม่ให้ Manager และ Employee เข้าถึงเมนูตั้งค่า Users
        if (role_level < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลบัญชีผู้ใช้งาน' });
        }

        // 💡 แก้ไขเพิ่มเติม: ดึง last_login และ created_at มาด้วย (อ้างอิงจากภาพตาราง users)
        let sql = `
            SELECT 
                u.id, 
                u.username, 
                u.status, 
                u.last_login,
                u.created_at,
                r.role_name, 
                c.name_th AS company_name
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

        const [users] = await db.query(sql, params);
        res.status(200).json({ message: 'ดึงข้อมูลบัญชีผู้ใช้งานสำเร็จ', data: users });

    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน' });
    }
};