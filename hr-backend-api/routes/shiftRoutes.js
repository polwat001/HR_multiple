const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');

// 1. ใช้วิธีเรียก authMiddleware แบบไม่ต้องมีปีกกา (เหมือนไฟล์อื่นๆ ที่เราทำผ่านแล้ว)
const authMiddleware = require('../middleware/authMiddleware'); 

// 2. เปลี่ยนคำว่า verifyToken เป็น authMiddleware
router.get('/', authMiddleware, shiftController.getAllShifts);
router.post('/', authMiddleware, shiftController.createShift);

module.exports = router; // สำคัญที่สุด!