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
                data: parsedData,
                saved: result
            });
        } catch (error) {
            next(error);
        }
    }
}
module.exports = new messageController();
