const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// กำหนดเส้นทางสำหรับ Login (ใช้ POST)
router.post('/login', authController.login);

// ✨ เพิ่มบรรทัดนี้สำหรับเช็คโปรไฟล์ (ใช้ GET)
router.get('/me', authMiddleware, authController.getMe); 

module.exports = router;