const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

router.use(authMiddleware);

router.get('/permission-matrix', adminController.getPermissionMatrix);
router.put('/permission-matrix/:roleName', adminController.updatePermissionMatrix);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/approval-flows', adminController.getApprovalFlows);
router.put('/approval-flows', adminController.updateApprovalFlows);
router.get('/leave-policies', adminController.getLeavePolicies);
router.put('/leave-policies', adminController.updateLeavePolicies);
router.get('/system-settings', adminController.getSystemSettings);
router.put('/system-settings', adminController.updateSystemSettings);
router.post('/system-actions/:actionKey', adminController.runSystemAction);
router.get('/payroll-settings', adminController.getPayrollSettings);
router.put('/payroll-settings/:employeeId', adminController.updatePayrollSetting);

module.exports = router;
