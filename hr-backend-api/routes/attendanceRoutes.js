const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');

// 🛡️ ทุกเส้นทางในนี้ ต้องผ่านการตรวจสอบ Token ก่อน
router.use(authMiddleware);

// Route: GET /api/attendance
router.get('/', attendanceController.getAttendances);
router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);

module.exports = router;