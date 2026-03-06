const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');

// นำเข้าแบบก้อนหลัก (ไม่มีปีกกา)
const authMiddleware = require('../middleware/authMiddleware'); 

// เปลี่ยนจาก verifyToken เป็น authMiddleware
router.get('/', authMiddleware, shiftController.getAllShifts);
router.post('/', authMiddleware, shiftController.createShift);

module.exports = router;