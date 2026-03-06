const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // ไฟล์เชื่อมต่อฐานข้อมูล MySQL ของคุณ

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. ตรวจสอบว่ากรอกข้อมูลมาครบไหม
        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
        }

        // 2. ค้นหา User พร้อมกับดึงสิทธิ์ (Role) และขอบเขตข้อมูล (Company/Department)
        const sql = `
            SELECT 
                u.id AS user_id, 
                u.username, 
                u.password_hash, 
                u.status,
                ur.company_id, 
                ur.department_id,
                r.role_name, 
                r.role_level
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.username = ?
        `;
        
        const [users] = await db.query(sql, [username]);

        // 3. เช็คว่าเจอ User ไหม และสถานะถูกล็อคอยู่หรือเปล่า
        if (users.length === 0) {
            return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
        }

        const user = users[0];

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อ HR' });
        }

        // 4. ตรวจสอบรหัสผ่าน (Password Hashing)
        // หมายเหตุ: กรณี Mock Data ที่ผมให้ไปเป็น Hash ปลอม ถ้าคุณจะทดสอบตอนแรก 
        // อาจจะแก้บรรทัดนี้เป็นการเช็ค string ธรรมดาก่อนได้ (เช่น password === '123456')
         const isMatch = (password === user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
        }
        
        // 5. สร้าง JWT Payload (ข้อมูลที่จะฝังไปใน Token) ⭐️ หัวใจสำคัญของระบบสิทธิ์!
        const payload = {
            user_id: user.user_id,
            role_level: user.role_level,       // เช่น 99, 80, 50, 20
            role_name: user.role_name,         // เช่น 'Manager', 'HR Company'
            company_id: user.company_id,       // ระบุบริษัท (ถ้าเป็น NULL คือดูได้หมด)
            department_id: user.department_id  // ระบุแผนก (ถ้าเป็น NULL คือดูได้หมด)
        };

        // 6. สร้าง Token (ตั้งอายุไว้ที่ 1 วัน)
        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET || 'your_super_secret_key', 
            { expiresIn: '1d' }
        );

        // 7. ส่ง Token และข้อมูลเบื้องต้นกลับไปให้หน้าบ้าน (React)
        res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            token: token,
            user: {
                user_id: user.user_id,
                username: user.username,
                role: user.role_name,
                company_id: user.company_id
            }
        });
        
        // อัปเดตเวลาเข้าสู่ระบบล่าสุด (Optional)
        await db.query(`UPDATE users SET last_login = NOW() WHERE id = ?`, [user.user_id]);



    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
};
// เพิ่มต่อท้ายไฟล์ authController.js
exports.getMe = async (req, res) => {
    try {
        // ข้อมูล req.user จะถูกส่งมาจาก authMiddleware หลังจากถอดรหัส Token สำเร็จ
        // เราสามารถส่งข้อมูลนี้กลับไปให้หน้าบ้าน (React) ใช้แสดงชื่อหรือ Role ได้ทันที
        if (!req.user) {
            return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้งาน" });
        }

        res.status(200).json({
            message: "ดึงข้อมูลโปรไฟล์สำเร็จ",
            user: {
                user_id: req.user.user_id,
                username: req.user.username, // ถ้าใน middleware มีการดึงชื่อมาด้วย
                role_name: req.user.role_name,
                role_level: req.user.role_level,
                company_id: req.user.company_id,
                department_id: req.user.department_id
            }
        });
    } catch (error) {
        console.error('GetMe Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลส่วนตัว' });
    }
};