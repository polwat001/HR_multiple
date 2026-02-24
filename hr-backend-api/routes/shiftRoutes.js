const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const auth = require('../middleware/authMiddleware'); // ดึงยามมาเฝ้า

router.get('/', auth, shiftController.getAllShifts);
router.post('/', auth, shiftController.createShift);

module.exports = router; // สำคัญที่สุด!