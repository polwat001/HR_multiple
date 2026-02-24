const db = require('../config/db');

// ==========================================
// 1. ดึงข้อมูลกะการทำงานทั้งหมด (GET)
// ==========================================
exports.getAllShifts = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shifts ORDER BY start_time ASC');
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
    const { company_id, shift_name, start_time, end_time } = req.body;

    if (!company_id || !shift_name || !start_time || !end_time) {
      return res.status(400).json({
        message: 'กรุณาส่ง company_id, ชื่อกะ, เวลาเริ่ม และเวลาเลิกงานให้ครบถ้วน'
      });
    }

    const [result] = await db.query(
      'INSERT INTO shifts (company_id, NAME, start_time, end_time) VALUES (?, ?, ?, ?)',
      [company_id, shift_name, start_time, end_time]
    );

    res.status(201).json({ message: 'สร้างกะการทำงานสำเร็จ!', shiftId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกกะการทำงานไม่สำเร็จ', error: err.message });
  }
};