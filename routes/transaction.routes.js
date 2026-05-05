const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transactionController');
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/allowedTo');


router.post('/app/addManually', authenticate, allowRoles(['normal']), (req, res, next) => {
    transactionController.addAppManually(req, res).catch(next);
});

router.get('/recents', authenticate, (req, res, next) => {
    transactionController.getRecentTransactions(req, res).catch(next);
});

module.exports = router;