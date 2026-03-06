const db = require('../config/db');

exports.getAllEmployees = async (req, res) => {
    try {
        // 1. แกะข้อมูลสิทธิ์ที่ได้จาก Token (authMiddleware ส่งมาให้ใน req.user)
        const { user_id, role_level, company_id } = req.user;

        // 2. สร้างคำสั่ง SQL พื้นฐาน (Join ตารางเพื่อเอาชื่อบริษัท แผนก ตำแหน่ง มาโชว์สวยๆ)
        let sql = `
            SELECT 
                e.id, 
                e.employee_code, 
                e.firstname_th, 
                e.lastname_th, 
                e.status,
                c.name_th AS company_name, 
                d.name_th AS department_name, 
                p.title_th AS position_name
            FROM employees e
            LEFT JOIN companies c ON e.company_id = c.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            WHERE 1=1
        `;
        
        const params = [];

        // 3. ⭐️ หัวใจหลัก: กรองข้อมูลตามสิทธิ์ (Data Isolation)
        if (role_level >= 80) {
            // Super Admin (99) และ Central HR (80) -> ไม่ต้องเติม WHERE เพิ่ม (ดึงได้หมดทุกบริษัท)
        } 
        else if (role_level === 50) {
            // HR Company (50) -> ล็อคให้ดูได้แค่บริษัทของตัวเอง
            sql += ` AND e.company_id = ?`;
            params.push(company_id);
        } 
        else if (role_level === 20) {
            // Manager (20) -> ล็อคให้ดูได้เฉพาะคนที่มี manager_id ตรงกับรหัสพนักงานของตัวเอง
            // (ต้องแปลงจาก user_id เป็น employee_id ของ Manager ก่อน)
            sql += ` AND e.manager_id = (SELECT id FROM employees WHERE user_id = ?)`;
            params.push(user_id);
        } 
        else {
            // Employee (1) -> ดูได้แค่ข้อมูลของตัวเองเท่านั้น
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        // 4. รันคำสั่ง SQL
        const [employees] = await db.query(sql, params);

        res.status(200).json({
            message: 'ดึงข้อมูลพนักงานสำเร็จ',
            count: employees.length,
            data: employees
        });

    } catch (error) {
        console.error('Get Employees Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' });
    }
};