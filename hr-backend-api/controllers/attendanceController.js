const db = require('../config/db');

// ดึงข้อมูลประวัติการลงเวลาเข้า-ออกงาน
exports.getAttendances = async (req, res) => {
    try {
        const { user_id, role_level, company_id } = req.user;
        
        // 1. สร้างคำสั่ง SQL พื้นฐาน (Join ตารางเพื่อเอาชื่อ-นามสกุลมาแสดง)
        let sql = `
            SELECT 
                a.id, 
                a.work_date, 
                a.check_in_time, 
                a.check_out_time, 
                a.status,
                e.employee_code, 
                e.firstname_th, 
                e.lastname_th,
                d.name_th AS department_name
            FROM attendances a
            JOIN employees e ON a.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE 1=1
        `;
        
        const params = [];

        // 2. ⭐️ กรองข้อมูลตามสิทธิ์ (RBAC)
        if (role_level >= 80) {
            // Super Admin (99) & Central HR (80) -> ดูได้หมดทุกคน
        } 
        else if (role_level === 50) {
            // HR Company (50) -> ดูได้ทุกคน "แต่เฉพาะในบริษัทตัวเอง"
            sql += ` AND e.company_id = ?`;
            params.push(company_id);
        } 
        else if (role_level === 20) {
            // Manager (20) -> ดูได้เฉพาะ "ตัวเอง" และ "ลูกทีมของตัวเอง"
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } 
        else {
            // Employee (1) -> ดูได้เฉพาะข้อมูลสแกนนิ้วของ "ตัวเอง" เท่านั้น
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        // เรียงลำดับจากวันที่ล่าสุดก่อน และจำกัดแค่ 100 รายการเพื่อไม่ให้โหลดช้า
        sql += ` ORDER BY a.work_date DESC LIMIT 100`;

        // 3. รันคำสั่ง
        const [attendances] = await db.query(sql, params);

        res.status(200).json({ 
            message: 'ดึงข้อมูลการลงเวลาสำเร็จ',
            count: attendances.length,
            data: attendances 
        });

    } catch (error) {
        console.error('Get Attendances Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลลงเวลา' });
    }
};