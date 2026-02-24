const messageService = require('../services/messageService');
const { sendSuccess, sendError } = require('../utils/response');
const AppError = require('../utils/appError');

class messageController {

    async extractAndSave(req, res, next) {
        try {
            const { messages, messageText , date } = req.body;
            const userId = req.currentUser.userId;
            const userRole = req.currentUser.role ;

            // both single message and batch (just in case)
            if (messages && Array.isArray(messages)) {
                // Batch processing
                const result = await messageService.processBatchMessages(messages, userId, userRole);
                //console.log(result.date);
                
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
                console.log(userRole);

                const parsedData = await messageService.extractMessageData(messageText, date);
                const saved = await messageService.createMessage(parsedData, userId, userRole);
               // console.log(parsedData.date);
                
                return sendSuccess(res, 201, 'Message parsed and saved successfully', saved);
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

    async getRecentTransactions(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            const userRole = req.currentUser?.role;
            const limit = parseInt(req.limit) || 20;
            if (!userId) throw AppError.create('Unauthorized', 401);
            const messages = await messageService.getMessagesByUser(userId, userRole, limit);
            return sendSuccess(res, 200, 'User messages fetched', { data: messages });
        } catch (error) {
            next(error);
        }
    }


    async getMonthlyTransactions(req, res, next) {
       // try {
            const userId = req.currentUser?.userId;
            const userRole = req.currentUser?.role;
            const { month, year } = req.body;
            if (!userId) throw AppError.create('Unauthorized', 401);    
            if (!month || isNaN(month) || month < 1 || month > 12) {
                throw AppError.create('Invalid month. Please provide a value between 1 and 12.', 400);
            }
            const messages = await messageService.getMessagesByUserAndMonth(userId, userRole, parseInt(month), parseInt(year));
            return sendSuccess(res, 200, 'Monthly transactions fetched', { data: messages });
      //  } catch (error) {
        //    next(error);
       // }
    }

    

}
module.exports = new messageController();
