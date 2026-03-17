const db = require('../config/db');

exports.getAllCompanies = async (req, res) => {
  try {
    const roleLevel = Number(req.user?.role_level || 0);
    const companyId = Number(req.user?.company_id || 0);

    // ปรับให้ตรงกับโครงสร้างจริงในภาพ
    let query = `
      SELECT 
        id, 
        name_th AS name,       -- เปลี่ยนจาก name_th เป็น name
        CODE AS shortName,      -- เปลี่ยนจาก CODE เป็น shortName
        COALESCE(logo_url, '🏢') AS logo, -- ใช้ logo_url ตามภาพ
        'hsl(215 70% 45%)' AS color 
      FROM companies
    `;
    const params = [];

    if (roleLevel < 80) {
      if (!companyId) {
        return res.status(403).json({ message: 'ไม่สามารถกำหนดขอบเขตบริษัทของผู้ใช้งานได้' });
      }
      query += ' WHERE id = ?';
      params.push(companyId);
    }

    const [rows] = await db.query(query, params);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ SQL Error:", err.message);
    res.status(500).json({ message: 'Error', error: err.message });
  }
};