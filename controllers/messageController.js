const messageService = require('../services/messageService');
const { sendSuccess, sendError } = require('../utils/response');
const AppError = require('../utils/appError');

class messageController {

    async extractAndSave(req, res, next) {
        try {
            const { messages, messageText } = req.body;

            // both single message and batch (just in case)
            if (messages && Array.isArray(messages)) {
                // Batch processing
                const result = await messageService.processBatchMessages(messages);
                return sendSuccess(res, 201, 'Batch processing completed', {
                    data: result,
                    summary: {
                        total: messages.length,
                        successful: result.successful.length,
                        failed: result.failed.length
                    }
                });
            } else if (messageText) {
                // Single message
                const parsedData = await messageService.extractMessageData(messageText);
                const result = await messageService.createMessage(parsedData);
                return sendSuccess(res, 201, 'Message parsed and saved successfully', parsedData);
            } else {
                throw AppError.create(
                    'Please provide either "messageText" for single message or "messages" array for batch',
                    400
                );
            }
        } catch (error) {
            next(error);
        }
    }
}
module.exports = new messageController();
