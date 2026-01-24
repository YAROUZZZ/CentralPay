// controllers/messageController.js
const messageService = require('../services/messageService');
class messageController {
    
    async extractAndSave(req, res, next) {
        try {
            const { messageText } = req.body;

            const parsedData = await messageService.extractMessageData(messageText);

            const result = await messageService.createMessage(parsedData);

            res.status(201).json({
                success: true,
                data: parsedData
            });
        } catch (error) {
            // Check if it's a duplicate error
            if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
                return res.status(409).json({
                    success: false,
                    error: error.message,
                    statusCode: 409
                });
            }
            next(error);
        }
    }
}
module.exports = new messageController();
