const mongoose = require('mongoose');
const schema = mongoose.Schema;

const BusinessUserSchema = new schema({
    name: String,
    email: String,
    password: String,
    verified: Boolean,
    role: {
        type: String,
        enum: ['business'],
        default: 'business'
    },
    companyName: String,
    companyWebsite: String,
    businessType: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const BusinessUser = mongoose.model('BusinessUser', BusinessUserSchema);

module.exports = BusinessUser;
