const db = require('../config/db');

exports.getContracts = async (req, res) => {
    try {
        const { user_id, role_level, company_id } = req.user;
        
        let sql = `
            SELECT 
                ec.id, 
                ec.contract_type, 
                ec.start_date, 
                ec.end_date, 
                ec.status, 
                e.employee_code, 
                e.firstname_th, 
                e.lastname_th,
                c.name_th AS company_name
            FROM employee_contracts ec
            JOIN employees e ON ec.employee_id = e.id
            JOIN companies c ON ec.company_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // ⭐️ กรองข้อมูลตามสิทธิ์
        if (role_level >= 80) {
            // Super Admin & Central HR ดูได้หมด
        } else if (role_level === 50) {
            // HR Company ดูได้เฉพาะบริษัทตัวเอง
            sql += ` AND ec.company_id = ?`;
            params.push(company_id);
        } else if (role_level === 20) {
            // Manager ดูเฉพาะลูกทีมตัวเอง
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } else {
            // พนักงานทั่วไป ดูสัญญาตัวเอง
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        const [contracts] = await db.query(sql, params);
        res.status(200).json({ message: 'ดึงข้อมูลสัญญาสำเร็จ', data: contracts });

    } catch (error) {
        console.error('Get Contracts Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสัญญาจ้าง' });
    }
};