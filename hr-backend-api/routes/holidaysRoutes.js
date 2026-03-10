const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const holidaysController = require('../controllers/holidaysController');

// Get all holidays
router.get('/', authMiddleware, holidaysController.getHolidays);

// Get upcoming holidays (next 30 days by default)
router.get('/upcoming', authMiddleware, holidaysController.getUpcomingHolidays);

// Create holiday (admin only)
router.post('/', authMiddleware, holidaysController.createHoliday);

// Update holiday (admin only)
router.put('/:id', authMiddleware, holidaysController.updateHoliday);

// Delete holiday (admin only)
router.delete('/:id', authMiddleware, holidaysController.deleteHoliday);

module.exports = router;
