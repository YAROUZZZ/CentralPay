const mongoose = require('mongoose');
const schema = mongoose.Schema;

const messageSchema = new schema({
    amount: Number,
    date: String,
    time: String,
    type: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create unique index to prevent duplicates
// Messages are considered duplicates if they have same amount, date, time, and type
messageSchema.index({ date: 1, time: 1, createdAt: 1}, { unique: true });

const message = mongoose.model('Message', messageSchema);

module.exports = message;
