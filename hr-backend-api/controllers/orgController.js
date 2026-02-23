const db = require('../config/db');

// ==========================================
// 🏢 ส่วนจัดการ แผนก (Departments)
// ==========================================
exports.getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching departments', error: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, company_id, parent_id, cost_center } = req.body;
    if (!name || !company_id) return res.status(400).json({ message: 'กรุณาส่งชื่อแผนกและบริษัทให้ครบ' });
    
    const [result] = await db.query(
      'INSERT INTO departments (name, company_id, parent_id, cost_center) VALUES (?, ?, ?, ?)',
      [name, company_id, parent_id || null, cost_center || null]
    );
    res.status(201).json({ message: 'สร้างแผนกสำเร็จ!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating department', error: err.message });
  }
};

// ==========================================
// 💼 ส่วนจัดการ ตำแหน่ง (Positions)
// ==========================================
exports.getPositions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM positions');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching positions', error: err.message });
  }
};

exports.createPosition = async (req, res) => {
  try {
    const { title, company_id, level } = req.body;
    if (!title || !company_id) return res.status(400).json({ message: 'กรุณาส่งชื่อตำแหน่งและบริษัทให้ครบ' });
    
    const [result] = await db.query(
      'INSERT INTO positions (title, company_id, level) VALUES (?, ?, ?)',
      [title, company_id, level || 1]
    );
    res.status(201).json({ message: 'สร้างตำแหน่งสำเร็จ!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Error creating position', error: err.message });
  }
};