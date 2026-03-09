const db = require('../config/db');

// ==========================================
// 1. ดึงข้อมูลกะการทำงานทั้งหมด (GET)
// ==========================================
exports.getAllShifts = async (req, res) => {
  try {
    // 🚨 แก้ไข: เปลี่ยนจากตาราง shifts เป็น work_schedules
    const [rows] = await db.query('SELECT * FROM work_schedules ORDER BY time_in ASC');
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ดึงข้อมูลกะการทำงานไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// 2. สร้างกะการทำงานใหม่ (POST)
// ==========================================
exports.createShift = async (req, res) => {
  try {
    const { company_id, shift_name, time_in, time_out } = req.body;

    if (!company_id || !shift_name || !time_in || !time_out) {
      return res.status(400).json({
        message: 'กรุณาส่ง company_id, ชื่อกะ, เวลาเริ่ม และเวลาเลิกงานให้ครบถ้วน'
      });
    }

    // 🚨 แก้ไข: เปลี่ยนจากตาราง shifts เป็น work_schedules
    const [result] = await db.query(
      'INSERT INTO work_schedules (company_id, NAME, time_in, time_out) VALUES (?, ?, ?, ?)',
      [company_id, shift_name, time_in, time_out]
    );

    res.status(201).json({ message: 'สร้างกะการทำงานสำเร็จ!', scheduleId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกกะการทำงานไม่สำเร็จ', error: err.message });
  }
};