const mongoose = require('mongoose');
const schema = mongoose.Schema;

const transactionSchema = new schema({
    amount: {
        type: Number,
        required: true
    },

    expense: {
        type: Boolean,
        required: true},

    category: {
        type: String
    },

    date: {
        type: Date,
        required: true
    },

    createdBy: {
        type: schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    userRole: {
        type: String,
        enum: ['business', 'normal'],
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
