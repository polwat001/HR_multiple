const db = require('../config/db');

// ต้องมีคำว่า exports.getDashboardStats แบบนี้เป๊ะๆ ครับ
exports.getDashboardStats = async (req, res) => {
    try {
        const { user_id, role_level, company_id } = req.user;

        // เงื่อนไขการกรอง (Data Isolation)
        let empCondition = "WHERE 1=1";
        const empParams = [];

        if (role_level === 50) {
            empCondition += " AND company_id = ?";
            empParams.push(company_id);
        } else if (role_level === 20) {
            empCondition += " AND (user_id = ? OR manager_id = (SELECT id FROM employees WHERE user_id = ?))";
            empParams.push(user_id, user_id);
        } else if (role_level === 1) {
            empCondition += " AND user_id = ?";
            empParams.push(user_id);
        }

        // 1. ดึงจำนวนพนักงานทั้งหมด
        const [totalEmp] = await db.query(`SELECT COUNT(id) as total FROM employees ${empCondition} AND status = 'active'`, empParams);

        // 2. ดึงจำนวนใบลาที่รออนุมัติ
        let leaveCondition = "WHERE lr.status = 'pending'";
        if (role_level === 50) leaveCondition += ` AND e.company_id = ${company_id}`;
        else if (role_level === 20) leaveCondition += ` AND (e.manager_id = (SELECT id FROM employees WHERE user_id = ${user_id}))`;
        else if (role_level === 1) leaveCondition += ` AND e.user_id = ${user_id}`;

        const [pendingLeaves] = await db.query(`
            SELECT COUNT(lr.id) as total 
            FROM leave_requests lr
            JOIN employees e ON lr.employee_id = e.id
            ${leaveCondition}
        `);

        // 3. ดึงสถิติมาทำงาน "วันนี้"
        const today = new Date().toISOString().split('T')[0]; 
        
        let attCondition = `WHERE a.work_date = '${today}'`;
        if (role_level === 50) attCondition += ` AND e.company_id = ${company_id}`;
        else if (role_level === 20) attCondition += ` AND (e.manager_id = (SELECT id FROM employees WHERE user_id = ${user_id}))`;
        else if (role_level === 1) attCondition += ` AND e.user_id = ${user_id}`;

        const [attStats] = await db.query(`
            SELECT 
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent
            FROM attendances a
            JOIN employees e ON a.employee_id = e.id
            ${attCondition}
        `);

        res.status(200).json({
            message: 'ดึงข้อมูล Dashboard สำเร็จ',
            data: {
                total_employees: totalEmp[0].total || 0,
                pending_leave_requests: pendingLeaves[0].total || 0,
                attendance_today: {
                    present: attStats[0].present || 0,
                    late: attStats[0].late || 0,
                    absent: attStats[0].absent || 0
                }
            }
        });

    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสถิติ Dashboard' });
    }
};