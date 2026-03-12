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

exports.createSchedule = async (req, res) => {
    try {
        const { role_level, company_id: authCompanyId } = req.user;
        const roleLevel = Number(role_level || 0);

        if (roleLevel < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์สร้างกะการทำงาน' });
        }

        const {
            company_id: payloadCompanyId,
            shift_name,
            time_in,
            time_out,
            grace_period_mins,
        } = req.body;

        if (!shift_name || !time_in || !time_out) {
            return res.status(400).json({ message: 'กรุณาระบุชื่อกะ, เวลาเข้า และเวลาออกให้ครบถ้วน' });
        }

        const targetCompanyId = roleLevel === 50 ? authCompanyId : payloadCompanyId;
        if (!targetCompanyId) {
            return res.status(400).json({ message: 'กรุณาระบุบริษัทที่ต้องการสร้างกะ' });
        }

        const [result] = await db.query(
            `
                INSERT INTO work_schedules (company_id, shift_name, time_in, time_out, grace_period_mins)
                VALUES (?, ?, ?, ?, ?)
            `,
            [
                targetCompanyId,
                shift_name,
                time_in,
                time_out,
                Number(grace_period_mins || 0),
            ]
        );

        res.status(201).json({
            message: 'สร้างกะการทำงานสำเร็จ',
            data: { id: result.insertId },
        });
    } catch (error) {
        console.error('Create Schedule Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างกะการทำงาน' });
    }
};

exports.getScheduleEmployees = async (req, res) => {
    try {
        const { id } = req.params;
        const { role_level, company_id } = req.user;
        const roleLevel = Number(role_level || 0);

        let sql = `
            SELECT
                e.id,
                e.user_id,
                e.employee_code,
                e.firstname_th,
                e.lastname_th,
                d.name_th AS department_name,
                p.title_th AS position_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            WHERE e.work_schedule_id = ?
        `;
        const params = [id];

        if (roleLevel < 80) {
            sql += ' AND e.company_id = ?';
            params.push(company_id);
        }

        sql += ' ORDER BY e.firstname_th ASC, e.lastname_th ASC';

        const [rows] = await db.query(sql, params);
        res.status(200).json({
            message: 'ดึงรายชื่อพนักงานในกะสำเร็จ',
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('Get Schedule Employees Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายชื่อพนักงานในกะ' });
    }
};