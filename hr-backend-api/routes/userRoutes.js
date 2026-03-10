const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// ทุกเส้นต้องผ่านการตรวจสอบสิทธิ์ก่อน
router.use(authMiddleware);

// ✅ GET /api/users - ดึงข้อมูลผู้ใช้งานทั้งหมด
router.get('/', userController.getUsers);

// ✅ GET /api/users/:id - ดึงข้อมูลผู้ใช้งานรายคนพอดี
router.get('/:id', userController.getUserById);

// ✅ POST /api/users - สร้างผู้ใช้งานใหม่
router.post('/', userController.createUser);

// ✅ PUT /api/users/:id - อัปเดตข้อมูลผู้ใช้งาน
router.put('/:id', userController.updateUser);

// ✅ DELETE /api/users/:id - ลบผู้ใช้งาน
router.delete('/:id', userController.deleteUser);

// ✅ POST /api/users/:id/assign-role - กำหนด role
router.post('/:id/assign-role', userController.assignRole);

// ✅ DELETE /api/users/:id/remove-role - เอา role ออก
router.delete('/:id/remove-role', userController.removeRole);

// ✅ PUT /api/users/:id/change-password - เปลี่ยนรหัสผ่าน
router.put('/:id/change-password', userController.changePassword);

module.exports = router;