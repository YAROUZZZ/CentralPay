const mongoose = require('mongoose');
const schema = mongoose.Schema;

const AdminUserSchema = new schema({
    name: String,
    email: String,
    password: String,
    verified: Boolean,
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin'
    },
    permissions: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

module.exports = AdminUser;
