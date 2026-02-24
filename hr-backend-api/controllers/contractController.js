const db = require('../config/db');

// ==========================================
// 1. ดึงข้อมูลสัญญาจ้างทั้งหมด (พร้อมชื่อพนักงาน)
// ==========================================
exports.getAllContracts = async (req, res) => {
  try {
    const query = `
      SELECT c.*, e.firstname_th, e.lastname_th, e.employee_code 
      FROM contracts c
      JOIN employees e ON c.employee_id = e.id
      ORDER BY c.end_date ASC -- เรียงเอาคนที่ใกล้หมดสัญญาขึ้นก่อน
    `;
    const [rows] = await db.query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ดึงข้อมูลสัญญาจ้างไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// 2. สร้างสัญญาจ้างฉบับใหม่
// ==========================================
exports.createContract = async (req, res) => {
  try {
    // รับข้อมูลให้ตรงกับโครงสร้างตารางเป๊ะๆ
    const { 
      employee_id, 
      company_id, 
      contract_number, 
      start_date, 
      end_date, 
      notify_days_before, 
      STATUS, 
      file_path 
    } = req.body;

    // เช็คข้อมูลบังคับ
    if (!employee_id || !company_id || !contract_number || !start_date) {
      return res.status(400).json({ message: 'กรุณาส่งข้อมูลบังคับ (ID, บริษัท, เลขที่สัญญา, วันเริ่ม) ให้ครบ' });
    }

    // ทำการ Insert ลง Database
    const [result] = await db.query(
      `INSERT INTO contracts 
      (employee_id, company_id, contract_number, start_date, end_date, notify_days_before, STATUS, file_path) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id, 
        company_id, 
        contract_number, 
        start_date, 
        end_date || null, 
        notify_days_before || 30, // ถ้าไม่ส่งมา ให้ค่าเริ่มต้นคือแจ้งเตือนล่วงหน้า 30 วัน
        STATUS || 'Active',       // เช็คใน DB ของคุณด้วยนะครับว่าใช้ตัวพิมพ์เล็ก-ใหญ่ยังไง
        file_path || null
      ]
    );

    res.status(201).json({ message: 'สร้างสัญญาจ้างสำเร็จ!', contractId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกสัญญาจ้างไม่สำเร็จ', error: err.message });
  }
};