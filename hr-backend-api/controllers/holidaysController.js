const db = require('../config/db');

const isSchemaError = (error) => {
  const code = String(error?.code || '');
  return code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR' || code === 'ER_PARSE_ERROR';
};

const resolveHolidayTableName = async () => {
  try {
    await db.query('SELECT 1 FROM public_holidays LIMIT 1');
    return 'public_holidays';
  } catch (error) {
    if (String(error?.code || '') === 'ER_NO_SUCH_TABLE') {
      await db.query('SELECT 1 FROM holidays LIMIT 1');
      return 'holidays';
    }
    throw error;
  }
};

const getHolidayTableColumns = async (tableName) => {
  const sql = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
  `;
  const [rows] = await db.query(sql, [tableName]);
  return new Set(rows.map((row) => String(row.COLUMN_NAME || '').toLowerCase()));
};

const detectDateColumn = (columns) => {
  if (columns.has('holiday_date')) return 'holiday_date';
  if (columns.has('date')) return 'date';
  return null;
};

const hasRoleForHolidayWrite = (roleLevel) => Number(roleLevel || 0) >= 50;

const mapHolidayRow = (row) => ({
  id: row.id,
  holiday_name_th: row.holiday_name_th || row.name_th || row.holiday_name || row.name || '',
  holiday_name_en: row.holiday_name_en || row.name_en || '',
  holiday_date: row.holiday_date || row.date || row.holidayDate || null,
  is_paid: row.is_paid ?? row.paid ?? 1,
  description: row.description || null,
  company_id: row.company_id ?? null,
});

const loadRawHolidayRows = async () => {
  const tableName = await resolveHolidayTableName();
  const [rows] = await db.query(`SELECT * FROM ${tableName}`);
  return { rows, tableName };
};

exports.getHolidays = async (req, res) => {
  try {
    const { role_level, company_id } = req.user;
    const roleLevel = Number(role_level || 0);
    const { rows } = await loadRawHolidayRows();
    const currentYear = new Date().getFullYear();
    const holidays = rows
      .map(mapHolidayRow)
      .filter((h) => {
        if (roleLevel === 50 && String(company_id || '')) {
          return String(h.company_id || '') === String(company_id);
        }
        return true;
      })
      .filter((h) => {
        const d = h.holiday_date ? new Date(h.holiday_date) : null;
        return d && !Number.isNaN(d.getTime()) ? d.getFullYear() >= currentYear : true;
      })
      .sort((a, b) => String(a.holiday_date || '').localeCompare(String(b.holiday_date || '')));

    res.status(200).json({
      message: 'ดึงข้อมูลวันหยุดสาธารณะสำเร็จ',
      count: holidays.length,
      data: holidays
    });
  } catch (error) {
    console.error('Get Holidays Error:', error);
    if (isSchemaError(error)) {
      return res.status(200).json({
        message: 'ยังไม่พบโครงสร้างตารางวันหยุดที่สมบูรณ์ ส่งข้อมูลว่างชั่วคราว',
        count: 0,
        data: [],
      });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลวันหยุด' });
  }
};

exports.getUpcomingHolidays = async (req, res) => {
  try {
    const { role_level, company_id } = req.user;
    const roleLevel = Number(role_level || 0);
    const days = req.query.days || 30;
    const { rows } = await loadRawHolidayRows();
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + Number(days));

    const holidays = rows
      .map(mapHolidayRow)
      .filter((h) => {
        if (roleLevel === 50 && String(company_id || '')) {
          return String(h.company_id || '') === String(company_id);
        }
        return true;
      })
      .filter((h) => {
        if (!h.holiday_date) return false;
        const d = new Date(h.holiday_date);
        if (Number.isNaN(d.getTime())) return false;
        return d >= new Date(now.toDateString()) && d <= maxDate;
      })
      .sort((a, b) => String(a.holiday_date || '').localeCompare(String(b.holiday_date || '')));

    res.status(200).json({
      message: `ดึงข้อมูลวันหยุดสาธารณะใน ${days} วันข้างหน้าสำเร็จ`,
      count: holidays.length,
      data: holidays
    });
  } catch (error) {
    console.error('Get Upcoming Holidays Error:', error);
    if (isSchemaError(error)) {
      return res.status(200).json({
        message: 'ยังไม่พบโครงสร้างตารางวันหยุดที่สมบูรณ์ ส่งข้อมูลว่างชั่วคราว',
        count: 0,
        data: [],
      });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลวันหยุด' });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { holiday_name_th, holiday_name_en, date, is_paid, description, company_id: companyIdPayload } = req.body;
    const { role_level, company_id } = req.user;
    const roleLevel = Number(role_level || 0);

    if (!hasRoleForHolidayWrite(roleLevel)) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เพิ่มวันหยุดสาธารณะ' });
    }

    if (!holiday_name_th || !date) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const tableName = await resolveHolidayTableName();
    const columns = await getHolidayTableColumns(tableName);
    const dateColumn = detectDateColumn(columns);
    if (!dateColumn) {
      return res.status(500).json({ message: 'ไม่พบคอลัมน์วันที่ของตารางวันหยุด' });
    }

    const data = {
      holiday_name_th,
      holiday_name_en: holiday_name_en || null,
      [dateColumn]: date,
      is_paid: is_paid ?? 1,
      description: description || null,
    };

    if (columns.has('company_id')) {
      if (roleLevel === 50) {
        if (!company_id) {
          return res.status(400).json({ message: 'ไม่พบ company_id ของผู้ใช้งาน' });
        }
        data.company_id = company_id;
      } else {
        data.company_id = companyIdPayload || null;
      }
    }

    const fieldNames = Object.keys(data);
    const placeholders = fieldNames.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${fieldNames.join(', ')}) VALUES (${placeholders})`;
    const [result] = await db.query(sql, fieldNames.map((field) => data[field]));

    res.status(201).json({
      message: 'เพิ่มวันหยุดสาธารณะสำเร็จ',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create Holiday Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มวันหยุด' });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { holiday_name_th, holiday_name_en, date, is_paid, description } = req.body;
    const { role_level, company_id } = req.user;
    const roleLevel = Number(role_level || 0);

    if (!hasRoleForHolidayWrite(roleLevel)) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขวันหยุดสาธารณะ' });
    }

    const tableName = await resolveHolidayTableName();
    const columns = await getHolidayTableColumns(tableName);
    const dateColumn = detectDateColumn(columns);
    if (!dateColumn) {
      return res.status(500).json({ message: 'ไม่พบคอลัมน์วันที่ของตารางวันหยุด' });
    }

    const fields = [];
    const values = [];

    if (holiday_name_th !== undefined) {
      fields.push('holiday_name_th = ?');
      values.push(holiday_name_th);
    }
    if (holiday_name_en !== undefined) {
      fields.push('holiday_name_en = ?');
      values.push(holiday_name_en);
    }
    if (date !== undefined) {
      fields.push(`${dateColumn} = ?`);
      values.push(date);
    }
    if (is_paid !== undefined) {
      fields.push('is_paid = ?');
      values.push(is_paid);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'ไม่มีข้อมูลที่ต้องแก้ไข' });
    }

    let sql = `UPDATE ${tableName} SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    if (roleLevel === 50) {
      if (!columns.has('company_id')) {
        return res.status(409).json({ message: 'ระบบวันหยุดปัจจุบันยังไม่รองรับ company scope สำหรับ HR Company' });
      }
      sql += ' AND company_id = ?';
      values.push(company_id);
    }

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบวันหยุดสาธารณะ' });
    }

    res.status(200).json({ message: 'แก้ไขวันหยุดสาธารณะสำเร็จ' });
  } catch (error) {
    console.error('Update Holiday Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไข' });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_level, company_id } = req.user;
    const roleLevel = Number(role_level || 0);

    if (!hasRoleForHolidayWrite(roleLevel)) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบวันหยุดสาธารณะ' });
    }

    const tableName = await resolveHolidayTableName();
    const columns = await getHolidayTableColumns(tableName);

    let sql = `DELETE FROM ${tableName} WHERE id = ?`;
    const params = [id];

    if (roleLevel === 50) {
      if (!columns.has('company_id')) {
        return res.status(409).json({ message: 'ระบบวันหยุดปัจจุบันยังไม่รองรับ company scope สำหรับ HR Company' });
      }
      sql += ' AND company_id = ?';
      params.push(company_id);
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบวันหยุดสาธารณะ' });
    }

    res.status(200).json({ message: 'ลบวันหยุดสาธารณะสำเร็จ' });
  } catch (error) {
    console.error('Delete Holiday Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบ' });
  }
};
