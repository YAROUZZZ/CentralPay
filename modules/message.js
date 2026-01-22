const mongoose = require('mongoose');
const schema = mongoose.Schema;

const messageSchema = new schema({
    amount: Number,
    date: Date,
    time: String,
    type: String
});

const message = mongoose.model('Message', messageSchema);

module.exports = message;
