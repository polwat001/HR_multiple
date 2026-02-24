const db = require('../config/db');

// ==========================================
// 🕒 1. ดึงประวัติการเข้า-ออกงานทั้งหมด
// ==========================================
exports.getAttendanceLogs = async (req, res) => {
  try {
    const query = `
      SELECT a.*, e.firstname_th, e.lastname_th, e.employee_code 
      FROM attendance_logs a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.\`DATE\` DESC, a.check_in_time DESC
    `;
    const [rows] = await db.query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ดึงข้อมูลเวลาเข้างานไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// ⏱️ 2. บันทึกเวลาเข้างาน (Check-in)
// ==========================================
exports.recordAttendance = async (req, res) => {
  try {
    const { employee_id, company_id, DATE, check_in_time, STATUS, late_minutes } = req.body;

    // เช็คข้อมูลบังคับตามตารางจริงของคุณ
    if (!employee_id || !company_id || !DATE) {
      return res.status(400).json({ message: 'กรุณาส่ง employee_id, company_id และ DATE ให้ครบ' });
    }

    const [result] = await db.query(
      `INSERT INTO attendance_logs 
      (employee_id, company_id, \`DATE\`, check_in_time, STATUS, late_minutes) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        employee_id, 
        company_id, 
        DATE, 
        check_in_time || null, 
        STATUS || 'present', 
        late_minutes || 0
      ]
    );

    res.status(201).json({
      message: 'บันทึกเวลาเข้างานสำเร็จ!',
      logId: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกเวลาไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// ⏱️ 3. บันทึกเวลาออกงาน (Check-out)
// ==========================================
exports.checkOut = async (req, res) => {
  try {
    const { id, employee_id, company_id, DATE, check_out_time, STATUS, ot_hours } = req.body;

    if (!id && (!employee_id || !company_id || !DATE)) {
      return res.status(400).json({
        message: 'กรุณาส่ง id หรือ (employee_id, company_id, DATE) สำหรับระบุแถวที่จะอัปเดต'
      });
    }

    const fieldsToUpdate = [];
    const values = [];

    if (check_out_time !== undefined) {
      fieldsToUpdate.push('check_out_time = ?');
      values.push(check_out_time);
    }

    if (STATUS !== undefined) {
      fieldsToUpdate.push('STATUS = ?');
      values.push(STATUS);
    }

    if (ot_hours !== undefined) {
      fieldsToUpdate.push('ot_hours = ?');
      values.push(ot_hours);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        message: 'กรุณาส่งข้อมูลที่ต้องการอัปเดตอย่างน้อย 1 ฟิลด์ (เช่น check_out_time, STATUS, ot_hours)'
      });
    }

    let whereClause = '';
    const whereValues = [];

    if (id) {
      whereClause = 'id = ?';
      whereValues.push(id);
    } else {
      whereClause = 'employee_id = ? AND company_id = ? AND `DATE` = ?';
      whereValues.push(employee_id, company_id, DATE);
    }

    const sql = `UPDATE attendance_logs SET ${fieldsToUpdate.join(', ')} WHERE ${whereClause}`;
    const [result] = await db.query(sql, [...values, ...whereValues]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลที่ต้องการอัปเดตเวลาออกงาน' });
    }

    res.status(200).json({ message: 'บันทึกเวลาออกงานสำเร็จ!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกเวลาออกงานไม่สำเร็จ', error: err.message });
  }
};