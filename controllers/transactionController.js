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
            if (result.successful === 0) {
               // return sendError(res, 400, `Failed to add any transactions: ${result.fails}`);
                return (res.status(400).json({
                    status: "FAILED",
                    message: 'Failed to add any transactions',
                    fails: result.fails
                }));
            }
            return sendSuccess(res, 201, `${result.successful} Transactions added successfully`, result.fails);
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Error adding app message manually: ' + error.message, 500);
        }
    }


    async getRecentTransactions(req, res, next){
        try{
            const userId = req.currentUser?.userId;
            const userRole = req.currentUser?.role;
           // const limit = parseInt(req.limit) || 20;
            if (!userId) throw AppError.create('Unauthorized', 401);
            const result = await transactionService.getTransactionsByUser(userId, userRole);
            return sendSuccess(res, 200, 'User transactions fetched', result );

        }catch{
            throw error instanceof AppError
                ? error
                : AppError.create('Error getting recents ' + error.message, 500);
        }
    }


}

module.exports = new transactionController();