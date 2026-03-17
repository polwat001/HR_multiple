const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const authMiddleware = require('../middleware/authMiddleware');

// 🛡️ ทุกเส้นทางต้องผ่านการเช็ค Token (Login แล้วเท่านั้น)
router.use(authMiddleware);

// Route: GET /api/organization/companies
router.get('/companies', orgController.getCompanies);

// Route: GET /api/organization/departments
router.get('/departments', orgController.getDepartments);
router.post('/departments', orgController.createDepartment);
router.put('/departments/:id', orgController.updateDepartment);
router.delete('/departments/:id', orgController.deleteDepartment);

// Route: GET /api/organization/positions
router.get('/positions', orgController.getPositions);
router.post('/positions', orgController.createPosition);
router.put('/positions/:id', orgController.updatePosition);
router.delete('/positions/:id', orgController.deletePosition);

module.exports = router;