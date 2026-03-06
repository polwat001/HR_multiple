const db = require('../config/db');

// 1. ดึงรายชื่อบริษัท (Companies)
exports.getCompanies = async (req, res) => {
    try {
        const { role_level, company_id } = req.user;
        let sql = `SELECT id, code, name_th, name_en, logo_url FROM companies WHERE 1=1`;
        const params = [];

        // ถ้าสิทธิ์ต่ำกว่า Central HR (80) เช่น HR Company (50) ให้ดูได้แค่บริษัทตัวเอง
        if (role_level < 80) {
            sql += ` AND id = ?`;
            params.push(company_id);
        }

        const [companies] = await db.query(sql, params);
        res.status(200).json({ data: companies });
    } catch (error) {
        console.error('Get Companies Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบริษัท' });
    }
};

// 2. ดึงรายชื่อแผนก (Departments)
exports.getDepartments = async (req, res) => {
    try {
        const { role_level, company_id } = req.user;
        let sql = `
            SELECT d.id, d.code, d.name_th, d.parent_dept_id, c.name_th AS company_name 
            FROM departments d
            LEFT JOIN companies c ON d.company_id = c.id
            WHERE 1=1
        `;
        const params = [];

        // กรองตามบริษัทที่สังกัด (ยกเว้นสิทธิ์ระดับ 80 ขึ้นไป)
        if (role_level < 80) {
            sql += ` AND d.company_id = ?`;
            params.push(company_id);
        }

        const [departments] = await db.query(sql, params);
        res.status(200).json({ data: departments });
    } catch (error) {
        console.error('Get Departments Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก' });
    }
};

// 3. ดึงรายชื่อตำแหน่งงาน (Positions)
exports.getPositions = async (req, res) => {
    try {
        const { role_level, company_id } = req.user;
        let sql = `
            SELECT p.id, p.title_th, p.level, c.name_th AS company_name 
            FROM positions p
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (role_level < 80) {
            sql += ` AND p.company_id = ?`;
            params.push(company_id);
        }

        const [positions] = await db.query(sql, params);
        res.status(200).json({ data: positions });
    } catch (error) {
        console.error('Get Positions Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตำแหน่ง' });
    }
};