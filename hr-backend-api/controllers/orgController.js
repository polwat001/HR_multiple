const db = require('../config/db');

// ==========================================
// 🏢 1. จัดการแผนก (Departments)
// ==========================================
exports.getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments ORDER BY NAME ASC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: 'ดึงข้อมูลแผนกไม่สำเร็จ', error: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { company_id, NAME, parent_dept_id, cost_center } = req.body;
    const [result] = await db.query(
      'INSERT INTO departments (company_id, NAME, parent_dept_id, cost_center) VALUES (?, ?, ?, ?)',
      [company_id, NAME, parent_dept_id || null, cost_center || null]
    );
    res.status(201).json({ message: 'สร้างแผนกสำเร็จ', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'บันทึกแผนกไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// 🎓 2. จัดการตำแหน่ง (Positions)
// ==========================================
exports.getPositions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM positions ORDER BY title_th ASC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: 'ดึงข้อมูลตำแหน่งไม่สำเร็จ', error: err.message });
  }
};

exports.createPosition = async (req, res) => {
  try {
    // ใช้ชื่อ title_th และ LEVEL ตามตารางจริงของคุณ
    const { company_id, title_th, LEVEL } = req.body;
    const [result] = await db.query(
      'INSERT INTO positions (company_id, title_th, LEVEL) VALUES (?, ?, ?)',
      [company_id, title_th, LEVEL || 1]
    );
    res.status(201).json({ message: 'สร้างตำแหน่งสำเร็จ', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'บันทึกตำแหน่งไม่สำเร็จ', error: err.message });
  }
};