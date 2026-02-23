const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 1. รับ Token จาก Header (รูปแบบคือ Authorization: Bearer <token>)
  const authHeader = req.header('Authorization');
  
  // ถ้าไม่มีการส่ง Header นี้มาเลย
  if (!authHeader) {
    return res.status(401).json({ message: 'ไม่มี Token ปฏิเสธการเข้าถึง (Access Denied)' });
  }

  // แยกคำว่า Bearer ออก เอาเฉพาะก้อน Token
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'รูปแบบ Token ไม่ถูกต้อง' });
  }

  try {
    // 2. ตรวจสอบและถอดรหัส Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my_super_secret_key_hr_system_2026');
    
    // 3. เอาข้อมูล user (id, role, company_id) ไปแปะไว้ใน req 
    // เพื่อให้ API ดึงข้อมูลรู้ว่า "ใคร" กำลังเรียกใช้งาน และอยู่บริษัทไหน
    req.user = decoded.user; 
    
    // 4. ให้ผ่านด่านไปทำงานฟังก์ชันถัดไปได้
    next(); 
  } catch (err) {
    res.status(401).json({ message: 'Token ไม่ถูกต้อง หรือ หมดอายุแล้ว' });
  }
};