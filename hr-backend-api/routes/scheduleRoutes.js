const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const auth = require('../middleware/authMiddleware'); // ดึงยามมาเฝ้า

// ดึงตารางงานทั้งหมด (GET)
router.get('/', auth, scheduleController.getAllSchedules);

// จัดตารางงานใหม่ (POST)
router.post('/', auth, scheduleController.createSchedule);

module.exports = router;