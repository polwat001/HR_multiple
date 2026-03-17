const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', contractController.getContracts);
router.get('/templates', contractController.getContractTemplates);
router.post('/templates', contractController.createContractTemplate);

module.exports = router;