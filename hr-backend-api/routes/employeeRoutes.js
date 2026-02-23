const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// เมื่อมีคนเรียก GET /api/employees ให้ไปดึงข้อมูล
router.get('/', employeeController.getAllEmployees);

// เมื่อมีคนเรียก POST /api/employees ให้ไปบันทึกข้อมูล
router.post('/', employeeController.createEmployee);

module.exports = router;