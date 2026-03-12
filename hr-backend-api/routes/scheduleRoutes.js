const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', scheduleController.getSchedules);
router.post('/', scheduleController.createSchedule);
router.get('/:id/employees', scheduleController.getScheduleEmployees);

module.exports = router;