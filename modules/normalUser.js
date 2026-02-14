const mongoose = require('mongoose');
const schema = mongoose.Schema;

const NormalUserSchema = new schema({
    name: String,
    email: {
        type: String,
        required: true
    },
    password: String,
    role: {
        type: String,
        default: 'normal'
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

// Index: email unique per normal user collection
NormalUserSchema.index({ email: 1 }, { unique: true });

const NormalUser = mongoose.model('NormalUser', NormalUserSchema);

module.exports = NormalUser;
