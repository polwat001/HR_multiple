const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const approvalsController = require('../controllers/approvalsController');

// Get pending approvals
router.get('/pending', authMiddleware, approvalsController.getPendingApprovals);

// Get all approvals
router.get('/', authMiddleware, approvalsController.getApprovals);

// Approve a request
router.post('/:id/approve', authMiddleware, approvalsController.approveRequest);

// Reject a request
router.post('/:id/reject', authMiddleware, approvalsController.rejectRequest);

module.exports = router;
