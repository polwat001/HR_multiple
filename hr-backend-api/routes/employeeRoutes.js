const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const auth = require('../middleware/authMiddleware'); // 👈 ดึงยามมาใช้งาน

// สังเกตว่าเราแทรกคำว่า "auth" ไว้ตรงกลาง แปลว่าต้องผ่านยามก่อน ถึงจะเข้าไปดึงข้อมูล (Controller) ได้
router.get('/', auth, employeeController.getAllEmployees);
router.post('/', auth, employeeController.createEmployee);
router.get('/:id', auth, employeeController.getEmployeeById);
router.put('/:id', auth, employeeController.updateEmployee);

module.exports = router;