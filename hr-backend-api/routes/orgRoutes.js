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

// Route: GET /api/organization/positions
router.get('/positions', orgController.getPositions);

module.exports = router;