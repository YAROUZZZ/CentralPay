// Utility functions for common database operations

const mongoose = require('mongoose');
const UnverifiedUser = require('../modules/UnverifiedUser');
const NormalUser = require('../modules/NormalUser');
const BusinessUser = require('../modules/BusinessUser');
const AdminUser = require('../modules/AdminUser');

// Helper function to get the correct model based on role
const getUserModel = (role = 'normal') => {
    switch(role) {
        case 'business':
            return BusinessUser;
        case 'admin':
            return AdminUser;
        case 'normal':
        default:
            return NormalUser;
    }
};

const findUserByEmail = async (email) => {
    try {
        // Search in unverified users first
        let user = await UnverifiedUser.findOne({ email });
        if (user) return user;

        // Then search in verified user models
        user = await NormalUser.findOne({ email });
        if (user) return user;

        user = await BusinessUser.findOne({ email });
        if (user) return user;

        user = await AdminUser.findOne({ email });
        if (user) return user;

        return null;
    } catch (error) {
        throw new Error('Database error while finding user');
    }
};

const createUser = async (userData) => {
    try {
        // All new users go to UnverifiedUser table first
        const newUser = new UnverifiedUser(userData);
        return await newUser.save();
    } catch (error) {
        throw new Error('Database error while creating user');
    }
};

const updateUser = async (userId, updateData) => {
    try {
        // Try to update in unverified users first
        let result = await UnverifiedUser.updateOne({ _id: userId }, updateData);
        if (result.modifiedCount > 0) return result;

        // Then try to update in verified user models
        result = await NormalUser.updateOne({ _id: userId }, updateData);
        if (result.modifiedCount > 0) return result;

        result = await BusinessUser.updateOne({ _id: userId }, updateData);
        if (result.modifiedCount > 0) return result;

        result = await AdminUser.updateOne({ _id: userId }, updateData);
        if (result.modifiedCount > 0) return result;

        return result;
    } catch (error) {
        throw new Error('Database error while updating user');
    }
};

const moveUserToRoleTable = async (userId) => {
    try {
        // Find user in UnverifiedUser table
        const unverifiedUser = await UnverifiedUser.findById(userId);
        
        if (!unverifiedUser) {
            throw new Error('User not found in unverified records');
        }

        // Get the appropriate role table
        const RoleModel = getUserModel(unverifiedUser.role);

        // Create user data for role table
        const verifiedUserData = {
            name: unverifiedUser.name,
            email: unverifiedUser.email,
            password: unverifiedUser.password,
            verified: true,
            role: unverifiedUser.role
        };


        // Create new user in role table
        const newVerifiedUser = new RoleModel(verifiedUserData);
        const savedUser = await newVerifiedUser.save();

        // Delete from UnverifiedUser table
        await UnverifiedUser.deleteOne({ _id: userId });

        return savedUser;
    } catch (error) {
        throw new Error('Database error while moving user to role table: ' + error.message);
    }
};


module.exports = {
    findUserByEmail,
    createUser,
    updateUser,
    moveUserToRoleTable
};

