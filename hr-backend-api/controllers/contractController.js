const db = require('../config/db');

async function ensureContractTemplateTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS contract_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT NOT NULL,
            name VARCHAR(255) NOT NULL,
            html_content LONGTEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
}

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

exports.getContractTemplates = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        const companyId = Number(req.user?.company_id || 0);
        await ensureContractTemplateTable();

        let sql = `
            SELECT ct.id, ct.name, ct.company_id, ct.html_content, c.code AS company_code
            FROM contract_templates ct
            LEFT JOIN companies c ON c.id = ct.company_id
            WHERE 1=1
        `;
        const params = [];

        if (roleLevel === 50) {
            sql += ' AND ct.company_id = ?';
            params.push(companyId);
        }

        sql += ' ORDER BY ct.id ASC';

        const [rows] = await db.query(sql, params);

        const data = rows.map((row) => ({
            id: row.id,
            name: row.name,
            company: row.company_code || String(row.company_id),
            logoUrl: '',
            content: row.html_content,
            variables: Array.from(new Set((String(row.html_content || '').match(/\{\{[^}]+\}\}/g) || []))),
        }));

        res.status(200).json({ message: 'ดึงข้อมูล template สัญญาสำเร็จ', data });
    } catch (error) {
        console.error('Get Contract Templates Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล template สัญญา' });
    }
};

exports.createContractTemplate = async (req, res) => {
    try {
        const { role_level, user_id } = req.user;
        const authCompanyId = Number(req.user?.company_id || 0);
        if (Number(role_level || 0) < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์สร้าง template สัญญา' });
        }

        const { name, company_scope, logo_url, content, variables } = req.body || {};
        if (!name || !content) {
            return res.status(400).json({ message: 'กรุณาระบุชื่อ template และเนื้อหาให้ครบถ้วน' });
        }

        await ensureContractTemplateTable();

        const [companies] = await db.query(
            `SELECT id, code
             FROM companies
             ORDER BY id ASC`
        );

        if (!companies.length) {
            return res.status(400).json({ message: 'ไม่พบบริษัทในระบบสำหรับผูก template สัญญา' });
        }

        const scope = String(company_scope || 'ALL').toUpperCase();
        const targetCompanies = scope === 'ALL'
            ? companies
            : companies.filter((company) => String(company.code || '').toUpperCase() === scope || String(company.id) === scope);

        if (Number(role_level || 0) === 50) {
            if (!authCompanyId) {
                return res.status(403).json({ message: 'ไม่สามารถกำหนดขอบเขตบริษัทของผู้ใช้งานได้' });
            }

            const companyScoped = targetCompanies.filter((company) => Number(company.id) === authCompanyId);
            if (!companyScoped.length) {
                return res.status(403).json({ message: 'HR Company สามารถสร้าง template ได้เฉพาะบริษัทของตนเองเท่านั้น' });
            }

            targetCompanies.length = 0;
            targetCompanies.push(...companyScoped);
        }

        if (!targetCompanies.length) {
            return res.status(400).json({ message: 'ไม่พบบริษัทตาม company_scope ที่ระบุ' });
        }

        const variableList = Array.isArray(variables)
            ? variables
            : Array.from(new Set((String(content).match(/\{\{[^}]+\}\}/g) || [])));

        let firstInsertId = null;
        let createdCount = 0;

        for (const company of targetCompanies) {
            const [result] = await db.query(
                `INSERT INTO contract_templates (company_id, name, html_content)
                 VALUES (?, ?, ?)`,
                [Number(company.id), String(name), String(content)]
            );

            if (firstInsertId === null) {
                firstInsertId = result.insertId;
            }
            createdCount += 1;
        }

        res.status(201).json({
            message: 'สร้าง template สัญญาสำเร็จ',
            data: {
                id: firstInsertId,
                created_count: createdCount,
                variables: variableList,
                created_by: Number(user_id || 0) || null,
                logo_url: logo_url ? String(logo_url) : '',
            }
        });
    } catch (error) {
        console.error('Create Contract Template Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้าง template สัญญา' });
    }
};