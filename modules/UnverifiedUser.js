const mongoose = require('mongoose');
const schema = mongoose.Schema;

const UnverifiedUserSchema = new schema({
    name: String,
    email: String,
    password: String,
    role: {
        type: String,
        enum: ['Business', 'Normal'],
        default: 'Normal',
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const UnverifiedUser = mongoose.model('UnverifiedUser', UnverifiedUserSchema);

module.exports = UnverifiedUser;