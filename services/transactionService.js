const transaction = require('../modules/Transaction');
const AppError = require('../utils/appError');
const { validateRequiredFields, sanitizeInput } = require('../utils/validation');
const { findUserById } = require('../utils/database');
const { _parseDateValue } = require('./messageService');

class TransactionService {



    async createListOfTransactions(transactions, userId, userRole) {
        try {

            let s = 0;
            let f = 0;
            let fails = [];



            for (let i = 0; i < transactions.length; i++) {
                try {
                    const { amount, expense, category, date } = transactions[i];
                    const res = await this.createTransaction(amount, expense, category, date, userId, userRole);
                    if (res) {
                        //result.successful.push(res);
                        s++;
                    } else {
                        fails.push({ index: i, reason: res });
                        f++;
                    }

                } catch (error) {
                   // console.error(`Error processing transaction at index ${i}:`, error);
                    fails.push({ index: i, error: error.message });
                    f++;
                }

            }

            return {
                successful: s,
                failed: f,
                fails: fails
            };
        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Error creating transactions: ' + error.message, 500);
        }
    }

    async createTransaction(amount, expense, category, date, userId, userRole) {
        try {
            if (!amount || !expense || !category || !date) {
                throw AppError.create('All fields are required', 400);
            }
           
        
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
            return { amount: x.amount, expense: x.expense, category: x.category, date: x.date };

        } catch (error) {
            throw error instanceof AppError
                ? error
                : AppError.create('Error adding app message manually: ' + error.message, 500);
        }
    }



}
module.exports = new TransactionService();