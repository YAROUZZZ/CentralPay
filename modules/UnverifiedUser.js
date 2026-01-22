const mongoose = require('mongoose');
const schema = mongoose.Schema;

const UnverifiedUserSchema = new schema({
    name: String,
    email: String,
    password: String,
    verified: Boolean,
    role: {
        type: String,
        enum: ['normal', 'business', 'admin'],
        default: 'normal'
    }
});

const UnverifiedUser = mongoose.model('User', UnverifiedUserSchema);

module.exports = UnverifiedUser;