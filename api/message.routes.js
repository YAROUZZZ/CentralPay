const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');

router.post('/parse', (req, res, next) => {
    messageController.extractAndSave(req, res).catch(next);
});

module.exports = router;