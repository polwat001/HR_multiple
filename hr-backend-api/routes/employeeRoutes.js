const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Route: GET /api/employees
// ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (แต่ Controller จะเป็นคนกรอง Data อีกทีว่าใครเห็นแค่ไหน)
router.get('/', 
    authMiddleware, // ยามคนที่ 1: เช็คว่า Login แล้วหรือยัง (มี Token ไหม)
    // roleMiddleware(['Super Admin', 'Central HR', 'HR Company', 'Manager']), // (ถ้าต้องการล็อคไม่ให้พนักงานทั่วไปเข้า API นี้เลย ให้เปิดคอมเมนต์บรรทัดนี้ครับ)
    employeeController.getAllEmployees
);

router.get('/:id',
    authMiddleware,
    employeeController.getEmployeeById
);

router.post('/',
    authMiddleware,
    roleMiddleware(['Super Admin', 'Central HR', 'HR Company']),
    employeeController.createEmployee
);

router.put('/:id',
    authMiddleware,
    roleMiddleware(['Super Admin', 'Central HR', 'HR Company']),
    employeeController.updateEmployee
);

router.delete('/:id',
    authMiddleware,
    roleMiddleware(['Super Admin', 'Central HR', 'HR Company']),
    employeeController.deleteEmployee
);

module.exports = router;