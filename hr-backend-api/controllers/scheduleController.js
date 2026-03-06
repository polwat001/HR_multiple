const db = require('../config/db');

exports.getSchedules = async (req, res) => {
    try {
        const { role_level, company_id } = req.user;
        
        let sql = `
            SELECT 
                ws.id, 
                ws.shift_name, 
                ws.time_in, 
                ws.time_out, 
                ws.grace_period_mins,
                c.name_th AS company_name
            FROM work_schedules ws
            JOIN companies c ON ws.company_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // กะการทำงานจะผูกกับบริษัท (พนักงานดูได้แค่กะของบริษัทตัวเอง)
        if (role_level < 80) {
            sql += ` AND ws.company_id = ?`;
            params.push(company_id);
        }

        const [schedules] = await db.query(sql, params);
        res.status(200).json({ message: 'ดึงข้อมูลกะการทำงานสำเร็จ', data: schedules });

    } catch (error) {
        console.error('Get Schedules Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตารางเวลา' });
    }
};