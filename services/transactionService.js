const transaction = require('../modules/Transaction');
const AppError = require('../utils/appError');
const { validateRequiredFields, sanitizeInput } = require('../utils/validation');
const { findUserById } = require('../utils/database');
const {_parseDateValue} = require('./messageService');

class TransactionService {

async createTransaction(amount, expense, category, date, userId, userRole) {
        try {
            if(!amount || !expense || !category || !date) {
                throw AppError.create('All fields are required', 400);
            }
           /* const SanatizedData = {
                amount,
                expense,
                category,
                date,
                createdBy: findUserById(userId),
                userRole,
                createdAt: Date.now()
            } */

            /* const data = validateRequiredFields(SanatizedData, ['amount', 'expense', 'category', 'date']);
            if (data) {
                throw AppError.create(data, 400);
            }
 */
            const trans = new transaction({
                amount,
                expense,
                category,
                date: _parseDateValue(date),
                createdBy: userId,
                userRole,
                createdAt: Date.now()
            });


            let x = await trans.save();
            return {amount: x.amount, expense: x.expense, category: x.category, date: x.date};  

        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Error adding app message manually: ' + error.message, 500);
        }
    }



}
module.exports = new TransactionService();