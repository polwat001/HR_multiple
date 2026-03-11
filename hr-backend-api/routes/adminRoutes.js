const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(authMiddleware);

router.get('/permission-matrix', adminController.getPermissionMatrix);
router.put('/permission-matrix/:roleName', adminController.updatePermissionMatrix);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
