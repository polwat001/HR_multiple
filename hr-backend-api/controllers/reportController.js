const db = require('../config/db');

// ==========================================
// 📊 1. รายงานสรุปรายชื่อพนักงานแยกตามแผนกและตำแหน่ง
// ==========================================
exports.getEmployeeSummary = async (req, res) => {
  try {
    // พยายามใช้โครงสร้างที่ "เบาที่สุด" เพื่อหลีกเลี่ยงปัญหา column ไม่ตรงกับฐานจริง
    // ถ้าฐานข้อมูลยังไม่มี column department_id / position_id เราจะไม่ JOIN ตารางอื่นเลย
    const baseQuery = `
      SELECT 
        e.employee_code,
        e.firstname_th,
        e.lastname_th,
        NULL AS department_name,
        NULL AS position_name,
        e.STATUS
      FROM employees e
    `;

    const companyId = req.user?.company_id;

    // ถ้า token มี company_id ให้ filter ตามบริษัท, ถ้าไม่มีก็ดึงทั้งหมด
    const whereClause = companyId ? 'WHERE e.current_company_id = ?' : '';
    const orderClause = 'ORDER BY e.employee_code';

    const query = [baseQuery, whereClause, orderClause].filter(Boolean).join(' ');
    
    const params = companyId ? [companyId] : [];
    const [rows] = await db.query(query, params);
    
    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error("❌ Report Error:", err);
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
    console.error("❌ Attendance Report Error:", err);
    res.status(500).json({ message: 'ดึงรายงานการเข้างานไม่สำเร็จ', error: err.message });
  }
};