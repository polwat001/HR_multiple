const db = require('../config/db');

const asNullableString = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length ? text : null;
};

const asNullableInt = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const normalizeEmploymentType = (raw) => {
    const value = String(raw || '').toLowerCase();
    if (value === 'daily') return 'daily';
    if (value === 'contract') return 'contract';
    return 'full_time';
};

const normalizeStatus = (raw) => {
    const value = String(raw || '').toLowerCase();
    const allowed = new Set(['active', 'probation', 'resigned', 'terminated']);
    return allowed.has(value) ? value : 'active';
};

const mapDbEmployeeToPayload = (row) => ({
    id: row.id,
    user_id: row.user_id,
    employee_code: row.employee_code,
    firstname_th: row.firstname_th,
    lastname_th: row.lastname_th,
    nickname: row.nickname || '',
    national_id: row.id_card_number || '',
    birth_date: row.birth_date || null,
    gender: row.gender || '',
    phone: row.phone || '',
    email: row.email || '',
    emergency_name: row.emergency_name || '',
    emergency_phone: row.emergency_phone || '',
    emergency_relation: row.emergency_relation || '',
    company_id: row.company_id,
    company_name: row.company_name || '',
    department_id: row.department_id,
    department_name: row.department_name || '',
    position_id: row.position_id,
    position_name: row.position_name || '',
    manager_id: row.manager_id,
    report_to_name: row.report_to_name || '',
    start_date: row.hire_date || null,
    probation_end_date: row.probation_end_date || null,
    employee_type: row.employment_type === 'daily' ? 'daily' : row.employment_type === 'contract' ? 'contract' : 'monthly',
    status: row.status || 'active',
    avatar_url: row.avatar_url || '',
});

const getEmployeeScope = (user, alias = 'e') => {
    const roleLevel = Number(user?.role_level || 0);
    const userId = Number(user?.user_id || 0);
    const companyId = Number(user?.company_id || 0);

    if (roleLevel >= 80) {
        return { clause: '', params: [] };
    }

    if (roleLevel === 50) {
        return {
            clause: ` AND ${alias}.company_id = ?`,
            params: [companyId],
        };
    }

    if (roleLevel === 20) {
        return {
            clause: ` AND (${alias}.user_id = ? OR ${alias}.manager_id = (SELECT id FROM employees WHERE user_id = ?))`,
            params: [userId, userId],
        };
    }

    return {
        clause: ` AND ${alias}.user_id = ?`,
        params: [userId],
    };
};

const ensureEmployeeProfileStorage = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS employee_attachments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_type VARCHAR(100) NULL,
            file_size BIGINT NULL,
            uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_employee_attachments_employee (employee_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS employee_history_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            changed_at DATE NOT NULL,
            event_type VARCHAR(50) NOT NULL,
            old_value VARCHAR(255) NULL,
            new_value VARCHAR(255) NULL,
            note TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_employee_history_employee (employee_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [dbRows] = await db.query('SELECT DATABASE() AS db_name');
    const dbName = dbRows[0]?.db_name;

    const requiredColumns = [
        ['phone', 'VARCHAR(30) NULL'],
        ['email', 'VARCHAR(255) NULL'],
        ['birth_date', 'DATE NULL'],
        ['gender', 'VARCHAR(20) NULL'],
        ['emergency_name', 'VARCHAR(255) NULL'],
        ['emergency_phone', 'VARCHAR(30) NULL'],
        ['emergency_relation', 'VARCHAR(100) NULL'],
    ];

    const [columnRows] = await db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME = 'employees'`,
        [dbName]
    );
    const existingColumns = new Set(columnRows.map((row) => row.COLUMN_NAME));

    for (const [columnName, definition] of requiredColumns) {
        if (!existingColumns.has(columnName)) {
            await db.query(`ALTER TABLE employees ADD COLUMN ${columnName} ${definition}`);
        }
    }
};

const saveEmployeeChildData = async (employeeId, attachments = [], historyLogs = []) => {
    await db.query('DELETE FROM employee_attachments WHERE employee_id = ?', [employeeId]);
    await db.query('DELETE FROM employee_history_logs WHERE employee_id = ?', [employeeId]);

    for (const item of Array.isArray(attachments) ? attachments : []) {
        const fileName = asNullableString(item?.file_name);
        if (!fileName) continue;

        await db.query(
            `INSERT INTO employee_attachments (employee_id, file_name, file_type, file_size, uploaded_at)
             VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
            [
                employeeId,
                fileName,
                asNullableString(item?.file_type),
                asNullableInt(item?.file_size),
                asNullableString(item?.uploaded_at),
            ]
        );
    }

    for (const item of Array.isArray(historyLogs) ? historyLogs : []) {
        const changedAt = asNullableString(item?.changed_at);
        if (!changedAt) continue;

        await db.query(
            `INSERT INTO employee_history_logs (employee_id, changed_at, event_type, old_value, new_value, note)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                employeeId,
                changedAt,
                asNullableString(item?.event_type) || 'update',
                asNullableString(item?.old_value),
                asNullableString(item?.new_value),
                asNullableString(item?.note),
            ]
        );
    }
};

exports.getAllEmployees = async (req, res) => {
    try {
        await ensureEmployeeProfileStorage();

        // 1. แกะข้อมูลสิทธิ์ที่ได้จาก Token (authMiddleware ส่งมาให้ใน req.user)
        const { user_id, role_level, company_id } = req.user;

        // 2. สร้างคำสั่ง SQL พื้นฐาน (Join ตารางเพื่อเอาชื่อบริษัท แผนก ตำแหน่ง มาโชว์สวยๆ)
        let sql = `
            SELECT 
                e.id, 
                e.user_id,
                e.employee_code, 
                e.firstname_th, 
                e.lastname_th, 
                e.nickname,
                e.id_card_number,
                e.birth_date,
                e.gender,
                e.phone,
                e.email,
                e.emergency_name,
                e.emergency_phone,
                e.emergency_relation,
                e.company_id,
                e.department_id,
                e.position_id,
                e.manager_id,
                e.hire_date,
                e.probation_end_date,
                e.employment_type,
                e.avatar_url,
                e.status,
                c.name_th AS company_name, 
                d.name_th AS department_name, 
                p.title_th AS position_name,
                CONCAT(m.firstname_th, ' ', m.lastname_th) AS report_to_name
            FROM employees e
            LEFT JOIN companies c ON e.company_id = c.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN positions p ON e.position_id = p.id
            LEFT JOIN employees m ON e.manager_id = m.id
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
            // และดูข้อมูลของตัวเองได้ด้วย (self + team)
            sql += ` AND (e.user_id = ? OR e.manager_id = (SELECT id FROM employees WHERE user_id = ?))`;
            params.push(user_id, user_id);
        } 
        else {
            // Employee (1) -> ดูได้แค่ข้อมูลของตัวเองเท่านั้น
            sql += ` AND e.user_id = ?`;
            params.push(user_id);
        }

        // 4. รันคำสั่ง SQL
        const [employees] = await db.query(sql, params);
        const data = employees.map(mapDbEmployeeToPayload);

        res.status(200).json({
            message: 'ดึงข้อมูลพนักงานสำเร็จ',
            count: data.length,
            data
        });

    } catch (error) {
        console.error('Get Employees Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงาน' });
    }
};

exports.getEmployeeById = async (req, res) => {
    try {
        await ensureEmployeeProfileStorage();

        const { id } = req.params;
        const employeeId = Number(id);
        if (!Number.isFinite(employeeId)) {
            return res.status(400).json({ message: 'employee id ไม่ถูกต้อง' });
        }

        const { clause: scopeClause, params: scopeParams } = getEmployeeScope(req.user, 'e');

        const [rows] = await db.query(
            `SELECT
                e.id,
                e.user_id,
                e.employee_code,
                e.firstname_th,
                e.lastname_th,
                e.nickname,
                e.id_card_number,
                e.birth_date,
                e.gender,
                e.phone,
                e.email,
                e.emergency_name,
                e.emergency_phone,
                e.emergency_relation,
                e.company_id,
                e.department_id,
                e.position_id,
                e.manager_id,
                e.hire_date,
                e.probation_end_date,
                e.employment_type,
                e.status,
                e.avatar_url,
                c.name_th AS company_name,
                d.name_th AS department_name,
                p.title_th AS position_name,
                CONCAT(m.firstname_th, ' ', m.lastname_th) AS report_to_name
             FROM employees e
             LEFT JOIN companies c ON e.company_id = c.id
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN positions p ON e.position_id = p.id
             LEFT JOIN employees m ON e.manager_id = m.id
             WHERE e.id = ?
             ${scopeClause}
             LIMIT 1`,
            [employeeId, ...scopeParams]
        );

        if (!rows.length) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงาน' });
        }

        const [attachments] = await db.query(
            `SELECT id, file_name, file_type, file_size, uploaded_at
             FROM employee_attachments
             WHERE employee_id = ?
             ORDER BY uploaded_at DESC, id DESC`,
            [employeeId]
        );

        const [historyLogs] = await db.query(
            `SELECT id, changed_at, event_type, old_value, new_value, note
             FROM employee_history_logs
             WHERE employee_id = ?
             ORDER BY changed_at DESC, id DESC`,
            [employeeId]
        );

        res.status(200).json({
            message: 'ดึงข้อมูลพนักงานสำเร็จ',
            data: {
                ...mapDbEmployeeToPayload(rows[0]),
                attachments,
                history_logs: historyLogs,
            },
        });
    } catch (error) {
        console.error('Get Employee By Id Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลพนักงานรายบุคคล' });
    }
};

exports.createEmployee = async (req, res) => {
    try {
        await ensureEmployeeProfileStorage();

        const roleLevel = Number(req.user?.role_level || 0);
        const authCompanyId = asNullableInt(req.user?.company_id);

        if (roleLevel < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์สร้างข้อมูลพนักงาน' });
        }

        const {
            avatar_url,
            firstname_th,
            lastname_th,
            nickname,
            national_id,
            birth_date,
            gender,
            phone,
            email,
            emergency_name,
            emergency_phone,
            emergency_relation,
            employee_code,
            company_id,
            department_id,
            position_id,
            manager_id,
            start_date,
            probation_end_date,
            employee_type,
            status,
            attachments,
            history_logs,
        } = req.body || {};

        if (!asNullableString(firstname_th) || !asNullableString(lastname_th) || !asNullableString(employee_code)) {
            return res.status(400).json({ message: 'กรุณาระบุชื่อ นามสกุล และรหัสพนักงาน' });
        }

        const requestedCompanyId = asNullableInt(company_id);
        if (roleLevel === 50 && requestedCompanyId && authCompanyId && requestedCompanyId !== authCompanyId) {
            return res.status(403).json({ message: 'HR Company สามารถสร้างพนักงานได้เฉพาะบริษัทของตนเองเท่านั้น' });
        }

        const companyId = requestedCompanyId || authCompanyId;
        if (!companyId) {
            return res.status(400).json({ message: 'กรุณาระบุบริษัทของพนักงาน' });
        }

        const [duplicateRows] = await db.query(
            `SELECT id
             FROM employees
             WHERE employee_code = ?
             LIMIT 1`,
            [String(employee_code)]
        );
        if (duplicateRows.length) {
            return res.status(409).json({ message: 'รหัสพนักงานนี้ถูกใช้งานแล้ว' });
        }

        const [insertResult] = await db.query(
            `INSERT INTO employees (
                employee_code,
                firstname_th,
                lastname_th,
                nickname,
                id_card_number,
                company_id,
                department_id,
                position_id,
                manager_id,
                hire_date,
                probation_end_date,
                employment_type,
                status,
                avatar_url,
                phone,
                email,
                birth_date,
                gender,
                emergency_name,
                emergency_phone,
                emergency_relation
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(employee_code),
                String(firstname_th),
                String(lastname_th),
                asNullableString(nickname),
                asNullableString(national_id),
                companyId,
                asNullableInt(department_id),
                asNullableInt(position_id),
                asNullableInt(manager_id),
                asNullableString(start_date),
                asNullableString(probation_end_date),
                normalizeEmploymentType(employee_type),
                normalizeStatus(status),
                asNullableString(avatar_url),
                asNullableString(phone),
                asNullableString(email),
                asNullableString(birth_date),
                asNullableString(gender),
                asNullableString(emergency_name),
                asNullableString(emergency_phone),
                asNullableString(emergency_relation),
            ]
        );

        const employeeId = Number(insertResult.insertId);
        await saveEmployeeChildData(employeeId, attachments, history_logs);

        res.status(201).json({
            message: 'บันทึกข้อมูลพนักงานสำเร็จ',
            data: { id: employeeId },
        });
    } catch (error) {
        console.error('Create Employee Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างข้อมูลพนักงาน' });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        await ensureEmployeeProfileStorage();

        const employeeId = Number(req.params.id);
        if (!Number.isFinite(employeeId)) {
            return res.status(400).json({ message: 'employee id ไม่ถูกต้อง' });
        }

        const roleLevel = Number(req.user?.role_level || 0);
        const authCompanyId = asNullableInt(req.user?.company_id);
        if (roleLevel < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลพนักงาน' });
        }

        const [existingRows] = await db.query('SELECT id, company_id FROM employees WHERE id = ? LIMIT 1', [employeeId]);
        if (!existingRows.length) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงาน' });
        }

        if (roleLevel === 50 && authCompanyId && Number(existingRows[0].company_id) !== authCompanyId) {
            return res.status(403).json({ message: 'HR Company สามารถแก้ไขพนักงานได้เฉพาะบริษัทของตนเองเท่านั้น' });
        }

        const {
            avatar_url,
            firstname_th,
            lastname_th,
            nickname,
            national_id,
            birth_date,
            gender,
            phone,
            email,
            emergency_name,
            emergency_phone,
            emergency_relation,
            employee_code,
            company_id,
            department_id,
            position_id,
            manager_id,
            start_date,
            probation_end_date,
            employee_type,
            status,
            attachments,
            history_logs,
        } = req.body || {};

        const updates = {
            avatar_url: asNullableString(avatar_url),
            firstname_th: asNullableString(firstname_th),
            lastname_th: asNullableString(lastname_th),
            nickname: asNullableString(nickname),
            id_card_number: asNullableString(national_id),
            phone: asNullableString(phone),
            email: asNullableString(email),
            birth_date: asNullableString(birth_date),
            gender: asNullableString(gender),
            emergency_name: asNullableString(emergency_name),
            emergency_phone: asNullableString(emergency_phone),
            emergency_relation: asNullableString(emergency_relation),
            employee_code: asNullableString(employee_code),
            company_id: asNullableInt(company_id),
            department_id: asNullableInt(department_id),
            position_id: asNullableInt(position_id),
            manager_id: asNullableInt(manager_id),
            hire_date: asNullableString(start_date),
            probation_end_date: asNullableString(probation_end_date),
            employment_type: normalizeEmploymentType(employee_type),
            status: normalizeStatus(status),
        };

        const fieldMap = [
            ['avatar_url', updates.avatar_url],
            ['firstname_th', updates.firstname_th],
            ['lastname_th', updates.lastname_th],
            ['nickname', updates.nickname],
            ['id_card_number', updates.id_card_number],
            ['phone', updates.phone],
            ['email', updates.email],
            ['birth_date', updates.birth_date],
            ['gender', updates.gender],
            ['emergency_name', updates.emergency_name],
            ['emergency_phone', updates.emergency_phone],
            ['emergency_relation', updates.emergency_relation],
            ['employee_code', updates.employee_code],
            ['company_id', updates.company_id],
            ['department_id', updates.department_id],
            ['position_id', updates.position_id],
            ['manager_id', updates.manager_id],
            ['hire_date', updates.hire_date],
            ['probation_end_date', updates.probation_end_date],
            ['employment_type', updates.employment_type],
            ['status', updates.status],
        ];

        const sets = [];
        const params = [];
        for (const [column, value] of fieldMap) {
            if (value !== undefined) {
                sets.push(`${column} = ?`);
                params.push(value);
            }
        }

        if (!sets.length) {
            return res.status(400).json({ message: 'ไม่พบข้อมูลสำหรับอัปเดต' });
        }

        let whereClause = 'WHERE id = ?';
        params.push(employeeId);
        if (roleLevel === 50 && authCompanyId) {
            whereClause += ' AND company_id = ?';
            params.push(authCompanyId);
        }

        const [updateResult] = await db.query(`UPDATE employees SET ${sets.join(', ')} ${whereClause}`, params);
        if (!updateResult.affectedRows) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลพนักงานรายการนี้' });
        }

        await saveEmployeeChildData(employeeId, attachments, history_logs);

        res.status(200).json({ message: 'บันทึกข้อมูลพนักงานสำเร็จ', data: { id: employeeId } });
    } catch (error) {
        console.error('Update Employee Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลพนักงาน' });
    }
};

exports.deleteEmployee = async (req, res) => {
    try {
        const roleLevel = Number(req.user?.role_level || 0);
        const authCompanyId = asNullableInt(req.user?.company_id);
        if (roleLevel < 50) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบข้อมูลพนักงาน' });
        }

        const employeeId = Number(req.params.id);
        if (!Number.isFinite(employeeId)) {
            return res.status(400).json({ message: 'employee id ไม่ถูกต้อง' });
        }

        const [existingRows] = await db.query('SELECT id, company_id FROM employees WHERE id = ? LIMIT 1', [employeeId]);
        if (!existingRows.length) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงาน' });
        }

        if (roleLevel === 50 && authCompanyId && Number(existingRows[0].company_id) !== authCompanyId) {
            return res.status(403).json({ message: 'HR Company สามารถลบพนักงานได้เฉพาะบริษัทของตนเองเท่านั้น' });
        }

        await db.query('DELETE FROM employee_attachments WHERE employee_id = ?', [employeeId]);
        await db.query('DELETE FROM employee_history_logs WHERE employee_id = ?', [employeeId]);

        const deleteParams = [employeeId];
        let deleteSql = 'DELETE FROM employees WHERE id = ?';
        if (roleLevel === 50 && authCompanyId) {
            deleteSql += ' AND company_id = ?';
            deleteParams.push(authCompanyId);
        }

        const [deleteResult] = await db.query(deleteSql, deleteParams);
        if (!deleteResult.affectedRows) {
            return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบข้อมูลพนักงานรายการนี้' });
        }

        res.status(200).json({ message: 'ลบข้อมูลพนักงานสำเร็จ' });
    } catch (error) {
        console.error('Delete Employee Error:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูลพนักงาน' });
    }
};