const mongoose = require('mongoose');
const schema = mongoose.Schema;

const messageSchema = new schema({
    sender: String,
    amount: Number,
    date: Date,
    type: String,
   // category: String,
    userRole: {
        type: String,
        enum: ['business', 'normal'],
        required: true
    },
    createdBy: {
        type: schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create unique index to prevent duplicates: same amount, date, type, user, AND role
messageSchema.index({ amount: 1, date: 1, type: 1, createdBy: 1, userRole: 1}, { unique: true });

const message = mongoose.model('Message', messageSchema);

module.exports = message;
