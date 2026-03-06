// ตัวอย่างการเรียกใช้งาน (ยังไม่ต้องก๊อปปี้นะครับ ให้ดูเป็นคอนเซปต์)
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const hrController = require('../controllers/hrController');

// เอา ยามคนที่ 1 (auth) และ ยามคนที่ 2 (role) มายืนดักหน้าห้อง
router.get('/salary-report', 
    authMiddleware, 
    roleMiddleware(['Super Admin', 'Central HR']), 
    hrController.getSalaryReport
);