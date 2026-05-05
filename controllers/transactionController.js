const AppError = require("../utils/appError");
const { sendSuccess, sendError } = require('../utils/response');
const transactionService = require('../services/transactionService');



class transactionController {
    

    async addAppManually(req, res, next) {
        try {

            const userId = req.currentUser?.userId;
            const userRole = req.currentUser?.role;
            const { transactions } = req.body;
            if (!userId) throw AppError.create('Unauthorized', 401);

            if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
                throw AppError.create(
                    'Please provide "Transactions" array with transaction objects',
                    400
                );
            }

            const result = await transactionService.createListOfTransactions(transactions, userId, userRole);
            return sendSuccess(res, 201, `${result.successful} Transactions added successfully`, result.fails);
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Error adding app message manually: ' + error.message, 500);
        }
    }


}

module.exports = new transactionController();