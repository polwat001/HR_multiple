const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const auth = require('../middleware/authMiddleware'); // ดึงยามมาเฝ้า

// ดึงสัญญาทั้งหมด (GET)
router.get('/', auth, contractController.getAllContracts);

// สร้างสัญญาใหม่ (POST)
router.post('/', auth, contractController.createContract);

// 👇 บรรทัดนี้สำคัญมาก! ถ้าไม่มีบรรทัดนี้ server.js จะพังทันที
module.exports = router;