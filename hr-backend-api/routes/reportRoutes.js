const express = require('express');
const router = express.Router();
// บรรทัดนี้ต้องชี้ไปที่ไฟล์ controller ถูกต้อง
const reportController = require('../controllers/reportController'); 
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// สังเกตตรงนี้: ต้องเป็น reportController.getDashboardStats (ไม่มีวงเล็บต่อท้าย)
router.get('/dashboard', reportController.getDashboardStats);
router.get('/attendance', reportController.getAttendanceReport);
router.get('/ot', reportController.getOtReport);

module.exports = router;