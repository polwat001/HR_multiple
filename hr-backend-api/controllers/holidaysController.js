const db = require('../config/db');

const isSchemaError = (error) => {
  const code = String(error?.code || '');
  return code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR' || code === 'ER_PARSE_ERROR';
};

const mapHolidayRow = (row) => ({
  id: row.id,
  holiday_name_th: row.holiday_name_th || row.name_th || row.holiday_name || row.name || '',
  holiday_name_en: row.holiday_name_en || row.name_en || '',
  holiday_date: row.holiday_date || row.date || row.holidayDate || null,
  is_paid: row.is_paid ?? row.paid ?? 1,
  description: row.description || null,
});

const loadRawHolidayRows = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM public_holidays');
    return rows;
  } catch (error) {
    if (String(error?.code || '') === 'ER_NO_SUCH_TABLE') {
      const [rows] = await db.query('SELECT * FROM holidays');
      return rows;
    }
    throw error;
  }
};

exports.getHolidays = async (req, res) => {
  try {
    const rows = await loadRawHolidayRows();
    const currentYear = new Date().getFullYear();
    const holidays = rows
      .map(mapHolidayRow)
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
    const days = req.query.days || 30;
    const rows = await loadRawHolidayRows();
    const now = new Date();
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + Number(days));

    const holidays = rows
      .map(mapHolidayRow)
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
    const { holiday_name_th, holiday_name_en, date, is_paid, description } = req.body;
    const { role_level } = req.user;

    if (role_level < 80) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เพิ่มวันหยุดสาธารณะ' });
    }

    if (!holiday_name_th || !date) {
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const sql = `
      INSERT INTO public_holidays 
      (holiday_name_th, holiday_name_en, date, is_paid, description)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(sql, [
      holiday_name_th,
      holiday_name_en || null,
      date,
      is_paid || 1,
      description || null
    ]);

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
    const { role_level } = req.user;

    if (role_level < 80) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขวันหยุดสาธารณะ' });
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
      fields.push('date = ?');
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

    values.push(id);
    const sql = `UPDATE public_holidays SET ${fields.join(', ')} WHERE id = ?`;

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
    const { role_level } = req.user;

    if (role_level < 80) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบวันหยุดสาธารณะ' });
    }

    const sql = 'DELETE FROM public_holidays WHERE id = ?';
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบวันหยุดสาธารณะ' });
    }

    res.status(200).json({ message: 'ลบวันหยุดสาธารณะสำเร็จ' });
  } catch (error) {
    console.error('Delete Holiday Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบ' });
  }
};
