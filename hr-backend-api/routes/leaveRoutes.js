const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const auth = require('../middleware/authMiddleware'); // ดึงยามมาเฝ้า

// ดึงรายการใบลากลับมาดู
router.get('/requests', auth, leaveController.getAllLeaves);

// ส่งใบลาใหม่
router.post('/request', auth, leaveController.requestLeave);

// อัปเดตสถานะใบลา (อนุมัติ/ปฏิเสธ) เช่น PUT /api/leaves/1/status
router.put('/:id/status', auth, leaveController.updateLeaveStatus);

module.exports = router;