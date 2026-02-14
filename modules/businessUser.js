const mongoose = require('mongoose');
const schema = mongoose.Schema;

const BusinessUserSchema = new schema({
    name: String,
    email: {
        type: String,
        required: true
    },
    password: String,
    role: {
        type: String,
        default: 'business'
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

// Composite index: email + role unique per business user collection
BusinessUserSchema.index({ email: 1 }, { unique: true });

const BusinessUser = mongoose.model('BusinessUser', BusinessUserSchema);

module.exports = BusinessUser;
