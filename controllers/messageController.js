const messageService = require('../services/messageService');
const { sendSuccess, sendError } = require('../utils/response');
const AppError = require('../utils/appError');

class messageController {

    async extractAndSave(req, res, next) {
        try {
            const { Lastsyncdate, Devicename, Messages } = req.body;
            const userId = req.currentUser.userId;
            const userRole = req.currentUser.role;

            // Validate request
            if (!Messages || !Array.isArray(Messages) || Messages.length === 0) {
                throw AppError.create(
                    'Please provide "Messages" array with SMS objects containing Sender, Date, and MessageBody',
                    400
                );
            }

            // Process batch messages
            const result = await messageService.processBatchMessages(
                Messages,
                userId,
                userRole,
                { Lastsyncdate: Lastsyncdate, Devicename }
            );

            return sendSuccess(res, 201, 'Batch processing completed', {
                data: result,
                summary: {
                    total: Messages.length,
                    successful: result.successful.length,
                    failed: result.failed.length
                }
            });
        } catch (error) {
             throw error instanceof AppError 
                ? error 
                : AppError.create('Error processing batch messages: ' + error.message, 500);
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
             throw error instanceof AppError 
                ? error 
                : AppError.create('Error fetching recent transactions: ' + error.message, 500);
        }
    }


    async getMonthlyTransactions(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            const userRole = req.currentUser?.role;
            const { month, year } = req.body;
            if (!userId) throw AppError.create('Unauthorized', 401);    
            if (!month || isNaN(month) || month < 1 || month > 12) {
                throw AppError.create('Invalid month. Please provide a value between 1 and 12.', 400);
            }
            const messages = await messageService.getMessagesByUserAndMonth(userId, userRole, parseInt(month), parseInt(year));
            return sendSuccess(res, 200, 'Monthly transactions fetched', { data: messages });
        } catch (error) {
             throw error instanceof AppError 
                ? error 
                : AppError.create('Error fetching monthly transactions: ' + error.message, 500);
        }
    }

    async getTopAndLeastSenders(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            const userRole = req.currentUser?.role;
            if (!userId) throw AppError.create('Unauthorized', 401);
            
            const senderStats = await messageService.getTopAndLeastSenders(userId, userRole);
            return sendSuccess(res, 200, 'Sender statistics fetched', senderStats);
        } catch (error) {
             throw error instanceof AppError 
                ? error 
                : AppError.create('Error fetching sender statistics: ' + error.message, 500);}
    }

    async getUserDevices(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            if (!userId) throw AppError.create('Unauthorized', 401);
            
            const devices = await messageService.getUserDevices(userId);
            return sendSuccess(res, 200, 'User devices fetched', { devices: devices.devices });
        } catch (error) {
             throw error instanceof AppError 
                ? error 
                : AppError.create('Error fetching user devices: ' + error.message, 500);}
    }

    async getDeviceMessages(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            const { deviceName } = req.params;
            if (!userId) throw AppError.create('Unauthorized', 401);
            
            const device = await messageService.getDeviceMessages(userId, deviceName);
            return sendSuccess(res, 200, 'Device messages fetched', device);
        } catch (error) {
             throw error instanceof AppError 
                ? error 
                : AppError.create('Error fetching device messages: ' + error.message, 500);}
    }


    async getFilters(req, res, next) {
        try {
            const userId = req.currentUser?.userId;
            const {device, from, to, sender, amount, type} = req.body;
            const filterssss = {device, from, to, sender, amount, type};
            if (!userId) throw AppError.create('Unauthorized', 401);
            const filters = await messageService.getFilteredMessages(userId, filterssss);
            return sendSuccess(res, 200, 'User filters fetched', { filters });
        } catch (error) {
             throw error instanceof AppError 
                ? error 
                : AppError.create('Error fetching filters: ' + error.message, 500);
        }
    }
    

}
module.exports = new messageController();
