const express = require('express');
const router = express.Router();
const otController = require('../controllers/otController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/requests', otController.getOtRequests);
router.get('/summary', otController.getOtSummary);
router.post('/request', otController.createOtRequest);
router.put('/:id/status', otController.updateOtStatus);

module.exports = router;
