const mongoose = require('mongoose');
const schema = mongoose.Schema;

const UserVerificationSchema = new schema({
    Id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uniqueString: String,
    createdAt: Date,
    expiresAt: Date
});

const UserVerification = mongoose.model('UserVerification', UserVerificationSchema);

module.exports = UserVerification;