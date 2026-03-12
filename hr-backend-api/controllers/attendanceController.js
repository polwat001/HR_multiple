const db = require('../config/db');

async function getEmployeeByUserId(userId) {
    const [rows] = await db.query(
        `SELECT id, employee_code, firstname_th, lastname_th
         FROM employees
         WHERE user_id = ?
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

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
                e.user_id,
                e.employee_code, 
                e.firstname_th, 
                e.lastname_th,
                d.name_th AS department_name,
                ws.id AS shift_id,
                ws.shift_name,
                ws.time_in AS shift_time_in,
                ws.time_out AS shift_time_out
            FROM attendances a
            JOIN employees e ON a.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN work_schedules ws ON e.work_schedule_id = ws.id
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

// ลงเวลาเข้างาน (check-in) ของ user ปัจจุบัน
exports.checkIn = async (req, res) => {
    try {
        const { user_id } = req.user;
        const employee = await getEmployeeByUserId(user_id);

        if (!employee) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงานของผู้ใช้งานนี้' });
        }

        const [existingRows] = await db.query(
            `SELECT id, check_in_time, check_out_time
             FROM attendances
             WHERE employee_id = ? AND work_date = CURDATE()
             ORDER BY id DESC
             LIMIT 1`,
            [employee.id]
        );

        const existing = existingRows[0];
        if (existing?.check_in_time) {
            return res.status(409).json({ message: 'วันนี้ลงเวลาเข้างานแล้ว' });
        }

        if (existing) {
            await db.query(
                `UPDATE attendances
                 SET check_in_time = CURTIME(), status = 'present'
                 WHERE id = ?`,
                [existing.id]
            );
        } else {
            await db.query(
                `INSERT INTO attendances (employee_id, work_date, check_in_time, status)
                 VALUES (?, CURDATE(), CURTIME(), 'present')`,
                [employee.id]
            );
        }

        res.status(200).json({ message: 'ลงเวลาเข้างานสำเร็จ' });
    } catch (error) {
        console.error('Check In Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงเวลาเข้างาน' });
    }
};

// ลงเวลาออกงาน (check-out) ของ user ปัจจุบัน
exports.checkOut = async (req, res) => {
    try {
        const { user_id } = req.user;
        const employee = await getEmployeeByUserId(user_id);

        if (!employee) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงานของผู้ใช้งานนี้' });
        }

        const [existingRows] = await db.query(
            `SELECT id, check_in_time, check_out_time
             FROM attendances
             WHERE employee_id = ? AND work_date = CURDATE()
             ORDER BY id DESC
             LIMIT 1`,
            [employee.id]
        );

        const existing = existingRows[0];
        if (!existing || !existing.check_in_time) {
            return res.status(400).json({ message: 'ยังไม่ได้ลงเวลาเข้างานวันนี้' });
        }

        if (existing.check_out_time) {
            return res.status(409).json({ message: 'วันนี้ลงเวลาออกงานแล้ว' });
        }

        await db.query(
            `UPDATE attendances
             SET check_out_time = CURTIME()
             WHERE id = ?`,
            [existing.id]
        );

        res.status(200).json({ message: 'ลงเวลาออกงานสำเร็จ' });
    } catch (error) {
        console.error('Check Out Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงเวลาออกงาน' });
    }
};