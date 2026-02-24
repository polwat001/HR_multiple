const db = require('../config/db');

// ==========================================
// 1. ดึงรายการใบลาทั้งหมด (เพื่อเอาไปแสดงหน้าตาราง HR)
// ==========================================
exports.getAllLeaves = async (req, res) => {
  try {
    // เปลี่ยนชื่อตารางเป็น leave_requests
    const query = `
      SELECT l.*, e.firstname_th, e.lastname_th 
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      ORDER BY l.id DESC
    `;
    const [rows] = await db.query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ดึงข้อมูลการลาไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// 2. พนักงานยื่นขอลาพักผ่อน/ป่วย (POST)
// ==========================================
exports.requestLeave = async (req, res) => {
  try {
    // เพิ่มการรับค่า company_id เข้ามาด้วย
    const { employee_id, company_id, leave_type, start_date, end_date, reason } = req.body;

    if (!employee_id || !company_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({ message: 'กรุณาส่งข้อมูลวันลาและบริษัทให้ครบถ้วน' });
    }

    const [result] = await db.query(
        'INSERT INTO leave_requests (employee_id, company_id, leave_type, start_date, end_date, reason, STATUS) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [employee_id, company_id, leave_type, start_date, end_date, reason || '', 'pending'] 
      );

    res.status(201).json({ message: 'ส่งคำขอลาสำเร็จ!', leaveId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกคำขอลาไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// 3. หัวหน้า/HR กดอนุมัติหรือปฏิเสธใบลา (PUT)
// ==========================================
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params; 
    const { STATUS } = req.body; // รับค่า STATUS ตัวพิมพ์ใหญ่

    // อัปเดตตาราง leave_requests
    const [result] = await db.query('UPDATE leave_requests SET STATUS = ? WHERE id = ?', [STATUS, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบใบลาที่ต้องการอัปเดต' });
    }

    res.status(200).json({ message: `อัปเดตสถานะใบลาเป็น ${STATUS} สำเร็จ!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'อัปเดตสถานะไม่สำเร็จ', error: err.message });
  }
};