const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const auth = require('../middleware/authMiddleware'); // ดึงยามมาเฝ้าประตู

// เส้นทางสำหรับแผนก (Departments)
router.get('/departments', auth, orgController.getDepartments);
router.post('/departments', auth, orgController.createDepartment);

// เส้นทางสำหรับตำแหน่ง (Positions)
router.get('/positions', auth, orgController.getPositions);
router.post('/positions', auth, orgController.createPosition);

module.exports = router;