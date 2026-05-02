const AppError = require("../utils/appError");
const { sendSuccess, sendError } = require('../utils/response');
const transactionService = require('../services/transactionService');



class transactionController {
    constructor(transactionService) {
        this.transactionService = transactionService;
    }

    async addAppManually(req, res, next) {
        try {

            const userId = req.currentUser?.userId;
            const userRole = req.currentUser?.role;
            const { amount, expense, category, date } = req.body;
            if (!userId) throw AppError.create('Unauthorized', 401);

            const transaction = await transactionService.createTransaction(amount, expense, category, date, userId, userRole);
            return sendSuccess(res, 201, 'Transaction added successfully',  transaction);
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Error adding app message manually: ' + error.message, 500);
        }
    }


}

module.exports = new transactionController();