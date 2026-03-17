const db = require('../config/db');

const ensureOrgSchema = async () => {
    await db.query(`ALTER TABLE positions ADD COLUMN code VARCHAR(50) NULL`).catch(() => {});
    await db.query(`ALTER TABLE positions ADD COLUMN department_id INT NULL`).catch(() => {});
    await db.query(`ALTER TABLE positions ADD CONSTRAINT fk_positions_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL`).catch(() => {});
    await db.query(`ALTER TABLE companies ADD COLUMN address TEXT NULL`).catch(() => {});
    await db.query(`ALTER TABLE companies ADD COLUMN phone VARCHAR(30) NULL`).catch(() => {});
};

const canManageOrg = (user) => Number(user?.role_level || 0) >= 50;

const parseNullableNumber = (value) => {
    if (value === undefined || value === null || value === '' || value === 'none') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};
    const parsePositionLevel = (value) => {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return null;
        if (raw === 'staff') return 1;
        if (raw === 'manager') return 5;
        if (raw === 'executive') return 9;

        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    };

const resolveScopedCompanyId = (req, bodyCompanyId) => {
    const roleLevel = Number(req.user?.role_level || 0);
    const currentCompanyId = Number(req.user?.company_id || 0);
    if (roleLevel < 80) return currentCompanyId;

    const companyId = Number(bodyCompanyId || 0);
    return Number.isFinite(companyId) && companyId > 0 ? companyId : null;
};

const ensureDepartmentOwnership = async (req, departmentId) => {
    const roleLevel = Number(req.user?.role_level || 0);
    const currentCompanyId = Number(req.user?.company_id || 0);

    const [rows] = await db.query(
        `SELECT id, company_id
         FROM departments
         WHERE id = ?
         LIMIT 1`,
        [departmentId]
    );

    if (!rows.length) return null;
    if (roleLevel < 80 && Number(rows[0].company_id || 0) !== currentCompanyId) return null;
    return rows[0];
};

const ensurePositionOwnership = async (req, positionId) => {
    const roleLevel = Number(req.user?.role_level || 0);
    const currentCompanyId = Number(req.user?.company_id || 0);

    const [rows] = await db.query(
        `SELECT id, company_id
         FROM positions
         WHERE id = ?
         LIMIT 1`,
        [positionId]
    );

    if (!rows.length) return null;
    if (roleLevel < 80 && Number(rows[0].company_id || 0) !== currentCompanyId) return null;
    return rows[0];
};

// 1. ดึงรายชื่อบริษัท (Companies)
exports.getCompanies = async (req, res) => {
    try {
        await ensureOrgSchema();

        const { role_level, company_id } = req.user;
        let sql = `SELECT id, code, name_th, name_en, tax_id, logo_url, address, phone FROM companies WHERE 1=1`;
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
        await ensureOrgSchema();

        const { role_level, company_id } = req.user;
        let sql = `
            SELECT d.id, d.code, d.name_th, d.company_id, d.parent_dept_id, d.cost_center, c.name_th AS company_name 
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
        await ensureOrgSchema();

        const { role_level, company_id } = req.user;
        let sql = `
            SELECT p.id, p.code, p.title_th, p.level, p.company_id, p.department_id, c.name_th AS company_name 
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

exports.createDepartment = async (req, res) => {
    try {
        await ensureOrgSchema();

        if (!canManageOrg(req.user)) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์จัดการแผนก' });
        }

        const companyId = resolveScopedCompanyId(req, req.body?.company_id);
        const code = String(req.body?.code || '').trim();
        const nameTh = String(req.body?.name_th || '').trim();
        const parentDeptId = parseNullableNumber(req.body?.parent_dept_id);
        const costCenter = String(req.body?.cost_center || '').trim() || null;

        if (!companyId || !nameTh) {
            return res.status(400).json({ message: 'กรุณาระบุบริษัทและชื่อแผนกให้ครบถ้วน' });
        }

        if (parentDeptId) {
            const parent = await ensureDepartmentOwnership(req, parentDeptId);
            if (!parent || Number(parent.company_id || 0) !== Number(companyId)) {
                return res.status(400).json({ message: 'แผนกแม่ไม่ถูกต้องหรือไม่อยู่ในบริษัทเดียวกัน' });
            }
        }

        const [result] = await db.query(
            `INSERT INTO departments (company_id, code, name_th, parent_dept_id, cost_center)
             VALUES (?, ?, ?, ?, ?)`,
            [companyId, code || null, nameTh, parentDeptId, costCenter]
        );

        res.status(201).json({ message: 'เพิ่มแผนกสำเร็จ', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create Department Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มแผนก' });
    }
};

exports.updateDepartment = async (req, res) => {
    try {
        await ensureOrgSchema();

        if (!canManageOrg(req.user)) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขแผนก' });
        }

        const departmentId = Number(req.params.id || 0);
        if (!departmentId) return res.status(400).json({ message: 'department id ไม่ถูกต้อง' });

        const target = await ensureDepartmentOwnership(req, departmentId);
        if (!target) return res.status(404).json({ message: 'ไม่พบแผนกที่ต้องการแก้ไข' });

        const code = String(req.body?.code || '').trim() || null;
        const nameTh = String(req.body?.name_th || '').trim();
        const parentDeptId = parseNullableNumber(req.body?.parent_dept_id);
        const costCenter = String(req.body?.cost_center || '').trim() || null;

        if (!nameTh) return res.status(400).json({ message: 'กรุณาระบุชื่อแผนก' });
        if (parentDeptId && Number(parentDeptId) === departmentId) {
            return res.status(400).json({ message: 'ไม่สามารถตั้งแผนกตัวเองเป็นแผนกแม่ได้' });
        }

        if (parentDeptId) {
            const parent = await ensureDepartmentOwnership(req, parentDeptId);
            if (!parent || Number(parent.company_id || 0) !== Number(target.company_id || 0)) {
                return res.status(400).json({ message: 'แผนกแม่ไม่ถูกต้องหรือไม่อยู่ในบริษัทเดียวกัน' });
            }
        }

        await db.query(
            `UPDATE departments
             SET code = ?,
                 name_th = ?,
                 parent_dept_id = ?,
                 cost_center = ?
             WHERE id = ?`,
            [code, nameTh, parentDeptId, costCenter, departmentId]
        );

        res.status(200).json({ message: 'แก้ไขแผนกสำเร็จ' });
    } catch (error) {
        console.error('Update Department Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขแผนก' });
    }
};

exports.deleteDepartment = async (req, res) => {
    try {
        await ensureOrgSchema();

        if (!canManageOrg(req.user)) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบแผนก' });
        }

        const departmentId = Number(req.params.id || 0);
        if (!departmentId) return res.status(400).json({ message: 'department id ไม่ถูกต้อง' });

        const target = await ensureDepartmentOwnership(req, departmentId);
        if (!target) return res.status(404).json({ message: 'ไม่พบแผนกที่ต้องการลบ' });

        const [childRows] = await db.query(`SELECT id FROM departments WHERE parent_dept_id = ? LIMIT 1`, [departmentId]);
        if (childRows.length) {
            return res.status(400).json({ message: 'ไม่สามารถลบแผนกที่มีแผนกย่อยอยู่ได้' });
        }

        await db.query(`UPDATE positions SET department_id = NULL WHERE department_id = ?`, [departmentId]);
        await db.query(`DELETE FROM departments WHERE id = ?`, [departmentId]);

        res.status(200).json({ message: 'ลบแผนกสำเร็จ' });
    } catch (error) {
        console.error('Delete Department Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบแผนก' });
    }
};

exports.createPosition = async (req, res) => {
    try {
        await ensureOrgSchema();

        if (!canManageOrg(req.user)) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์จัดการตำแหน่ง' });
        }

        const companyId = resolveScopedCompanyId(req, req.body?.company_id);
        const code = String(req.body?.code || '').trim() || null;
        const titleTh = String(req.body?.title_th || '').trim();
        const levelRaw = req.body?.level;
        const level = parsePositionLevel(req.body?.level);
        const departmentId = parseNullableNumber(req.body?.department_id);

        if (!companyId || !titleTh) {
            return res.status(400).json({ message: 'กรุณาระบุบริษัทและชื่อตำแหน่งให้ครบถ้วน' });
        }

        if (departmentId) {
            const dept = await ensureDepartmentOwnership(req, departmentId);
            if (!dept || Number(dept.company_id || 0) !== Number(companyId)) {
                return res.status(400).json({ message: 'แผนกไม่ถูกต้องหรือไม่อยู่ในบริษัทเดียวกัน' });
            }
        }

        const [result] = await db.query(
            `INSERT INTO positions (company_id, code, title_th, level, department_id)
             VALUES (?, ?, ?, ?, ?)`,
            [companyId, code, titleTh, level, departmentId]
        );

        res.status(201).json({ message: 'เพิ่มตำแหน่งสำเร็จ', data: { id: result.insertId } });
    } catch (error) {
        console.error('Create Position Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มตำแหน่ง' });
    }
};

exports.updatePosition = async (req, res) => {
    try {
        await ensureOrgSchema();

        if (!canManageOrg(req.user)) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขตำแหน่ง' });
        }

        const positionId = Number(req.params.id || 0);
        if (!positionId) return res.status(400).json({ message: 'position id ไม่ถูกต้อง' });

        const target = await ensurePositionOwnership(req, positionId);
        if (!target) return res.status(404).json({ message: 'ไม่พบตำแหน่งที่ต้องการแก้ไข' });

        const code = String(req.body?.code || '').trim() || null;
        const titleTh = String(req.body?.title_th || '').trim();
        const levelRaw = req.body?.level;
        const level = parsePositionLevel(req.body?.level);
        const departmentId = parseNullableNumber(req.body?.department_id);

        if (!titleTh) return res.status(400).json({ message: 'กรุณาระบุชื่อตำแหน่ง' });

        if (departmentId) {
            const dept = await ensureDepartmentOwnership(req, departmentId);
            if (!dept || Number(dept.company_id || 0) !== Number(target.company_id || 0)) {
                return res.status(400).json({ message: 'แผนกไม่ถูกต้องหรือไม่อยู่ในบริษัทเดียวกัน' });
            }
        }

        await db.query(
            `UPDATE positions
             SET code = ?,
                 title_th = ?,
                 level = ?,
                 department_id = ?
             WHERE id = ?`,
            [code, titleTh, level, departmentId, positionId]
        );

        res.status(200).json({ message: 'แก้ไขตำแหน่งสำเร็จ' });
    } catch (error) {
        console.error('Update Position Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขตำแหน่ง' });
    }
};

exports.deletePosition = async (req, res) => {
    try {
        await ensureOrgSchema();

        if (!canManageOrg(req.user)) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบตำแหน่ง' });
        }

        const positionId = Number(req.params.id || 0);
        if (!positionId) return res.status(400).json({ message: 'position id ไม่ถูกต้อง' });

        const target = await ensurePositionOwnership(req, positionId);
        if (!target) return res.status(404).json({ message: 'ไม่พบตำแหน่งที่ต้องการลบ' });

        await db.query(`UPDATE employees SET position_id = NULL WHERE position_id = ?`, [positionId]);
        await db.query(`DELETE FROM positions WHERE id = ?`, [positionId]);

        res.status(200).json({ message: 'ลบตำแหน่งสำเร็จ' });
    } catch (error) {
        console.error('Delete Position Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบตำแหน่ง' });
    }
};