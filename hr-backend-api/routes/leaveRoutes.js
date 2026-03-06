const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware'); // 🆕 เอาไว้ล็อคสิทธิ์

router.use(authMiddleware);

// Routes เดิม
router.get('/requests', leaveController.getLeaveRequests);
router.get('/balances', leaveController.getLeaveBalances);

// 🆕 Route ใหม่: ยื่นใบลา (ทุกคนทำได้)
router.post('/request', leaveController.createLeaveRequest);

// 🆕 Route ใหม่: อนุมัติ/ปฏิเสธใบลา (เฉพาะ Manager ขึ้นไป)
router.put('/:id/status', roleMiddleware(['Super Admin', 'Central HR', 'HR Company', 'Manager']), leaveController.updateLeaveStatus);

module.exports = router;