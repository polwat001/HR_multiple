const db = require('../config/db');

// ==========================================
// 📊 1. รายงานสรุปรายชื่อพนักงานแยกตามแผนกและตำแหน่ง
// ==========================================
exports.getEmployeeSummary = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.employee_code,
        e.firstname_th,
        e.lastname_th,
        d.NAME AS department_name,
        p.title_th AS position_name,
        e.status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE e.company_id = ?
      ORDER BY d.NAME, e.employee_code
    `;
    
    // ดึง company_id จากตัวผู้ใช้งานที่ Login อยู่ (ผ่าน Middleware)
    const companyId = req.user.company_id; 
    const [rows] = await db.query(query, [companyId]);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'สร้างรายงานสรุปพนักงานไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// ⏰ 2. รายงานสรุปการเข้างานรายวัน (Attendance Summary)
// ==========================================
exports.getDailyAttendanceReport = async (req, res) => {
  try {
    const { date } = req.query; // รับวันที่จาก Query String เช่น ?date=2026-02-24
    
    const query = `
      SELECT 
        e.firstname_th, 
        e.lastname_th, 
        a.check_in_time, 
        a.check_out_time, 
        a.STATUS,
        a.late_minutes
      FROM attendance_logs a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.\`DATE\` = ? AND a.company_id = ?
    `;
    
    const [rows] = await db.query(query, [date, req.user.company_id]);
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: 'ดึงรายงานการเข้างานไม่สำเร็จ', error: err.message });
  }
};