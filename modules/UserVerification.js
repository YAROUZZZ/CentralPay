const mongoose = require('mongoose');
const schema = mongoose.Schema;

const UserVerificationSchema = new schema({
    Id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    // Hashed OTP string
    otp: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: Date
});

const UserVerification = mongoose.model('UserVerification', UserVerificationSchema);

module.exports = UserVerification;