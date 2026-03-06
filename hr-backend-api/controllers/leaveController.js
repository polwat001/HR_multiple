const db = require('../config/db');

// 1. ดึงข้อมูลประวัติคำร้องขอลางาน (Leave Requests)
exports.getLeaveRequests = async (req, res) => {
    try {
        const { user_id, role_level, company_id } = req.user;
        
        let sql = `
            SELECT 
                lr.id, 
                lr.start_date, 
                lr.end_date, 
                lr.total_days, 
                lr.reason, 
                lr.status, 
                lr.created_at,
                lt.name AS leave_type_name,
                e.employee_code, 
                e.firstname_th, 
                e.lastname_th
            FROM leave_requests lr
            JOIN leave_types lt ON lr.leave_type_id = lt.id
            JOIN employees e ON lr.employee_id = e.id
            WHERE 1=1
        `;
        
        const params = [];

        // ⭐️ กรองข้อมูลตามสิทธิ์ (RBAC)
        if (role_level >= 80) {
            // Super Admin & Central HR ดูได้หมด
        } else if (role_level === 50) {
            // HR Company ดูได้เฉพาะคนในบริษัทตัวเอง
            sql += ` AND e.company_id = ?`;
            params.push(company_id);
        } else if (role_level === 20) {
            // Manager ดูได้เฉพาะ "ตัวเอง" และ "ลูกทีม" (รออนุมัติ)
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } else {
            // Employee ดูประวัติการลาของตัวเองเท่านั้น
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        sql += ` ORDER BY lr.created_at DESC LIMIT 100`;

        const [requests] = await db.query(sql, params);

        res.status(200).json({ 
            message: 'ดึงข้อมูลประวัติการลาสำเร็จ',
            count: requests.length,
            data: requests 
        });

    } catch (error) {
        console.error('Get Leave Requests Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการลา' });
    }
};

// 2. ดึงข้อมูลกระเป๋าวันลาคงเหลือ (Leave Balances) ประจำปี
exports.getLeaveBalances = async (req, res) => {
    try {
        const { user_id, role_level, company_id } = req.user;
        const currentYear = new Date().getFullYear(); // ดึงปีปัจจุบัน (เช่น 2026)
        
        let sql = `
            SELECT 
                lb.id, 
                lb.year, 
                lb.quota, 
                lb.used, 
                lb.pending, 
                lb.balance,
                lt.name AS leave_type_name,
                e.firstname_th, 
                e.lastname_th
            FROM leave_balances lb
            JOIN leave_types lt ON lb.leave_type_id = lt.id
            JOIN employees e ON lb.employee_id = e.id
            WHERE lb.year = ?
        `;
        
        const params = [currentYear];

        // ⭐️ กรองข้อมูลตามสิทธิ์เหมือนเดิมเป๊ะๆ
        if (role_level >= 80) {
            // Pass
        } else if (role_level === 50) {
            sql += ` AND e.company_id = ?`;
            params.push(company_id);
        } else if (role_level === 20) {
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } else {
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        const [balances] = await db.query(sql, params);

        res.status(200).json({ 
            message: `ดึงข้อมูลกระเป๋าวันลาปี ${currentYear} สำเร็จ`,
            data: balances 
        });

    } catch (error) {
        console.error('Get Leave Balances Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงยอดวันลาคงเหลือ' });
    }
};
// 3. สร้างคำร้องขอลางานใหม่ (Create Leave Request)
exports.createLeaveRequest = async (req, res) => {
    try {
        const { user_id } = req.user;
        const { leave_type_id, start_date, end_date, total_days, reason } = req.body;

        // หา employee_id จาก user_id
        const [emp] = await db.query(`SELECT id, manager_id FROM employees WHERE user_id = ?`, [user_id]);
        if (emp.length === 0) return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงาน' });

        const employee_id = emp[0].id;
        const approver_id = emp[0].manager_id; // ดึงหัวหน้ามาเป็นผู้อนุมัติอัตโนมัติ

        // เช็คกระเป๋าวันลา (ตรวจสอบโควต้า)
        const currentYear = new Date().getFullYear();
        const [balance] = await db.query(
            `SELECT balance FROM leave_balances WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
            [employee_id, leave_type_id, currentYear]
        );

        if (balance.length === 0 || balance[0].balance < total_days) {
            return res.status(400).json({ message: 'โควต้าวันลาไม่เพียงพอ' });
        }

        // บันทึกใบลา
        await db.query(
            `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id]
        );

        res.status(201).json({ message: 'ส่งคำร้องขอลางานเรียบร้อยแล้ว' });

    } catch (error) {
        console.error('Create Leave Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งคำร้องขอลางาน' });
    }
};

// 4. อนุมัติหรือปฏิเสธใบลา (Approve / Reject)
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params; // ID ของใบลา
        const { status } = req.body; // 'approved' หรือ 'rejected'
        const { role_level, user_id } = req.user;

        // ตรวจสอบสิทธิ์ว่ามีสิทธิ์อนุมัติไหม (ต้องเป็น Manager ขึ้นไป)
        if (role_level < 20) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติวันลา' });
        }

        // หา ID ของพนักงานที่กดอนุมัติ
        const [approver] = await db.query(`SELECT id FROM employees WHERE user_id = ?`, [user_id]);
        const approver_id = approver[0].id;

        // อัปเดตสถานะใบลา
        await db.query(
            `UPDATE leave_requests SET status = ?, approver_id = ? WHERE id = ?`,
            [status, approver_id, id]
        );

        // ⭐️ ถ้าอนุมัติ (approved) ให้ไปหักโควต้าในกระเป๋าวันลาด้วย
        if (status === 'approved') {
            const [request] = await db.query(`SELECT employee_id, leave_type_id, total_days FROM leave_requests WHERE id = ?`, [id]);
            const reqData = request[0];
            const currentYear = new Date().getFullYear();

            await db.query(
                `UPDATE leave_balances SET used = used + ?, balance = balance - ? 
                 WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
                [reqData.total_days, reqData.total_days, reqData.employee_id, reqData.leave_type_id, currentYear]
            );
        }

        res.status(200).json({ message: `อัปเดตสถานะเป็น ${status} เรียบร้อยแล้ว` });

    } catch (error) {
        console.error('Update Leave Status Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตสถานะใบลา' });
    }
};