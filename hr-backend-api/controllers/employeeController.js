const db = require('../config/db');

// ==========================================
// 1. ดึงข้อมูลพนักงานทั้งหมด (GET)
// ==========================================
exports.getAllEmployees = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM employees ORDER BY id DESC');
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: err.message });
  }
};

// ==========================================
// 2. เพิ่มข้อมูลพนักงานใหม่ (POST)
// ==========================================
exports.createEmployee = async (req, res) => {
  try {
    const { 
      employee_code, 
      firstname_th, 
      lastname_th, 
      nickname,
      id_card_number,
      current_company_id,
      user_id,
      STATUS,
      avatar_url
    } = req.body;

    if (!employee_code || !firstname_th || !lastname_th || !current_company_id) {
      return res.status(400).json({ message: 'กรุณาส่งข้อมูลบังคับให้ครบถ้วน' });
    }

    const [result] = await db.query(
      `INSERT INTO employees 
      (employee_code, firstname_th, lastname_th, nickname, id_card_number, current_company_id, user_id, STATUS, avatar_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_code, 
        firstname_th, 
        lastname_th, 
        nickname || null, 
        id_card_number || null, 
        current_company_id, 
        user_id || null, 
        STATUS || 'Active',
        avatar_url || null
      ]
    );

    res.status(201).json({ 
      message: 'เพิ่มพนักงานสำเร็จ!', 
      insertId: result.insertId 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกข้อมูลไม่สำเร็จ', error: err.message });
  }
};