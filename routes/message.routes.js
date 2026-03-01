const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');
const authenticate = require('../middleware/auth');
const allowRoles = require('../middleware/allowedTo');


router.post('/parse', authenticate, (req, res, next) => {
    messageController.extractAndSave(req, res).catch(next);
});

router.get('/recents', authenticate, (req, res, next) => {
    messageController.getRecentTransactions(req, res).catch(next);
});


router.get('/monthlyTransactions', authenticate, (req, res, next) => {
    messageController.getMonthlyTransactions(req, res).catch(next);
});

router.get('/analytics', authenticate, (req, res, next) => {
    messageController.getTopAndLeastSenders(req, res).catch(next);
});

router.get('/devices', authenticate, (req, res, next) => {
    messageController.getUserDevices(req, res).catch(next);
});

router.get('/devices/:deviceName/messages', authenticate, (req, res, next) => {
    messageController.getDeviceMessages(req, res).catch(next);
});


module.exports = router;