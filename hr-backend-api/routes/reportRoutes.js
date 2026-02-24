const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/authMiddleware');

// เส้นทางสำหรับดึงรายงานต่างๆ
router.get('/employee-summary', auth, reportController.getEmployeeSummary);
router.get('/attendance-daily', auth, reportController.getDailyAttendanceReport);

module.exports = router;