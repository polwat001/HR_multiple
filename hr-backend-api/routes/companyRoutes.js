const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController'); // 1. เช็ค path ให้ถูก
const authMiddleware = require('../middleware/authMiddleware'); // 2. ถ้าต้องการป้องกันความปลอดภัย

// 3. บรรทัดนี้สำคัญที่สุด! 
// ต้องแน่ใจว่าชื่อหลังจุด (getAllCompanies) ตรงกับที่ export ใน Controller เป๊ะๆ
router.get('/', authMiddleware, companyController.getAllCompanies); 

module.exports = router;