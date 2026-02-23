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

// ==========================================
// 3. ดึงข้อมูลพนักงานรายบุคคล (GET by ID)
// ==========================================
exports.getEmployeeById = async (req, res) => {
    try {
      const { id } = req.params; // รับค่า id จาก URL
      const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบข้อมูลพนักงาน' });
      }
      
      res.status(200).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: err.message });
    }
  };
  
  // ==========================================
  // 4. อัปเดตข้อมูล/ย้ายบริษัทพนักงาน (PUT)
  // ==========================================
  exports.updateEmployee = async (req, res) => {
    try {
      const { id } = req.params;
      // รับข้อมูลที่ต้องการอัปเดต (ส่งมาแค่อันที่ต้องการเปลี่ยนก็ได้)
      const { 
        firstname_th, 
        lastname_th, 
        nickname,
        current_company_id,
        STATUS 
      } = req.body;
  
      // ใช้ COALESCE ของ SQL เพื่ออัปเดตเฉพาะค่าที่ส่งมา ถ้าไม่ส่งมาให้ใช้ค่าเดิม
      const [result] = await db.query(
        `UPDATE employees 
         SET firstname_th = COALESCE(?, firstname_th), 
             lastname_th = COALESCE(?, lastname_th), 
             nickname = COALESCE(?, nickname), 
             current_company_id = COALESCE(?, current_company_id), 
             STATUS = COALESCE(?, STATUS)
         WHERE id = ?`,
        [firstname_th, lastname_th, nickname, current_company_id, STATUS, id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'ไม่พบพนักงานที่ต้องการอัปเดต' });
      }
  
      res.status(200).json({ message: 'อัปเดตข้อมูลพนักงานสำเร็จ!' });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'อัปเดตข้อมูลไม่สำเร็จ', error: err.message });
    }
  };