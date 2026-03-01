const mongoose = require('mongoose');
const schema = mongoose.Schema;
const messageSchema = require('./message').schema;

const deviceSchema = new schema({
    name: {
        type: String,
        required: true
    },
    lastSyncDate: {
        type: Date,
        default: Date.now
    },
    messages: [messageSchema]
});

const UserSchema = new schema({
    name: String,
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: String,
    role: {
        type: String,
        enum: ['business', 'normal'],
        default: 'business'
    },
    verified: {
        type: Boolean,
        default: false
    },
    devices: {
        type: [deviceSchema],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;