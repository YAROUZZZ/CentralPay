const mongoose = require('mongoose');
const schema = mongoose.Schema;

const NormalUserSchema = new schema({
    name: String,
    email: String,
    password: String,
    verified: Boolean,
    role: {
        type: String,
        enum: ['normal'],
        default: 'normal'
    },
    phoneNumber: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const NormalUser = mongoose.model('NormalUser', NormalUserSchema);

module.exports = NormalUser;
