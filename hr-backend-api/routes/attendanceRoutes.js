const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const auth = require('../middleware/authMiddleware'); // ดึงยามมาเฝ้าประตูเหมือนเดิม!

// ... โค้ดส่วนบน ...
router.get('/', auth, attendanceController.getAttendanceLogs); // สำหรับดึงข้อมูล
router.post('/record', auth, attendanceController.recordAttendance); // สำหรับบันทึกเข้างาน
router.put('/check-out', auth, attendanceController.checkOut); // สำหรับบันทึกออกงาน

module.exports = router;