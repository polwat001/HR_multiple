const db = require('../config/db');

const isSchemaError = (error) => {
  const code = String(error?.code || '');
  return code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_FIELD_ERROR' || code === 'ER_PARSE_ERROR';
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const { user_id, role_level, company_id } = req.user;

    if (role_level < 20) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลการอนุมัติ' });
    }

    let sql = `
      SELECT 
        a.id,
        a.approval_type,
        a.request_reason,
        a.status,
        a.requested_by,
        a.approved_by,
        a.requested_date,
        a.approved_date,
        ur.id as requester_id,
        CONCAT(e.firstname_th, ' ', e.lastname_th) as requester_name,
        d.name_th as department_name
      FROM approvals a
      LEFT JOIN users ur ON a.requested_by = ur.id
      LEFT JOIN employees e ON ur.id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.status = 'pending'
    `;

    const params = [];

    // Data isolation based on role
    if (role_level >= 80) {
      // Super Admin (99) and Central HR (80) can see all
    } else if (role_level === 50) {
      // HR Company (50) - only see requests from their company
      sql += ` AND e.company_id = ?`;
      params.push(company_id);
    } else if (role_level === 20) {
      // Manager (20) - only see requests from their team
      sql += ` AND e.manager_id = (SELECT id FROM employees WHERE user_id = ?)`;
      params.push(user_id);
    } else {
      // Employee (1) - only see own requests
      sql += ` AND a.requested_by = ?`;
      params.push(user_id);
    }

    sql += ` ORDER BY a.requested_date DESC`;

    const [approvals] = await db.query(sql, params);

    res.status(200).json({
      message: 'ดึงข้อมูลการอนุมัติที่กำลังรออยู่สำเร็จ',
      count: approvals.length,
      data: approvals
    });
  } catch (error) {
    console.error('Get Pending Approvals Error:', error);
    if (isSchemaError(error)) {
      return res.status(200).json({
        message: 'ยังไม่พบโครงสร้างตาราง approvals ที่สมบูรณ์ ส่งข้อมูลว่างชั่วคราว',
        count: 0,
        data: [],
      });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการอนุมัติ' });
  }
};

exports.getApprovals = async (req, res) => {
  try {
    const { user_id, role_level, company_id } = req.user;

    if (role_level < 20) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลการอนุมัติ' });
    }

    let sql = `
      SELECT 
        a.id,
        a.approval_type,
        a.request_reason,
        a.status,
        a.requested_by,
        a.approved_by,
        a.requested_date,
        a.approved_date,
        ur.id as requester_id,
        CONCAT(e.firstname_th, ' ', e.lastname_th) as requester_name,
        d.name_th as department_name
      FROM approvals a
      LEFT JOIN users ur ON a.requested_by = ur.id
      LEFT JOIN employees e ON ur.id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;

    const params = [];

    // Data isolation based on role
    if (role_level >= 80) {
      // Super Admin (99) and Central HR (80) can see all
    } else if (role_level === 50) {
      // HR Company (50) - only see requests from their company
      sql += ` AND e.company_id = ?`;
      params.push(company_id);
    } else if (role_level === 20) {
      // Manager (20) - only see requests from their team
      sql += ` AND e.manager_id = (SELECT id FROM employees WHERE user_id = ?)`;
      params.push(user_id);
    } else {
      // Employee (1) - only see own requests
      sql += ` AND a.requested_by = ?`;
      params.push(user_id);
    }

    sql += ` ORDER BY a.requested_date DESC`;

    const [approvals] = await db.query(sql, params);

    res.status(200).json({
      message: 'ดึงข้อมูลการอนุมัติสำเร็จ',
      count: approvals.length,
      data: approvals
    });
  } catch (error) {
    console.error('Get Approvals Error:', error);
    if (isSchemaError(error)) {
      return res.status(200).json({
        message: 'ยังไม่พบโครงสร้างตาราง approvals ที่สมบูรณ์ ส่งข้อมูลว่างชั่วคราว',
        count: 0,
        data: [],
      });
    }
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการอนุมัติ' });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role_level } = req.user;

    if (role_level < 20) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในการอนุมัติ' });
    }

    const sql = `
      UPDATE approvals 
      SET status = 'approved', 
          approved_by = ?, 
          approved_date = NOW()
      WHERE id = ?
    `;

    const [result] = await db.query(sql, [user_id, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบการร้องขอ' });
    }

    res.status(200).json({ message: 'อนุมัติการร้องขอสำเร็จ' });
  } catch (error) {
    console.error('Approve Request Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติ' });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role_level } = req.user;

    if (role_level < 20) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ในการปฏิเสธ' });
    }

    const sql = `
      UPDATE approvals 
      SET status = 'rejected', 
          approved_by = ?, 
          approved_date = NOW()
      WHERE id = ?
    `;

    const [result] = await db.query(sql, [user_id, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบการร้องขอ' });
    }

    res.status(200).json({ message: 'ปฏิเสธการร้องขอสำเร็จ' });
  } catch (error) {
    console.error('Reject Request Error:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการปฏิเสธ' });
  }
};
